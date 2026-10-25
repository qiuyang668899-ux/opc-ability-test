import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const nativeRequire = createRequire(import.meta.url)
const cache = new Map()
function load(path) {
  const file = resolve(path)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.env', '({ VITE_HOS_AI_ENDPOINT: "https://hos.example/api/hos-coach" })')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const require = id => id.startsWith('.') ? load(resolve(dirname(file), `${id}.ts`)) : nativeRequire(id)
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
function storage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), clear: () => data.clear() }
}
globalThis.localStorage = storage(); globalThis.sessionStorage = storage()
globalThis.window = { dispatchEvent: () => true, setTimeout, clearTimeout }
let downloads = 0
globalThis.document = { createElement: () => ({ click: () => downloads++ }) }
const root = fileURLToPath(new URL('../', import.meta.url))
const auth = load(`${root}src/services/accountSession.ts`)
const cloud = load(`${root}src/services/cloudArchive.ts`)
const session = (letter = 'a', id = '11111111-1111-1111-1111-111111111111') => ({ token: letter.repeat(64), expiresAt: Date.now() + 60_000, user: { id, phoneMasked: 'test', inviteCode: '', cloudConsent: true, createdAt: 0 } })
const response = data => new Response(JSON.stringify(data))
function reset() { localStorage.clear(); sessionStorage.clear(); auth.setAccountSession(session()); cloud.resetCloudStatus(); downloads = 0 }
function deferred() {
  let finish, notify; const requests = []
  const started = new Promise(resolve => { notify = resolve })
  globalThis.fetch = (url, options) => { requests.push({ url, options }); notify(); return new Promise(resolve => { finish = resolve }) }
  return { requests, started, finish: data => finish(response(data)) }
}
const remote = { data: { journal: ['cloud record'] }, revision: 4, updatedAt: 1 }

reset()
cloud.setCloudEnabled(true)
let pending = deferred()
let work = cloud.enableCloud()
await pending.started
cloud.setCloudEnabled(false)
pending.finish(remote); await work
assert.equal(cloud.cloudEnabled(), false, 'Pause must survive an older enable response')
assert.equal(localStorage.getItem(auth.accountStorageKey('journal')), null)
assert.equal(pending.requests.length, 1, 'Paused hydration must not upload')

reset(); cloud.setCloudEnabled(true)
pending = deferred(); work = cloud.syncCloud()
await pending.started
cloud.setCloudEnabled(false); pending.finish(remote); await work
assert.equal(cloud.cloudStatus().state, 'off', 'Paused sync must not publish saved status')
assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), null)

reset(); pending = deferred(); work = cloud.enableCloud()
await pending.started
auth.setAccountSession(session('b'))
pending.finish(remote); await work
assert.equal(cloud.cloudEnabled(), false, 'New token for same account must invalidate old hydration')
assert.equal(localStorage.getItem(auth.accountStorageKey('journal')), null)

reset(); pending = deferred(); work = cloud.downloadCloudCopy()
await pending.started
auth.setAccountSession(session('b', '22222222-2222-2222-2222-222222222222'))
pending.finish(remote); await work
assert.equal(downloads, 0, 'Old account response must not trigger a download in new account')

reset(); cloud.setCloudEnabled(true)
pending = deferred(); work = cloud.resolveCloud('cloud')
await pending.started
cloud.setCloudEnabled(false); pending.finish(remote); await work
assert.equal(downloads, 0)
assert.equal(cloud.cloudEnabled(), false)
assert.equal(localStorage.getItem(auth.accountStorageKey('journal')), null)

reset()
const methods = []
globalThis.fetch = async (_url, options) => { methods.push(options.method); return response(options.method === 'GET' ? remote : { revision: 5, updatedAt: Date.now() }) }
await cloud.enableCloud()
assert.deepEqual(methods, ['GET', 'PUT'])
assert.equal(cloud.cloudEnabled(), true)
assert.equal(cloud.cloudStatus().state, 'saved')
assert.deepEqual(JSON.parse(localStorage.getItem(auth.accountStorageKey('journal'))), ['cloud record'])
assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), '5')

reset(); localStorage.setItem(auth.accountStorageKey('journal'), JSON.stringify(['local record']))
globalThis.fetch = async () => response(remote)
await cloud.enableCloud()
assert.equal(cloud.cloudStatus().state, 'conflict')
assert.deepEqual(JSON.parse(localStorage.getItem(auth.accountStorageKey('journal'))), ['local record'])

function delayedArchiveServer() {
  let revision = 1, data = { journal: ['same record'] }, release, notify
  const requests = []
  const started = new Promise(resolve => { notify = resolve })
  globalThis.fetch = async (_url, options) => {
    const body = options.body ? JSON.parse(options.body) : null
    requests.push({ method: options.method, body, token: options.headers['X-HOS-Session'] })
    if (options.method === 'PUT') {
      if (requests.length === 1) { notify(); await new Promise(resolve => { release = resolve }) }
      if (body.revision !== revision) return new Response(JSON.stringify({ message: 'revision conflict' }), { status: 409 })
      data = body.data; revision++
    }
    return response({ data, revision, updatedAt: Date.now() })
  }
  return { requests, started, finish: () => release(), snapshot: () => ({ data, revision }) }
}
function prepareUpload() {
  reset(); cloud.setCloudEnabled(true)
  localStorage.setItem(auth.accountStorageKey('journal'), JSON.stringify(['same record']))
  localStorage.setItem(auth.accountStorageKey('cloudRevision'), '1')
  return delayedArchiveServer()
}

let server = prepareUpload()
let first = cloud.syncCloud(); await server.started
let queued = cloud.enableCloud()
await Promise.resolve()
assert.deepEqual(server.requests.map(request => request.method), ['PUT'], 'Hydration must wait for an in-flight upload')
server.finish(); await Promise.all([first, queued])
assert.deepEqual(server.requests.map(request => request.method), ['PUT', 'GET', 'PUT'])
assert.deepEqual(server.requests.filter(request => request.body).map(request => request.body.revision), [1, 2])
assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), '3')
assert.equal(cloud.cloudStatus().state, 'saved', 'Re-enabling during upload must not create a false revision conflict')

for (const direction of ['cloud', 'local']) {
  server = prepareUpload()
  localStorage.setItem(auth.accountStorageKey('journal'), JSON.stringify(['latest local record']))
  first = cloud.syncCloud(); await server.started
  queued = cloud.resolveCloud(direction)
  await Promise.resolve()
  assert.equal(server.requests.length, 1, `Resolving ${direction} must wait for the earlier upload`)
  server.finish(); await Promise.all([first, queued])
  assert.deepEqual(server.requests.map(request => request.method), ['PUT', 'GET', 'PUT'])
  assert.deepEqual(server.snapshot(), { data: { journal: ['latest local record'] }, revision: 3 })
  assert.equal(cloud.cloudStatus().state, 'saved')
  assert.equal(downloads, direction === 'cloud' ? 1 : 2)
}

for (const action of [() => cloud.enableCloud(), () => cloud.resolveCloud('cloud'), () => cloud.syncCloud(), () => cloud.downloadCloudCopy()]) {
  server = prepareUpload()
  first = cloud.syncCloud(); await server.started
  queued = action(); cloud.setCloudEnabled(false)
  server.finish(); await Promise.all([first, queued])
  assert.equal(server.requests.length, 1, 'Pausing must cancel queued archive requests before they are sent')
  assert.equal(cloud.cloudEnabled(), false)
  assert.equal(cloud.cloudStatus().state, 'off')
  assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), '1')
  assert.equal(downloads, 0)
}

server = prepareUpload()
first = cloud.syncCloud(); await server.started
queued = cloud.enableCloud()
auth.setAccountSession(session('b', '22222222-2222-2222-2222-222222222222'))
cloud.resetCloudStatus()
server.finish(); await Promise.all([first, queued])
assert.equal(server.requests.length, 1, 'Account replacement must cancel queued operations before they use the new token')
assert.equal(localStorage.getItem(auth.accountStorageKey('journal')), null)
assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), null)

server = prepareUpload()
first = cloud.syncCloud(); await server.started
localStorage.setItem(auth.accountStorageKey('journal'), JSON.stringify(['edited while uploading']))
queued = cloud.syncCloud()
server.finish(); await Promise.all([first, queued])
assert.deepEqual(server.requests.map(request => request.method), ['PUT', 'PUT'])
assert.deepEqual(server.snapshot(), { data: { journal: ['edited while uploading'] }, revision: 3 })
assert.equal(localStorage.getItem(auth.accountStorageKey('cloudRevision')), '3')

reset()
globalThis.fetch = async () => { throw new Error('offline') }
await assert.rejects(cloud.enableCloud(), /网络暂时不可用/)
globalThis.fetch = async (_url, options) => response(options.method === 'GET' ? remote : { revision: 5, updatedAt: Date.now() })
await cloud.enableCloud()
assert.equal(cloud.cloudStatus().state, 'saved', 'A failed request must release the queue for retries')
console.log('PASS: 17 cloud lifecycle scenarios (late-response isolation, serialized upload/hydration/resolution, queued cancellation, latest-data sync, retry recovery)')
