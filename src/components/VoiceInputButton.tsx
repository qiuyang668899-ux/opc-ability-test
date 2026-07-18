import { Mic } from 'lucide-react'
import { openVoiceCompanion } from './voiceCompanionBus'

interface VoiceInputButtonProps {
  value: string
  onChange: (value: string) => void
  label?: string
  maxLength?: number
}

export default function VoiceInputButton({ value, onChange, label = '用语音输入', maxLength }: VoiceInputButtonProps) {
  const open = () => {
    openVoiceCompanion({
      context: label,
      onComplete: (transcript) => {
        const separator = value.trim() ? '，' : ''
        onChange(`${value}${separator}${transcript}`.slice(0, maxLength ?? 2000))
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
