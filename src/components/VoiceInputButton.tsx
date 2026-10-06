import { Mic } from 'lucide-react'
import { openVoiceCompanion } from './voiceCompanionBus'

interface VoiceInputButtonProps {
  value: string
  onChange: (value: string) => void
  label?: string
  maxLength?: number
  onComplete?: (value: string) => void
}

export default function VoiceInputButton({ value, onChange, label = '用语音输入', maxLength, onComplete }: VoiceInputButtonProps) {
  const open = () => {
    openVoiceCompanion({
      context: label,
      mode: 'dictation',
      onComplete: (transcript) => {
        const separator = value.trim() ? '，' : ''
        const next = `${value}${separator}${transcript}`.slice(0, maxLength ?? 2000)
        onChange(next)
        onComplete?.(next)
      },
    })
    navigator.vibrate?.(14)
  }

  return (
    <span className="voice-field-action">
      <button type="button" onClick={open} aria-label={label}>
        <Mic size={17} />
      </button>
    </span>
  )
}
