import { loadState, saveStateBatch, type JournalEntry } from '../stores/useStore'

export type Landmark = { x: number; y: number; visibility?: number }
export type PoseFeatures = { headX: number; headY: number; tilt: number; span: number; centerX: number; centerY: number }
export type PerceptionAlert = { id: string; at: number; reason: string; response: 'pending' | 'adjusted' | 'snoozed' | 'false-alarm'; respondedAt?: number }
export type PerceptionSession = { id: string; startedAt: number; endedAt: number; task: string; observedSeconds: number; changedSeconds: number; alerts: PerceptionAlert[]; note: string; stopReason: string; source: 'local-camera' }
export type CoachFrameState = { lastAt: number; changedSince: number; lastAlertAt: number; snoozedUntil: number; observedSeconds: number; changedSeconds: number; count: number; falseAlarms: number }
export const blankFrameState = (): CoachFrameState => ({ lastAt: 0, changedSince: 0, lastAlertAt: 0, snoozedUntil: 0, observedSeconds: 0, changedSeconds: 0, count: 0, falseAlarms: 0 })

export function poseFeatures(points: Landmark[], aspect = 4 / 3): PoseFeatures | null {
  const required = [points[0], points[11], points[12]]
  if (!Number.isFinite(aspect) || aspect <= 0 || required.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || (p.visibility ?? 0) < .75 || p.x < .03 || p.x > .97 || p.y < .03 || p.y > .97)) return null
  const [nose, left, right] = required
  const dx = Math.abs(right.x - left.x) * aspect
  if (dx < .12 || dx > 1.4) return null
  const centerX = (left.x + right.x) / 2, centerY = (left.y + right.y) / 2
  return { headX: (nose.x - centerX) * aspect / dx, headY: (nose.y - centerY) / dx,
    tilt: Math.atan2(right.y - left.y, dx) * 180 / Math.PI, span: dx, centerX, centerY }
}

export function calibratePose(frames: PoseFeatures[]): PoseFeatures | null {
  if (frames.length < 20) return null
  const keys: (keyof PoseFeatures)[] = ['headX', 'headY', 'tilt', 'span', 'centerX', 'centerY']
  const result = {} as PoseFeatures
  for (const key of keys) {
    const values = frames.map(x => x[key]).sort((a, b) => a - b)
    if (values.some(x => !Number.isFinite(x))) return null
    result[key] = values[Math.floor(values.length / 2)]
    const spread = values[Math.floor(values.length * .9)] - values[Math.floor(values.length * .1)]
    if (spread > (key === 'tilt' ? 8 : key === 'span' ? .15 : .12)) return null
  }
  return result
}

export function comparePose(frame: PoseFeatures | null, baseline: PoseFeatures | null): 'missing' | 'uncalibrated' | 'reframe' | 'changed' | 'steady' {
  if (!frame) return 'missing'
  if (!baseline) return 'uncalibrated'
  if (frame.span / baseline.span < .65 || frame.span / baseline.span > 1.5 || Math.abs(frame.centerX - baseline.centerX) > .2 || Math.abs(frame.centerY - baseline.centerY) > .22) return 'reframe'
  if (Math.abs(frame.headX - baseline.headX) > .3 || frame.headY - baseline.headY > .22 || Math.abs(frame.tilt - baseline.tilt) > 12) return 'changed'
  return 'steady'
}

/** Only continuous, confident frames count. These are relative visual changes, not posture diagnoses. */
export function advanceCoach(previous: CoachFrameState, status: ReturnType<typeof comparePose>, now: number, enabled: boolean, quiet: boolean) {
  const s = { ...previous }
  const gap = now - s.lastAt
  const valid = status === 'steady' || status === 'changed'
  const seconds = gap > 0 && gap <= 1500 && valid ? gap / 1000 : 0
  s.lastAt = now
  s.observedSeconds += seconds
  if (status === 'changed') s.changedSeconds += seconds
  if (status !== 'changed' || gap > 1500 || gap < 0 || !enabled || quiet) s.changedSince = 0
  if (status === 'changed' && enabled && !quiet && !s.changedSince) s.changedSince = now
  const offer = status === 'changed' && enabled && !quiet && s.changedSince > 0
    && now - s.changedSince >= 20_000 && (!s.lastAlertAt || now - s.lastAlertAt >= 300_000)
    && now >= s.snoozedUntil && s.count < 3 && s.falseAlarms < 2
  if (offer) { s.lastAlertAt = now; s.changedSince = 0; s.count++ }
  return { state: s, offer }
}

export function perceptionSummary(s: PerceptionSession) {
  const completed = s.alerts.filter(x => x.response === 'adjusted').length
  const dismissed = s.alerts.filter(x => x.response === 'false-alarm').length
  return `本机摄像头观察 ${Math.round(s.observedSeconds)} 秒；相对本人校准姿态的持续变化 ${Math.round(s.changedSeconds)} 秒。提醒 ${s.alerts.length} 次，自报已调整 ${completed} 次，标记误报 ${dismissed} 次。此记录不判断健康、情绪或工作效率。${s.note ? `\n本人反馈：${s.note}` : ''}`
}

export function savePerceptionSession(session: PerceptionSession) {
  const sessions = loadState<PerceptionSession[]>('perceptionSessions', [])
  const journals = loadState<JournalEntry[]>('journal', [])
  const journal: JournalEntry = { id: `perception-${session.id}`, timestamp: session.startedAt,
    trigger: '主动陪伴 · 摄像头观察', oldPattern: '', newResponse: session.task || '给身体一点余地', somatic: '', distortion: '',
    organizedText: perceptionSummary(session), rawFragment: session.note, source: 'manual' }
  return saveStateBatch({ perceptionSessions: [session, ...sessions.filter(x => x.id !== session.id)].slice(0, 180),
    journal: [journal, ...journals.filter(x => x.id !== journal.id)] })
}

export function perceptionWeek(start: number, end: number) {
  const sessions = loadState<PerceptionSession[]>('perceptionSessions', []).filter(x => x.startedAt >= start && x.startedAt < end)
  const alerts = sessions.flatMap(x => x.alerts)
  return { sessions: sessions.length, observedMinutes: Math.round(sessions.reduce((n, x) => n + x.observedSeconds, 0) / 60),
    reminders: alerts.length, selfReportedAdjustments: alerts.filter(x => x.response === 'adjusted').length,
    falseAlarms: alerts.filter(x => x.response === 'false-alarm').length, snoozes: alerts.filter(x => x.response === 'snoozed').length }
}
