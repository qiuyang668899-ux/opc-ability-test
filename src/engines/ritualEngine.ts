import { loadState } from '../stores/useStore'

export type RitualAspirationId = 'steady' | 'clarity' | 'action' | 'compassion' | 'create' | 'freedom'
export type RitualStateId = 'storm' | 'depleted' | 'scattered' | 'stuck' | 'clear'

export interface RitualProfile {
  aspirationId: RitualAspirationId
  word: string
  title: string
  identity: string
  createdAt: number
  updatedAt: number
}

export interface RitualRecord {
  id: string
  date: string
  stateId: RitualStateId
  keyword: string
  stateLabel: string
  microAction: string
  aspirationId: RitualAspirationId
  completedAt: number
}

export interface RitualAspiration {
  id: RitualAspirationId
  word: string
  title: string
  en: string
  identity: string
  color: string
}

export interface RitualState {
  id: RitualStateId
  label: string
  hint: string
  keyword: string
  keywordEn: string
  title: string
  guidance: string
  tradition: string
  classic: string
  interpretation: string
  soundName: string
  soundAsset: string
  microActions: string[]
  seal: string
}

export const RITUAL_ASPIRATIONS: RitualAspiration[] = [
  { id: 'steady', word: '定', title: '稳定', en: 'STEADINESS', identity: '一个能安住自己，也能稳稳前行的人', color: '#b96b55' },
  { id: 'clarity', word: '明', title: '清醒', en: 'CLARITY', identity: '一个看见真实、做清醒选择的人', color: '#5c7f8b' },
  { id: 'action', word: '行', title: '行动', en: 'ACTION', identity: '一个把重要之事落到现实的人', color: '#8874a0' },
  { id: 'compassion', word: '慈', title: '慈悲', en: 'COMPASSION', identity: '一个有力量，也不失温柔的人', color: '#b67682' },
  { id: 'create', word: '创', title: '创造', en: 'CREATION', identity: '一个让内在经验成为新作品的人', color: '#bc7a45' },
  { id: 'freedom', word: '游', title: '自在', en: 'FREEDOM', identity: '一个顺势而为、保持内在自由的人', color: '#5d8a78' },
]

export const RITUAL_STATES: RitualState[] = [
  {
    id: 'storm',
    label: '压力正在升高',
    hint: '急、紧、烦，身体像在应战',
    keyword: '定',
    keywordEn: 'STILLNESS',
    title: '先定其心，再应其事',
    guidance: '今天不需要立刻解决全部问题。先让呼气变长，让身体知道：此刻可以慢一点。',
    tradition: '道家 · 守静',
    classic: '致虚极，守静笃。',
    interpretation: '静不是逃避，而是在行动前收回被外界夺走的主导权。',
    soundName: '海岸呼吸',
    soundAsset: 'audio/scenes/ocean-birds.mp3',
    microActions: ['关闭一个非必要通知', '把最急的事写成一句话', '放松下颌与肩膀一次'],
    seal: '你没有被压力带走。你先安住了自己。',
  },
  {
    id: 'depleted',
    label: '能量已经见底',
    hint: '疲惫、迟钝，不想继续硬撑',
    keyword: '养',
    keywordEn: 'RESTORE',
    title: '养其根，不催其花',
    guidance: '恢复不是停滞，而是生命系统最重要的维护。今天允许自己减少，而不是增加。',
    tradition: '道家 · 养生',
    classic: '少则得，多则惑。',
    interpretation: '真正的恢复往往始于减法：少一点输入，才能让内在资源重新聚拢。',
    soundName: '晨光森林',
    soundAsset: 'audio/scenes/morning-forest.mp3',
    microActions: ['慢慢喝三口水', '删掉一件非必要任务', '闭眼休息两分钟'],
    seal: '你没有继续透支。你正在学习照顾自己的根。',
  },
  {
    id: 'scattered',
    label: '注意力很分散',
    hint: '想法太多，不知道先做什么',
    keyword: '简',
    keywordEn: 'SIMPLIFY',
    title: '知道停在哪里，心才会定',
    guidance: '此刻不缺更多答案，只缺一个边界。把今天缩到一个能看见、能开始的动作。',
    tradition: '儒家 · 知止',
    classic: '知止而后有定。',
    interpretation: '先确定什么最重要，注意力才不必继续在所有可能之间流浪。',
    soundName: '林间流水',
    soundAsset: 'audio/scenes/flowing-water.mp3',
    microActions: ['写下今天唯一目标', '关掉两个无关页面', '只做最重要任务两分钟'],
    seal: '你从复杂中取回了一条清楚的路。',
  },
  {
    id: 'stuck',
    label: '知道，但无法开始',
    hint: '拖延、抗拒，启动成本很高',
    keyword: '行',
    keywordEn: 'BEGIN',
    title: '不要等准备好，先向前一寸',
    guidance: '阻力不是命令。把任务缩小到几乎不可能失败，让身体先于情绪开始。',
    tradition: '儒家 · 笃行',
    classic: '虽覆一篑，进，吾往也。',
    interpretation: '成长不依赖宏大的冲动，而依赖此刻仍愿意放下的这一小篑土。',
    soundName: '柔和节拍',
    soundAsset: 'audio/scenes/relax-beat.mp3',
    microActions: ['只打开要处理的文件', '发出第一条必要消息', '只完成任务的开头'],
    seal: '你没有等待动力。行动本身已经开始生成动力。',
  },
  {
    id: 'clear',
    label: '状态清楚可用',
    hint: '平稳、清醒，准备做重要的事',
    keyword: '明',
    keywordEn: 'CLARITY',
    title: '心不滞留，行动自然流动',
    guidance: '不必把好状态消耗在更多选择上。守住一个方向，把清醒变成完成。',
    tradition: '禅修 · 无住',
    classic: '应无所住，而生其心。',
    interpretation: '不困在结果与评价里，反而能更完整地投入眼前这一件事。',
    soundName: '山谷暮光',
    soundAsset: 'audio/scenes/valley-sunset.mp3',
    microActions: ['圈出今天最重要的结果', '开始一轮 25 分钟专注', '完成后写下一个反馈'],
    seal: '你把清醒变成了方向，也把方向变成了行动。',
  },
]

export function ritualTodayKey() {
  return new Date().toLocaleDateString('en-CA')
}

export function loadRitualProfile() {
  return loadState<RitualProfile | undefined>('ritualProfile', undefined)
}

export function loadRitualRecords() {
  return loadState<RitualRecord[]>('ritualRecords', [])
}

export function getTodayRitualRecord() {
  const today = ritualTodayKey()
  return loadRitualRecords().find((record) => record.date === today)
}

export function getRitualState(id?: string) {
  return RITUAL_STATES.find((state) => state.id === id) ?? RITUAL_STATES[2]
}

export function getRitualAspiration(id?: string) {
  return RITUAL_ASPIRATIONS.find((aspiration) => aspiration.id === id) ?? RITUAL_ASPIRATIONS[0]
}
