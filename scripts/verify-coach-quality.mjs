import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Exercise the actual TypeScript engines with isolated browser storage.
const nativeRequire = createRequire(import.meta.url)
const cache = new Map()
function load(path) {
  const file = resolve(path)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const code = ts.transpileModule(readFileSync(file, 'utf8').replaceAll('import.meta.env', '({ BASE_URL: "/", DEV: false })'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const require = (id) => id.startsWith('.') ? load(resolve(dirname(file), `${id}.ts`)) : nativeRequire(id)
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
const storage = new Map()
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
globalThis.window = { localStorage, dispatchEvent: () => true }
const root = fileURLToPath(new URL('../', import.meta.url))
const coach = load(`${root}src/engines/coachEngine.ts`)
const state = load(`${root}src/engines/stateOrchestrator.ts`)
const voice = load(`${root}src/engines/voiceJournalEngine.ts`)
const store = load(`${root}src/stores/useStore.ts`)
const drafts = load(`${root}src/engines/voiceDraftStore.ts`)
drafts.saveVoiceDraft('日记', '第一份未完成表达')
drafts.saveVoiceDraft('表单', '另一份未完成表达')
assert.equal(drafts.loadVoiceDraft('日记').text, '第一份未完成表达')
drafts.saveVoiceDraft('表单', null)
assert.equal(drafts.loadVoiceDraft('表单'), null)
assert.equal(drafts.loadVoiceDraft('日记').text, '第一份未完成表达')
const today = new Date().toLocaleDateString('en-CA')
store.saveState('dailyCheckIn', { date: today, energy: 1, clarity: 1, pressure: 5, createdAt: Date.now(), source: 'manual' })
const snapshot = coach.buildCoachSnapshot()
assert.equal(coach.createCoachPlan('我不焦虑，也不累，我要学习英语技能', snapshot).mode, 'learn', 'Current corrections must outrank an earlier check-in')
assert.equal(coach.createCoachPlan('我现在想学习英语，不需要休息', snapshot).mode, 'learn')
assert.equal(coach.createCoachPlan('我压力很大，特别紧张', snapshot).mode, 'stabilize')
const taskPlan = coach.createCoachPlan('我要写客户方案，但一直拖延无法开始', snapshot)
assert.equal(taskPlan.mode, 'execute')
assert.match(taskPlan.actionStep, /客户方案/)
const followup = coach.createCoachPlan('任务太大，无法开始', snapshot, taskPlan)
assert.match(followup.actionStep, /客户方案/)
assert.notEqual(followup.question, taskPlan.question)
const crisis = coach.createCoachPlan('我想伤害自己', snapshot)
assert.equal(crisis.route, '/support-now')
assert.deepEqual(state.buildTextRegulationJourney('我想伤害自己', crisis).steps.map((step) => step.route), ['/support-now'])
const tiny = state.buildTextRegulationJourney('无法开始', coach.shrinkCoachPlan(taskPlan))
assert.equal(tiny.steps[0].minutes, 0.5)
assert.equal(state.matchesGuidanceRoute('/music?intent=focus', '/music', '?intent=focus'), true)
assert.equal(state.matchesGuidanceRoute('/music?intent=focus', '/music', '?intent=sleep'), false)
assert.equal(state.matchesGuidanceRoute('/reset/pressure', '/reset/sleep', ''), false)
assert.equal(voice.polishVoiceTranscript('I need a little rest'), 'I need a little rest')
assert.equal(voice.polishVoiceTranscript('今天 我 很累'), '今天我很累')
store.saveState('voiceJournal', [{ date: '2000-01-01', transcript: '旧记录', analysis: { pressure: 5, clarity: 1, energy: 1 } }])
assert.equal(coach.buildCoachSnapshot().latestVoice, undefined)
state.completeRegulationJourney(tiny)
state.completeRegulationJourney(tiny)
assert.equal(store.loadState('regulationJourneyHistory', []).length, 1)

Object.assign(window, { location: { hostname: 'hos.example' }, setTimeout, clearTimeout })
const client = load(`${root}src/services/aiCoachService.ts`)
globalThis.fetch = async () => new Response('{}', { status: 429 })
await assert.rejects(client.requestHOSCoachAnalysis({ text: 'hello', source: 'text', snapshot }), /请求较多/)
globalThis.fetch = async () => new Response('{}')
await assert.rejects(client.requestHOSCoachAnalysis({ text: 'hello', source: 'text', snapshot }), /不完整/)
globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
  const abort = () => reject(new DOMException('Cancelled', 'AbortError'))
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
})
const abortController = new AbortController()
const pending = client.requestHOSCoachAnalysis({ text: 'hello', source: 'text', snapshot, signal: abortController.signal })
abortController.abort()
await assert.rejects(pending, { name: 'AbortError' })

const worker = (await import('../worker/hos-worker.js')).default
const req = (body, origin = 'https://qiuyang668899-ux.github.io') => new Request('https://hos.example/api/hos-coach', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
assert.equal((await worker.fetch(new Request('https://hos.example/api/hos-coach'), {})).status, 503)
assert.equal((await worker.fetch(req({ text: 'hello' }, 'https://untrusted.example'), { DEEPSEEK_API_KEY: 'test-only' })).status, 403)
assert.equal((await worker.fetch(req({ text: 'x'.repeat(25_000) }), { DEEPSEEK_API_KEY: 'test-only' })).status, 413)
assert.equal((await worker.fetch(req({ text: '' }), { DEEPSEEK_API_KEY: 'test-only' })).status, 400)
globalThis.fetch = async (_url, options) => {
  const input = JSON.parse(options.body)
  assert.equal(input.thinking.type, 'disabled')
  assert.equal(input.model, 'deepseek-flash')
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ mode: 'learn', recommendedModules: ['flow', 'made-up'], stateLabel: '学习', response: '一起找到一个小动作', hypothesis: '可能需要反馈', actionStep: '回忆一个知识点' }) } }] }), { status: 200 })
}
const response = await worker.fetch(req({ text: '我想学习英语' }), { DEEPSEEK_API_KEY: 'test-only' })
assert.equal(response.status, 200)
const insight = await response.json()
assert.equal(insight.engine, 'deepseek')
assert.equal(insight.recommendedModules.includes('made-up'), false)
globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }))
assert.equal((await worker.fetch(req({ text: 'hello' }), { DEEPSEEK_API_KEY: 'test-only' })).status, 502, 'Empty model JSON must not masquerade as successful AI analysis')
console.log('PASS: current intent, negation, task relevance, crisis routing, tiny plan, music routes, bilingual text, stale memory, idempotent history, worker readiness/origin/body limits/model output')
