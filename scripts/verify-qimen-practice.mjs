import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const code = ts.transpileModule(await readFile(new URL('../src/data/qimenPractice.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { QIMEN_VERSES, QIMEN_GATES, QIMEN_SOURCE_NOTES, newQimenDraft, qimenJournalText } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
assert.equal(QIMEN_VERSES.length, 15)
assert.equal(QIMEN_GATES.length, 6)
assert.equal(new Set(QIMEN_GATES.flatMap(gate => gate.verses)).size, 15, 'Every supplied verse is reachable from a practice gate')
assert.equal(new Set(QIMEN_GATES.map(gate => gate.id)).size, 6)
assert.ok(QIMEN_GATES.every(gate => gate.actions.length >= 3 && gate.boundary))
assert.equal(QIMEN_SOURCE_NOTES.length, 4)
const draft = newQimenDraft('2026-09-29')
assert.equal(draft.done.length, 0)
assert.equal(draft.notes.length, 6)
assert.deepEqual(draft.joys, ['', '', ''])
const partial = { ...draft, done: ['clear'], notes: ['整理桌面', '', '', '', '', ''], joys: ['热饭', '朋友问候', '一页好书'], reflection: '明天继续两分钟', before: 2, after: 3 }
const text = qimenJournalText(partial)
assert.match(text, /已实践 1\/6 门/)
assert.match(text, /✓ 已实践 · 净身净居/)
assert.match(text, /○ 待实践 · 择人结缘/)
for (const phrase of ['整理桌面', '热饭', '朋友问候', '一页好书', '明天继续两分钟']) assert.ok(text.includes(phrase))
assert.match(qimenJournalText({ ...partial, done: QIMEN_GATES.map(gate => gate.id) }), /已实践 6\/6 门/)
console.log('PASS: 15 complete verses, 6 gates, source interpretations, boundaries, draft and accurate journal output')
