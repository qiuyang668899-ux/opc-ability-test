import type { VoiceJournalRecord } from '../engines/voiceJournalEngine'

export interface VoiceCompanionRequest {
  context: string
  onComplete?: (transcript: string, record: VoiceJournalRecord) => void
}

type VoiceCompanionOpener = (request: VoiceCompanionRequest) => void

let activeOpener: VoiceCompanionOpener | null = null

export function registerVoiceCompanion(opener: VoiceCompanionOpener) {
  activeOpener = opener
  return () => {
    if (activeOpener === opener) activeOpener = null
  }
}

export function openVoiceCompanion(request: VoiceCompanionRequest) {
  activeOpener?.(request)
}
