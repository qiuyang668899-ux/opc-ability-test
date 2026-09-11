import { loadState } from '../stores/useStore'

export interface PracticeOutcome {
  id: string
  title: string
  route: string
  completedAt: number
  seconds: number
  before: number | null
  after: number | null
  note: string
}
export function appendPracticeOutcome(outcome: PracticeOutcome) {
  return [outcome, ...loadState<PracticeOutcome[]>('practiceOutcomes', []).filter((item) => item.id !== outcome.id)].slice(0, 365)
}
export function practiceLearning() {
  const records = loadState<PracticeOutcome[]>('practiceOutcomes', [])
  const rated = records.filter((item) => item.before !== null && item.after !== null)
  const groups = new Map<string, { title: string; route: string; count: number; delta: number }>()
  for (const item of rated) {
    const group = groups.get(item.title) ?? { title: item.title, route: item.route, count: 0, delta: 0 }
    group.count += 1
    group.delta += item.after! - item.before!
    groups.set(item.title, group)
  }
  const best = [...groups.values()].filter((item) => item.count >= 3 && item.delta > 0).sort((a, b) => b.delta / b.count - a.delta / a.count)[0]
  return { records, rated, best, minutes: Math.floor(records.reduce((sum, item) => sum + item.seconds, 0) / 60) }
}
