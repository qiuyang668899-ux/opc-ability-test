import {
  defaultActivationProgress,
  getActivationCompletion,
  loadState,
  type ActivationProgress,
  type DailyCheckIn,
  type FlowSession,
  type JournalEntry,
} from '../stores/useStore'

export type EvolutionDimensionId = 'body' | 'emotion' | 'clarity' | 'action' | 'meaning'

export interface EvolutionProfile {
  direction: string
  reason: string
  startedAt: number
  updatedAt: number
}

export interface EvolutionProgress {
  completedStepIds: string[]
  completedDates: string[]
}

export interface EvolutionFeedback {
  date: string
  difficulty: 'hard' | 'right' | 'easy'
  createdAt: number
}

export interface EvolutionDimension {
  id: EvolutionDimensionId
  label: string
  en: string
  score: number
  observation: string
}

export interface EvolutionStep {
  id: string
  phase: '调节' | '行动' | '复盘'
  duration: string
  title: string
  description: string
  route: string
  action: string
  tinyVersion: string
}

export interface EvolutionStage {
  index: number
  days: string
  title: string
  subtitle: string
  description: string
  active: boolean
  complete: boolean
}

export interface EvolutionSnapshot {
  date: string
  day: number
  integration: number
  focusId: EvolutionDimensionId
  focusLabel: string
  headline: string
  explanation: string
  dimensions: EvolutionDimension[]
  steps: EvolutionStep[]
  stages: EvolutionStage[]
  completedToday: number
  practiceDays: number
  hasCheckIn: boolean
  evidenceLine: string
  abilityMode: 'tiny' | 'standard'
  abilityMessage: string
}

type ClassicPracticeNote = { passageId: string; text: string; createdAt: number }

const DAY_MS = 86_400_000

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function isRecent(timestamp: number, days = 7) {
  return timestamp >= Date.now() - days * DAY_MS
}

function defaultProfile(): EvolutionProfile {
  const now = Date.now()
  return { direction: '', reason: '', startedAt: now, updatedAt: now }
}

export function loadEvolutionProfile() {
  return loadState<EvolutionProfile>('evolutionProfile', defaultProfile())
}

export function loadEvolutionProgress() {
  return loadState<EvolutionProgress>('evolutionProgress', { completedStepIds: [], completedDates: [] })
}

function buildDimensions({
  checkIn,
  activation,
  journal,
  flow,
  classicNotes,
  profile,
}: {
  checkIn?: DailyCheckIn
  activation: ActivationProgress
  journal: JournalEntry[]
  flow: FlowSession[]
  classicNotes: ClassicPracticeNote[]
  profile: EvolutionProfile
}): EvolutionDimension[] {
  const energy = checkIn?.energy ?? 3
  const clarity = checkIn?.clarity ?? 3
  const pressure = checkIn?.pressure ?? 3
  const recentJournal = journal.filter((entry) => isRecent(entry.timestamp)).length
  const recentFlow = flow.filter((entry) => isRecent(entry.timestamp)).length
  const recentClassic = classicNotes.filter((entry) => isRecent(entry.createdAt)).length
  const activationCompletion = getActivationCompletion(activation)

  return [
    {
      id: 'body',
      label: '身体',
      en: 'Body',
      score: clamp(energy * 17 + recentFlow * 2),
      observation: energy <= 2 ? '能量偏低，先恢复再推进' : energy >= 4 ? '能量可用，适合稳步行动' : '能量平稳，注意节奏与间歇',
    },
    {
      id: 'emotion',
      label: '情绪',
      en: 'Emotion',
      score: clamp((6 - pressure) * 17 + recentJournal * 2),
      observation: pressure >= 4 ? '压力信号较强，先降低唤醒' : pressure <= 2 ? '内在空间较充足' : '压力适中，保持觉察即可',
    },
    {
      id: 'clarity',
      label: '认知',
      en: 'Clarity',
      score: clamp(clarity * 17 + recentJournal + recentFlow * 2),
      observation: clarity <= 2 ? '信息尚未收束，需要明确下一步' : clarity >= 4 ? '思路清楚，适合处理关键问题' : '清晰度可用，避免同时推进太多',
    },
    {
      id: 'action',
      label: '行动',
      en: 'Action',
      score: clamp(28 + activationCompletion * 0.5 + recentFlow * 8),
      observation: recentFlow > 0 ? '近期已有行动闭环' : '从一个 10 分钟动作开始',
    },
    {
      id: 'meaning',
      label: '意义',
      en: 'Meaning',
      score: clamp(28 + (profile.direction.trim() ? 28 : 0) + recentClassic * 8 + recentJournal * 2),
      observation: profile.direction.trim() ? '方向已建立，需要每日对齐' : '尚未写下阶段方向，容易只顾眼前',
    },
  ]
}

function pathForFocus(focus: EvolutionDimensionId, checkIn?: DailyCheckIn) {
  if ((checkIn?.pressure ?? 0) >= 4 || focus === 'emotion') {
    return {
      headline: '先稳住系统，再处理事情',
      explanation: '今日压力信号优先级最高。先降低身体唤醒，再完成一个最小动作，最后把经验写下来。',
      steps: [
        ['调节', '3 分钟', '呼吸降载', '延长呼气，让身体从高唤醒回到可调节区间。', '/reset/pressure', '开始呼吸', '只做 1 次缓慢呼气'],
        ['行动', '10 分钟', '只做最小下一步', '不要解决全部问题，只完成能让事情向前移动的一小步。', '/architect', '收束下一步', '只写下下一步的 3 个字'],
        ['复盘', '5 分钟', '识别压力脚本', '记录触发、自动反应与下次更好的选择。', '/journal', '写入日志', '只写一句：我现在感觉……'],
      ],
    }
  }

  if ((checkIn?.energy ?? 3) <= 2 || focus === 'body') {
    return {
      headline: '恢复不是暂停，而是系统维护',
      explanation: '今天的收益来自节律而非硬撑。先补充感官与身体资源，再选择低阻力行动。',
      steps: [
        ['调节', '8 分钟', '进入恢复音景', '选择雨声、森林或舒缓纯音乐，让注意力从任务中松开。', '/music', '选择音景', '只播放 30 秒喜欢的声音'],
        ['行动', '10 分钟', '按节律安排今天', '查看当前生物节律，只保留一件与能量匹配的任务。', '/biosync', '查看节律', '只删掉一件非必要任务'],
        ['复盘', '3 分钟', '记录身体反馈', '写下什么正在消耗你，以及今晚要减少什么。', '/journal', '记录反馈', '只写下一个身体感受'],
      ],
    }
  }

  if ((checkIn?.clarity ?? 3) <= 2 || focus === 'clarity') {
    return {
      headline: '把复杂世界收束成一个动作',
      explanation: '当前不是需要更多信息，而是需要一个清晰边界。先看见状态，再收束，再实践。',
      steps: [
        ['调节', '2 分钟', '看见此刻状态', '通过自我观察确认紧张、疲惫或分心，不急着评价。', '/visual', '开始觉察', '只命名此刻最明显的感受'],
        ['行动', '8 分钟', '让 AI 帮你收束', '把脑中的事情说出来，只保留一个可见动作。', '/architect', '开始梳理', '只输入：我最卡的是……'],
        ['复盘', '15 分钟', '完成一轮心流闭环', '把动作拆小、执行，并留下一个即时反馈。', '/flow', '进入心流', '只打开要处理的文件'],
      ],
    }
  }

  if (focus === 'meaning') {
    return {
      headline: '先校准方向，再安排速度',
      explanation: '意义感不足时，忙碌容易变成消耗。用经典与自问回到价值，再选择今天的行动。',
      steps: [
        ['调节', '8 分钟', '读一段经典', '从儒释道经典中取一个可实践的提醒，安住当下。', '/classics', '进入修习', '只读一句原文'],
        ['行动', '10 分钟', '对齐阶段方向', '把今天的一件事与长期方向连接，删掉无关动作。', '/activation', '选择行动', '只圈出今天一件重要的事'],
        ['复盘', '5 分钟', '写下今日所得', '记录今天什么值得继续，以及明天最重要的一步。', '/journal', '写下所得', '只写下一个关键词'],
      ],
    }
  }

  return {
    headline: '用一个闭环，把潜力变成能力',
    explanation: '状态已经具备行动条件。今天不追求更多任务，只完成一次专注、反馈与复盘。',
    steps: [
      ['调节', '3 分钟', '收束注意力', '关闭额外输入，用三轮呼吸确认今天唯一目标。', '/reset/focus', '开始收束', '只做 1 次呼吸并关掉一个通知'],
      ['行动', '25 分钟', '完成心流闭环', '拆解、预演、练习，在结束时保留一个反馈。', '/flow', '进入心流', '只打开任务并做 2 分钟'],
      ['复盘', '5 分钟', '固化有效策略', '把有效方法写成下次可以直接调用的个人协议。', '/journal', '固化经验', '只写一句有效做法'],
    ],
  }
}

export function buildEvolutionSnapshot(
  profile = loadEvolutionProfile(),
  progress = loadEvolutionProgress(),
): EvolutionSnapshot {
  const date = todayKey()
  const storedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const checkIn = storedCheckIn?.date === date ? storedCheckIn : undefined
  const activation = loadState<ActivationProgress>('activation', defaultActivationProgress)
  const journal = loadState<JournalEntry[]>('journal', [])
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const classicNotes = loadState<ClassicPracticeNote[]>('classicPracticeNotes', [])
  const feedback = loadState<EvolutionFeedback[]>('evolutionFeedback', [])
  const latestFeedback = feedback[0]
  const abilityMode = latestFeedback?.difficulty === 'hard' ? 'tiny' : 'standard'
  const dimensions = buildDimensions({ checkIn, activation, journal, flow, classicNotes, profile })
  const focus = [...dimensions].sort((left, right) => left.score - right.score)[0]
  const path = pathForFocus(focus.id, checkIn)
  const steps: EvolutionStep[] = path.steps.map((step, index) => ({
    id: `${date}-${focus.id}-${index + 1}`,
    phase: step[0] as EvolutionStep['phase'],
    duration: abilityMode === 'tiny' ? '保底版' : step[1],
    title: step[2],
    description: abilityMode === 'tiny' ? step[6] : step[3],
    route: step[4],
    action: step[5],
    tinyVersion: step[6],
  }))
  const day = clamp(Math.floor((Date.now() - profile.startedAt) / DAY_MS) + 1, 1, 21)
  const activeStage = day <= 7 ? 1 : day <= 14 ? 2 : 3
  const completedToday = steps.filter((step) => progress.completedStepIds.includes(step.id)).length

  const stages = [
    { index: 1, days: 'DAY 01—07', title: '稳态', subtitle: '觉察与恢复', description: '看见身体、情绪与注意力信号，建立随时可用的调节方法。' },
    { index: 2, days: 'DAY 08—14', title: '重塑', subtitle: '模式与行动', description: '识别自动脚本，把关键行为压缩成可重复的小闭环。' },
    { index: 3, days: 'DAY 15—21', title: '整合', subtitle: '意义与进化', description: '连接价值、行动与反馈，沉淀属于自己的个人协议。' },
  ].map((stage) => ({ ...stage, active: stage.index === activeStage, complete: stage.index < activeStage }))

  return {
    date,
    day,
    integration: clamp(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
    focusId: focus.id,
    focusLabel: focus.label,
    headline: path.headline,
    explanation: path.explanation,
    dimensions,
    steps,
    stages,
    completedToday,
    practiceDays: new Set(progress.completedDates).size,
    hasCheckIn: Boolean(checkIn),
    evidenceLine: `依据：今日自检${checkIn ? '已完成' : '未完成'} · 7日启动 ${getActivationCompletion(activation)}% · 日志 ${journal.length} 条 · 心流 ${flow.length} 轮 · 经典笔记 ${classicNotes.length} 条`,
    abilityMode,
    abilityMessage: abilityMode === 'tiny'
      ? '上次反馈“有点难”，今日已自动切换为保底版。做得更小，反而更容易持续。'
      : '路径保持标准难度；任何时候都可以只做保底版。',
  }
}
