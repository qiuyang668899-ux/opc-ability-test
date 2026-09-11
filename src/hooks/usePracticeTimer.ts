import { useCallback, useEffect, useRef, useState } from 'react'
import { createPracticeTimer, restorePracticeTimer, tickPracticeTimer, type PracticeTimerState } from '../utils/practiceTimer'
import { playCultivationChime, prepareCultivationChime } from '../utils/cultivationChime'

export function usePracticeTimer(durations: number[], active: boolean, autoAdvance: boolean, initial?: Partial<PracticeTimerState> | null) {
  const [session, setSession] = useState(() => restorePracticeTimer(initial ?? null, durations))
  const [audioReady, setAudioReady] = useState<boolean | null>(null)
  const lastChime = useRef(0)
  const durationsRef = useRef(durations)
  durationsRef.current = durations

  useEffect(() => {
    if (!active || !session.running) return
    const tick = () => setSession((current) => tickPracticeTimer(current, durationsRef.current, Date.now(), autoAdvance && document.visibilityState === 'visible'))
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [active, autoAdvance, session.running])

  useEffect(() => {
    if (session.endSequence > lastChime.current) {
      lastChime.current = session.endSequence
      if (active) {
        void playCultivationChime().then(setAudioReady)
        navigator.vibrate?.([45, 90, 45, 90, 70])
      }
    }
  }, [active, session.endSequence])

  const pause = useCallback(() => setSession((current) => {
    const next = tickPracticeTimer(current, durationsRef.current, Date.now(), false)
    return { ...next, running: false, deadline: null }
  }), [])
  const toggle = () => {
    if (session.running) { pause(); return }
    if (session.complete) return
    void prepareCultivationChime().then(setAudioReady)
    setSession((current) => ({ ...current, running: true, deadline: Date.now() + current.remaining * 1000 }))
  }
  const reset = (stored?: Partial<PracticeTimerState> | null) => {
    lastChime.current = 0
    setSession(stored ? restorePracticeTimer(stored, durationsRef.current) : createPracticeTimer(durationsRef.current))
  }
  const resetFor = (nextDurations: number[]) => {
    durationsRef.current = nextDurations
    lastChime.current = 0
    setSession(createPracticeTimer(nextDurations))
  }
  const startFor = (nextDurations: number[]) => {
    durationsRef.current = nextDurations
    lastChime.current = 0
    void prepareCultivationChime().then(setAudioReady)
    setSession({ ...createPracticeTimer(nextDurations), running: true, deadline: Date.now() + nextDurations[0] * 1000 })
  }
  const chooseStep = (index: number) => setSession((current) => {
    const next = tickPracticeTimer(current, durationsRef.current, Date.now(), false)
    return { ...next, stepIndex: index, remaining: durationsRef.current[index], running: false, deadline: null, complete: false }
  })
  const finish = () => setSession((current) => ({ ...tickPracticeTimer(current, durationsRef.current, Date.now(), false), complete: true, running: false, deadline: null }))
  return { session, toggle, pause, reset, resetFor, startFor, chooseStep, finish, audioReady }
}
