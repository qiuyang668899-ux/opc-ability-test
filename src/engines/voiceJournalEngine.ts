export interface VoiceAcousticMetrics {
  durationSec: number
  averageLevel: number
  levelVariability: number
  peakLevel: number
  pauseRatio: number
  sampleCount: number
}

export interface VoiceStateAnalysis {
  stateLabel: string
  confidence: number
  energy: number
  clarity: number
  pressure: number
  keywords: string[]
  deliverySignals: string[]
  summary: string
  response: string
  acousticNote: string
}

export interface VoiceJournalRecord {
  id: string
  timestamp: number
  date: string
  rawTranscript: string
  transcript: string
  metrics: VoiceAcousticMetrics
  analysis: VoiceStateAnalysis
  coachMode: string
  commitment: string
  calibration?: -1 | 0 | 1
}

export interface VoiceMemory {
  version: 1
  voiceCount: number
  baseline: {
    averageLevel: number
    pauseRatio: number
    speechRate: number
    samples: number
  }
  recurringTopics: Array<{ label: string; count: number }>
  recentStates: string[]
  calibrationOffset: number
  lastUpdated: number
}

const defaultMemory: VoiceMemory = {
  version: 1,
  voiceCount: 0,
  baseline: { averageLevel: 36, pauseRatio: 0.42, speechRate: 150, samples: 0 },
  recurringTopics: [],
  recentStates: [],
  calibrationOffset: 0,
  lastUpdated: 0,
}

const topicSignals: Array<{ label: string; words: string[] }> = [
  { label: '工作', words: ['工作', '项目', '客户', '老板', '同事', '方案', '会议', '业绩'] },
  { label: '学习', words: ['学习', '考试', '技能', '课程', '读书', '专注', '训练'] },
  { label: '关系', words: ['关系', '家人', '父母', '伴侣', '孩子', '朋友', '沟通', '委屈'] },
  { label: '睡眠', words: ['睡眠', '睡不着', '失眠', '熬夜', '困', '休息'] },
  { label: '身体', words: ['身体', '头疼', '胸闷', '肩颈', '心跳', '疲惫', '累'] },
  { label: '行动', words: ['开始', '拖延', '行动', '完成', '计划', '任务', '效率'] },
  { label: '情绪', words: ['焦虑', '紧张', '生气', '害怕', '难过', '烦', '压力', '情绪'] },
  { label: '方向', words: ['方向', '目标', '未来', '选择', '意义', '想要'] },
]

const stateSignals = {
  pressure: ['焦虑', '压力', '紧张', '慌', '害怕', '担心', '烦', '崩溃', '来不及', '必须'],
  lowEnergy: ['累', '疲惫', '没电', '困', '不想动', '耗尽', '撑不住', '休息不好'],
  unclear: ['混乱', '不知道', '想不清', '纠结', '选择太多', '没有方向', '脑子乱'],
  blocked: ['拖延', '无法开始', '不敢开始', '做不好', '没动力', '卡住', '逃避'],
  grounded: ['平静', '安心', '清楚', '稳定', '轻松', '有力量', '期待', '开心'],
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function countSignals(text: string, words: string[]) {
  return words.filter((word) => text.includes(word)).length
}

function speechRate(text: string, durationSec: number) {
  const spokenUnits = text.replace(/[\s，。！？、,.!?]/g, '').length
  return durationSec > 1 ? Math.round((spokenUnits / durationSec) * 60) : 0
}

export function polishVoiceTranscript(value: string) {
  return value
    .replace(/\s+/g, '')
    .replace(/^(嗯+|呃+|额+|那个[，,]?|就是[，,]?)+/g, '')
    .replace(/([，。！？])\1+/g, '$1')
    .replace(/(嗯|呃|额)(?=[，。！？])/g, '')
    .trim()
}

function inferKeywords(text: string) {
  return topicSignals
    .map((topic) => ({ label: topic.label, count: countSignals(text, topic.words) }))
    .filter((topic) => topic.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
    .map((topic) => topic.label)
}

function buildSummary(text: string) {
  const compact = text.replace(/[。！？]+/g, '，').replace(/，+/g, '，')
  if (compact.length <= 62) return compact
  return `${compact.slice(0, 61)}…`
}

export function analyzeVoiceJournal(
  transcript: string,
  metrics: VoiceAcousticMetrics,
  memory: VoiceMemory = defaultMemory,
): VoiceStateAnalysis {
  const text = transcript.toLowerCase()
  const rate = speechRate(transcript, metrics.durationSec)
  const pressureWords = countSignals(text, stateSignals.pressure)
  const lowEnergyWords = countSignals(text, stateSignals.lowEnergy)
  const unclearWords = countSignals(text, stateSignals.unclear)
  const blockedWords = countSignals(text, stateSignals.blocked)
  const groundedWords = countSignals(text, stateSignals.grounded)
  const hasUsableAudio = metrics.sampleCount > 12 && metrics.averageLevel >= 3 && metrics.pauseRatio < 0.96
  const hasBaseline = memory.baseline.samples >= 2
  const levelDelta = metrics.averageLevel - memory.baseline.averageLevel
  const rateDelta = rate - memory.baseline.speechRate
  const pauseDelta = metrics.pauseRatio - memory.baseline.pauseRatio

  let energy = 3
  if (lowEnergyWords > 0 || (hasUsableAudio && ((rate > 0 && rate < 92) || levelDelta < -14))) energy -= 1
  if (lowEnergyWords > 1 || (hasUsableAudio && rate > 0 && rate < 62)) energy -= 1
  if (hasUsableAudio && (rate > 195 || levelDelta > 15)) energy += 1
  if (groundedWords > 1 && lowEnergyWords === 0) energy += 1

  let pressure = 2 + Math.min(2, pressureWords)
  if (hasUsableAudio && (rate > 205 || metrics.levelVariability > 24)) pressure += 1
  if (hasUsableAudio && metrics.pauseRatio > 0.68 && pressureWords > 0) pressure += 1
  if (groundedWords > pressureWords) pressure -= 1
  pressure += memory.calibrationOffset

  let clarity = 3
  if (unclearWords > 0) clarity -= 1
  if (unclearWords > 1 || transcript.length < 12) clarity -= 1
  if (/[：:]/.test(transcript) || /第一|首先|最重要|我决定|我需要/.test(transcript)) clarity += 1
  if (transcript.length > 45 && unclearWords === 0) clarity += 1

  energy = clamp(Math.round(energy), 1, 5)
  pressure = clamp(Math.round(pressure), 1, 5)
  clarity = clamp(Math.round(clarity), 1, 5)

  let stateLabel = '状态可用'
  if (pressure >= 4 && energy <= 2) stateLabel = '高压耗竭'
  else if (pressure >= 4) stateLabel = '高唤醒承压'
  else if (energy <= 2) stateLabel = '低能量恢复期'
  else if (blockedWords > 0) stateLabel = '启动阻滞'
  else if (clarity <= 2) stateLabel = '思绪待收束'
  else if (groundedWords > 0) stateLabel = '平稳可行动'

  const deliverySignals: string[] = []
  if (!hasUsableAudio) {
    deliverySignals.push('声音样本不足，本轮以内容为主')
  } else if (hasBaseline) {
    deliverySignals.push(levelDelta > 9 ? '声量高于个人平时' : levelDelta < -9 ? '声量低于个人平时' : '声量接近个人平时')
    deliverySignals.push(rateDelta > 34 ? '语速比平时更快' : rateDelta < -34 ? '语速比平时更慢' : '语速接近平时')
    deliverySignals.push(pauseDelta > 0.14 ? '停顿比平时更多' : pauseDelta < -0.14 ? '表达比平时更连续' : '停顿节奏接近平时')
  } else {
    deliverySignals.push(metrics.averageLevel < 24 ? '声音能量偏轻' : metrics.averageLevel > 58 ? '声音能量较强' : '声音能量平稳')
    deliverySignals.push(rate > 190 ? '表达节奏偏快' : rate > 0 && rate < 95 ? '表达节奏偏慢' : '表达节奏适中')
    deliverySignals.push(metrics.pauseRatio > 0.62 ? '停顿较多' : metrics.pauseRatio < 0.24 ? '表达较连续' : '停顿自然')
  }

  const evidenceCount = pressureWords + lowEnergyWords + unclearWords + blockedWords + groundedWords
  const confidence = clamp(Math.round(58 + Math.min(16, evidenceCount * 4) + (hasUsableAudio ? 7 : 0) + (hasBaseline && hasUsableAudio ? 6 : 0)), 58, 88)
  const keywords = inferKeywords(text)
  const response = stateLabel === '高压耗竭'
    ? '我听见你一边在撑住，一边已经很累了。现在不需要再证明自己，先把系统负荷降下来。'
    : stateLabel === '高唤醒承压'
      ? '我听见这件事正在占用你很多内在空间。我们先让身体慢一点，再一起收窄问题。'
      : stateLabel === '低能量恢复期'
        ? '我听见你的能量正在见底。今天的优化不是逼自己更快，而是先恢复一点可用资源。'
        : stateLabel === '启动阻滞'
          ? '我听见你不是不知道该做什么，而是开始这一步的阻力太大。我们会把它缩到身体愿意启动。'
          : stateLabel === '思绪待收束'
            ? '我听见很多事情同时挤在一起。我们不急着全部解决，只找现在最值得守住的一件。'
            : '我听见你此刻仍有可用的力量。接下来把这份状态转成一个清晰、不会过载的动作。'

  return {
    stateLabel,
    confidence,
    energy,
    clarity,
    pressure,
    keywords: keywords.length ? keywords : ['今日状态'],
    deliverySignals,
    summary: buildSummary(transcript),
    response,
    acousticNote: !hasUsableAudio ? '本轮没有足够的声学样本' : hasBaseline ? '已与个人声音基线比较' : '这是第一次声音基线，后续会更贴近你',
  }
}

export function loadVoiceMemory(value?: VoiceMemory) {
  return value?.version === 1 ? value : defaultMemory
}

export function updateVoiceMemory(memoryValue: VoiceMemory | undefined, record: VoiceJournalRecord): VoiceMemory {
  const memory = loadVoiceMemory(memoryValue)
  const hasUsableAudio = record.metrics.sampleCount > 12 && record.metrics.averageLevel >= 3 && record.metrics.pauseRatio < 0.96
  const rate = speechRate(record.transcript, record.metrics.durationSec)
  const samples = memory.baseline.samples
  const nextSamples = samples + (hasUsableAudio ? 1 : 0)
  const merge = (previous: number, current: number) => Math.round(((previous * samples) + current) / nextSamples)
  const topicCounts = new Map(memory.recurringTopics.map((topic) => [topic.label, topic.count]))
  record.analysis.keywords.forEach((keyword) => topicCounts.set(keyword, (topicCounts.get(keyword) ?? 0) + 1))

  return {
    ...memory,
    voiceCount: memory.voiceCount + 1,
    baseline: hasUsableAudio ? {
      averageLevel: merge(memory.baseline.averageLevel, record.metrics.averageLevel),
      pauseRatio: Number((((memory.baseline.pauseRatio * samples) + record.metrics.pauseRatio) / nextSamples).toFixed(2)),
      speechRate: merge(memory.baseline.speechRate, rate || memory.baseline.speechRate),
      samples: nextSamples,
    } : memory.baseline,
    recurringTopics: [...topicCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    recentStates: [record.analysis.stateLabel, ...memory.recentStates].slice(0, 7),
    lastUpdated: record.timestamp,
  }
}

export function calibrateVoiceMemory(memoryValue: VoiceMemory | undefined, calibration: -1 | 0 | 1): VoiceMemory {
  const memory = loadVoiceMemory(memoryValue)
  const target = calibration === 0 ? memory.calibrationOffset * 0.7 : memory.calibrationOffset + calibration * 0.35
  return { ...memory, calibrationOffset: Number(clamp(target, -1, 1).toFixed(2)), lastUpdated: Date.now() }
}

export function rebuildVoiceMemory(records: VoiceJournalRecord[]) {
  return [...records].reverse().reduce<VoiceMemory>((memory, record) => {
    const updated = updateVoiceMemory(memory, record)
    return record.calibration === undefined ? updated : calibrateVoiceMemory(updated, record.calibration)
  }, defaultMemory)
}

export function voiceMemoryInsight(memoryValue?: VoiceMemory) {
  const memory = loadVoiceMemory(memoryValue)
  if (!memory.voiceCount) return '从第一次真实表达开始，系统会逐渐认识你的节奏与关注点。'
  const topic = memory.recurringTopics[0]?.label
  if (memory.baseline.samples < 3) return `已倾听 ${memory.voiceCount} 次${topic ? `，开始注意到「${topic}」` : ''}；再完成 ${Math.max(1, 3 - memory.baseline.samples)} 次清晰表达会建立个人基线。`
  return `已从 ${memory.voiceCount} 次表达中建立个人声音基线${topic ? `，近期常出现「${topic}」` : ''}。`
}
