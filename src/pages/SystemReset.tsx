import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react'
import { BREATH_PROTOCOLS, type BreathProtocol } from '../stores/useStore'
import { UI } from '../utils/i18n'

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdOut' | 'idle'

const phaseLabels: Record<Phase, { zh: string; en: string }> = {
  inhale: { zh: '吸气', en: 'Inhale' },
  hold: { zh: '止息', en: 'Hold' },
  exhale: { zh: '呼气', en: 'Exhale' },
  holdOut: { zh: '止息', en: 'Hold' },
  idle: { zh: '准备', en: 'Ready' },
}

function playFrequency(freq: number, duration: number): AudioContext | null {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration)
    return ctx
  } catch {
    return null
  }
}

const COHERENCE_PROTOCOL: BreathProtocol = {
  char: '心', pinyin: 'XĪN', keyword: 'HEART', keywordEn: 'Heart',
  frequency: '528', freqLabel: { zh: '谐振', en: 'Coherence' },
  inhale: 5.5, hold: 0, exhale: 5.5, holdOut: 0,
  description: { zh: '心脑谐振 · 平衡自主神经', en: 'Heart-Brain Coherence · Balance ANS' },
}

function resolveProtocol(paramProtocol?: string): BreathProtocol {
  if (!paramProtocol || paramProtocol === 'coherence') return BREATH_PROTOCOLS[0]
  const normalized = paramProtocol.toLowerCase()
  return BREATH_PROTOCOLS.find((item) => item.keyword.toLowerCase() === normalized || item.keywordEn.toLowerCase() === normalized) ?? BREATH_PROTOCOLS[0]
}

export default function SystemReset() {
  const navigate = useNavigate()
  const { protocol: paramProtocol } = useParams()
  const isCoherence = paramProtocol === 'coherence'

  const [selectedProtocol, setSelectedProtocol] = useState<BreathProtocol>(
    isCoherence ? COHERENCE_PROTOCOL : resolveProtocol(paramProtocol)
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(60)

  useEffect(() => {
    if (isCoherence) {
      setSelectedProtocol(COHERENCE_PROTOCOL)
    } else {
      setSelectedProtocol(resolveProtocol(paramProtocol))
    }
  }, [isCoherence, paramProtocol])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    timerRef.current = null
    phaseTimerRef.current = null
  }, [])

  const runBreathCycle = useCallback((p: BreathProtocol) => {
    const phases: { phase: Phase; duration: number }[] = []
    if (p.inhale > 0) phases.push({ phase: 'inhale', duration: p.inhale })
    if (p.hold > 0) phases.push({ phase: 'hold', duration: p.hold })
    if (p.exhale > 0) phases.push({ phase: 'exhale', duration: p.exhale })
    if (p.holdOut > 0) phases.push({ phase: 'holdOut', duration: p.holdOut })

    let idx = 0
    const next = () => {
      if (idx >= phases.length) idx = 0
      const current = phases[idx]
      setPhase(current.phase)
      idx++
      phaseTimerRef.current = setTimeout(next, current.duration * 1000)
    }
    next()
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    setPhase('idle')
    clearTimers()
    if (audioRef.current) {
      try { audioRef.current.close() } catch { void 0 }
      audioRef.current = null
    }
  }, [clearTimers])

  const start = useCallback(() => {
    setRunning(true)
    setSeconds(totalSeconds)
    setPhase('inhale')

    const freq = parseInt(selectedProtocol.frequency)
    if (freq > 20) {
      audioRef.current = playFrequency(freq, totalSeconds)
    }

    runBreathCycle(selectedProtocol)

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          stop()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [selectedProtocol, totalSeconds, runBreathCycle, stop])

  useEffect(() => {
    return () => {
      clearTimers()
      if (audioRef.current) try { audioRef.current.close() } catch { void 0 }
    }
  }, [clearTimers])

  const circleClass = phase === 'inhale'
    ? 'animate-breathe-in'
    : phase === 'exhale'
    ? 'animate-breathe-out'
    : phase === 'hold' || phase === 'holdOut'
    ? 'animate-hold scale-115'
    : ''

  const isCoherenceMode = selectedProtocol.keyword === 'HEART'
  const accentColor = isCoherenceMode ? 'hos-gold' : 'hos-cyan'

  return (
    <div className="flex flex-col max-w-[430px] mx-auto bg-hos-bg" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl border border-hos-border flex items-center justify-center text-hos-text-dim hover:text-hos-text hover:border-hos-border-light transition-colors">
          <ArrowLeft size={18} />
        </button>
        {!isCoherenceMode && (
          <div className="flex gap-1.5 overflow-x-auto">
            {BREATH_PROTOCOLS.map((p) => (
              <button
                key={p.char}
                onClick={() => { if (!running) setSelectedProtocol(p) }}
                className={`px-3 py-1.5 rounded-xl text-[12px] border font-medium transition-all ${
                  selectedProtocol.char === p.char
                    ? 'border-hos-cyan/50 bg-hos-cyan/12 text-hos-cyan'
                    : 'border-hos-border text-hos-text-muted hover:border-hos-border-light hover:text-hos-text-dim'
                }`}
              >
                {p.char}
              </button>
            ))}
          </div>
        )}
        {isCoherenceMode && (
          <div className="text-[13px] font-bold text-hos-gold">{UI.heartBrain.zh} / {UI.heartBrain.en}</div>
        )}
        <div className="w-9" />
      </div>

      {/* Main breathing area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Outer decorative ring */}
        <div className={`absolute w-56 h-56 rounded-full border border-${accentColor}/10`} style={{ animation: 'pulse 4s ease-in-out infinite' }} />
        <div className={`absolute w-64 h-64 rounded-full border border-${accentColor}/5`} />

        {/* Main breathing circle */}
        <div className={`w-48 h-48 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-1000 ${
          isCoherenceMode
            ? 'border-hos-gold/30 bg-hos-gold/5'
            : 'border-hos-cyan/25 bg-hos-cyan/5'
        } ${running ? circleClass : ''}`}
          style={isCoherenceMode && running ? {
            animation: 'coherence 11s ease-in-out infinite',
          } : undefined}
        >
          {/* Character */}
          <span className={`text-[52px] font-bold mb-0.5 leading-none ${isCoherenceMode ? 'text-hos-gold' : 'text-hos-cyan glow-cyan'}`}>
            {selectedProtocol.char}
          </span>
          <span className={`text-[11px] tracking-[0.3em] mb-3 font-mono ${isCoherenceMode ? 'text-hos-gold/60' : 'text-hos-cyan/60'}`}>
            {selectedProtocol.pinyin}
          </span>

          {/* Phase label */}
          {running && phase !== 'idle' && (
            <div className="text-center animate-float-up">
              <p className={`text-[18px] font-medium ${isCoherenceMode ? 'text-hos-gold/80' : 'text-hos-text/80'}`}>{phaseLabels[phase].zh}</p>
              <p className="text-[11px] text-hos-text-dim">{phaseLabels[phase].en}</p>
            </div>
          )}

          {!running && (
            <div className="text-center px-6">
              <p className="text-[12px] text-hos-text-dim leading-relaxed">{selectedProtocol.description.zh}</p>
              <p className="text-en">{selectedProtocol.description.en}</p>
            </div>
          )}
        </div>

        {/* Coherence description */}
        {isCoherenceMode && !running && (
          <div className="mt-8 text-center px-10">
            <p className="text-[13px] text-hos-text-dim leading-relaxed">
              保持 5.5 秒吸气、5.5 秒呼气。
            </p>
            <p className="text-[11px] text-hos-text-muted mt-1.5">
              此频率 (0.1Hz) 可最大化心率变异性，平衡自主神经系统。
            </p>
            <p className="text-en mt-1">
              5.5s inhale, 5.5s exhale at 0.1Hz maximizes HRV and balances ANS.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 flex-shrink-0">
        {/* Timer + Frequency info */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className={`px-4 py-1.5 rounded-xl text-[14px] font-mono font-bold border ${
            isCoherenceMode
              ? 'bg-hos-gold/8 text-hos-gold border-hos-gold/20'
              : 'bg-hos-cyan/8 text-hos-cyan border-hos-cyan/20'
          }`}>
            {running ? `${seconds}s` : `${totalSeconds}s`}
          </div>
          <span className="text-[11px] text-hos-text-muted font-mono">
            {selectedProtocol.frequency}Hz · {selectedProtocol.freqLabel.zh}
          </span>
        </div>

        {/* Duration selector */}
        {!running && (
          <div className="flex justify-center gap-2 mb-3">
            {[30, 60, 120, 180, 300].map((t) => (
              <button
                key={t}
                onClick={() => setTotalSeconds(t)}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] border font-medium transition-all ${
                  totalSeconds === t
                    ? `border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor}`
                    : 'border-hos-border text-hos-text-muted hover:border-hos-border-light hover:text-hos-text-dim'
                }`}
              >
                {t < 60 ? `${t}s` : `${t / 60}m`}
              </button>
            ))}
          </div>
        )}

        {/* Play/Stop button */}
        <div className="flex justify-center gap-4">
          <button
            onClick={running ? stop : start}
            className={`w-[68px] h-[68px] rounded-full flex items-center justify-center border-2 transition-all active:scale-95 ${
              isCoherenceMode
                ? running ? 'border-hos-gold bg-hos-gold/15' : 'border-hos-gold/40 bg-hos-gold/8 hover:bg-hos-gold/15'
                : running ? 'border-hos-cyan bg-hos-cyan/15' : 'border-hos-cyan/40 bg-hos-cyan/8 hover:bg-hos-cyan/15'
            }`}
          >
            {running
              ? <Pause size={26} className={isCoherenceMode ? 'text-hos-gold' : 'text-hos-cyan'} />
              : <Play size={26} className={`ml-1 ${isCoherenceMode ? 'text-hos-gold' : 'text-hos-cyan'}`} />
            }
          </button>
          {running && (
            <button
              onClick={() => { stop(); setSeconds(totalSeconds) }}
              className="w-12 h-12 rounded-full flex items-center justify-center border border-hos-border text-hos-text-muted hover:text-hos-text hover:border-hos-border-light transition-colors self-center"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
