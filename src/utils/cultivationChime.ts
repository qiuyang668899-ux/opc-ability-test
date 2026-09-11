let cultivationAudioContext: AudioContext | null = null

export function getChimeVolume() {
  try { return Math.max(0.1, Math.min(1, Number(localStorage.getItem('hos_chimeVolume') ?? 0.7))) || 0.7 } catch { return 0.7 }
}
export function setChimeVolume(value: number) {
  try { localStorage.setItem('hos_chimeVolume', String(value)) } catch { /* preference only */ }
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

function getAudioContext() {
  if (cultivationAudioContext) return cultivationAudioContext
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext
  if (!AudioContextClass) return null
  cultivationAudioContext = new AudioContextClass()
  return cultivationAudioContext
}

function strike(context: AudioContext, startAt: number, strength: number) {
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, startAt)
  master.gain.exponentialRampToValueAtTime(0.34 * strength * getChimeVolume(), startAt + 0.012)
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + 3.2)
  master.connect(context.destination)

  const partials = [
    { ratio: 1, gain: 0.52, decay: 2.9 },
    { ratio: 2.01, gain: 0.25, decay: 2.15 },
    { ratio: 3.91, gain: 0.12, decay: 1.28 },
    { ratio: 5.43, gain: 0.055, decay: 0.72 },
  ]

  partials.forEach((partial, index) => {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = index < 2 ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(1174.66 * partial.ratio, startAt)
    oscillator.detune.setValueAtTime(index % 2 ? 2.5 : -1.5, startAt)
    envelope.gain.setValueAtTime(0.0001, startAt)
    envelope.gain.exponentialRampToValueAtTime(partial.gain, startAt + 0.006)
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + partial.decay)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(startAt)
    oscillator.stop(startAt + partial.decay + 0.08)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); if (index === 0) master.disconnect() }
  })
}

function scheduleThreeChimes(context: AudioContext) {
  const startAt = context.currentTime + 0.045
  strike(context, startAt, 0.92)
  strike(context, startAt + 0.76, 0.82)
  strike(context, startAt + 1.52, 1)
}

/** 在用户点击开始时调用，解除 iOS/安卓浏览器的音频播放限制。 */
export async function prepareCultivationChime() {
  const context = getAudioContext()
  if (!context) return false
  try {
    if (context.state === 'suspended') await context.resume()
    const silent = context.createBufferSource()
    silent.buffer = context.createBuffer(1, 1, context.sampleRate)
    silent.connect(context.destination)
    silent.start()
    return context.state === 'running'
  } catch {
    return false
  }
}

/** 环节自然结束时播放三声清脆引磬，不依赖外部音频文件。 */
export async function playCultivationChime() {
  if (!await prepareCultivationChime()) return false
  const context = getAudioContext()
  if (!context) return false
  scheduleThreeChimes(context)
  return true
}
