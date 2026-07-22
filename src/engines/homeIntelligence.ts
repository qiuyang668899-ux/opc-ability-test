import {
  loadState,
  type DailyCheckIn,
  type FlowSession,
  type JournalEntry,
} from '../stores/useStore'
import { buildEvolutionSnapshot } from './evolutionEngine'
import { getTodayRitualRecord, loadRitualProfile } from './ritualEngine'
import type { VoiceJournalRecord, VoiceMemory } from './voiceJournalEngine'

export type SmartActionId = 'initialize' | 'align' | 'stabilize' | 'restore' | 'clarify' | 'focus' | 'close-day' | 'evolve'

export interface SmartAction {
  id: SmartActionId
  eyebrow: string
  title: string
  description: string
  route: string
  cta: string
  reason: string
  duration: string
}

export interface HomeSignal {
  label: string
  value: string
  level: 'calm' | 'attention' | 'neutral'
}

export interface HomeIntelligence {
  greeting: string
  moment: string
  primary: SmartAction
  alternatives: SmartAction[]
  signals: HomeSignal[]
  integration: number
  practiceDays: number
  learnedSignals: number
  isCheckedIn: boolean
  checkIn?: DailyCheckIn
  intention?: string
  insight: string
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function getTimeContext(hour: number) {
  if (hour < 5) return { greeting: '夜深了', moment: '先让系统安静下来' }
  if (hour < 11) return { greeting: '早上好', moment: '先决定今天的内在方向' }
  if (hour < 14) return { greeting: '中午好', moment: '让能量回到最重要的事' }
  if (hour < 19) return { greeting: '下午好', moment: '只保留一个清晰的下一步' }
  if (hour < 22) return { greeting: '晚上好', moment: '收拢今天，也为明天留出空间' }
  return { greeting: '该休息了', moment: '不再增加输入，允许系统恢复' }
}

function action(id: SmartActionId, values: Omit<SmartAction, 'id'>): SmartAction {
  return { id, ...values }
}

const ACTIONS: Record<SmartActionId, SmartAction> = {
  initialize: action('initialize', {
    eyebrow: '初始化你的 HOS',
    title: '先选择，你想成为怎样的人',
    description: '用一个字建立你的内在方向，系统才能开始理解你。',
    route: '/ritual', cta: '开始初始化', reason: '尚未建立成长方向', duration: '1 分钟',
  }),
  align: action('align', {
    eyebrow: '今日校准',
    title: '先回到自己，再开始今天',
    description: '呼吸、真实音景、一个关键词和一个微小行动。',
    route: '/ritual', cta: '开始今日校准', reason: '今日还未完成状态对齐', duration: '3 分钟',
  }),
  stabilize: action('stabilize', {
    eyebrow: '优先级：稳态',
    title: '暂时不解决问题，先降低系统负荷',
    description: '压力较高时，继续分析通常只会增加噪音。先让呼气变长。',
    route: '/reset/pressure', cta: '进入快速稳态', reason: '今日压力信号偏高', duration: '3 分钟',
  }),
  restore: action('restore', {
    eyebrow: '优先级：恢复',
    title: '今天的进步，从停止透支开始',
    description: '减少输入，选择一段自然音景，让身体重新获得可用资源。',
    route: '/music?intent=restore', cta: '开始恢复', reason: '今日能量信号偏低', duration: '8 分钟',
  }),
  clarify: action('clarify', {
    eyebrow: '优先级：清晰',
    title: '不需要更多答案，只需要一个下一步',
    description: '把脑中的事说出来，让教练帮你收束成一个可见动作。',
    route: '/architect', cta: '帮我收束问题', reason: '今日清晰度信号偏低', duration: '5 分钟',
  }),
  focus: action('focus', {
    eyebrow: '优先级：行动',
    title: '状态已经可用，现在只完成一个小闭环',
    description: '关掉多余输入，为最重要的事保留一段不被打断的时间。',
    route: '/flow', cta: '开始一轮专注', reason: '当前状态适合进入行动', duration: '25 分钟',
  }),
  'close-day': action('close-day', {
    eyebrow: '优先级：收拢',
    title: '把今天安放好，不把未完成带进睡眠',
    description: '留下一句有效经验，写明明天第一步，然后允许系统关闭。',
    route: '/journal', cta: '完成今日收拢', reason: '已进入晚间恢复时段', duration: '5 分钟',
  }),
  evolve: action('evolve', {
    eyebrow: '今日进化路径',
    title: '从当前最薄弱的一维开始训练',
    description: '系统已经结合你的状态、行动和复盘，生成今天的三步路径。',
    route: '/evolution', cta: '查看今日路径', reason: '基于五维整合数据', duration: '10—25 分钟',
  }),
}

function uniqueActions(actions: SmartAction[]) {
  return actions.filter((item, index) => actions.findIndex((candidate) => candidate.id === item.id) === index)
}

export function buildHomeIntelligence(now = new Date()): HomeIntelligence {
  const context = getTimeContext(now.getHours())
  const date = todayKey()
  const storedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const checkIn = storedCheckIn?.date === date ? storedCheckIn : undefined
  const profile = loadRitualProfile()
  const ritual = getTodayRitualRecord()
  const evolution = buildEvolutionSnapshot()
  const journal = loadState<JournalEntry[]>('journal', [])
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const voiceJournal = loadState<VoiceJournalRecord[]>('voiceJournal', [])
  const voiceMemory = loadState<VoiceMemory | undefined>('voiceMemory', undefined)

  let primary = ACTIONS.focus
  if ((checkIn?.pressure ?? 0) >= 4) primary = ACTIONS.stabilize
  else if ((checkIn?.energy ?? 3) <= 2) primary = ACTIONS.restore
  else if ((checkIn?.clarity ?? 3) <= 2) primary = ACTIONS.clarify
  else if (!profile) primary = ACTIONS.initialize
  else if (!ritual) primary = ACTIONS.align
  else if (now.getHours() >= 21) primary = ACTIONS['close-day']

  const alternatives = uniqueActions([
    !profile ? ACTIONS.initialize : !ritual ? ACTIONS.align : ACTIONS.evolve,
    primary.id === 'align' ? ACTIONS.clarify : ACTIONS.align,
    primary.id === 'focus' ? ACTIONS.evolve : ACTIONS.focus,
    now.getHours() >= 19 ? ACTIONS['close-day'] : ACTIONS.restore,
  ]).filter((item) => item.id !== primary.id)

  const signals: HomeSignal[] = [
    { label: '能量', value: checkIn ? `${checkIn.energy}/5` : '待记录', level: checkIn && checkIn.energy <= 2 ? 'attention' : checkIn ? 'calm' : 'neutral' },
    { label: '清晰', value: checkIn ? `${checkIn.clarity}/5` : '待记录', level: checkIn && checkIn.clarity <= 2 ? 'attention' : checkIn ? 'calm' : 'neutral' },
    { label: '压力', value: checkIn ? `${checkIn.pressure}/5` : '待记录', level: checkIn && checkIn.pressure >= 4 ? 'attention' : checkIn ? 'calm' : 'neutral' },
  ]

  const learnedSignals = [Boolean(profile), Boolean(ritual), Boolean(checkIn), journal.length > 0, flow.length > 0, evolution.practiceDays > 0, (voiceMemory?.voiceCount ?? 0) > 0].filter(Boolean).length
  const insight = checkIn?.intention
    ? checkIn.source === 'voice' && voiceJournal[0]
      ? `今天从你的声音里听见「${voiceJournal[0].analysis.stateLabel}」，可随时校准。`
      : `今天最想守住：${checkIn.intention}`
    : ritual
      ? `今日关键词「${ritual.keyword}」，行动是「${ritual.microAction}」`
      : '每多完成一次真实记录，推荐就会更贴近你。'

  return {
    ...context,
    primary,
    alternatives,
    signals,
    integration: evolution.integration,
    practiceDays: evolution.practiceDays,
    learnedSignals,
    isCheckedIn: Boolean(checkIn),
    checkIn,
    intention: checkIn?.intention,
    insight,
  }
}
