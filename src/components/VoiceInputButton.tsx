import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

interface RecognitionAlternativeLike { transcript: string }
interface RecognitionResultLike { isFinal: boolean; 0: RecognitionAlternativeLike }
interface RecognitionEventLike { resultIndex: number; results: ArrayLike<RecognitionResultLike> }
interface RecognitionErrorLike { error: string }
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorLike) => void) | null
  onend: (() => void) | null
}
type RecognitionConstructor = new () => RecognitionLike

function recognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

interface VoiceInputButtonProps {
  value: string
  onChange: (value: string) => void
  label?: string
  maxLength?: number
}

export default function VoiceInputButton({ value, onChange, label = '用语音输入', maxLength }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState('')
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const workingValueRef = useRef(value)
  const supported = typeof window !== 'undefined' && Boolean(recognitionConstructor())

  const stop = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
    setNotice('')
  }

  const toggle = () => {
    if (listening) {
      stop()
      return
    }
    const Recognition = recognitionConstructor()
    if (!Recognition) {
      setNotice('当前浏览器暂不支持语音输入')
      window.setTimeout(() => setNotice(''), 2600)
      return
    }
    const recognition = new Recognition()
    workingValueRef.current = value
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let finalText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result?.isFinal) finalText += result[0]?.transcript ?? ''
      }
      if (!finalText) return
      const separator = workingValueRef.current.trim() ? '，' : ''
      const next = `${workingValueRef.current}${separator}${finalText}`.slice(0, maxLength ?? 2000)
      workingValueRef.current = next
      onChange(next)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') setNotice(event.error === 'not-allowed' ? '请允许麦克风权限' : '没有听清，请再试一次')
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
      window.setTimeout(() => setNotice(''), 1800)
    }
    recognitionRef.current = recognition
    setListening(true)
    setNotice('正在听，你可以直接说…')
    recognition.start()
    navigator.vibrate?.(14)
  }

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return (
    <span className="voice-field-action">
      <button type="button" className={listening ? 'listening' : ''} onClick={toggle} aria-label={listening ? '停止语音输入' : label} disabled={!supported && Boolean(notice)}>
        {listening ? <Square size={14} /> : <Mic size={17} />}
      </button>
      {notice && <small role="status">{notice}</small>}
    </span>
  )
}
