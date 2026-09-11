export interface PracticeTimerState {
  date: string
  stepIndex: number
  remaining: number
  running: boolean
  complete: boolean
  deadline: number | null
  spent: number[]
  completedSteps: number[]
  endSequence: number
}

export const practiceDate = () => new Date().toLocaleDateString('en-CA')

export function createPracticeTimer(durations: number[]): PracticeTimerState {
  return { date: practiceDate(), stepIndex: 0, remaining: durations[0], running: false, complete: false, deadline: null, spent: durations.map(() => 0), completedSteps: [], endSequence: 0 }
}

export function restorePracticeTimer(value: Partial<PracticeTimerState> | null, durations: number[]): PracticeTimerState {
  const initial = createPracticeTimer(durations)
  if (!value || value.date !== initial.date || !Number.isInteger(value.stepIndex) || value.stepIndex! < 0 || value.stepIndex! >= durations.length) return initial
  const stepIndex = value.stepIndex!
  const remaining = typeof value.remaining === 'number' && Number.isFinite(value.remaining)
    ? Math.max(0, Math.min(durations[stepIndex], value.remaining)) : durations[stepIndex]
  return { ...initial, stepIndex, remaining, complete: Boolean(value.complete || (stepIndex === durations.length - 1 && remaining === 0)),
    // Legacy progress cannot prove elapsed time. Preserve the position, not invented minutes.
    spent: durations.map((duration, index) => Math.max(0, Math.min(duration, Number(value.spent?.[index]) || 0))),
    completedSteps: (value.completedSteps ?? []).filter((index) => Number.isInteger(index) && index >= 0 && index < durations.length),
  }
}

/** Use a deadline, not interval counts. A late callback never consumes unstarted steps. */
export function tickPracticeTimer(state: PracticeTimerState, durations: number[], now: number, autoAdvance: boolean): PracticeTimerState {
  if (!state.running || state.deadline === null) return state
  const remaining = Math.max(0, Math.ceil((state.deadline - now) / 1000))
  if (remaining === state.remaining) return state
  const spent = [...state.spent]
  spent[state.stepIndex] = Math.min(durations[state.stepIndex], spent[state.stepIndex] + Math.max(0, state.remaining - remaining))
  if (remaining > 0) return { ...state, remaining, spent }
  const completedSteps = [...new Set([...state.completedSteps, state.stepIndex])]
  const endSequence = state.endSequence + 1
  const nextIndex = state.stepIndex + 1
  if (nextIndex >= durations.length) return { ...state, remaining: 0, running: false, deadline: null, complete: true, spent, completedSteps, endSequence }
  return { ...state, stepIndex: nextIndex, remaining: durations[nextIndex], running: autoAdvance, deadline: autoAdvance ? now + durations[nextIndex] * 1000 : null, spent, completedSteps, endSequence }
}
