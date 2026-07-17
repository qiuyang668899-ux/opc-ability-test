import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceAcousticMetrics } from '../engines/voiceJournalEngine'

type CaptureStatus = 'idle' | 'requesting' | 'listening' | 'review' | 'error'

interface RecognitionAlternativeLike { transcript: string }
interface RecognitionResultLike { isFinal: boolean; 0: RecognitionAlternativeLike }
interface RecognitionEventLike { resultIndex: number; results: ArrayLike<RecognitionResultLike> }
interface RecognitionErrorLike { error: string }
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorLike) => void) | null
  onend: (() => void) | null
}
type RecognitionConstructor = new () => RecognitionLike

function getRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

const emptyMetrics: VoiceAcousticMetrics = {
  durationSec: 0,
  averageLevel: 0,
  levelVariability: 0,
  peakLevel: 0,
  pauseRatio: 0,
  sampleCount: 0,
}

export function useVoiceCapture() {
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [liveLevel, setLiveLevel] = useState(0)
  const [metrics, setMetrics] = useState<VoiceAcousticMetrics>(emptyMetrics)
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const animationRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const activeRef = useRef(false)
  const samplesRef = useRef<number[]>([])

  const supported = typeof window !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices && Boolean(getRecognitionConstructor())

  const cleanupMedia = useCallback(() => {
    activeRef.current = false
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
    if (timerRef.current) window.clearInterval(timerRef.current)
    animationRef.current = null
    timerRef.current = null
    recognitionRef.current?.stop()
    recognitionRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close()
    audioContextRef.current = null
  }, [])

  const finalizeMetrics = useCallback(() => {
    const samples = samplesRef.current
    const durationSec = Math.max(1, (Date.now() - startedAtRef.current) / 1000)
    if (!samples.length) {
      setMetrics({ ...emptyMetrics, durationSec: Number(durationSec.toFixed(1)) })
      return
    }
    const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length
    const variance = samples.reduce((sum, sample) => sum + ((sample - average) ** 2), 0) / samples.length
    const result: VoiceAcousticMetrics = {
      durationSec: Number(durationSec.toFixed(1)),
      averageLevel: Math.round(average),
      levelVariability: Math.round(Math.sqrt(variance)),
      peakLevel: Math.round(Math.max(...samples)),
      pauseRatio: Number((samples.filter((sample) => sample < 13).length / samples.length).toFixed(2)),
      sampleCount: samples.length,
    }
    setMetrics(result)
  }, [])

  const stop = useCallback(() => {
    if (!activeRef.current) return
    finalizeMetrics()
    cleanupMedia()
    setLiveLevel(0)
    setInterimTranscript('')
    setStatus('review')
    navigator.vibrate?.([18, 30, 22])
  }, [cleanupMedia, finalizeMetrics])

  const start = useCallback(async () => {
    if (!supported || status === 'requesting' || status === 'listening') {
      if (!supported) {
        setError('当前浏览器暂不支持语音转写，请使用最新版 Chrome、Edge 或 Safari。')
        setStatus('error')
      }
      return
    }
    setStatus('requesting')
    setError('')
    setTranscript('')
    setInterimTranscript('')
    setElapsedSec(0)
    setMetrics(emptyMetrics)
    samplesRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      })
      const Recognition = getRecognitionConstructor()
      if (!Recognition) throw new Error('Speech recognition unavailable')
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      const buffer = new Uint8Array(analyser.fftSize)
      const recognition = new Recognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.onresult = (event) => {
        let finalText = ''
        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (!result) continue
          if (result.isFinal) finalText += result[0]?.transcript ?? ''
          else interimText += result[0]?.transcript ?? ''
        }
        if (finalText) setTranscript((previous) => `${previous}${finalText}`)
        setInterimTranscript(interimText)
      }
      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return
        setError(event.error === 'not-allowed' ? '需要允许麦克风权限，才能倾听并记录。' : '刚才没有听清，请再试一次。')
      }
      recognition.onend = () => {
        if (activeRef.current) {
          try { recognition.start() } catch { /* browser restart race */ }
        }
      }

      streamRef.current = stream
      audioContextRef.current = audioContext
      recognitionRef.current = recognition
      activeRef.current = true
      startedAtRef.current = Date.now()
      setStatus('listening')
      recognition.start()
      timerRef.current = window.setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250)

      const analyze = () => {
        if (!activeRef.current) return
        analyser.getByteTimeDomainData(buffer)
        let squareSum = 0
        for (const item of buffer) {
          const centered = (item - 128) / 128
          squareSum += centered * centered
        }
        const rms = Math.sqrt(squareSum / buffer.length)
        const level = Math.min(100, rms * 390)
        samplesRef.current.push(level)
        setLiveLevel(Math.round(level))
        animationRef.current = window.requestAnimationFrame(analyze)
      }
      analyze()
      navigator.vibrate?.(18)
    } catch (captureError) {
      cleanupMedia()
      const namedError = captureError as DOMException
      setError(namedError.name === 'NotAllowedError' ? '麦克风权限没有打开。请允许后再试；声音原始录音不会被保存。' : '暂时无法打开麦克风，请检查浏览器权限。')
      setStatus('error')
    }
  }, [cleanupMedia, status, supported])

  const reset = useCallback(() => {
    cleanupMedia()
    setStatus('idle')
    setTranscript('')
    setInterimTranscript('')
    setElapsedSec(0)
    setLiveLevel(0)
    setMetrics(emptyMetrics)
    setError('')
  }, [cleanupMedia])

  useEffect(() => cleanupMedia, [cleanupMedia])

  return {
    supported,
    status,
    transcript,
    interimTranscript,
    elapsedSec,
    liveLevel,
    metrics,
    error,
    start,
    stop,
    reset,
    setTranscript,
  }
}
