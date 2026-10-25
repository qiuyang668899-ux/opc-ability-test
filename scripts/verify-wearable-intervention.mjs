import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const code = ts.transpileModule(readFileSync('src/engines/wearableIntervention.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', code)(module, module.exports)
const { defaultInterventionPolicy, parseWearableSample, wearableStatus, evaluateWearableIntervention: evaluate, recordInterventionFeedback } = module.exports
const now = new Date('2026-10-25T12:00:00').getTime()
const connection = { authorized: true, subscribed: true, deviceId: 'fixture-device', sessionId: 'fixture-session' }
const context = { mode: 'desk', validUntil: now + 3600000, focused: false }
const policy = { ...defaultInterventionPolicy, enabled: true }
// Synthetic fixtures are deliberately only in tests. No demo data is published as device telemetry.
const samples = Array.from({ length: 46 }, (_, i) => ({
  id: `fixture-${i}`, provider: 'honor-healthkit', deviceId: 'fixture-device', sessionId: 'fixture-session',
  metric: 'steps-total', value: 1000 + Math.floor(i / 10), observedAt: now - (45 - i) * 60000,
  delivery: 'live', quality: 'valid',
}))
const run = (s = samples, c = connection, ctx = context, p = policy, h = [], time = now) => evaluate(s, c, ctx, p, h, time)
const offer = run()
assert.ok(offer); assert.equal(offer.sampleIds.length, 46); assert.match(offer.observation, /4 步/)
assert.equal(run([], connection), null, 'Missing data cannot mean inactivity')
assert.equal(wearableStatus(connection, [], now), 'waiting-for-data')
assert.equal(wearableStatus(connection, samples, now), 'receiving')
assert.equal(wearableStatus(connection, samples, now + 180000), 'stale')
assert.equal(run(samples, { ...connection, authorized: false }), null)
assert.equal(run(samples, { ...connection, subscribed: false }), null)
assert.equal(run(samples, { ...connection, sessionId: 'new-session' }), null, 'Reconnection must not inherit old evidence')
assert.equal(run(samples, { ...connection, deviceId: 'another-device' }), null)
assert.equal(run(samples, connection, context, defaultInterventionPolicy), null)
for (const mode of ['exercise', 'driving', 'sleep', 'unknown']) assert.equal(run(samples, connection, { ...context, mode }), null)
assert.equal(run(samples, connection, { ...context, validUntil: now }), null)
assert.equal(run(samples, connection, { ...context, focused: true }), null)
assert.equal(run(samples, connection, context, { ...policy, startHour: 13 }), null)
assert.equal(run(samples, connection, context, { ...policy, snoozedUntil: now + 60000 }), null)
assert.equal(run(samples, connection, context, { ...policy, inactivityMinutes: NaN }), null)
assert.equal(run(samples, connection, context, { ...policy, endHour: 25 }), null)
assert.equal(run(samples, connection, context, policy, [offer]), null, 'Repeated evaluation cannot issue a second reminder')
const daily = [1, 2, 3].map((x) => ({ ...offer, id: `past-${x}`, createdAt: now - x * 3600000 }))
assert.equal(run(samples, connection, context, policy, daily), null, 'Daily cap applies to all offered reminders')
assert.equal(run(samples.map(s => ({ ...s, delivery: 'history' }))), null)
assert.equal(run(samples.map(s => ({ ...s, quality: 'off-body' }))), null)
assert.equal(run(samples.map(s => ({ ...s, quality: 'unknown' }))), null)
assert.equal(run(samples.map((s, i) => i === 20 ? { ...s, quality: 'off-body' } : s)), null, 'A short off-body period cannot be silently discarded')
assert.equal(run(samples.slice(4)), null, 'Short history cannot prove a 45 minute window')
assert.equal(run(samples.slice(0, -3)), null, 'Stale live data cannot trigger reminders')
assert.equal(run(samples.filter((_, i) => i < 10 || i > 18)), null, 'A dropout cannot mean no movement')
assert.equal(run(samples.map((s, i) => ({ ...s, value: i < 20 ? s.value : 0 }))), null, 'Counter reset requires a fresh window')
assert.equal(run(samples.map((s, i) => ({ ...s, value: 1000 + i }))), null)
assert.ok(run([...samples, samples[0]]), 'Exact retransmission is idempotent')
assert.equal(run([...samples, { ...samples[0], value: 999 }]), null, 'Conflicting replay invalidates evidence')
assert.equal(run(samples.map(s => ({ ...s, metric: 'heart-rate', value: 100 }))), null, 'Heart rate alone never classifies emotion or prompts treatment')
assert.equal(parseWearableSample({ ...samples[0], value: NaN }, now), null)
assert.equal(parseWearableSample({ ...samples[0], observedAt: now + 60000 }, now), null)
assert.equal(parseWearableSample({ ...samples[0], metric: 'imaginary-sensor' }, now), null)
const completed = recordInterventionFeedback(offer, 'completed', true, now + 60000)
assert.equal(completed.id, offer.id); assert.equal(completed.helpful, true)
assert.equal(recordInterventionFeedback(completed, 'dismissed', undefined, now + 120000).helpful, undefined)
assert.equal(recordInterventionFeedback(offer, 'completed', true, now - 1), offer)
console.log('PASS: wearable provenance, authorization/session isolation, freshness, coverage, resets, deduplication, context, quiet hours, cooldown, daily cap, non-diagnostic rules and feedback receipts (synthetic fixtures only)')
