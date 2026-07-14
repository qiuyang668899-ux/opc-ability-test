import { useState, useCallback } from 'react';

// Bilingual text type
export interface BiText {
  zh: string;
  en: string;
}

// User state
export interface UserState {
  level: BiText;
  integration: number;
  streak: number;
  depthLocked: boolean;
  depthRequirement: number;
  journalCount: number;
  energy: number;
  maxEnergy: number;
}

// Journal entry
export interface JournalEntry {
  id: string;
  timestamp: number;
  trigger: string;
  oldPattern: string;
  newResponse: string;
  somatic: string;
  distortion: string;
  analysis?: string;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Emotion state
export type EmotionState = 'calm' | 'anxious' | 'focused' | 'fatigued' | 'excited' | 'confused' | 'stressed';

// Bio phase
export interface BioPhase {
  name: BiText;
  description: BiText;
  timeRange: string;
  protocol: string;
  frequency: string;
}

const BIO_PHASES: BioPhase[] = [
  {
    name: { zh: '认知高峰', en: 'Cognitive Peak' },
    description: { zh: '深度工作 · 逻辑运算', en: 'Deep Work · Logic Processing' },
    timeRange: '09:00-12:00',
    protocol: '963Hz + 维持',
    frequency: '963',
  },
  {
    name: { zh: '整合期', en: 'Integration' },
    description: { zh: '信息整合 · 创意连接', en: 'Info Integration · Creative Links' },
    timeRange: '12:00-14:00',
    protocol: '528Hz + NSDR',
    frequency: '528',
  },
  {
    name: { zh: '执行期', en: 'Execution' },
    description: { zh: '任务执行 · 高效输出', en: 'Task Execution · High Output' },
    timeRange: '14:00-17:00',
    protocol: '852Hz + 心流',
    frequency: '852',
  },
  {
    name: { zh: '降噪期', en: 'Noise Reduction' },
    description: { zh: '放松恢复 · 感官休息', en: 'Relax Recovery · Sensory Rest' },
    timeRange: '17:00-21:00',
    protocol: '417Hz + 清理',
    frequency: '417',
  },
  {
    name: { zh: '修复期', en: 'Repair' },
    description: { zh: '深度修复 · 意识重置', en: 'Deep Repair · Consciousness Reset' },
    timeRange: '21:00-09:00',
    protocol: '528Hz + 修复',
  frequency: '528',
  },
];

export interface ActivationTask {
  id: string;
  title: BiText;
  detail: BiText;
  metric: BiText;
}

export interface ActivationDay {
  day: number;
  title: BiText;
  subtitle: BiText;
  keyword: string;
  keywordEn: string;
  frequency: string;
  routeProtocol: string;
  objective: BiText;
  science: BiText;
  tasks: ActivationTask[];
  reflection: BiText[];
}

export interface ActivationProgress {
  completedTaskIds: string[];
  notes: Record<string, string>;
}

export interface OnboardingState {
  completed: boolean;
  completedAt?: number;
}

export interface DailyCheckIn {
  date: string;
  energy: number;
  clarity: number;
  pressure: number;
  intention: string;
  createdAt: number;
}

export const ACTIVATION_DAYS: ActivationDay[] = [
  {
    day: 1,
    title: { zh: '系统断电与物理清空', en: 'Power Down & Clear Space' },
    subtitle: { zh: 'BIOS 重置', en: 'BIOS Reset' },
    keyword: '简',
    keywordEn: 'Simplify',
    frequency: '417Hz',
    routeProtocol: 'void',
    objective: { zh: '清理物理环境与信息环境，为新系统腾出认知内存。', en: 'Clear physical and digital clutter to free cognitive bandwidth.' },
    science: { zh: '环境杂乱会持续占用注意力。第一天先减少后台消耗。', en: 'Clutter consumes attention. Day one reduces background load.' },
    tasks: [
      { id: 'd1-space', title: { zh: '一平米清空', en: 'One-Square-Meter Reset' }, detail: { zh: '整理桌面或床头，只保留今天真正要用的物品。', en: 'Clear one desk or bedside area, keeping only what matters today.' }, metric: { zh: '15 分钟', en: '15 min' } },
      { id: 'd1-notify', title: { zh: '通知静音', en: 'Notification Silence' }, detail: { zh: '关闭非必要 App 推送，退掉 1 个消耗型群聊。', en: 'Mute nonessential app notifications and leave one draining group.' }, metric: { zh: '10 分钟', en: '10 min' } },
      { id: 'd1-cache', title: { zh: '睡前缓存清空', en: 'Night Cache Dump' }, detail: { zh: '睡前把待办和担忧写出，手机离床。', en: 'Write out tasks and worries before sleep, keep phone away from bed.' }, metric: { zh: '5 分钟', en: '5 min' } },
    ],
    reflection: [
      { zh: '清空时，你更焦虑还是更轻松？', en: 'Did clearing make you more anxious or relieved?' },
      { zh: '今天最想重新打开的红点刺激是什么？', en: 'What notification did you most want to reopen?' },
    ],
  },
  {
    day: 2,
    title: { zh: '能量探底与漏洞修补', en: 'Energy Audit & Leak Repair' },
    subtitle: { zh: '精气神检测', en: 'Energy System Scan' },
    keyword: '调',
    keywordEn: 'Tune',
    frequency: '528Hz',
    routeProtocol: 'source',
    objective: { zh: '识别能量资产、负债和最大泄漏点。', en: 'Map energy assets, liabilities, and the largest leak.' },
    science: { zh: '先堵能量漏洞，再追求高输出，系统才不会过载。', en: 'Plug leaks before demanding output so the system does not overload.' },
    tasks: [
      { id: 'd2-ledger', title: { zh: '能量资产负债表', en: 'Energy Ledger' }, detail: { zh: '写下 3 个滋养源与 3 个消耗源。', en: 'Write three nourishing sources and three draining sources.' }, metric: { zh: '8 分钟', en: '8 min' } },
      { id: 'd2-boundary', title: { zh: '执行一次说不', en: 'One Clean No' }, detail: { zh: '拒绝或延后一个不必要请求，保护今日能量。', en: 'Decline or defer one unnecessary request to protect energy.' }, metric: { zh: '1 次', en: '1 time' } },
      { id: 'd2-reset', title: { zh: '528Hz 修复呼吸', en: '528Hz Repair Breath' }, detail: { zh: '执行 3 分钟系统重置，观察肩颈和下颌放松。', en: 'Run a 3-minute reset and observe jaw and shoulder release.' }, metric: { zh: '3 分钟', en: '3 min' } },
    ],
    reflection: [
      { zh: '今天最大的能量漏洞是什么？', en: 'What was your largest energy leak today?' },
      { zh: '说“不”时，身体哪里最有感觉？', en: 'Where did your body react when you said no?' },
    ],
  },
  {
    day: 3,
    title: { zh: '安装认知防火墙', en: 'Install Cognitive Firewall' },
    subtitle: { zh: '信息过滤测试', en: 'Input Filter Test' },
    keyword: '清',
    keywordEn: 'Cleanse',
    frequency: '417Hz',
    routeProtocol: 'void',
    objective: { zh: '从被动投喂切换到主动摄入。', en: 'Move from passive feed consumption to intentional intake.' },
    science: { zh: '工作记忆有限，防火墙的第一原则是拒绝更多。', en: 'Working memory is limited; the first firewall rule is refusing more.' },
    tasks: [
      { id: 'd3-gray', title: { zh: '开启灰度屏', en: 'Grayscale Screen' }, detail: { zh: '手机转为黑白，降低图标与短视频刺激。', en: 'Switch phone to grayscale to reduce app and video pull.' }, metric: { zh: '全天', en: 'All day' } },
      { id: 'd3-intent', title: { zh: '意图先行', en: 'Intent First' }, detail: { zh: '每次打开设备前，先说出具体目的。完成后立刻退出。', en: 'State the exact purpose before opening a device; exit after completion.' }, metric: { zh: '5 次', en: '5 times' } },
      { id: 'd3-signal', title: { zh: '信号/噪音复盘', en: 'Signal/Noise Review' }, detail: { zh: '晚上记录今天真正有价值的一条信息。', en: 'At night, record one truly valuable input from the day.' }, metric: { zh: '1 条', en: '1 item' } },
    ],
    reflection: [
      { zh: '灰度屏后，手机诱惑下降了吗？', en: 'Did grayscale reduce phone temptation?' },
      { zh: '今天哪条信息真的改变了你的判断？', en: 'Which input actually changed your judgment today?' },
    ],
  },
  {
    day: 4,
    title: { zh: '激活元认知中枢', en: 'Activate Meta-Awareness' },
    subtitle: { zh: '自我调度觉醒', en: 'Self-Scheduling Awakening' },
    keyword: '观',
    keywordEn: 'Observe',
    frequency: '528Hz',
    routeProtocol: 'observe',
    objective: { zh: '在刺激与反应之间楔入觉察空间。', en: 'Insert awareness between stimulus and response.' },
    science: { zh: '命名情绪会帮助前额叶重新上线，降低情绪劫持。', en: 'Naming emotions helps the prefrontal cortex come back online.' },
    tasks: [
      { id: 'd4-sutra', title: { zh: '晨间元序经', en: 'Morning Sutra' }, detail: { zh: '诵读或默念“吾，观者也……”三遍。', en: 'Recite or silently repeat the observer sutra three times.' }, metric: { zh: '3 遍', en: '3 rounds' } },
      { id: 'd4-anchor', title: { zh: '设置觉察锚点', en: 'Awareness Anchor' }, detail: { zh: '把喝水、开门或亮屏设为 0.5 秒觉察提醒。', en: 'Use drinking, doors, or screen wake as a 0.5-second awareness cue.' }, metric: { zh: '5 次', en: '5 times' } },
      { id: 'd4-name', title: { zh: '第三人称命名情绪', en: 'Third-Person Labeling' }, detail: { zh: '把“我很焦虑”改成“我观察到焦虑正在升起”。', en: 'Change “I am anxious” to “I notice anxiety arising.”' }, metric: { zh: '1 次', en: '1 time' } },
    ],
    reflection: [
      { zh: '你今天捕捉到了几次自动反应？', en: 'How many automatic responses did you catch today?' },
      { zh: '命名情绪后，强度有没有变化？', en: 'Did labeling the emotion change its intensity?' },
    ],
  },
  {
    day: 5,
    title: { zh: '压力接种与反脆弱测试', en: 'Stress Inoculation' },
    subtitle: { zh: '环境适应训练', en: 'Adaptation Training' },
    keyword: '化',
    keywordEn: 'Transform',
    frequency: '417Hz',
    routeProtocol: 'flow',
    objective: { zh: '用可控小压力训练系统复原和成长。', en: 'Use small controlled stressors to train recovery and growth.' },
    science: { zh: '15% 挑战原则：略高于舒适区，低于崩溃区。', en: 'The 15% challenge principle: beyond comfort, below overwhelm.' },
    tasks: [
      { id: 'd5-cold', title: { zh: '30 秒冷水尾声', en: '30-Second Cold Finish' }, detail: { zh: '洗澡最后 30 秒降温，观察身体抗拒。', en: 'End a shower with 30 seconds of colder water and observe resistance.' }, metric: { zh: '30 秒', en: '30 sec' } },
      { id: 'd5-fear', title: { zh: '一个微恐惧行动', en: 'One Micro-Fear Action' }, detail: { zh: '完成一个轻微抗拒但有益的电话、表达或整理。', en: 'Do one useful action you mildly resist: call, speak, or clean up.' }, metric: { zh: '1 件', en: '1 action' } },
      { id: 'd5-gold', title: { zh: '隐藏红利提问', en: 'Hidden Upside Prompt' }, detail: { zh: '问：这个压力暴露了我系统的哪个漏洞？', en: 'Ask: which system leak did this stress reveal?' }, metric: { zh: '3 分钟', en: '3 min' } },
    ],
    reflection: [
      { zh: '主动迎接压力后，你更虚弱还是更稳定？', en: 'After choosing stress, did you feel weaker or steadier?' },
      { zh: '这次压力可以转化成什么能力？', en: 'What ability can this stress become?' },
    ],
  },
  {
    day: 6,
    title: { zh: '建立心流通道', en: 'Build the Flow Channel' },
    subtitle: { zh: '深度聚焦与创造', en: 'Deep Focus & Creation' },
    keyword: '聚',
    keywordEn: 'Focus',
    frequency: '852Hz',
    routeProtocol: 'gather',
    objective: { zh: '把收回的能量集中到一项真实输出。', en: 'Concentrate reclaimed energy into one real output.' },
    science: { zh: '单任务、清晰目标和即时反馈，是心流入口。', en: 'Monotasking, clear goals, and feedback create a flow gateway.' },
    tasks: [
      { id: 'd6-target', title: { zh: '定义一个心流目标', en: 'Define One Flow Target' }, detail: { zh: '写下 90 分钟内唯一要推进的结果。', en: 'Write the one result to move forward in 90 minutes.' }, metric: { zh: '1 句', en: '1 line' } },
      { id: 'd6-cabin', title: { zh: '45-90 分钟心流舱', en: '45-90 min Flow Cabin' }, detail: { zh: '断开消息，只做一个任务，到点停。', en: 'Disconnect messages and do one task only until the timer ends.' }, metric: { zh: '1 轮', en: '1 round' } },
      { id: 'd6-recover', title: { zh: '心流后彻底休眠', en: 'Post-Flow Recovery' }, detail: { zh: '结束后散步、拉伸或闭目 10 分钟。', en: 'Walk, stretch, or rest eyes for 10 minutes after.' }, metric: { zh: '10 分钟', en: '10 min' } },
    ],
    reflection: [
      { zh: '这轮心流中，时间感是否改变？', en: 'Did your sense of time change during flow?' },
      { zh: '最影响专注的摩擦点是什么？', en: 'What friction most disrupted focus?' },
    ],
  },
  {
    day: 7,
    title: { zh: '系统整合与管理员宣誓', en: 'Integration & Admin Oath' },
    subtitle: { zh: '完全启动', en: 'Full Launch' },
    keyword: '归',
    keywordEn: 'Return',
    frequency: '528Hz',
    routeProtocol: 'source',
    objective: { zh: '把七天体验晶体化为个人启动矩阵。', en: 'Crystallize seven days into a personal launch matrix.' },
    science: { zh: '复盘能把体验转成可复用策略，完成从知道到做到。', en: 'Reflection turns experience into reusable strategy.' },
    tasks: [
      { id: 'd7-review', title: { zh: '七日数据复盘', en: 'Seven-Day Review' }, detail: { zh: '回看前六天，写下能量、注意力、情绪的变化。', en: 'Review changes in energy, attention, and emotion.' }, metric: { zh: '10 分钟', en: '10 min' } },
      { id: 'd7-matrix', title: { zh: '专属启动矩阵', en: 'Personal Launch Matrix' }, detail: { zh: '选出最有效的关键词、音频、呼吸和仪式。', en: 'Choose your best keyword, audio, breath, and ritual.' }, metric: { zh: '4 项', en: '4 items' } },
      { id: 'd7-oath', title: { zh: '管理员宣誓', en: 'Admin Oath' }, detail: { zh: '说出：我正式接管我生命系统的最高权限。', en: 'Say: I reclaim administrator access to my life system.' }, metric: { zh: '1 次', en: '1 time' } },
    ],
    reflection: [
      { zh: '七天里最有效的一个协议是什么？', en: 'Which protocol worked best across seven days?' },
      { zh: '下一阶段你要升级哪个系统？', en: 'Which system will you upgrade next?' },
    ],
  },
];

export const defaultActivationProgress: ActivationProgress = {
  completedTaskIds: [],
  notes: {},
};

export const defaultOnboardingState: OnboardingState = {
  completed: false,
};

export function getActiveActivationDay(progress: ActivationProgress): ActivationDay {
  return ACTIVATION_DAYS.find((day) => day.tasks.some((task) => !progress.completedTaskIds.includes(task.id)))
    ?? ACTIVATION_DAYS[ACTIVATION_DAYS.length - 1];
}

export function getCurrentBioPhase(): BioPhase {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 12) return BIO_PHASES[0];
  if (hour >= 12 && hour < 14) return BIO_PHASES[1];
  if (hour >= 14 && hour < 17) return BIO_PHASES[2];
  if (hour >= 17 && hour < 21) return BIO_PHASES[3];
  return BIO_PHASES[4];
}

// Breathing protocols
export interface BreathProtocol {
  char: string;
  pinyin: string;
  keyword: string;
  keywordEn: string;
  frequency: string;
  freqLabel: BiText;
  inhale: number;
  hold: number;
  exhale: number;
  holdOut: number;
  description: BiText;
}

export const BREATH_PROTOCOLS: BreathProtocol[] = [
  {
    char: '空', pinyin: 'KŌNG', keyword: 'VOID', keywordEn: 'Void',
    frequency: '417', freqLabel: { zh: '清理', en: 'Cleanse' },
    inhale: 4, hold: 2, exhale: 6, holdOut: 0,
    description: { zh: '释放执念，回归虚空', en: 'Release attachment, return to void' },
  },
  {
    char: '观', pinyin: 'GUĀN', keyword: 'OBSERVE', keywordEn: 'Observe',
    frequency: '528', freqLabel: { zh: '修复', en: 'Repair' },
    inhale: 4, hold: 4, exhale: 4, holdOut: 4,
    description: { zh: '觉察当下，如实观照', en: 'Observe the present, see as it is' },
  },
  {
    char: '聚', pinyin: 'JÙ', keyword: 'GATHER', keywordEn: 'Gather',
    frequency: '852', freqLabel: { zh: '觉醒', en: 'Awaken' },
    inhale: 5, hold: 3, exhale: 5, holdOut: 0,
    description: { zh: '凝聚意念，汇聚能量', en: 'Focus intention, gather energy' },
  },
  {
    char: '流', pinyin: 'LIÚ', keyword: 'FLOW', keywordEn: 'Flow',
    frequency: '417', freqLabel: { zh: '清理', en: 'Cleanse' },
    inhale: 4, hold: 0, exhale: 8, holdOut: 0,
    description: { zh: '顺其自然，如水流动', en: 'Go with the flow, like water' },
  },
  {
    char: '源', pinyin: 'YUÁN', keyword: 'SOURCE', keywordEn: 'Source',
    frequency: '528', freqLabel: { zh: '修复', en: 'Repair' },
    inhale: 6, hold: 3, exhale: 6, holdOut: 3,
    description: { zh: '连接本源，回归真我', en: 'Connect to source, return to true self' },
  },
];

export interface HOSProtocol {
  id: string;
  title: BiText;
  scene: BiText;
  duration: BiText;
  keyword: string;
  command: BiText;
  frequency: string;
  evidence: '强证据' | '中证据' | '体验探索';
  routeProtocol: string;
  steps: BiText[];
}

export const HOS_PROTOCOLS: HOSProtocol[] = [
  {
    id: 'pressure',
    title: { zh: '高压演讲 / 谈判启动', en: 'High-Stakes Performance Reset' },
    scene: { zh: '心跳快、呼吸浅、马上要上场。', en: 'Fast heartbeat, shallow breath, about to perform.' },
    duration: { zh: '3 分钟', en: '3 min' },
    keyword: '稳',
    command: { zh: '我根植当下，风动而我不移。', en: 'I root in the present; the wind moves, I stay steady.' },
    frequency: '174Hz / 396Hz',
    evidence: '强证据',
    routeProtocol: 'observe',
    steps: [
      { zh: '延长呼气，完成 3 轮 4-7-8 呼吸。', en: 'Lengthen exhale with three rounds of 4-7-8 breathing.' },
      { zh: '默念“稳”，把注意力落到脚底和丹田。', en: 'Repeat “steady” and drop attention to feet and center.' },
      { zh: '只写一个上场意图：我要传递什么价值？', en: 'Write one intention: what value will I deliver?' },
    ],
  },
  {
    id: 'overload',
    title: { zh: '信息过载 / 决策瘫痪', en: 'Information Overload Reset' },
    scene: { zh: '任务太多，大脑像被塞满，无法开始。', en: 'Too many tasks, mind packed, unable to begin.' },
    duration: { zh: '5 分钟', en: '5 min' },
    keyword: '空',
    command: { zh: '我清空缓存，只保留下一步。', en: 'I clear cache and keep only the next step.' },
    frequency: '417Hz',
    evidence: '强证据',
    routeProtocol: 'void',
    steps: [
      { zh: '把所有待办写到纸上，不分类不判断。', en: 'Write every open loop on paper without sorting or judging.' },
      { zh: '圈出今天唯一能推进局面的 1 件事。', en: 'Circle the one action that can move today forward.' },
      { zh: '执行 60 秒“空”呼吸，然后开始 2 分钟微行动。', en: 'Run 60 seconds of void breath, then begin a 2-minute action.' },
    ],
  },
  {
    id: 'emotion',
    title: { zh: '强烈情绪 / 冲突降级', en: 'Emotional Hijack De-escalation' },
    scene: { zh: '愤怒、委屈、焦虑已接管语言系统。', en: 'Anger, hurt, or anxiety has taken over speech.' },
    duration: { zh: '10 分钟', en: '10 min' },
    keyword: '观',
    command: { zh: '我看见情绪升起，但我不是情绪本身。', en: 'I see emotion arising, but I am not the emotion.' },
    frequency: '528Hz / 639Hz',
    evidence: '强证据',
    routeProtocol: 'observe',
    steps: [
      { zh: '物理暂停 90 秒，离开争吵现场或停止打字。', en: 'Pause physically for 90 seconds; step away or stop typing.' },
      { zh: '第三人称命名：我观察到胸口有愤怒。', en: 'Label in third person: I notice anger in the chest.' },
      { zh: '重新对话前先复述共同目标，而不是证明谁对。', en: 'Before returning, restate the shared goal, not who is right.' },
    ],
  },
  {
    id: 'sleep',
    title: { zh: '夜间过载 / 入睡修复', en: 'Night Overload Recovery' },
    scene: { zh: '身体躺下了，大脑仍在跑程序。', en: 'Body is in bed, mind still running processes.' },
    duration: { zh: '8 分钟', en: '8 min' },
    keyword: '归',
    command: { zh: '今日之事已毕，系统缓存清空。', en: 'Today is complete; system cache is cleared.' },
    frequency: '432Hz / 528Hz',
    evidence: '中证据',
    routeProtocol: 'source',
    steps: [
      { zh: '写出 3 个未完成事项，并安排明天第一步。', en: 'Write three unfinished items and tomorrow’s first step.' },
      { zh: '手机离床，灯光转暖，播放低刺激音场。', en: 'Move phone away, warm the light, play low-stimulation audio.' },
      { zh: '使用 5.5 秒吸、5.5 秒呼，直到身体变重。', en: 'Use 5.5s inhale and 5.5s exhale until the body feels heavy.' },
    ],
  },
  {
    id: 'learning',
    title: { zh: '快速学习 / 技能植入', en: 'Rapid Learning Primer' },
    scene: { zh: '准备学习新技能，需要高效进入训练状态。', en: 'Preparing to learn a skill and enter training efficiently.' },
    duration: { zh: '15 分钟启动', en: '15 min primer' },
    keyword: '聚',
    command: { zh: '我只训练一个关键节点。', en: 'I train only one key node.' },
    frequency: 'Alpha / Gamma',
    evidence: '中证据',
    routeProtocol: 'gather',
    steps: [
      { zh: '把技能拆成 4 个动作帧或认知步骤。', en: 'Break the skill into four motion frames or cognitive steps.' },
      { zh: '只选最小闭环，进行 3 次慢速心象模拟。', en: 'Choose the smallest loop and run three slow mental rehearsals.' },
      { zh: '做 15 分钟实体练习，结束后写下一个反馈。', en: 'Practice physically for 15 minutes, then write one feedback note.' },
    ],
  },
];

export interface FlowSession {
  id: string;
  timestamp: number;
  skill: string;
  target: string;
  keyNode: string;
  rehearsal: string;
  practiceMinutes: number;
  feedback: string;
}

// Music tracks
export interface MusicTrack {
  id: string;
  name: BiText;
  category: BiText;
  icon: string;
  color: string;
  scene: BiText;
  target: BiText;
  frequency: string;
  intensity: '低' | '中' | '高';
  tags: string[];
  layers: number[];
  texture: 'sine' | 'triangle' | 'sawtooth';
  assetUrl?: string;
  durationSec?: number;
  source?: BiText;
}

export const MUSIC_TRACKS: MusicTrack[] = ([
  {
    id: 'morning-boot',
    name: { zh: '晨间启动', en: 'Morning Boot' },
    category: { zh: '能量启动', en: 'Activation' },
    icon: '◎',
    color: '#fbbf24',
    scene: { zh: '起床后、工作前、状态低迷时', en: 'Morning, before work, low-energy state' },
    target: { zh: '唤醒身体与执行系统', en: 'Wake the body and execution system' },
    frequency: 'Beta / 396Hz',
    intensity: '中',
    tags: ['启动', '能量', '行动'],
    layers: [196, 247, 396, 528],
    texture: 'triangle',
  },
  {
    id: 'alpha',
    name: { zh: '深度专注', en: 'Deep Focus' },
    category: { zh: '专注心流', en: 'Focus' },
    icon: '◆',
    color: '#a78bfa',
    scene: { zh: '写作、编码、学习、长时间单任务', en: 'Writing, coding, studying, monotasking' },
    target: { zh: '稳定注意力，减少切换冲动', en: 'Stabilize attention and reduce switching' },
    frequency: 'Alpha / 852Hz',
    intensity: '中',
    tags: ['专注', '学习', '心流'],
    layers: [110, 220, 440, 852],
    texture: 'sine',
  },
  {
    id: 'gamma-spark',
    name: { zh: '创造火花', en: 'Creative Spark' },
    category: { zh: '创造发散', en: 'Creativity' },
    icon: '✦',
    color: '#fb7185',
    scene: { zh: '头脑风暴、选题、产品创意', en: 'Brainstorming, ideation, product thinking' },
    target: { zh: '提高联想密度，打开新组合', en: 'Increase associative thinking' },
    frequency: 'Gamma / 639Hz',
    intensity: '高',
    tags: ['创造', '灵感', '发散'],
    layers: [174, 348, 639, 963],
    texture: 'triangle',
  },
  {
    id: 'pressure-release',
    name: { zh: '压力释放', en: 'Pressure Release' },
    category: { zh: '情绪调节', en: 'Regulation' },
    icon: '◌',
    color: '#5eead4',
    scene: { zh: '紧张、烦躁、准备沟通前', en: 'Tension, agitation, before conversations' },
    target: { zh: '降低高唤醒，回到可回应状态', en: 'Reduce arousal and return to response mode' },
    frequency: '174Hz / 528Hz',
    intensity: '低',
    tags: ['压力', '呼吸', '稳定'],
    layers: [87, 174, 261.63, 528],
    texture: 'sine',
  },
  {
    id: 'rain',
    name: { zh: '雨夜清理', en: 'Rain Cache Clear' },
    category: { zh: '自然环境', en: 'Nature' },
    icon: '∿',
    color: '#38bdf8',
    scene: { zh: '整理、复盘、睡前写日志', en: 'Organizing, reviewing, night journaling' },
    target: { zh: '清空缓存，降低信息噪音', en: 'Clear cache and lower information noise' },
    frequency: '417Hz',
    intensity: '低',
    tags: ['清理', '雨声', '复盘'],
    layers: [52, 104, 208, 417],
    texture: 'triangle',
  },
  {
    id: 'theta',
    name: { zh: '虚空冥想', en: 'Void Meditation' },
    category: { zh: '冥想觉察', en: 'Meditation' },
    icon: '◐',
    color: '#c084fc',
    scene: { zh: '静坐、观察情绪、系统重置后', en: 'Sitting, observing emotions, after reset' },
    target: { zh: '从内容退回观察者位置', en: 'Return from content to observer mode' },
    frequency: 'Theta / 417Hz',
    intensity: '低',
    tags: ['冥想', '觉察', '空'],
    layers: [64, 128, 256, 417],
    texture: 'sine',
  },
  {
    id: 'heart-coherence',
    name: { zh: '心脑谐振', en: 'Heart Coherence' },
    category: { zh: '身心同步', en: 'Coherence' },
    icon: '◇',
    color: '#00e676',
    scene: { zh: '呼吸练习、疲劳恢复、情绪波动', en: 'Breathwork, recovery, emotional waves' },
    target: { zh: '配合慢呼吸，建立身心一致感', en: 'Pair with slow breath and build coherence' },
    frequency: '528Hz',
    intensity: '低',
    tags: ['心脑', '呼吸', '修复'],
    layers: [66, 132, 264, 528],
    texture: 'sine',
  },
  {
    id: 'sleep-repair',
    name: { zh: '睡前修复', en: 'Sleep Repair' },
    category: { zh: '睡眠恢复', en: 'Sleep' },
    icon: '◑',
    color: '#818cf8',
    scene: { zh: '睡前 30 分钟、夜间过载', en: '30 minutes before sleep, night overload' },
    target: { zh: '降低刺激，帮助系统进入休眠', en: 'Lower stimulation and enter rest mode' },
    frequency: 'Delta / 432Hz',
    intensity: '低',
    tags: ['睡眠', '恢复', '低刺激'],
    layers: [54, 108, 216, 432],
    texture: 'sine',
  },
  {
    id: 'cafe',
    name: { zh: '城市咖啡馆', en: 'Urban Cafe' },
    category: { zh: '环境白噪', en: 'Ambient' },
    icon: '▧',
    color: '#fb923c',
    scene: { zh: '轻工作、阅读、独处办公', en: 'Light work, reading, solo office time' },
    target: { zh: '制造温和社会感，降低孤立感', en: 'Create mild social presence' },
    frequency: 'Brown / Pink Noise',
    intensity: '中',
    tags: ['环境', '阅读', '办公'],
    layers: [120, 180, 300, 480],
    texture: 'triangle',
  },
  {
    id: 'wind',
    name: { zh: '山谷长风', en: 'Valley Wind' },
    category: { zh: '自然环境', en: 'Nature' },
    icon: '〰',
    color: '#2dd4bf',
    scene: { zh: '散步前后、放松拉伸、情绪散热', en: 'Before or after walking, stretching, cooling down' },
    target: { zh: '放松身体边界，释放紧绷感', en: 'Release physical tightness' },
    frequency: '396Hz / 528Hz',
    intensity: '低',
    tags: ['自然', '放松', '身体'],
    layers: [99, 198, 396, 528],
    texture: 'triangle',
  },
  {
    id: 'ritual-drum',
    name: { zh: '行动鼓点', en: 'Action Pulse' },
    category: { zh: '执行推进', en: 'Execution' },
    icon: '▰',
    color: '#ef4444',
    scene: { zh: '打扫、运动、短时冲刺任务', en: 'Cleaning, movement, short execution sprints' },
    target: { zh: '减少犹豫，进入动作节奏', en: 'Reduce hesitation and enter action rhythm' },
    frequency: 'Beta / 741Hz',
    intensity: '高',
    tags: ['执行', '运动', '冲刺'],
    layers: [185, 370, 555, 741],
    texture: 'sawtooth',
  },
  {
    id: 'deep-reading',
    name: { zh: '深读结界', en: 'Deep Reading Field' },
    category: { zh: '专注心流', en: 'Focus' },
    icon: '▣',
    color: '#60a5fa',
    scene: { zh: '读书、论文、长文吸收', en: 'Books, papers, long-form reading' },
    target: { zh: '延长理解窗口，减少跳读', en: 'Extend comprehension window' },
    frequency: 'Alpha / 639Hz',
    intensity: '中',
    tags: ['阅读', '理解', '专注'],
    layers: [106, 212, 424, 639],
    texture: 'sine',
  },
  {
    id: 'compassion',
    name: { zh: '慈心修复', en: 'Compassion Repair' },
    category: { zh: '情绪调节', en: 'Regulation' },
    icon: '♡',
    color: '#f472b6',
    scene: { zh: '自责、关系冲突、需要柔和下来时', en: 'Self-criticism, conflict, softening moments' },
    target: { zh: '从攻击模式回到理解与照顾', en: 'Return from attack mode to care' },
    frequency: '528Hz / 639Hz',
    intensity: '低',
    tags: ['慈心', '关系', '修复'],
    layers: [132, 264, 528, 639],
    texture: 'sine',
  },
  {
    id: 'source-return',
    name: { zh: '本源回归', en: 'Source Return' },
    category: { zh: '冥想觉察', en: 'Meditation' },
    icon: '●',
    color: '#eab308',
    scene: { zh: '重要决定前、迷失感、需要重新校准', en: 'Before decisions, disorientation, recalibration' },
    target: { zh: '回到价值、身体和真实意图', en: 'Return to values, body, and true intention' },
    frequency: '528Hz / 963Hz',
    intensity: '中',
    tags: ['本源', '校准', '意图'],
    layers: [132, 264, 528, 963],
    texture: 'triangle',
  },
] satisfies Omit<MusicTrack, 'assetUrl' | 'durationSec' | 'source'>[]).map((track) => ({
  ...track,
  assetUrl: `${import.meta.env.BASE_URL}audio/${track.id}.wav`,
  durationSec: 45,
  source: { zh: 'AI 生成音频库', en: 'AI-generated audio library' },
}));

// Cognitive distortions
export const DISTORTIONS: BiText[] = [
  { zh: '灾难化', en: 'Catastrophizing' },
  { zh: '非黑即白', en: 'Black & White Thinking' },
  { zh: '过度概括', en: 'Overgeneralization' },
  { zh: '读心术', en: 'Mind Reading' },
  { zh: '情绪推理', en: 'Emotional Reasoning' },
  { zh: '应该思维', en: 'Should Statements' },
  { zh: '贴标签', en: 'Labeling' },
  { zh: '选择性关注', en: 'Mental Filter' },
];

// Default user state
export const defaultUserState: UserState = {
  level: { zh: '初级操作员', en: 'Level 1 Operator' },
  integration: 0,
  streak: 0,
  depthLocked: true,
  depthRequirement: 3,
  journalCount: 0,
  energy: 5,
  maxEnergy: 18,
};

export function getActivationCompletion(progress: ActivationProgress): number {
  const total = ACTIVATION_DAYS.reduce((sum, day) => sum + day.tasks.length, 0);
  if (total === 0) return 0;
  return Math.round((progress.completedTaskIds.length / total) * 100);
}

export function recomputeUserState(): UserState {
  const user = loadState('user', defaultUserState);
  const activation = loadState('activation', defaultActivationProgress);
  const journal = loadState<JournalEntry[]>('journal', []);
  const flow = loadState<FlowSession[]>('flowSessions', []);
  const activationCompletion = getActivationCompletion(activation);
  const practiceScore = Math.min(100, activationCompletion * 0.55 + journal.length * 7 + flow.length * 8);
  user.journalCount = journal.length;
  user.streak = Math.max(user.streak, activation.completedTaskIds.length > 0 ? Math.min(365, Math.ceil(activation.completedTaskIds.length / 2)) : 0);
  user.integration = Math.min(100, Math.round(practiceScore));
  user.depthLocked = journal.length < user.depthRequirement;
  saveState('user', user);
  return user;
}

// Local storage helpers
export function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`hos_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`hos_${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Simple global state hook
let globalListeners: Array<() => void> = [];
let globalState = {
  musicPlaying: false,
  currentTrack: null as MusicTrack | null,
  musicMinimized: true,
};

export function useMusicStore() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate((n) => n + 1);
    globalListeners.push(listener);
    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const setMusicState = useCallback((updates: Partial<typeof globalState>) => {
    globalState = { ...globalState, ...updates };
    globalListeners.forEach((l) => l());
  }, []);

  return { ...globalState, setMusicState };
}
