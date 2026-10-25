import { loadState, saveStateBatch, type FlowSession, type JournalEntry } from '../stores/useStore'

export const GROWTH_DIMENSIONS = [
  { id: 'body', name: '身体有能量', detail: '睡眠、运动、饮食、恢复', action: '午饭后，按舒服的速度走两分钟。', anchor: '午饭后', route: '/biosync' },
  { id: 'emotion', name: '情绪有恢复力', detail: '觉察、命名、自我慈悲', action: '紧绷时，命名一个感受，做三次自然呼吸。', anchor: '察觉紧绷时', route: '/reset/emotion' },
  { id: 'attention', name: '注意力有方向', detail: '深度工作、优先级、不做清单', action: '打开电脑后，关掉消息，专注最重要的任务五分钟。', anchor: '打开电脑后', route: '/flow' },
  { id: 'decision', name: '决策更清晰', detail: '记录、反思、实验、追踪', action: '做重要决定前，写一个替代方案和一条反对证据。', anchor: '重要决定前', route: '/architect' },
  { id: 'meaning', name: '内心有平和', detail: '关系、连接、贡献、生活体验', action: '晚饭后，给一位在意的人一句真诚的问候。', anchor: '晚饭后', route: '/classics' },
  { id: 'creation', name: '行动有作品', detail: '每周可展示的小交付', action: '每天工作开始时，先为本周作品完成一个最小片段。', anchor: '工作开始时', route: '/flow' },
] as const
export type Dimension = typeof GROWTH_DIMENSIONS[number]['id']
export type ReviewInput = { week: string; dimension: Dimension; goal: string; events: string; emotions: string; decisions: string; body: string; artifact: string; includeHistory: boolean }
export type GrowthReport = { pattern: string; blindSpot: string; counterfactual: string; experiment: string; response: string; evidence: string[]; engine: 'local' | 'deepseek'; createdAt: number }
export type WeeklyReview = { id: string; input: ReviewInput; report: GrowthReport; createdAt: number }
export type Experiment = { id: string; reviewId: string; dimension: Dimension; action: string; anchor: string; target: number; start: string; end: string; baseline: string; expected: string; result: string; checkIns: { date: string; note: string }[]; status: 'active' | 'completed' | 'stopped' }
export type DailyEvidence = { id: string; date: string; source: string; sleepHours?: number; exerciseMinutes?: number; steps?: number; deepWorkMinutes?: number; recoveryMinutes?: number; errorOpportunities?: number; repeatedErrors?: number; note: string }
export type PhotoNote = { id: string; date: string; kind: string; caption: string; image: string }
export type GrowthProgram = { start: string; primaryMetric: 'completion' | 'errors' | 'recovery' | 'focus'; target: string }
export type ReminderSettings = { enabled: boolean; interval: number; startHour: number; endHour: number; lastAt: number; kind: 'posture' | 'rest' | 'focus' }
export const defaultReminder: ReminderSettings = { enabled: false, interval: 60, startHour: 9, endHour: 21, lastAt: 0, kind: 'posture' }
export const NUDGES = {
  posture: { title: '身体换个姿势', text: '双脚轻放地面，放松肩膀。若方便，起身走动一分钟；不用一直维持一种“完美坐姿”。出现疼痛就停止。', route: '/biosync' },
  rest: { title: '给自己一点恢复', text: '看看远处，松开下颌，做三次自然呼吸。此刻不必解决全部。', route: '/music?intent=pressure' },
  focus: { title: '只回到一件事', text: '问自己：接下来五分钟，最值得完成的小动作是什么？把其他事放进稍后清单。', route: '/flow' },
}
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function addDays(day: string, n: number) { const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() + n); return dayKey(date) }
export function weekKey(date = new Date()) { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d) }
export function validDay(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayKey(new Date(`${value}T12:00:00`)) === value }
export function blankReview(): ReviewInput { return { week: weekKey(), dimension: 'attention', goal: '', events: '', emotions: '', decisions: '', body: '', artifact: '', includeHistory: false } }
export function weeklyContext(week: string) {
  const start = new Date(`${week}T00:00:00`).getTime(); const end = new Date(`${addDays(week, 7)}T00:00:00`).getTime()
  const journals = loadState<JournalEntry[]>('journal', []).filter(x => x.timestamp >= start && x.timestamp < end && !x.id.startsWith('growth-'))
  const flow = loadState<FlowSession[]>('flowSessions', []).filter(x => x.timestamp >= start && x.timestamp < end && typeof x.actualSeconds === 'number' && x.actualSeconds > 0)
  const evidence = loadState<DailyEvidence[]>('growthEvidence', []).filter(x => x.date >= week && x.date < addDays(week, 7))
  return { journals, flowMinutes: Math.round(flow.reduce((sum, x) => sum + (x.actualSeconds || 0), 0) / 60), evidence }
}
export function localReport(input: ReviewInput): GrowthReport {
  const d = GROWTH_DIMENSIONS.find(x => x.id === input.dimension)!
  const evidence = [input.goal && `目标：${input.goal}`, input.events && `事件：${input.events}`, input.emotions && `感受：${input.emotions}`, input.decisions && `决定：${input.decisions}`, input.body && `身体自述：${input.body}`].filter(Boolean) as string[]
  const context = input.includeHistory ? weeklyContext(input.week) : null
  if (context) evidence.push(`本周已有 ${context.journals.length} 条日志、${context.flowMinutes} 分钟实际计时专注、${context.evidence.length} 条身体/行为数据。`)
  return { engine: 'local', createdAt: Date.now(), evidence,
    response: `这周先围绕“${d.name}”做一个小实验，不要求一次改变全部。`,
    pattern: evidence.length < 3 ? '目前线索还少，先记录一次具体情境、自己的动作和结果，再判断是否重复。' : `你选择的方向是“${d.name}”。本次材料可作为一次观察；是否存在重复模式，需要与以后几周对照。`,
    blindSpot: '你是否只记录了困难的时刻？补充一次做得比较顺的例外，以及当时的环境和支持。',
    counterfactual: `如果再次遇到“${(input.events || input.goal).slice(0, 90)}”，提前把第一步缩小到两分钟，结果可能有什么不同？这是待验证的问题。`,
    experiment: d.action }
}
export function saveReview(review: WeeklyReview) {
  const entries = loadState<JournalEntry[]>('journal', [])
  const journal: JournalEntry = { id: `growth-${review.id}`, timestamp: review.createdAt, trigger: `每周成长复盘 · ${review.input.week}`, oldPattern: review.input.events, newResponse: review.report.experiment, somatic: review.input.body, distortion: '', source: 'manual', organizedText: `${review.report.response}\n模式线索：${review.report.pattern}\n盲点提问：${review.report.blindSpot}\n反事实：${review.report.counterfactual}\n下周实验：${review.report.experiment}`, rawFragment: JSON.stringify(review.input), analysis: review.report.engine === 'deepseek' ? 'DeepSeek 辅助复盘；结论为待验证假设。' : '本机结构化整理；尚未调用云端 AI。' }
  const ok = saveStateBatch({ growthReviews: [review, ...loadState<WeeklyReview[]>('growthReviews', []).filter(x => x.id !== review.id)], journal: [journal, ...entries.filter(x => x.id !== journal.id)] })
  if (ok) window.dispatchEvent(new CustomEvent('hos:data-updated'))
  return ok
}
export function validateEvidence(row: Partial<DailyEvidence>): string | null {
  if (!row.date || !validDay(row.date) || row.date > dayKey()) return '日期须为不晚于今天的 YYYY-MM-DD。'
  const ranges: Record<string, number> = { sleepHours: 24, exerciseMinutes: 1440, steps: 150000, deepWorkMinutes: 1440, recoveryMinutes: 10080, errorOpportunities: 1000, repeatedErrors: 1000 }
  for (const [key, max] of Object.entries(ranges)) { const n = row[key as keyof DailyEvidence]; if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max)) return `${key} 超出可接受范围（0–${max}）。` }
  for (const key of ['steps','errorOpportunities','repeatedErrors'] as const) if (row[key] !== undefined && !Number.isInteger(row[key])) return '步数和情境次数须为整数。'
  if (row.repeatedErrors !== undefined && (row.errorOpportunities === undefined || row.repeatedErrors > row.errorOpportunities)) return '重复错误次数不能超过同类情境次数，且需同时填写两项。'
  if (!Object.keys(ranges).some(k => row[k as keyof DailyEvidence] !== undefined) && !row.note?.trim()) return '至少记录一项数据或一句观察。'
  return null
}
export function parseHealthCSV(csv: string): DailyEvidence[] {
  const rows = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => line.split(',').map(x => x.trim()))
  const headers = rows.shift() || []
  const allowed = ['date', 'source', 'sleepHours', 'exerciseMinutes', 'steps', 'deepWorkMinutes', 'recoveryMinutes', 'errorOpportunities', 'repeatedErrors', 'note']
  if (!headers.includes('date') || headers.some(h => !allowed.includes(h))) throw new Error('请使用下载的 CSV 模板，表头名称必须保持一致。')
  if (!rows.length || rows.length > 366) throw new Error('一次请导入 1–366 行。')
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`第 ${index + 2} 行列数不一致；备注内请不要使用英文逗号。`)
    const row: Record<string, unknown> = { id: '', source: '文件导入', note: '' }
    headers.forEach((key, i) => { if (cells[i] !== '') row[key] = ['date', 'source', 'note'].includes(key) ? cells[i].slice(0, 500) : Number(cells[i]) })
    const error = validateEvidence(row as Partial<DailyEvidence>); if (error) throw new Error(`第 ${index + 2} 行：${error}`)
    row.id = `import-${row.date}-${row.source}`
    return row as DailyEvidence
  })
}
export function mergeEvidence(current: DailyEvidence[], incoming: DailyEvidence[]) {
  // Reimport is idempotent; one daily aggregate per source avoids double counting.
  const map = new Map(current.map(x => [`${x.date}|${x.source}`, x]))
  for (const x of incoming) { const key = `${x.date}|${x.source}`; map.delete(key); map.set(key, x) }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}
export function experimentRate(experiments: Experiment[], start: string, end: string) {
  const items = experiments.filter(x => x.end >= start && x.end <= end && x.status !== 'stopped')
  const target = items.reduce((n, x) => n + x.target, 0)
  const done = items.reduce((n, x) => n + Math.min(x.target, new Set(x.checkIns.filter(c => c.date >= x.start && c.date <= x.end).map(c => c.date)).size), 0)
  return { value: target ? Math.round(done / target * 100) : null, numerator: done, denominator: target }
}
export function metricsBetween(start: string, end: string) {
  const all = loadState<DailyEvidence[]>('growthEvidence', []).filter(x => x.date >= start && x.date <= end)
  // When sources overlap, prefer the explicit manual correction, otherwise latest saved source.
  const byDay = new Map<string, DailyEvidence>()
  for (const row of [...all].sort((a,b) => Number(a.source === '手动记录') - Number(b.source === '手动记录'))) byDay.set(row.date, { ...byDay.get(row.date), ...Object.fromEntries(Object.entries(row).filter(([,v]) => v !== undefined)) } as DailyEvidence)
  const rows = [...byDay.values()]
  const recovery = rows.filter(x => x.recoveryMinutes !== undefined)
  const errors = rows.filter(x => x.errorOpportunities !== undefined && x.repeatedErrors !== undefined)
  const opportunities = errors.reduce((n,x) => n + x.errorOpportunities!, 0)
  const errorCount = errors.reduce((n,x) => n + x.repeatedErrors!, 0)
  const flows = loadState<FlowSession[]>('flowSessions', []).filter(x => dayKey(new Date(x.timestamp)) >= start && dayKey(new Date(x.timestamp)) <= end && typeof x.actualSeconds === 'number')
  const flowByDay = new Map<string, number>()
  for (const f of flows) { const d=dayKey(new Date(f.timestamp));flowByDay.set(d,(flowByDay.get(d)||0) + Math.max(0,f.actualSeconds!)/60) }
  for (const row of rows) if (row.deepWorkMinutes !== undefined) flowByDay.set(row.date, row.deepWorkMinutes)
  return { completion: experimentRate(loadState<Experiment[]>('growthExperiments', []), start, end), errors: opportunities ? Math.round(errorCount / opportunities * 100) : null, errorCount, opportunities, recovery: recovery.length ? Math.round(recovery.reduce((n,x) => n+x.recoveryMinutes!,0)/recovery.length) : null, recoverySamples: recovery.length, focus: flowByDay.size ? Math.round([...flowByDay.values()].reduce((n,x)=>n+x,0)/6)/10 : null, days: new Set([...rows.map(x=>x.date),...flowByDay.keys()]).size }
}
export function checkExperiment(experiment: Experiment, note: string, today = dayKey()) {
  if (experiment.status !== 'active' || today < experiment.start || today > experiment.end) return experiment
  return { ...experiment, checkIns: [...experiment.checkIns.filter(x => x.date !== today), { date: today, note: note.slice(0, 500) }] }
}
export function saveExperiments(items: Experiment[]) {
  const journals = loadState<JournalEntry[]>('journal', []).filter(x => !x.id.startsWith('growth-experiment-'))
  const entries: JournalEntry[] = items.filter(x => x.checkIns.length || x.result).map(x => ({ id: `growth-experiment-${x.id}`, timestamp: new Date(`${x.start}T12:00:00`).getTime(), trigger: `成长实验 · ${x.action}`, oldPattern: x.baseline, newResponse: x.action, somatic: '', distortion: '', source: 'manual', organizedText: `生活锚点：${x.anchor}。成功标准：${x.expected}。已记录 ${x.checkIns.length}/${x.target} 次。\n${x.checkIns.map(c=>`${c.date}：${c.note || '已完成'}`).join('\n')}\n实验结果：${x.result || '等待复盘'}`, rawFragment: x.result }))
  const ok = saveStateBatch({ growthExperiments: items, journal: [...entries,...journals].sort((a,b)=>b.timestamp-a.timestamp) })
  if(ok) window.dispatchEvent(new CustomEvent('hos:data-updated'))
  return ok
}
export function reminderDue(s: ReminderSettings, now = Date.now()) { const hour = new Date(now).getHours(); return s.enabled && hour >= s.startHour && hour < s.endHour && now - s.lastAt >= s.interval * 60000 }
export function calendarReminder(day: string, time: string) {
  if (!validDay(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('请选择有效日期和时间')
  const date = new Date(`${day}T${time}:00`); const stamp = (d: Date) => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HOS//Weekly Growth//ZH','BEGIN:VEVENT',`UID:hos-review-${day}-${time.replace(':','')}@hos.local`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(date)}`,`DTEND:${stamp(new Date(date.getTime()+15*60000))}`,'RRULE:FREQ=WEEKLY;COUNT=13','SUMMARY:HOS 每周成长复盘','DESCRIPTION:回顾一周经历，选择一个下周实验。打开 HOS 的成长复盘入口。','BEGIN:VALARM','TRIGGER:-PT5M','ACTION:DISPLAY','DESCRIPTION:给成长留十五分钟','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')
}
