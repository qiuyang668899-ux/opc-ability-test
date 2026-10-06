import { loadState, saveStateBatch } from '../stores/useStore'

type VoiceDraft = { text: string; context: string; updatedAt: number }

export function loadVoiceDraft(context: string) {
  const drafts = loadState<Record<string, VoiceDraft>>('voiceDrafts', {})
  const legacy = loadState<VoiceDraft | null>('voiceDraft', null)
  return drafts[context] ?? (legacy?.context === context ? legacy : null)
}

export function voiceDraftUpdate(context: string, text: string | null) {
  const drafts = { ...loadState<Record<string, VoiceDraft>>('voiceDrafts', {}) }
  const legacy = loadState<VoiceDraft | null>('voiceDraft', null)
  if (legacy?.context && !drafts[legacy.context]) drafts[legacy.context] = legacy
  const next = text ? { context, text, updatedAt: Date.now() } : null
  if (next) drafts[context] = next
  else delete drafts[context]
  return { voiceDrafts: drafts, voiceDraft: next ?? (legacy?.context === context ? null : legacy) }
}

export function saveVoiceDraft(context: string, text: string | null) {
  return saveStateBatch(voiceDraftUpdate(context, text))
}
