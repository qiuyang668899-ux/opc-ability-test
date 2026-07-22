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
    },
  }
}

function isInsight(value: unknown): value is HOSAIInsight {
  if (!value || typeof value !== 'object') return false
  const insight = value as Partial<HOSAIInsight>
  return insight.engine === 'deepseek'
    && typeof insight.response === 'string'
    && typeof insight.mode === 'string'
    && Array.isArray(insight.recommendedModules)
}

export async function requestHOSCoachAnalysis({
  text,
  source,
  snapshot,
  recentUserMessages = [],
}: AnalysisRequest): Promise<HOSAIInsight> {
  const target = endpoint()
  if (!target) throw new Error('AI coach endpoint is not configured on this host')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 22_000)
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
    if (!response.ok) throw new Error(`AI coach unavailable (${response.status})`)
    const value: unknown = await response.json()
    if (!isInsight(value)) throw new Error('AI coach returned an invalid response')
    return value
  } finally {
    window.clearTimeout(timeout)
  }
}
