import {
  HOS_PROTOCOLS,
  defaultActivationProgress,
  defaultUserState,
  getActivationCompletion,
  getActiveActivationDay,
  loadState,
  type ActivationDay,
  type ActivationTask,
  type DailyCheckIn,
  type FlowSession,
  type HOSProtocol,
  type JournalEntry,
  type UserState,
} from '../stores/useStore'
import { getTodayRitualRecord } from './ritualEngine'

export type CoachMode = 'stabilize' | 'clarify' | 'execute' | 'recover' | 'learn' | 'reflect'

export interface CoachSnapshot {
  user: UserState
  activationCompletion: number
  activeDay: ActivationDay
  nextTask?: ActivationTask
  journalCount: number
  flowCount: number
  latestJournal?: JournalEntry
  latestFlow?: FlowSession
  checkIn?: DailyCheckIn
  ritualKeyword?: string
  ritualAction?: string
}

export interface CoachReplyOption {
  label: string
  value: string
}

export interface CoachPlan {
  mode: CoachMode
  stateLabel: string
  protocol: HOSProtocol
  hypothesis: string
  bodyStep: string
  actionStep: string
  reflectionStep: string
  reframe: string
  question: string
  route: string
  confidence: number
  signals: string[]
  coreNeed: string
  commitment: string
  replyOptions: CoachReplyOption[]
  isCrisis?: boolean
  isTiny?: boolean
}

type CoachFeedbackSignal = { mode: string; result: 'helpful' | 'tiny'; createdAt: number }

const signalMap: Record<CoachMode, string[]> = {
  stabilize: ['焦虑', '压力', '紧张', '崩溃', '烦', '慌', '害怕', '心跳', '应付', 'stress', 'anxious', 'panic', 'overwhelm'],
  clarify: ['太多', '混乱', '不知道', '选择', '决策', '信息', '脑子', '方向', '收束', 'overload', 'confused', 'decision'],
  execute: ['拖延', '没动力', '不想做', '无法开始', '开始', '明天', '懒', '任务太大', '做不好', 'procrastinat', 'motivation', 'lazy'],
  recover: ['睡不着', '失眠', '疲惫', '累', '耗尽', '没电', '休息', '透支', 'sleep', 'tired', 'fatigue', 'exhausted'],
  learn: ['学习', '技能', '训练', '效率', '掌握', '进步', '考试', '专注', 'learn', 'skill', 'practice', 'focus'],
  reflect: ['关系', '冲突', '愤怒', '委屈', '内耗', '情绪', '吵架', '边界', '被理解', 'emotion', 'anger', 'conflict'],
}

const protocolByMode: Record<CoachMode, string> = {
  stabilize: 'pressure', clarify: 'overload', execute: 'overload', recover: 'sleep', learn: 'learning', reflect: 'emotion',
}

const modeLabels: Record<CoachMode, string> = {
  stabilize: '高压唤醒', clarify: '信息过载', execute: '启动阻滞', recover: '恢复不足', learn: '学习塑形', reflect: '情绪整合',
}

const coreNeeds: Record<CoachMode, string> = {
  stabilize: '安全与稳定', clarify: '边界与清晰', execute: '低阻力启动', recover: '减载与恢复', learn: '反馈与精进', reflect: '被看见与重新选择',
}

const crisisSignals = ['自杀', '轻生', '不想活', '伤害自己', 'suicide', 'kill myself', 'self harm']

const replyOptions: Record<CoachMode, CoachReplyOption[]> = {
  stabilize: [
    { label: '身体很紧', value: '我的压力主要表现在身体很紧，想先稳定下来。' },
    { label: '事情太多', value: '我的压力来自事情太多，脑子无法停下来。' },
    { label: '怕做不好', value: '我现在害怕做不好，压力和紧张都很高。' },
  ],
  clarify: [
    { label: '选项太多', value: '我的选择和信息太多，帮我做减法。' },
    { label: '目标不清', value: '我不知道自己真正要的方向和目标是什么。' },
    { label: '都很重要', value: '我觉得每件事都很重要，很难决策先做什么。' },
  ],
  execute: [
    { label: '任务太大', value: '我无法开始，因为任务看起来太大。' },
    { label: '怕结果不好', value: '我拖延是因为害怕结果不好，很难开始。' },
    { label: '完全没动力', value: '我知道该做什么，但完全没有动力开始。' },
  ],
  recover: [
    { label: '睡不着', value: '我很疲惫，但大脑还停不下来，睡不着。' },
    { label: '身体没电', value: '我的身体很累、像没电，需要恢复。' },
    { label: '不敢停下', value: '我已经透支，但一停下就焦虑。' },
  ],
  learn: [
    { label: '学了就忘', value: '我想学会一项技能，但总是学了就忘。' },
    { label: '无法专注', value: '我学习时无法专注，进入不了训练状态。' },
    { label: '不知练什么', value: '我想加速学习，但不知道应该练习哪个最小技能点。' },
  ],
  reflect: [
    { label: '感到委屈', value: '我在关系中感到委屈，希望被理解。' },
    { label: '想立刻反击', value: '我现在很愤怒，想立刻反击，但不想让情绪接管。' },
    { label: '边界被越过', value: '我感觉自己的边界被越过，一直在内耗。' },
  ],
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

function getProtocol(mode: CoachMode): HOSProtocol {
  const protocolId = protocolByMode[mode]
  return HOS_PROTOCOLS.find((item) => item.id === protocolId) ?? HOS_PROTOCOLS[0]
}

function scoreModes(input: string, snapshot: CoachSnapshot, previousMode?: CoachMode) {
  const normalized = input.toLowerCase()
  const scores = Object.fromEntries(Object.keys(signalMap).map((mode) => [mode, 0])) as Record<CoachMode, number>

  for (const [mode, words] of Object.entries(signalMap) as [CoachMode, string[]][]) {
    scores[mode] += words.filter((word) => normalized.includes(word)).length * 2
  }
  if (snapshot.checkIn) {
    if (snapshot.checkIn.pressure >= 4) scores.stabilize += 2.5
    if (snapshot.checkIn.energy <= 2) scores.recover += 2.25
    if (snapshot.checkIn.clarity <= 2) scores.clarify += 2
  }
  if (previousMode && input.length <= 32) scores[previousMode] += 1.5
  if (Object.values(scores).every((score) => score === 0)) scores[previousMode ?? 'clarify'] = 1

  const ranked = (Object.entries(scores) as [CoachMode, number][]).sort((left, right) => right[1] - left[1])
  const top = ranked[0]
  const second = ranked[1]
  const confidence = Math.max(58, Math.min(94, Math.round(62 + top[1] * 5 - second[1] * 1.5)))
  return { mode: top[0], confidence, normalized }
}

function buildSignals(mode: CoachMode, snapshot: CoachSnapshot, normalized: string, previousMode?: CoachMode) {
  const signals: string[] = []
  if (signalMap[mode].some((word) => normalized.includes(word))) signals.push('表达中的关键信号')
  if (snapshot.checkIn?.pressure && snapshot.checkIn.pressure >= 4) signals.push(`今日压力 ${snapshot.checkIn.pressure}/5`)
  if (snapshot.checkIn?.energy && snapshot.checkIn.energy <= 2) signals.push(`今日能量 ${snapshot.checkIn.energy}/5`)
  if (snapshot.checkIn?.clarity && snapshot.checkIn.clarity <= 2) signals.push(`今日清晰 ${snapshot.checkIn.clarity}/5`)
  if (previousMode === mode) signals.push('与上一轮语境一致')
  if (snapshot.ritualKeyword) signals.push(`今日关键词「${snapshot.ritualKeyword}」`)
  return signals.length ? signals.slice(0, 3) : ['当前表达', '本机练习记录']
}

function buildHypothesis(mode: CoachMode, snapshot: CoachSnapshot) {
  const intention = snapshot.checkIn?.intention?.trim()
  if (mode === 'stabilize') return '我听到的不是「你不够强」，而是系统正在高唤醒中保护你。此刻先调节，比继续分析更有效。'
  if (mode === 'execute') return '这更像是启动成本过高，不是能力不足。不等动力，只把动作缩小到身体愿意开始。'
  if (mode === 'recover') return '你不需要用更多意志力补偿耗尽。系统现在需要的是减载，不是加速。'
  if (mode === 'learn') return '问题可能不在学习时间，而在缺少一个「最小技能点 → 立即反馈」的训练回路。'
  if (mode === 'reflect') return '情绪不是敌人，它正在保护一个边界或价值。先看见它，再决定如何表达。'
  return intention
    ? `你现在缺的不是更多信息，而是一个边界。今天想守住「${intention}」，就先让其他事暂时退后。`
    : '你现在缺的不是更多信息，而是一个清楚的边界和唯一下一步。'
}

function buildSteps(mode: CoachMode, snapshot: CoachSnapshot) {
  const task = snapshot.nextTask?.title.zh ?? snapshot.activeDay.title.zh
  if (mode === 'stabilize') return { bodyStep: '脚底压住地面，做 3 次比吸气更长的呼气。', actionStep: '关闭一个非必要通知，暂停新的输入。', reflectionStep: '只写一句：我现在能控制的 1% 是什么？', commitment: '3 次慢呼气' }
  if (mode === 'execute') return { bodyStep: '站起来或喝一口水，让身体先于情绪启动。', actionStep: `只打开「${task}」所需的第一个文件，不要求完成。`, reflectionStep: '两分钟后只判断：继续，还是再缩小一次？', commitment: '只做开头 2 分钟' }
  if (mode === 'recover') return { bodyStep: '松开下颌和肩膀，把屏幕亮度调低一档。', actionStep: '删掉今晚一件非必要任务，让恢复获得真实空间。', reflectionStep: '写下明天第一步，然后允许今天结束。', commitment: '删掉一件事' }
  if (mode === 'learn') return { bodyStep: '做 60 秒凝神呼吸，关掉与训练无关的界面。', actionStep: '把技能拆成 4 帧，只练最关键、最容易得到反馈的 1 帧。', reflectionStep: '结束时只记录一个下轮要修正的点。', commitment: '只练一帧 15 分钟' }
  if (mode === 'reflect') return { bodyStep: '暂停回复 90 秒，命名情绪在身体的位置。', actionStep: '把「你总是」改成「当……时，我感到……」。', reflectionStep: '在表达前写下：我真正想保护的边界是什么？', commitment: '暂停回复 90 秒' }
  return { bodyStep: '闭眼 30 秒，让注意力从所有选项回到呼吸。', actionStep: '把所有待办写到一处，只圈出能改变今天的一件事。', reflectionStep: '问自己：如果不做其他事，这一件是否仍然值得？', commitment: '只圈出一件事' }
}

function buildQuestion(mode: CoachMode) {
  if (mode === 'stabilize') return '这份压力，更接近身体紧绷、事情太多，还是怕做不好？'
  if (mode === 'execute') return '阻力更接近任务太大、怕结果不好，还是完全没动力？'
  if (mode === 'recover') return '你现在更需要睡眠、身体恢复，还是允许自己停下？'
  if (mode === 'learn') return '当前最大的学习阻力，是记不住、无法专注，还是不知该练什么？'
  if (mode === 'reflect') return '这股情绪，更想保护你的尊严、边界，还是被理解的需要？'
  return '现在的混乱，更接近选项太多、目标不清，还是每件事都像很重要？'
}

export function buildCoachSnapshot(): CoachSnapshot {
  const user = loadState('user', defaultUserState)
  const activation = loadState('activation', defaultActivationProgress)
  const journal = loadState<JournalEntry[]>('journal', [])
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const storedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const today = new Date().toLocaleDateString('en-CA')
  const checkIn = storedCheckIn?.date === today ? storedCheckIn : undefined
  const activeDay = getActiveActivationDay(activation)
  const nextTask = activeDay.tasks.find((task) => !activation.completedTaskIds.includes(task.id))
  const ritual = getTodayRitualRecord()
  return {
    user,
    activationCompletion: getActivationCompletion(activation),
    activeDay,
    nextTask,
    journalCount: journal.length,
    flowCount: flow.length,
    latestJournal: journal[0],
    latestFlow: flow[0],
    checkIn,
    ritualKeyword: ritual?.keyword,
    ritualAction: ritual?.microAction,
  }
}

export function createCoachPlan(input: string, snapshot: CoachSnapshot, previousPlan?: CoachPlan): CoachPlan {
  const normalized = input.toLowerCase()
  if (hasAny(normalized, crisisSignals)) {
    const protocol = HOS_PROTOCOLS.find((item) => item.id === 'emotion') ?? HOS_PROTOCOLS[0]
    return {
      mode: 'stabilize', stateLabel: '高风险求助', protocol, confidence: 99, isCrisis: true,
      signals: ['表达中出现了需要立即重视的风险信号'], coreNeed: '立即安全与真实人际支持',
      hypothesis: '你提到的内容可能涉及自我伤害风险。此刻最重要的是立刻连接真实的人和专业支持，不要独自承受。',
      bodyStep: '把危险物品移远，去到有人在的地方。',
      actionStep: '立即联系当地紧急电话、可信任的人或专业心理危机支持。',
      reflectionStep: '现在不需要证明自己能承受，只需要让自己安全度过这一段。',
      commitment: '现在就联系一个人', reframe: '求助不是失败，是系统进入保护模式。',
      question: '你身边现在有没有一个可以立刻联系的人？', replyOptions: [], route: `/reset/${protocol.routeProtocol}`,
    }
  }

  const detected = scoreModes(input, snapshot, previousPlan?.mode)
  const mode = detected.mode
  const protocol = getProtocol(mode)
  const steps = buildSteps(mode, snapshot)
  const plan: CoachPlan = {
    mode,
    protocol,
    stateLabel: modeLabels[mode],
    confidence: detected.confidence,
    signals: buildSignals(mode, snapshot, detected.normalized, previousPlan?.mode),
    coreNeed: coreNeeds[mode],
    hypothesis: buildHypothesis(mode, snapshot),
    ...steps,
    reframe: '这不是你的固定属性，而是一个正在运行、可以被重写的状态脚本。',
    question: buildQuestion(mode),
    replyOptions: replyOptions[mode],
    route: mode === 'learn' || mode === 'execute' ? '/flow' : `/reset/${protocol.routeProtocol}`,
  }
  const learnedDifficulty = loadState<CoachFeedbackSignal[]>('coachFeedback', []).find((item) => item.mode === mode)
  return learnedDifficulty?.result === 'tiny' ? shrinkCoachPlan(plan) : plan
}

export function shrinkCoachPlan(plan: CoachPlan): CoachPlan {
  if (plan.isCrisis) return plan
  return {
    ...plan,
    isTiny: true,
    bodyStep: '只做一次缓慢呼气。',
    actionStep: '只做这件事的开头 30 秒，不要求继续。',
    reflectionStep: '结束后只留下一个感受词。',
    commitment: '30 秒保底版',
  }
}

export function formatCoachMessage(plan: CoachPlan): string {
  return `${plan.hypothesis}\n\n此刻只做：${plan.commitment}\n\n${plan.question}`
}

export function buildCoachGreeting(snapshot: CoachSnapshot): string {
  const state = snapshot.checkIn
    ? `能量 ${snapshot.checkIn.energy}/5 · 清晰 ${snapshot.checkIn.clarity}/5 · 压力 ${snapshot.checkIn.pressure}/5`
    : '还没有今日状态记录'
  return `我在。你不需要把问题说得完整。\n当前本机信号：${state}。`
}
