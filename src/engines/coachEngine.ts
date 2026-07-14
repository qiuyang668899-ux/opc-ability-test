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

export type CoachMode = 'stabilize' | 'clarify' | 'execute' | 'recover' | 'learn' | 'reflect'

export interface CoachSnapshot {
  user: UserState;
  activationCompletion: number;
  activeDay: ActivationDay;
  nextTask?: ActivationTask;
  journalCount: number;
  flowCount: number;
  latestJournal?: JournalEntry;
  latestFlow?: FlowSession;
  checkIn?: DailyCheckIn;
}

export interface CoachPlan {
  mode: CoachMode;
  stateLabel: string;
  protocol: HOSProtocol;
  hypothesis: string;
  bodyStep: string;
  actionStep: string;
  reflectionStep: string;
  reframe: string;
  question: string;
  route: string;
}

const signalMap: Record<CoachMode, string[]> = {
  stabilize: ['焦虑', '压力', '紧张', '崩溃', '烦', '慌', '害怕', 'stress', 'anxious', 'panic', 'overwhelm'],
  clarify: ['太多', '混乱', '不知道', '选择', '决策', '信息', '脑子', 'overload', 'confused', 'decision'],
  execute: ['拖延', '没动力', '不想做', '无法开始', '明天', '懒', 'procrastinat', 'motivation', 'lazy'],
  recover: ['睡不着', '失眠', '疲惫', '累', '耗尽', '没电', 'sleep', 'tired', 'fatigue', 'exhausted'],
  learn: ['学习', '技能', '训练', '效率', '掌握', '进步', '考试', 'learn', 'skill', 'practice', 'focus'],
  reflect: ['关系', '冲突', '愤怒', '委屈', '内耗', '情绪', '吵架', 'emotion', 'anger', 'conflict'],
}

const protocolByMode: Record<CoachMode, string> = {
  stabilize: 'pressure',
  clarify: 'overload',
  execute: 'overload',
  recover: 'sleep',
  learn: 'learning',
  reflect: 'emotion',
}

const modeLabels: Record<CoachMode, string> = {
  stabilize: '高压唤醒态',
  clarify: '信息过载态',
  execute: '执行阻滞态',
  recover: '恢复不足态',
  learn: '学习加速态',
  reflect: '情绪整合态',
}

const crisisSignals = ['自杀', '轻生', '不想活', '伤害自己', 'suicide', 'kill myself', 'self harm']

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

function detectMode(input: string): CoachMode {
  const normalized = input.toLowerCase()
  const match = Object.entries(signalMap).find(([, words]) => hasAny(normalized, words))
  return (match?.[0] as CoachMode | undefined) ?? 'clarify'
}

function getProtocol(mode: CoachMode): HOSProtocol {
  const protocolId = protocolByMode[mode]
  return HOS_PROTOCOLS.find((item) => item.id === protocolId) ?? HOS_PROTOCOLS[0]
}

function buildHypothesis(mode: CoachMode, snapshot: CoachSnapshot) {
  const progressLine = `7日启动 ${snapshot.activationCompletion}%，日志 ${snapshot.journalCount} 条，心流闭环 ${snapshot.flowCount} 轮`
  const checkInLine = snapshot.checkIn
    ? `今日自检：能量 ${snapshot.checkIn.energy}/5、清晰 ${snapshot.checkIn.clarity}/5、压力 ${snapshot.checkIn.pressure}/5。`
    : '今日还没有完成状态自检。'

  if (mode === 'stabilize') {
    return `你现在最需要的不是继续分析，而是先把身体从高唤醒拉回可调度区。${checkInLine} 系统数据：${progressLine}。`
  }
  if (mode === 'execute') {
    return `问题像是“启动成本过高”，不是能力不足。先把任务缩到 2 分钟，让行动系统重新上线。${checkInLine} 系统数据：${progressLine}。`
  }
  if (mode === 'recover') {
    return `恢复系统正在提醒你减载。今晚目标不是更努力，而是清空缓存、降低刺激、恢复睡眠质量。${checkInLine} 系统数据：${progressLine}。`
  }
  if (mode === 'learn') {
    return `适合进入技能压缩训练：拆关键节点、心象预演、最小闭环、即时反馈。${checkInLine} 系统数据：${progressLine}。`
  }
  if (mode === 'reflect') {
    return `情绪已经携带重要信息，但不适合直接让它接管语言和决策。先降级，再表达。${checkInLine} 系统数据：${progressLine}。`
  }
  return `当前主要矛盾是输入过多、下一步不清。先清空外部任务，再圈出唯一推进点。${checkInLine} 系统数据：${progressLine}。`
}

function buildSteps(mode: CoachMode, snapshot: CoachSnapshot) {
  const task = snapshot.nextTask
  const day = snapshot.activeDay

  if (mode === 'stabilize') {
    return {
      bodyStep: '脚底压住地面，呼气比吸气长，做 3 轮慢呼吸。',
      actionStep: `暂停新增输入，执行「${day.title.zh}」里的「${task?.title.zh ?? '今日最小任务'}」。`,
      reflectionStep: '写一句：真正威胁是什么？我现在能控制的 1% 是什么？',
    }
  }
  if (mode === 'execute') {
    return {
      bodyStep: '站起来喝水，身体先动，绕过“想不想做”的争论。',
      actionStep: `把任务切成 2 分钟版本，只做开头，不要求完成。今日可接「${task?.title.zh ?? day.title.zh}」。`,
      reflectionStep: '完成后记录：阻力来自任务本身，还是来自预期痛苦？',
    }
  }
  if (mode === 'recover') {
    return {
      bodyStep: '灯光转暖，手机离床，做 5.5 秒吸、5.5 秒呼。',
      actionStep: '把未完成事项写出，并给每件事安排明天第一步。',
      reflectionStep: '写一句：今天已经结束，系统允许休眠。',
    }
  }
  if (mode === 'learn') {
    return {
      bodyStep: '先做 60 秒凝神呼吸，把注意力收束到一个技能节点。',
      actionStep: '进入心流学习舱：拆 4 帧，只练 1 帧，15 分钟后写反馈。',
      reflectionStep: '记录一个最小反馈：下一轮只改哪一个点？',
    }
  }
  if (mode === 'reflect') {
    return {
      bodyStep: '停止打字或争辩 90 秒，命名身体位置：胸口、喉咙、胃部。',
      actionStep: '把“我就是很生气”改写成“我观察到愤怒正在升起”。',
      reflectionStep: '重新表达前先写共同目标，而不是证明谁对。',
    }
  }
  return {
    bodyStep: '闭眼 30 秒，让注意力从屏幕回到呼吸。',
    actionStep: '把所有待办写到一处，只圈出今天唯一推进点。',
    reflectionStep: `进入 Day ${day.day}「${day.title.zh}」，完成一个最小任务后再回来复盘。`,
  }
}

function buildQuestion(mode: CoachMode) {
  if (mode === 'stabilize') return '如果只把状态改善 10%，你现在最小的一步是什么？'
  if (mode === 'execute') return '这个任务的 2 分钟版本是什么？请只说一个可见动作。'
  if (mode === 'recover') return '今晚最该被关闭的一个后台程序是什么？'
  if (mode === 'learn') return '你要训练的技能里，最关键、最小的一帧是什么？'
  if (mode === 'reflect') return '这股情绪想保护你的什么边界或价值？'
  return '如果今天只推进一件事，哪件事会让系统最轻？'
}

export function buildCoachSnapshot(): CoachSnapshot {
  const user = loadState('user', defaultUserState)
  const activation = loadState('activation', defaultActivationProgress)
  const journal = loadState<JournalEntry[]>('journal', [])
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const checkIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const activeDay = getActiveActivationDay(activation)
  const nextTask = activeDay.tasks.find((task) => !activation.completedTaskIds.includes(task.id))

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
  }
}

export function createCoachPlan(input: string, snapshot: CoachSnapshot): CoachPlan {
  const normalized = input.toLowerCase()
  if (hasAny(normalized, crisisSignals)) {
    const protocol = HOS_PROTOCOLS.find((item) => item.id === 'emotion') ?? HOS_PROTOCOLS[0]
    return {
      mode: 'stabilize',
      stateLabel: '高风险求助态',
      protocol,
      hypothesis: '你提到的内容可能涉及自我伤害风险。此刻最重要的是立刻连接真实的人和专业支持，而不是独自硬扛。',
      bodyStep: '把危险物品移远，去到有人在的地方，保持通话或面对面陪伴。',
      actionStep: '请立即联系当地紧急电话、可信任的人，或专业心理危机热线。',
      reflectionStep: '现在不需要证明自己能扛住，只需要让自己安全地度过这一段。',
      reframe: '求助不是失败，是系统进入保护模式。',
      question: '你身边现在有没有一个可以立刻联系的人？',
      route: `/reset/${protocol.routeProtocol}`,
    }
  }

  const mode = detectMode(input)
  const protocol = getProtocol(mode)
  const steps = buildSteps(mode, snapshot)

  return {
    mode,
    protocol,
    stateLabel: modeLabels[mode],
    hypothesis: buildHypothesis(mode, snapshot),
    ...steps,
    reframe: `这不是“你不行”，而是系统正在运行一个可被训练、可被重写的状态脚本。`,
    question: buildQuestion(mode),
    route: mode === 'learn' ? '/flow' : `/reset/${protocol.routeProtocol}`,
  }
}

export function formatCoachMessage(plan: CoachPlan, snapshot: CoachSnapshot): string {
  const day = snapshot.activeDay
  const task = snapshot.nextTask
  const protocolSteps = plan.protocol.steps.map((step, index) => `${index + 1}. ${step.zh}`).join('\n')

  return `【教练判断】
状态画像：${plan.stateLabel}
推荐协议：${plan.protocol.title.zh}

${plan.hypothesis}

【3 分钟处方】
1. 身体：${plan.bodyStep}
2. 行动：${plan.actionStep}
3. 复盘：${plan.reflectionStep}

【协议步骤】
${protocolSteps}

【训练闭环】
今日启动：Day ${day.day}「${day.title.zh}」
最小任务：${task?.title.zh ?? '完成今日复盘'}

【重写提示】
${plan.reframe}

我的追问：${plan.question}`
}

export function buildCoachGreeting(snapshot: CoachSnapshot): string {
  const day = snapshot.activeDay
  const task = snapshot.nextTask

  return `HOS 教练引擎已加载。

我会读取你的训练数据，给出状态判断、协议处方和下一步闭环。

当前系统：
7日启动 ${snapshot.activationCompletion}%
模式日志 ${snapshot.journalCount} 条
心流训练 ${snapshot.flowCount} 轮
今日状态 ${snapshot.checkIn ? `能量 ${snapshot.checkIn.energy}/5 · 清晰 ${snapshot.checkIn.clarity}/5 · 压力 ${snapshot.checkIn.pressure}/5` : '等待自检'}

今日建议：
Day ${day.day}「${day.title.zh}」
先完成：${task?.title.zh ?? '今日复盘'}

你可以直接告诉我：现在最卡住你的是什么？`
}
