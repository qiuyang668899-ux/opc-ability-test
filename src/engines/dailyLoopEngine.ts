import { getTodayRitualRecord } from './ritualEngine'
import { loadActiveRegulationJourney, type RegulationJourney } from './stateOrchestrator'
import {
  loadState,
  type DailyCheckIn,
  type FlowSession,
  type JournalEntry,
} from '../stores/useStore'
import type { VoiceJournalRecord } from './voiceJournalEngine'

type StepState = 'complete' | 'current' | 'upcoming'

export type DailyLoopAction =
  | { kind: 'voice'; context: string }
  | { kind: 'route'; route: string }

export interface DailyLoopStep {
  id: 'sense' | 'regulate' | 'reflect'
  label: string
  title: string
  detail: string
  state: StepState
}

export interface DailyLoopSnapshot {
  progress: number
  headline: string
  summary: string
  cta: string
  action: DailyLoopAction
  steps: DailyLoopStep[]
  activeJourney?: RegulationJourney
  completedToday: number
}

type CoachFeedback = { date: string; result: 'helpful' | 'tiny'; createdAt: number }

function todayKey(value = new Date()) {
  return value.toLocaleDateString('en-CA')
}

function isToday(timestamp: number, today: string) {
  return todayKey(new Date(timestamp)) === today
}

function choosePractice(checkIn?: DailyCheckIn) {
  if ((checkIn?.pressure ?? 0) >= 4) {
    return { route: '/reset/pressure', title: '先把系统降速', detail: '高压时先延长呼气，再处理问题。', cta: '开始 3 分钟稳态' }
  }
  if ((checkIn?.energy ?? 3) <= 2) {
    return { route: '/music?intent=restore', title: '先补回一点能量', detail: '减少输入，用低刺激音景帮助恢复。', cta: '进入恢复音景' }
  }
  if ((checkIn?.clarity ?? 3) <= 2) {
    return { route: '/architect', title: '把问题收束到一层', detail: '不用解决全部，只找到唯一下一步。', cta: '让教练帮我收束' }
  }
  return { route: '/flow', title: '完成一个最小行动', detail: '状态可用，用一次短行动获得真实反馈。', cta: '开始最小行动' }
}

export function buildDailyLoop(): DailyLoopSnapshot {
  const today = todayKey()
  const storedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const checkIn = storedCheckIn?.date === today ? storedCheckIn : undefined
  const voice = loadState<VoiceJournalRecord[]>('voiceJournal', [])
  const hasVoiceToday = voice.some((record) => record.date === today)
  const journeyHistory = loadState<RegulationJourney[]>('regulationJourneyHistory', [])
  const hasJourneyToday = journeyHistory.some((journey) => isToday(journey.createdAt, today))
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const flowToday = flow.find((session) => isToday(session.timestamp, today))
  const ritual = getTodayRitualRecord()
  const feedback = loadState<CoachFeedback[]>('coachFeedback', [])
  const journal = loadState<JournalEntry[]>('journal', [])
  const hasManualReflection = journal.some((entry) => isToday(entry.timestamp, today) && entry.source !== 'voice')
  const hasFeedback = feedback.some((entry) => entry.date === today)
    || Boolean(flowToday?.feedback.trim())
    || hasManualReflection
  const activeJourney = loadActiveRegulationJourney()

  const sensed = Boolean(checkIn || hasVoiceToday)
  const practiced = Boolean(hasJourneyToday || flowToday || ritual)
  const reflected = Boolean(hasFeedback && practiced)
  const completedToday = [sensed, practiced, reflected].filter(Boolean).length
  const practice = choosePractice(checkIn)

  const steps: DailyLoopStep[] = [
    {
      id: 'sense', label: '01 · 感知', title: sensed ? '已经听见此刻状态' : '说出此刻真实状态',
      detail: sensed ? '今日状态已经进入个人档案。' : '不必组织语言，30 秒也可以。',
      state: sensed ? 'complete' : 'current',
    },
    {
      id: 'regulate', label: '02 · 调试', title: practiced ? '已经完成一次实践' : activeJourney ? activeJourney.steps[activeJourney.currentStep]?.title ?? practice.title : practice.title,
      detail: practiced ? '身体和行动都获得了一次真实反馈。' : activeJourney ? `继续第 ${activeJourney.currentStep + 1}/${activeJourney.steps.length} 步，不必重新开始。` : practice.detail,
      state: practiced ? 'complete' : sensed ? 'current' : 'upcoming',
    },
    {
      id: 'reflect', label: '03 · 回写', title: reflected ? '经验已经写回系统' : '留下结果，让下次更准',
      detail: reflected ? '今天的闭环已完成，明天会沿着有效节奏继续。' : '只说一句：做完后，我现在……',
      state: reflected ? 'complete' : practiced ? 'current' : 'upcoming',
    },
  ]

  if (!sensed) {
    return {
      progress: 0,
      headline: '先让系统真正听见你',
      summary: '一次真实表达，比填写更多表格更能生成贴近此刻的路径。',
      cta: '说说我现在的状态',
      action: { kind: 'voice', context: '今日闭环 · 此刻状态' },
      steps,
      completedToday,
    }
  }

  if (activeJourney && !practiced) {
    const current = activeJourney.steps[activeJourney.currentStep]
    return {
      progress: 34,
      headline: '继续刚才的调试，不必重来',
      summary: current?.reason ?? activeJourney.rationale,
      cta: current?.action ?? '继续当前调试',
      action: { kind: 'route', route: current?.route ?? '/architect' },
      steps,
      activeJourney,
      completedToday,
    }
  }

  if (!practiced) {
    return {
      progress: 34,
      headline: practice.title,
      summary: practice.detail,
      cta: practice.cta,
      action: { kind: 'route', route: practice.route },
      steps,
      completedToday,
    }
  }

  if (!reflected) {
    return {
      progress: 67,
      headline: '把变化留下来，系统才会学习',
      summary: '不用写总结，只说做完后哪里更松、哪里还卡，下一轮就会更贴近你。',
      cta: '用一句话回写结果',
      action: { kind: 'voice', context: '今日闭环 · 实践后的反馈' },
      steps,
      completedToday,
    }
  }

  return {
    progress: 100,
    headline: '今天已经完成一个成长闭环',
    summary: '状态被听见、行动被完成、经验也已留下。到这里就足够了。',
    cta: '查看我的进化轨迹',
    action: { kind: 'route', route: '/evolution' },
    steps,
    completedToday,
  }
}
