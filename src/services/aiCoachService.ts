import type { CoachSnapshot } from '../engines/coachEngine'

export const HOS_MODULE_IDS = [
  'reset_pressure',
  'reset_overload',
  'reset_sleep',
  'reset_emotion',
  'reset_coherence',
  'music_pressure',
  'music_sleep',
  'music_focus',
  'flow',
  'architect',
  'journal',
  'classics',
  'visual',
] as const

export type HOSModuleId = (typeof HOS_MODULE_IDS)[number]
export type HOSAIMode = 'stabilize' | 'clarify' | 'execute' | 'recover' | 'learn' | 'reflect'

export type HOSAIInsight = {
  engine: 'deepseek'
  stateLabel: string
  mode: HOSAIMode
  confidence: number
  coreNeed: string
  response: string
  hypothesis: string
  bodyStep: string
  actionStep: string
  reflectionStep: string
  reframe: string
  question: string
  commitment: string
  recommendedModules: HOSModuleId[]
  rationale: string
}

type AnalysisSource = 'text' | 'voice'

type AnalysisRequest = {
  text: string
  source: AnalysisSource
  snapshot: CoachSnapshot
  recentUserMessages?: string[]
  signal?: AbortSignal
}

function endpoint() {
  const configured = String(import.meta.env.VITE_HOS_AI_ENDPOINT ?? '').trim()
  if (configured) return configured
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('github.io')) return null
  return '/api/hos-coach'
}

export function hasHOSAIEndpoint() {
  return Boolean(endpoint())
}

export function coachErrorMessage(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
    ? '云端等待已结束，已切换到本机建议。'
    : error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : '云端暂时不可用，已切换到本机建议。'
}

export async function checkHOSAIConnection() {
  const target = endpoint()
  if (!target) return '当前站点没有配置云端教练地址。本机建议、语音归档和练习仍可使用。'
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(target, { method: 'GET', signal: controller.signal, cache: 'no-store' })
    const value = await response.json()
    return response.ok && value.ready === true
      ? '服务端已配置。实际模型可用性以发送后的结果为准；本次检查没有发送日记内容。'
      : '服务端尚未就绪，请检查部署配置。本次检查没有发送日记内容。'
  } catch { return '未能连接到云端教练。本机功能可继续使用。' }
  finally { window.clearTimeout(timeout) }
}

function contextFromSnapshot(snapshot: CoachSnapshot) {
  return {
    checkIn: snapshot.checkIn
      ? {
          energy: snapshot.checkIn.energy,
          clarity: snapshot.checkIn.clarity,
          pressure: snapshot.checkIn.pressure,
          intention: snapshot.checkIn.intention,
        }
      : null,
    latestVoice: snapshot.latestVoice
      ? {
          stateLabel: snapshot.latestVoice.analysis.stateLabel,
          energy: snapshot.latestVoice.analysis.energy,
          clarity: snapshot.latestVoice.analysis.clarity,
          pressure: snapshot.latestVoice.analysis.pressure,
          keywords: snapshot.latestVoice.analysis.keywords,
        }
      : null,
    ritual: snapshot.ritualKeyword
      ? { keyword: snapshot.ritualKeyword, action: snapshot.ritualAction }
      : null,
    recentPractice: {
      activationCompletion: snapshot.activationCompletion,
      journalCount: snapshot.journalCount,
      flowCount: snapshot.flowCount,
      selfReportedOutcomes: snapshot.recentPracticeOutcomes?.map(({ title, seconds, before, after }) => ({ title, seconds, before, after })) ?? [],
      personallyHelpful: snapshot.helpfulPractice ? { title: snapshot.helpfulPractice.title, samples: snapshot.helpfulPractice.count, averageSelfReportedChange: snapshot.helpfulPractice.delta / snapshot.helpfulPractice.count } : null,
    },
  }
}

function isInsight(value: unknown): value is HOSAIInsight {
  if (!value || typeof value !== 'object') return false
  const insight = value as Partial<HOSAIInsight>
  return insight.engine === 'deepseek'
    && ['stabilize', 'clarify', 'execute', 'recover', 'learn', 'reflect'].includes(insight.mode ?? '')
    && ['stateLabel', 'coreNeed', 'response', 'hypothesis', 'bodyStep', 'actionStep', 'reflectionStep', 'reframe', 'question', 'commitment', 'rationale'].every((key) => typeof (insight as Record<string, unknown>)[key] === 'string')
    && typeof insight.confidence === 'number' && Number.isFinite(insight.confidence) && insight.confidence >= 0 && insight.confidence <= 100
    && Array.isArray(insight.recommendedModules)
    && insight.recommendedModules.length > 0 && insight.recommendedModules.length <= 3
    && insight.recommendedModules.every((moduleId) => HOS_MODULE_IDS.includes(moduleId))
}

export async function requestHOSCoachAnalysis({
  text,
  source,
  snapshot,
  recentUserMessages = [],
  signal,
}: AnalysisRequest): Promise<HOSAIInsight> {
  const target = endpoint()
  if (!target) throw new Error('当前站点未配置云端教练，已使用本机建议。')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = window.setTimeout(abort, 30_000)
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 4000),
        source,
        context: contextFromSnapshot(snapshot),
        recentUserMessages: recentUserMessages.slice(-4).map((message) => message.slice(0, 800)),
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { code?: string }
      const notices: Record<string, string> = {
        usage_limit: '已触发云端用量保护，请稍后再试；若今日额度用完，将于北京时间 08:00 恢复。本机建议和日志仍可使用。',
        provider_balance: 'AI 服务余额不足，已切换本机建议。请应用维护者补充 DeepSeek 余额。',
        provider_auth: 'AI 服务授权需要维护，已切换本机建议。',
        provider_busy: 'DeepSeek 当前较忙，请稍后再试；本机建议已就绪。',
        provider_timeout: '云端本次响应较慢，已保留记录并切换本机建议。',
      }
      throw new Error(notices[failure.code ?? ''] || (response.status === 429 ? '云端请求较多，请稍后再试；本机建议已就绪。' : '云端暂时无法完成分析，已使用本机建议。'))
    }
    const value: unknown = await response.json()
    if (!isInsight(value)) throw new Error('云端返回内容不完整，已保留本机建议。')
    return value
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
