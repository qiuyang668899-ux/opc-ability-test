import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceAcousticMetrics } from '../engines/voiceJournalEngine'

type CaptureStatus = 'idle' | 'requesting' | 'listening' | 'finalizing' | 'review' | 'manual' | 'error'

interface RecognitionAlternativeLike { transcript: string }
interface RecognitionResultLike { isFinal?: boolean; 0: RecognitionAlternativeLike }
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

function prefersChunkedRecognition() {
  return /MicroMessenger|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function shouldAvoidParallelMicrophoneCapture() {
  return /MicroMessenger|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function mergeTranscript(previous: string, incoming: string) {
  const next = incoming.trim()
  if (!next || previous.endsWith(next)) return previous
  if (next.startsWith(previous)) return next

  const maxOverlap = Math.min(previous.length, next.length)
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (previous.slice(-size) === next.slice(0, size)) return `${previous}${next.slice(size)}`
  }
  return `${previous}${next}`
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
  const finalizationTimerRef = useRef<number | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const activeRef = useRef(false)
  const stoppingRef = useRef(false)
  const samplesRef = useRef<number[]>([])
  const transcriptRef = useRef('')
  const interimRef = useRef('')

  const recognitionAvailable = typeof window !== 'undefined' && Boolean(getRecognitionConstructor())
  const microphoneAvailable = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  const supported = recognitionAvailable

  const stopSampling = useCallback(() => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    animationRef.current = null
    timerRef.current = null
    restartTimerRef.current = null
    setLiveLevel(0)
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close()
    audioContextRef.current = null
  }, [])

  const finishReview = useCallback(() => {
    if (!stoppingRef.current) return
    if (finalizationTimerRef.current) window.clearTimeout(finalizationTimerRef.current)
    finalizationTimerRef.current = null

    const lastInterim = interimRef.current.trim()
    if (lastInterim) transcriptRef.current = mergeTranscript(transcriptRef.current, lastInterim)
    interimRef.current = ''
    setTranscript(transcriptRef.current)
    setInterimTranscript('')
    stoppingRef.current = false
    recognitionRef.current = null
    releaseStream()
    setStatus('review')
  }, [releaseStream])

  const scheduleFinishReview = useCallback((delay = 900) => {
    if (finalizationTimerRef.current) window.clearTimeout(finalizationTimerRef.current)
    finalizationTimerRef.current = window.setTimeout(finishReview, delay)
  }, [finishReview])

  const cleanupMedia = useCallback(() => {
    activeRef.current = false
    stoppingRef.current = false
    if (finalizationTimerRef.current) window.clearTimeout(finalizationTimerRef.current)
    finalizationTimerRef.current = null
    stopSampling()
    try { recognitionRef.current?.abort() } catch { /* recognition may already be closed */ }
    recognitionRef.current = null
    releaseStream()
  }, [releaseStream, stopSampling])

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

  const startOptionalSampling = useCallback(async () => {
    if (!microphoneAvailable || shouldAvoidParallelMicrophoneCapture()) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      })
      if (!activeRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      const buffer = new Uint8Array(analyser.fftSize)

      streamRef.current = stream
      audioContextRef.current = audioContext

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
    } catch {
      // Speech recognition owns the microphone. Acoustic sampling is best-effort
      // and must never prevent a transcript from being captured.
    }
  }, [microphoneAvailable])

  const stop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    stoppingRef.current = true
    finalizeMetrics()
    stopSampling()
    setStatus('finalizing')
    try {
      recognitionRef.current?.stop()
    } catch {
      finishReview()
      return
    }
    scheduleFinishReview(1800)
    navigator.vibrate?.([18, 30, 22])
  }, [finalizeMetrics, finishReview, scheduleFinishReview, stopSampling])

  const start = useCallback(async () => {
    if (status === 'requesting' || status === 'listening' || status === 'finalizing') return

    setError('')
    setTranscript('')
    setInterimTranscript('')
    setElapsedSec(0)
    setMetrics(emptyMetrics)
    transcriptRef.current = ''
    interimRef.current = ''
    samplesRef.current = []

    if (!recognitionAvailable) {
      setError('当前内置浏览器没有提供自动转写能力。你仍可点输入框，使用手机键盘上的话筒说，说完即可整理保存。')
      setStatus('manual')
      return
    }
    setStatus('requesting')
    try {
      const Recognition = getRecognitionConstructor()
      if (!Recognition) throw new Error('Speech recognition unavailable')
      const recognition = new Recognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = !prefersChunkedRecognition()
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.onresult = (event) => {
        let finalText = ''
        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (!result) continue
          const heard = result[0]?.transcript ?? ''
          if (result.isFinal === false) interimText += heard
          else finalText += heard
        }
        if (finalText) {
          transcriptRef.current = mergeTranscript(transcriptRef.current, finalText)
          setTranscript(transcriptRef.current)
        }
        interimRef.current = interimText
        setInterimTranscript(interimText)
        if (stoppingRef.current) scheduleFinishReview(650)
      }
      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return
        const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event.error)
        const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? '当前浏览器没有允许自动转写。点输入框后，可直接使用手机键盘上的话筒继续说。'
          : event.error === 'audio-capture'
            ? '麦克风暂时被其他功能占用。点输入框后，可使用手机键盘上的话筒继续说。'
            : '当前内置浏览器的转写服务没有连接成功。已经听到的内容会保留，也可用手机键盘话筒继续说。'
        setError(message)
        if (fatal) {
          activeRef.current = false
          stoppingRef.current = false
          stopSampling()
          releaseStream()
          recognitionRef.current = null
          setStatus('manual')
        }
      }
      recognition.onend = () => {
        if (stoppingRef.current) {
          scheduleFinishReview(900)
          return
        }
        if (activeRef.current) {
          const completedChunk = interimRef.current.trim()
          if (completedChunk) {
            transcriptRef.current = mergeTranscript(transcriptRef.current, completedChunk)
            interimRef.current = ''
            setTranscript(transcriptRef.current)
            setInterimTranscript('')
          }
          restartTimerRef.current = window.setTimeout(() => {
            if (!activeRef.current) return
            try { recognition.start() } catch { /* browser restart race */ }
          }, 120)
        }
      }

      recognitionRef.current = recognition
      activeRef.current = true
      stoppingRef.current = false
      startedAtRef.current = Date.now()
      // Start recognition while the user's tap still owns browser activation.
      // Awaiting getUserMedia first breaks speech start in several mobile webviews.
      recognition.start()
      setStatus('listening')
      timerRef.current = window.setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250)
      void startOptionalSampling()
      navigator.vibrate?.(18)
    } catch (captureError) {
      cleanupMedia()
      const namedError = captureError as DOMException
      setError(namedError.name === 'NotAllowedError' ? '麦克风权限没有打开。请允许后再试；声音原始录音不会被保存。' : '暂时无法打开麦克风，请检查浏览器权限。')
      setStatus('error')
    }
  }, [cleanupMedia, recognitionAvailable, releaseStream, scheduleFinishReview, startOptionalSampling, status, stopSampling])

  const reset = useCallback(() => {
    cleanupMedia()
    setStatus('idle')
    setTranscript('')
    setInterimTranscript('')
    setElapsedSec(0)
    setLiveLevel(0)
    setMetrics(emptyMetrics)
    setError('')
    transcriptRef.current = ''
    interimRef.current = ''
  }, [cleanupMedia])

  const useManualFallback = useCallback(() => {
    cleanupMedia()
    setError('当前浏览器的自动转写没有连接成功。点输入框后，可直接使用手机键盘上的话筒继续说。')
    setStatus('manual')
  }, [cleanupMedia])

  useEffect(() => cleanupMedia, [cleanupMedia])

  return {
    supported,
    recognitionAvailable,
    microphoneAvailable,
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
    useManualFallback,
    setTranscript,
  }
}
