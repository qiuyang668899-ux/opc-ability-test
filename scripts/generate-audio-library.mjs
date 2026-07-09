import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'audio')

const sampleRate = 44100
const durationSec = 45

const tracks = [
  { id: 'morning-boot', layers: [196, 247, 396, 528], texture: 'triangle', intensity: 'mid', noise: 0.018, movement: 0.24 },
  { id: 'alpha', layers: [110, 220, 440, 852], texture: 'sine', intensity: 'mid', noise: 0.012, movement: 0.16 },
  { id: 'gamma-spark', layers: [174, 348, 639, 963], texture: 'triangle', intensity: 'high', noise: 0.016, movement: 0.34 },
  { id: 'pressure-release', layers: [87, 174, 261.63, 528], texture: 'sine', intensity: 'low', noise: 0.014, movement: 0.12 },
  { id: 'rain', layers: [52, 104, 208, 417], texture: 'triangle', intensity: 'low', noise: 0.04, movement: 0.10 },
  { id: 'theta', layers: [64, 128, 256, 417], texture: 'sine', intensity: 'low', noise: 0.014, movement: 0.08 },
  { id: 'heart-coherence', layers: [66, 132, 264, 528], texture: 'sine', intensity: 'low', noise: 0.012, movement: 0.09 },
  { id: 'sleep-repair', layers: [54, 108, 216, 432], texture: 'sine', intensity: 'low', noise: 0.018, movement: 0.06 },
  { id: 'cafe', layers: [120, 180, 300, 480], texture: 'triangle', intensity: 'mid', noise: 0.04, movement: 0.18 },
  { id: 'wind', layers: [99, 198, 396, 528], texture: 'triangle', intensity: 'low', noise: 0.03, movement: 0.11 },
  { id: 'ritual-drum', layers: [185, 370, 555, 741], texture: 'sawtooth', intensity: 'high', noise: 0.018, movement: 0.42 },
  { id: 'deep-reading', layers: [106, 212, 424, 639], texture: 'sine', intensity: 'mid', noise: 0.012, movement: 0.13 },
  { id: 'compassion', layers: [132, 264, 528, 639], texture: 'sine', intensity: 'low', noise: 0.012, movement: 0.10 },
  { id: 'source-return', layers: [132, 264, 528, 963], texture: 'triangle', intensity: 'mid', noise: 0.014, movement: 0.15 },
]

const gains = {
  low: 0.18,
  mid: 0.23,
  high: 0.28,
}

function fract(value) {
  return value - Math.floor(value)
}

function seededNoise(index, seed) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453) * 2 - 1
}

function oscillator(phase, texture) {
  if (texture === 'triangle') {
    return 2 * Math.asin(Math.sin(phase)) / Math.PI
  }
  if (texture === 'sawtooth') {
    return 2 * (phase / (Math.PI * 2) - Math.floor(0.5 + phase / (Math.PI * 2)))
  }
  return Math.sin(phase)
}

function softClip(value) {
  return Math.tanh(value * 1.28)
}

function generateTrack(track) {
  const frameCount = sampleRate * durationSec
  const data = new Int16Array(frameCount * 2)
  const baseGain = gains[track.intensity]
  const seed = tracks.findIndex((item) => item.id === track.id) + 1
  let brown = 0

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / sampleRate
    const intro = Math.min(1, t / 3)
    const outro = Math.min(1, (durationSec - t) / 4)
    const fade = Math.max(0, Math.min(intro, outro))
    const breath = 0.78 + 0.22 * Math.sin(Math.PI * 2 * t / 11)
    const pulse = track.id === 'ritual-drum'
      ? 0.78 + 0.22 * Math.pow(Math.max(0, Math.sin(Math.PI * 2 * t * 1.15)), 8)
      : 1

    let left = 0
    let right = 0

    track.layers.forEach((freq, layerIndex) => {
      const slow = Math.sin(Math.PI * 2 * t * (0.018 + layerIndex * 0.007) + seed)
      const detune = 1 + slow * track.movement * 0.002
      const phase = Math.PI * 2 * freq * detune * t + layerIndex * 0.73
      const wave = oscillator(phase, track.texture)
      const overtone = Math.sin(phase * 2.003 + slow) * 0.22
      const pan = Math.sin(Math.PI * 2 * t * (0.009 + layerIndex * 0.003) + layerIndex)
      const amp = (0.52 / (layerIndex + 1)) * breath * pulse
      left += (wave + overtone) * amp * (0.9 - pan * 0.13)
      right += (wave + overtone) * amp * (0.9 + pan * 0.13)
    })

    const white = seededNoise(i, seed)
    brown = (brown + 0.025 * white) / 1.025
    const air = brown * 3.2 * track.noise
    const shimmer = Math.sin(Math.PI * 2 * t * 0.071 + seed) * track.noise * 0.35

    left = softClip((left * baseGain + air + shimmer) * fade)
    right = softClip((right * baseGain + air - shimmer) * fade)

    data[i * 2] = Math.max(-32768, Math.min(32767, Math.round(left * 32767)))
    data[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(right * 32767)))
  }

  return data
}

function writeWav(path, data) {
  const channels = 2
  const bitsPerSample = 16
  const blockAlign = channels * bitsPerSample / 8
  const byteRate = sampleRate * blockAlign
  const dataBytes = data.length * 2
  const buffer = Buffer.alloc(44 + dataBytes)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)

  for (let i = 0; i < data.length; i += 1) {
    buffer.writeInt16LE(data[i], 44 + i * 2)
  }

  writeFileSync(path, buffer)
}

mkdirSync(outDir, { recursive: true })

const manifest = {
  generatedAt: new Date().toISOString(),
  format: 'wav',
  sampleRate,
  channels: 2,
  durationSec,
  source: 'Local AI-style procedural sound-field generator',
  tracks: tracks.map((track) => ({
    id: track.id,
    file: `./audio/${track.id}.wav`,
    durationSec,
  })),
}

for (const track of tracks) {
  writeWav(join(outDir, `${track.id}.wav`), generateTrack(track))
  console.log(`generated ${track.id}.wav`)
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`audio library ready: ${outDir}`)
