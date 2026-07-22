import type { CoachMode, CoachPlan } from './coachEngine'
import type { VoiceStateAnalysis } from './voiceJournalEngine'
import { loadState, saveState } from '../stores/useStore'
import type { HOSAIInsight, HOSModuleId } from '../services/aiCoachService'

export type RegulationStep = {
  id: string
  title: string
  reason: string
  action: string
  route: string
  minutes: number
}

export type RegulationJourney = {
  id: string
  createdAt: number
  stateLabel: string
  coreNeed: string
  rationale: string
  currentStep: number
  steps: RegulationStep[]
}

const journeySteps: Record<CoachMode, RegulationStep[]> = {
  stabilize: [
    { id: 'settle-body', title: '先让身体慢下来', reason: '高唤醒时先恢复安全感，思考才会重新可用。', action: '完成一轮温和呼吸重置', route: '/reset/pressure', minutes: 3 },
    { id: 'sound-buffer', title: '用音景隔开噪声', reason: '减少外部刺激，让注意力从警觉回到稳定。', action: '选择压力释放或雨夜清理', route: '/music?intent=pressure', minutes: 8 },
    { id: 'name-one-thing', title: '只收束一件事', reason: '稳定后再把问题缩小，避免重新过载。', action: '让教练帮你确定唯一下一步', route: '/architect', minutes: 4 },
  ],
  clarify: [
    { id: 'reduce-input', title: '先停止继续输入', reason: '思绪混乱时，继续收集信息只会增加负荷。', action: '完成信息过载重置', route: '/reset/overload', minutes: 3 },
    { id: 'sort-needs', title: '把问题分成三层', reason: '区分现在、稍后和无需处理，重新获得边界。', action: '和教练完成一次问题收束', route: '/architect', minutes: 5 },
    { id: 'one-focus', title: '进入一个专注回合', reason: '清晰要通过行动反馈继续巩固。', action: '启动最小专注练习', route: '/flow', minutes: 10 },
  ],
  execute: [
    { id: 'tiny-start', title: '把开始缩到两分钟', reason: '启动阻力通常来自任务过大，而不是意志不足。', action: '进入最小行动训练', route: '/flow', minutes: 2 },
    { id: 'focus-sound', title: '建立行动环境', reason: '稳定的声音线索能减少再次切换和分心。', action: '播放深度专注音景', route: '/music?intent=focus', minutes: 12 },
    { id: 'capture-feedback', title: '留下真实反馈', reason: '记录哪里顺、哪里卡，让下一轮推荐更准确。', action: '在日志中说下这一轮感受', route: '/journal', minutes: 2 },
  ],
  recover: [
    { id: 'permit-rest', title: '先允许系统降速', reason: '能量见底时，恢复本身就是最高优先级任务。', action: '完成睡眠与恢复重置', route: '/reset/sleep', minutes: 5 },
    { id: 'recovery-sound', title: '进入低刺激音景', reason: '用连续、柔和的环境声帮助神经系统退出警觉。', action: '选择睡前修复或晨间启动', route: '/music?intent=sleep', minutes: 10 },
    { id: 'reset-tomorrow', title: '只安排明天第一步', reason: '恢复期不做复杂规划，只给未来留下一个入口。', action: '让教练生成明日保底动作', route: '/architect', minutes: 3 },
  ],
  learn: [
    { id: 'clear-channel', title: '清出一个学习通道', reason: '先降低无关输入，避免把努力消耗在切换上。', action: '完成专注校准', route: '/reset/coherence', minutes: 3 },
    { id: 'practice-loop', title: '练一个最小子技能', reason: '清晰目标、适度难度和即时反馈构成有效练习。', action: '进入心流学习舱', route: '/flow', minutes: 15 },
    { id: 'consolidate', title: '用一句话完成巩固', reason: '回忆和复述能把刚才的练习转成长时记忆线索。', action: '语音说下今天真正学会了什么', route: '/journal', minutes: 2 },
  ],
  reflect: [
    { id: 'emotion-space', title: '先给情绪一点空间', reason: '被看见的情绪才不需要用更强烈的方式表达。', action: '完成情绪重置', route: '/reset/emotion', minutes: 4 },
    { id: 'separate-layers', title: '分开事实、感受与需要', reason: '把纠缠拆开，才能看见边界和可选择的回应。', action: '让教练陪你梳理这段关系', route: '/architect', minutes: 6 },
    { id: 'return-wisdom', title: '借经典重新安放自己', reason: '在更长的时间尺度里看见关系与行动。', action: '阅读一段适合此刻的经典', route: '/classics', minutes: 5 },
  ],
}

const moduleSteps: Record<HOSModuleId, RegulationStep> = {
  reset_pressure: { id: 'reset-pressure', title: '先让身体慢下来', reason: '高唤醒时先恢复安全感，思考才会重新可用。', action: '完成一轮温和呼吸重置', route: '/reset/pressure', minutes: 3 },
  reset_overload: { id: 'reset-overload', title: '先停止继续输入', reason: '思绪混乱时，继续收集信息只会增加负荷。', action: '完成信息过载重置', route: '/reset/overload', minutes: 3 },
  reset_sleep: { id: 'reset-sleep', title: '允许系统进入恢复', reason: '能量不足时先减载，之后的行动才可持续。', action: '完成睡眠与恢复重置', route: '/reset/sleep', minutes: 5 },
  reset_emotion: { id: 'reset-emotion', title: '先给情绪一点空间', reason: '被看见的情绪才不需要用更强烈的方式表达。', action: '完成情绪整合重置', route: '/reset/emotion', minutes: 4 },
  reset_coherence: { id: 'reset-coherence', title: '清出一个专注通道', reason: '降低无关输入，让注意力重新变得可用。', action: '完成专注校准', route: '/reset/coherence', minutes: 3 },
  music_pressure: { id: 'music-pressure', title: '用音景缓冲压力', reason: '连续柔和的声音帮助系统从警觉回到稳定。', action: '播放压力释放音景', route: '/music?intent=pressure', minutes: 8 },
  music_sleep: { id: 'music-sleep', title: '进入低刺激音景', reason: '减少新的信息，让身体更容易进入修复节律。', action: '播放睡前修复音景', route: '/music?intent=sleep', minutes: 10 },
  music_focus: { id: 'music-focus', title: '建立专注环境', reason: '稳定的场景音乐可以减少切换和分心。', action: '播放深度专注音景', route: '/music?intent=focus', minutes: 12 },
  flow: { id: 'flow', title: '只做一个最小回合', reason: '用低阻力行动获得真实反馈，而不是继续空想。', action: '启动最小专注练习', route: '/flow', minutes: 10 },
  architect: { id: 'architect', title: '把问题收束到一层', reason: '一次只澄清一个关键变量，重新获得选择感。', action: '和状态教练继续梳理', route: '/architect', minutes: 5 },
  journal: { id: 'journal', title: '留下真实反馈', reason: '把感受和结果留下，下一轮推荐会更了解你。', action: '语音说下这一轮感受', route: '/journal', minutes: 2 },
  classics: { id: 'classics', title: '借经典重新安放自己', reason: '换到更长的时间尺度，看见另一种理解与行动。', action: '阅读一段适合此刻的经典', route: '/classics', minutes: 5 },
  visual: { id: 'visual', title: '用视觉看见隐性状态', reason: '语言说不清时，非语言线索能帮助继续觉察。', action: '完成一次视觉状态诊断', route: '/visual', minutes: 4 },
}

function chooseSteps(plan: CoachPlan, insight?: HOSAIInsight) {
  const selected = insight?.recommendedModules.map((moduleId) => moduleSteps[moduleId]) ?? []
  const unique = selected.filter((step, index) => selected.findIndex((item) => item.id === step.id) === index)
  for (const step of journeySteps[plan.mode]) {
    if (unique.length >= 3) break
    if (!unique.some((item) => item.route === step.route && item.action === step.action)) unique.push(step)
  }
  return unique.slice(0, 3)
}

function createJourney(
  state: Pick<VoiceStateAnalysis, 'stateLabel' | 'keywords' | 'energy' | 'clarity' | 'pressure'>,
  plan: CoachPlan,
  insight?: HOSAIInsight,
): RegulationJourney {
  const steps = chooseSteps(plan, insight)
  return {
    id: `journey-${Date.now()}`,
    createdAt: Date.now(),
    stateLabel: state.stateLabel,
    coreNeed: plan.coreNeed,
    rationale: insight?.rationale
      ?? `根据你表达中的「${state.keywords.slice(0, 2).join('、') || '此刻状态'}」以及能量 ${state.energy}/5、清晰 ${state.clarity}/5、压力 ${state.pressure}/5，先处理最影响状态的环节，再进入行动。`,
    currentStep: 0,
    steps,
  }
}

export function buildRegulationJourney(analysis: VoiceStateAnalysis, plan: CoachPlan, insight?: HOSAIInsight) {
  return createJourney(analysis, plan, insight)
}

export function buildTextRegulationJourney(
  text: string,
  plan: CoachPlan,
  state?: { energy?: number; clarity?: number; pressure?: number },
  insight?: HOSAIInsight,
) {
  return createJourney({
    stateLabel: plan.stateLabel,
    keywords: text.split(/[，。！？、\s]+/).filter(Boolean).slice(0, 2),
    energy: state?.energy ?? 3,
    clarity: state?.clarity ?? 3,
    pressure: state?.pressure ?? 3,
  }, plan, insight)
}

export function activateRegulationJourney(journey: RegulationJourney) {
  saveState('activeRegulationJourney', { ...journey, currentStep: 0 })
  window.dispatchEvent(new CustomEvent('hos:journey-updated'))
}

export function loadActiveRegulationJourney() {
  return loadState<RegulationJourney | null>('activeRegulationJourney', null)
}

export function updateActiveRegulationJourney(journey: RegulationJourney | null) {
  saveState('activeRegulationJourney', journey)
  window.dispatchEvent(new CustomEvent('hos:journey-updated'))
}

export function completeRegulationJourney(journey: RegulationJourney) {
  const history = loadState<RegulationJourney[]>('regulationJourneyHistory', [])
  saveState('regulationJourneyHistory', [{ ...journey, currentStep: journey.steps.length }, ...history].slice(0, 90))
  updateActiveRegulationJourney(null)
}
