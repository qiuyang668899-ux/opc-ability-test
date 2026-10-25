import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
const nativeRequire = createRequire(import.meta.url), cache = new Map(), storage = new Map()
function load(path) {
  const file = resolve(path)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.env', '({BASE_URL:"/"})')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
  const require = id => id.startsWith('.') ? load(resolve(dirname(file), `${id}.ts`)) : nativeRequire(id)
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }
globalThis.sessionStorage = { getItem: () => null }
globalThis.window = { dispatchEvent() {} }
const p = load('src/engines/perceptionCoach.ts'), store = load('src/stores/useStore.ts')
const points = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .99 }))
points[0] = { x: .5, y: .25, visibility: .99 }; points[11] = { x: .3, y: .5, visibility: .99 }; points[12] = { x: .7, y: .5, visibility: .99 }
const baseline = p.poseFeatures(points)
assert.ok(baseline)
assert.equal(p.poseFeatures([]), null)
assert.equal(p.poseFeatures(points.map((x, i) => i === 0 ? { ...x, visibility: .2 } : x)), null)
assert.equal(p.calibratePose(Array(19).fill(baseline)), null)
assert.deepEqual(p.calibratePose(Array(20).fill(baseline)), baseline)
assert.equal(p.calibratePose(Array.from({ length: 20 }, (_, i) => ({ ...baseline, headX: i / 10 }))), null)
assert.equal(p.comparePose(baseline, baseline), 'steady')
assert.equal(p.comparePose(null, baseline), 'missing')
assert.equal(p.comparePose(baseline, null), 'uncalibrated')
assert.equal(p.comparePose({ ...baseline, span: baseline.span * 2 }, baseline), 'reframe')
assert.equal(p.comparePose({ ...baseline, headY: baseline.headY + .3 }, baseline), 'changed')
let s = p.blankFrameState(), offers = 0
for (let time = 1000; time <= 22000; time += 500) { const r = p.advanceCoach(s, 'changed', time, true, false); s = r.state; if (r.offer) offers++ }
assert.equal(offers, 1); assert.ok(s.observedSeconds > 20)
assert.equal(p.advanceCoach(s, 'changed', 22500, true, false).offer, false, 'Cooldown suppresses repeated alerts')
const broken = p.advanceCoach({ ...p.blankFrameState(), changedSince: 1000, lastAt: 19500 }, 'missing', 20000, true, false).state
assert.equal(broken.changedSince, 0)
assert.equal(p.advanceCoach(broken, 'changed', 21000, true, false).offer, false)
assert.equal(p.advanceCoach({ ...s, lastAt: 22000, changedSince: 1000 }, 'changed', 40000, true, false).offer, false, 'Background gaps cannot accumulate trigger time')
for (const flags of [[false, false], [true, true]]) assert.equal(p.advanceCoach({ ...s, lastAt: 40000, changedSince: 1000, lastAlertAt: 0 }, 'changed', 40500, ...flags).offer, false)
assert.equal(p.advanceCoach({ ...s, lastAt: 40000, changedSince: 1000, lastAlertAt: 0, falseAlarms: 2 }, 'changed', 40500, true, false).offer, false)
assert.equal(p.advanceCoach({ ...s, lastAt: 40000, changedSince: 1000, lastAlertAt: 0, count: 3 }, 'changed', 40500, true, false).offer, false)
assert.equal(p.advanceCoach({ ...s, lastAt: 40000, changedSince: 1000, lastAlertAt: 0, snoozedUntil: 50000 }, 'changed', 40500, true, false).offer, false)
const session = { id: 'test', source: 'local-camera', startedAt: 1000, endedAt: 22000, task: 'write', observedSeconds: 20, changedSeconds: 5, alerts: [{ id: 'one', at: 20000, reason: 'relative change', response: 'adjusted' }], note: 'better', stopReason: 'done' }
assert.equal(p.savePerceptionSession(session), true); assert.equal(p.savePerceptionSession(session), true)
assert.equal(store.loadState('perceptionSessions', []).length, 1); assert.equal(store.loadState('journal', []).length, 1)
assert.deepEqual(p.perceptionWeek(0, 30000), { sessions: 1, observedMinutes: 0, reminders: 1, selfReportedAdjustments: 1, falseAlarms: 0, snoozes: 0 })
const setter = localStorage.setItem
localStorage.setItem = (key, value) => { if (key === 'hos_journal') throw Error('quota'); setter(key, value) }
assert.equal(p.savePerceptionSession({ ...session, id: 'failed' }), false)
assert.equal(store.loadState('perceptionSessions', []).length, 1, 'A partial archive save must roll back')
localStorage.setItem = setter

// Race: closing a camera request before the browser answers must stop late tracks.
let release, stopped = 0
Object.defineProperty(globalThis, 'navigator', { value: { mediaDevices: { getUserMedia: () => new Promise(resolve => { release = resolve }) } }, configurable: true })
globalThis.window = { isSecureContext: true, createImageBitmap() {}, Worker() {} }
const { LocalVisionSession } = load('src/services/localVisionSession.ts')
const runtime = new LocalVisionSession(() => {}, () => {})
const start = runtime.start({ play: async () => {} }).catch(e => e.message)
runtime.stop()
release({ getTracks: () => [{ stop() { stopped++ } }] })
assert.match(await start, /取消/); assert.equal(stopped, 1)
console.log('PASS: pose quality, stable calibration, relative cues, sustained duration, missing/gap suppression, cooldown, snooze, false-alarm limit, archive rollback/idempotence and late camera cleanup')
