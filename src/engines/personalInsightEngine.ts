import { loadState, type DailyCheckIn } from '../stores/useStore'
import type { VoiceJournalRecord, VoiceMemory } from './voiceJournalEngine'

export interface TrajectoryDay {
  key: string
  label: string
  energy?: number
  clarity?: number
  pressure?: number
  count: number
}

export interface PersonalTrajectory {
  days: TrajectoryDay[]
  samples: number
  averages: { energy: number; clarity: number; pressure: number }
  headline: string
  observation: string
  nextQuestion: string
}

function dateKey(value: Date) {
  return value.toLocaleDateString('en-CA')
}

function shortLabel(value: Date) {
  return value.toLocaleDateString('zh-CN', { weekday: 'short' }).replace('星期', '周')
}

function average(values: number[]) {
  if (!values.length) return 0
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

export function buildPersonalTrajectory(records: VoiceJournalRecord[], memory?: VoiceMemory): PersonalTrajectory {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const value = new Date()
    value.setHours(12, 0, 0, 0)
    value.setDate(value.getDate() - (6 - index))
    return value
  })
  const grouped = new Map<string, VoiceJournalRecord[]>()
  records.forEach((record) => {
    const bucket = grouped.get(record.date) ?? []
    bucket.push(record)
    grouped.set(record.date, bucket)
  })

  const storedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const days = dates.map<TrajectoryDay>((date) => {
    const key = dateKey(date)
    const entries = grouped.get(key) ?? []
    if (entries.length) {
      return {
        key,
        label: shortLabel(date),
        energy: average(entries.map((entry) => entry.analysis.energy)),
        clarity: average(entries.map((entry) => entry.analysis.clarity)),
        pressure: average(entries.map((entry) => entry.analysis.pressure)),
        count: entries.length,
      }
    }
    if (storedCheckIn?.date === key) {
      return {
        key,
        label: shortLabel(date),
        energy: storedCheckIn.energy,
        clarity: storedCheckIn.clarity,
        pressure: storedCheckIn.pressure,
        count: 1,
      }
    }
    return { key, label: shortLabel(date), count: 0 }
  })
  const observed = days.filter((day) => day.count > 0)
  const samples = observed.reduce((sum, day) => sum + day.count, 0)
  const averages = {
    energy: average(observed.flatMap((day) => day.energy ?? [])),
    clarity: average(observed.flatMap((day) => day.clarity ?? [])),
    pressure: average(observed.flatMap((day) => day.pressure ?? [])),
  }
  const topic = memory?.recurringTopics[0]?.label
  const state = memory?.recentStates[0]

  if (!samples) {
    return {
      days,
      samples,
      averages,
      headline: '轨迹会从第一次真实表达开始',
      observation: '这里不会用空泛分数定义你，只会整理你亲自留下的状态变化。',
      nextQuestion: '此刻的能量、清晰和压力，分别像几分？',
    }
  }

  const mostImportant = averages.pressure >= 3.7
    ? '近期优先降低压力负荷'
    : averages.energy > 0 && averages.energy <= 2.4
      ? '近期优先修复可用能量'
      : averages.clarity > 0 && averages.clarity <= 2.4
        ? '近期优先减少信息与选择'
        : '近期状态具备行动基础'
  const observation = [
    state ? `最近一次更接近「${state}」` : '',
    topic ? `持续出现的关注是「${topic}」` : '',
    `近 7 天留下 ${samples} 次可用状态样本`,
  ].filter(Boolean).join('；')

  return {
    days,
    samples,
    averages,
    headline: mostImportant,
    observation: `${observation}。这些是自我觉察线索，不是医学或心理诊断。`,
    nextQuestion: averages.pressure >= 3.7 ? '今天能删掉哪一项非必要负荷？' : '今天哪一个最小行动值得被完成？',
  }
}
