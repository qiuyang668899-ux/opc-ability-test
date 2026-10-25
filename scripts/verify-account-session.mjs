import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Exercise the production services against isolated storage and deferred network replies.
const nativeRequire = createRequire(import.meta.url)
const cache = new Map()
function load(path) {
  const file = resolve(path)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.env', '({ VITE_HOS_AI_ENDPOINT: "https://hos.test/api/hos-coach" })')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const require = (id) => id.startsWith('.') ? load(resolve(dirname(file), `${id}.ts`)) : nativeRequire(id)
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout, dispatchEvent: () => true }
const root = fileURLToPath(new URL('../', import.meta.url))
const sessions = load(`${root}src/services/accountSession.ts`)
const service = load(`${root}src/services/accountService.ts`)
const coach = load(`${root}src/services/aiCoachService.ts`)
const identity = (letter, user = '11111111-1111-1111-1111-111111111111') => ({
  token: letter.repeat(64), expiresAt: Date.now() + 3600000,
  user: { id: user, phoneMasked: '138****0000', inviteCode: 'abcdefabcdef', cloudConsent: false, createdAt: Date.now() },
})
const oldSession = identity('a')
const sameUserReplacement = identity('b')
const otherUserReplacement = identity('c', '22222222-2222-2222-2222-222222222222')
function deferredFetch() {
  let reply
  let request
  globalThis.fetch = (url, options) => { request = { url, options }; return new Promise(resolve => { reply = resolve }) }
  return { get request() { return request }, respond(status = 200) { reply(Response.json({ message: 'test response' }, { status })) } }
}

for (const replacement of [sameUserReplacement, otherUserReplacement]) {
  sessions.setAccountSession(oldSession)
  const network = deferredFetch()
  const pending = service.accountAPI('/api/account/me')
  assert.equal(network.request.options.headers['X-HOS-Session'], oldSession.token)
  sessions.setAccountSession(replacement)
  network.respond(401)
  await assert.rejects(pending, { status: 401 })
  assert.deepEqual(sessions.accountSession(), replacement, 'An older 401 must preserve a replacement login')

  sessions.setAccountSession(oldSession)
  const logoutNetwork = deferredFetch()
  const logout = service.signOut()
  sessions.setAccountSession(replacement)
  logoutNetwork.respond()
  await logout
  assert.deepEqual(sessions.accountSession(), replacement, 'An older logout must preserve a replacement login')

  sessions.setAccountSession(oldSession)
  const failedLogoutNetwork = deferredFetch()
  const failedLogout = service.signOut()
  sessions.setAccountSession(replacement)
  failedLogoutNetwork.respond(401)
  await assert.rejects(failedLogout, { status: 401 })
  assert.deepEqual(sessions.accountSession(), replacement, 'An older failed logout must preserve a replacement login')

  sessions.setAccountSession(oldSession)
  const coachNetwork = deferredFetch()
  const analysis = coach.requestHOSCoachAnalysis({ text: '我想整理今天的计划', source: 'text', snapshot: {} })
  assert.equal(coachNetwork.request.options.headers['X-HOS-Session'], oldSession.token)
  sessions.setAccountSession(replacement)
  coachNetwork.respond(401)
  await assert.rejects(analysis)
  assert.deepEqual(sessions.accountSession(), replacement, 'An older coach 401 must preserve a replacement login')
}

sessions.setAccountSession(null)
const anonymousNetwork = deferredFetch()
const anonymousRequest = service.accountAPI('/api/account/me')
sessions.setAccountSession(sameUserReplacement)
anonymousNetwork.respond(401)
await assert.rejects(anonymousRequest, { status: 401 })
assert.deepEqual(sessions.accountSession(), sameUserReplacement, 'An anonymous request must not expire a later login')

sessions.setAccountSession(oldSession)
const currentNetwork = deferredFetch()
const currentRequest = service.accountAPI('/api/account/me')
currentNetwork.respond(401)
await assert.rejects(currentRequest, { status: 401 })
assert.equal(sessions.accountSession(), null)
assert.equal(sessions.accountIdentity().token, oldSession.token)
assert.equal(sessions.accountStorageKey('journal'), `hos_account_${oldSession.user.id}_journal`, 'Expiry must keep private records in their account namespace')
globalThis.fetch = () => { throw new Error('Expired logout must not require a network request') }
await service.signOut()
assert.equal(sessions.accountIdentity(), null, 'Explicit logout must clear an expired local session')
assert.equal(sessions.accountStorageKey('journal'), 'hos_journal')

sessions.setAccountSession(oldSession)
globalThis.fetch = async () => { throw new TypeError('Offline') }
await assert.rejects(service.signOut(), { code: 'network' })
assert.equal(sessions.accountIdentity(), null, 'Explicit logout must end local access when the server is unavailable')
console.log('PASS: account and coach request-token isolation, stale 401 and logout, same-user replacement, anonymous request, expiry namespace, expired and offline logout')
