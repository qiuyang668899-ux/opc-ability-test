import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const code = ts.transpileModule(await readFile(new URL('../src/utils/practiceTimer.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { createPracticeTimer, restorePracticeTimer, tickPracticeTimer } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const durations = [10, 20]
const initial = createPracticeTimer(durations)
const running = { ...initial, running: true, deadline: 10_000 }
assert.equal(tickPracticeTimer(running, durations, 3_000, false).remaining, 7)
const late = tickPracticeTimer(running, durations, 90_000, false)
assert.deepEqual(late.spent, [10, 0])
assert.equal(late.stepIndex, 1)
assert.equal(late.remaining, 20)
assert.equal(late.running, false)
assert.equal(late.endSequence, 1)
assert.equal(tickPracticeTimer(late, durations, 100_000, false).endSequence, 1)
const auto = tickPracticeTimer(running, durations, 10_000, true)
assert.equal(auto.deadline, 30_000)
assert.equal(auto.running, true)
const done = tickPracticeTimer(auto, durations, 30_000, true)
assert.equal(done.complete, true)
assert.deepEqual(done.spent, [10, 20])
assert.deepEqual(done.completedSteps, [0, 1])
assert.equal(done.endSequence, 2)
const restored = restorePracticeTimer(auto, durations)
assert.equal(restored.running, false)
assert.equal(restored.deadline, null)
assert.deepEqual(restored.spent, [10, 0])
assert.equal(restorePracticeTimer({ ...auto, stepIndex: 999 }, durations).stepIndex, 0)
assert.equal(restorePracticeTimer({ ...auto, date: '2000-01-01' }, durations).stepIndex, 0)
const legacy = restorePracticeTimer({ date: initial.date, stepIndex: 1, remaining: 5, running: true }, durations)
assert.deepEqual(legacy.spent, [0, 0])
assert.deepEqual(legacy.completedSteps, [])
console.log('PASS: deadline, background recovery, pause/restore, exact completion, single chime sequence, legacy migration')
