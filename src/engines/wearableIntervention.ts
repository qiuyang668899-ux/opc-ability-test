/** Device adapters must authenticate their own transport. This module never grants device access. */
export type WearableSample = {
  id: string
  deviceId: string
  sessionId: string
  provider: 'honor-healthkit'
  metric: 'steps-total' | 'heart-rate'
  value: number
  observedAt: number
  delivery: 'live' | 'history'
  quality: 'valid' | 'unknown' | 'off-body'
}

export type WearableConnection = {
  authorized: boolean
  deviceId: string
  sessionId: string
  subscribed: boolean
}

export type InterventionPolicy = {
  enabled: boolean
  startHour: number
  endHour: number
  inactivityMinutes: number
  cooldownMinutes: number
  maxDaily: number
  snoozedUntil: number
}

export const defaultInterventionPolicy: InterventionPolicy = {
  enabled: false, startHour: 9, endHour: 21,
  inactivityMinutes: 45, cooldownMinutes: 60, maxDaily: 3, snoozedUntil: 0,
}

export type CoachingContext = {
  mode: 'desk' | 'exercise' | 'driving' | 'sleep' | 'unknown'
  validUntil: number
  focused: boolean
}

export type DeviceIntervention = {
  id: string
  kind: 'movement-break'
  createdAt: number
  deviceId: string
  sessionId: string
  sampleIds: string[]
  observation: string
  action: string
  route: '/growth?tab=coach'
  status: 'offered' | 'completed' | 'dismissed' | 'snoozed'
  feedbackAt?: number
  helpful?: boolean
}

const MINUTE = 60_000
const MAX_LIVE_AGE = 2 * MINUTE
const MAX_SAMPLE_GAP = 5 * MINUTE

function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160
}

/** Parse vendor-adapter output; imported/old observations remain ineligible for live intervention. */
export function parseWearableSample(raw: unknown, now = Date.now()): WearableSample | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as WearableSample
  if (!identifier(s.id) || !identifier(s.deviceId) || !identifier(s.sessionId) || s.provider !== 'honor-healthkit') return null
  if (!['live', 'history'].includes(s.delivery) || !['valid', 'unknown', 'off-body'].includes(s.quality)) return null
  if (!Number.isSafeInteger(s.observedAt) || s.observedAt > now + 5_000 || s.observedAt < now - 7 * 86400_000) return null
  if (!Number.isFinite(s.value)) return null
  if (s.metric === 'steps-total') {
    if (!Number.isInteger(s.value) || s.value < 0 || s.value > 1_000_000) return null
  } else if (s.metric === 'heart-rate') {
    if (s.value < 1 || s.value > 300) return null
  } else return null
  return { id: s.id, deviceId: s.deviceId, sessionId: s.sessionId, provider: s.provider,
    metric: s.metric, value: s.value, observedAt: s.observedAt, delivery: s.delivery, quality: s.quality }
}

function liveSamples(samples: readonly WearableSample[], connection: WearableConnection, now: number) {
  const unique = new Map<string, WearableSample>()
  for (const raw of samples) {
    const s = parseWearableSample(raw, now)
    if (!s || s.deviceId !== connection.deviceId || s.sessionId !== connection.sessionId || s.delivery !== 'live' || s.quality !== 'valid') continue
    // Conflicting replays invalidate this window instead of silently replacing sensor evidence.
    const previous = unique.get(s.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(s)) return []
    unique.set(s.id, s)
  }
  return [...unique.values()].sort((a, b) => a.observedAt - b.observedAt)
}

export function wearableStatus(connection: WearableConnection, samples: readonly WearableSample[], now = Date.now()) {
  if (!connection.authorized) return 'authorization-required'
  if (!connection.subscribed) return 'disconnected'
  const last = liveSamples(samples, connection, now).at(-1)
  if (!last) return 'waiting-for-data'
  return now - last.observedAt <= MAX_LIVE_AGE ? 'receiving' : 'stale'
}

function inHours(hour: number, start: number, end: number) {
  if (start === end) return false
  return start < end ? hour >= start && hour < end : hour >= start || hour < end
}

function validPolicy(p: InterventionPolicy) {
  return Number.isInteger(p.startHour) && p.startHour >= 0 && p.startHour <= 23
    && Number.isInteger(p.endHour) && p.endHour >= 0 && p.endHour <= 23
    && Number.isFinite(p.inactivityMinutes) && p.inactivityMinutes >= 30 && p.inactivityMinutes <= 120
    && Number.isFinite(p.cooldownMinutes) && p.cooldownMinutes >= 30 && p.cooldownMinutes <= 1440
    && Number.isInteger(p.maxDaily) && p.maxDaily >= 1 && p.maxDaily <= 6
    && Number.isFinite(p.snoozedUntil)
}

/** Conservative coaching rule, not a medical alarm or a posture/emotion classifier. */
export function evaluateWearableIntervention(
  samples: readonly WearableSample[], connection: WearableConnection,
  context: CoachingContext, policy: InterventionPolicy,
  history: readonly DeviceIntervention[], now = Date.now(),
): DeviceIntervention | null {
  if (!validPolicy(policy) || !policy.enabled || policy.snoozedUntil > now) return null
  if (!connection.authorized || !connection.subscribed || !identifier(connection.sessionId) || !identifier(connection.deviceId)) return null
  if (context.mode !== 'desk' || context.focused || !Number.isFinite(context.validUntil) || context.validUntil <= now) return null
  if (!inHours(new Date(now).getHours(), policy.startHour, policy.endHour)) return null
  const today = new Date(now).toDateString()
  const previous = history.filter(x => Number.isFinite(x.createdAt) && x.createdAt <= now)
  if (previous.filter(x => new Date(x.createdAt).toDateString() === today).length >= policy.maxDaily) return null
  if (previous.some(x => now - x.createdAt < policy.cooldownMinutes * MINUTE)) return null

  const start = now - policy.inactivityMinutes * MINUTE
  const invalidWindow = samples.some(raw => {
    const s = parseWearableSample(raw, now)
    return s && s.deviceId === connection.deviceId && s.sessionId === connection.sessionId
      && s.delivery === 'live' && s.observedAt >= start - MAX_SAMPLE_GAP && s.observedAt <= now
      && s.quality !== 'valid'
  })
  if (invalidWindow) return null
  const steps = liveSamples(samples, connection, now)
    .filter(s => s.metric === 'steps-total' && s.observedAt >= start - MAX_SAMPLE_GAP && s.observedAt <= now)
  const boundary = steps.findLastIndex(s => s.observedAt <= start)
  if (boundary < 0) return null
  const window = steps.slice(boundary)
  const first = window[0], last = window.at(-1)!
  if (window.length < 7 || now - last.observedAt > MAX_LIVE_AGE) return null
  for (let i = 1; i < window.length; i++) {
    const gap = window[i].observedAt - window[i - 1].observedAt
    // Drop-outs, counter resets, midnight resets and duplicate timestamps cannot prove inactivity.
    if (gap <= 0 || gap > MAX_SAMPLE_GAP || window[i].value < window[i - 1].value) return null
  }
  const addedSteps = last.value - first.value
  if (addedSteps > 20) return null
  const id = `movement:${connection.sessionId}:${last.id}`
  if (previous.some(x => x.id === id)) return null
  return {
    id, kind: 'movement-break', createdAt: now, deviceId: connection.deviceId,
    sessionId: connection.sessionId, sampleIds: window.map(s => s.id),
    observation: `在你设定的办公时段，过去约 ${policy.inactivityMinutes} 分钟，手环步数增加了 ${addedSteps} 步。步数不能判断你的坐姿。`,
    action: '方便的话，起身走动两分钟，轻轻活动肩膀。不方便就稍后提醒。',
    route: '/growth?tab=coach', status: 'offered',
  }
}

/** Repeated taps update the original receipt; they never create extra completed actions. */
export function recordInterventionFeedback(
  item: DeviceIntervention, status: Exclude<DeviceIntervention['status'], 'offered'>,
  helpful?: boolean, now = Date.now(),
): DeviceIntervention {
  if (now < item.createdAt || !Number.isFinite(now)) return item
  if (status === 'completed') return { ...item, status, feedbackAt: now, helpful }
  const next = { ...item, status, feedbackAt: now }
  delete next.helpful
  return next
}
