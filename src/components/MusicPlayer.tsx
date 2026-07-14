import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Music, Volume2, Sparkles, Waves } from 'lucide-react'
import { DAILY_AUDIO_TRACKS, FREQUENCY_TRACKS, MUSIC_TRACKS, type MusicTrack } from '../stores/useStore'
import { UI } from '../utils/i18n'

const WAVE_HEIGHTS = [8, 15, 11, 18]
const intensityGain: Record<MusicTrack['intensity'], number> = {
  低: 0.11,
  中: 0.14,
  高: 0.17,
}

type StoppableNode = {
  stop: () => void;
}

type PlaybackMode = 'audio' | 'synth';
type LibraryMode = 'daily' | 'frequency';

function createNoiseSource(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = buffer.getChannelData(0)

  let last = 0
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    output[i] = last * 3.5
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createAmbientSound(ctx: AudioContext, track: MusicTrack, volume: number) {
  const nodes: StoppableNode[] = []
  const master = ctx.createGain()
  master.gain.value = volume * intensityGain[track.intensity]
  master.connect(ctx.destination)

  track.layers.forEach((freq, index) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()

    osc.type = track.texture
    osc.frequency.value = freq
    gain.gain.value = 0.18 / (index + 1)
    lfo.frequency.value = 0.035 + index * 0.018
    lfoGain.gain.value = 0.025 / (index + 1)

    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    osc.connect(gain)
    gain.connect(master)

    osc.start()
    lfo.start()
    nodes.push(osc, lfo)
  })

  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  const noiseGain = ctx.createGain()
  filter.type = 'lowpass'
  filter.frequency.value = track.category.zh === '睡眠恢复' ? 420 : 880
  noiseGain.gain.value = track.intensity === '高' ? 0.028 : 0.018
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start()
  nodes.push(noise)

  return { nodes, master }
}

export default function MusicPlayer() {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(MUSIC_TRACKS[0])
  const [library, setLibrary] = useState<LibraryMode>('daily')
  const [category, setCategory] = useState('全部')
  const [volume, setVolume] = useState(0.58)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nodesRef = useRef<StoppableNode[]>([])
  const masterRef = useRef<GainNode | null>(null)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('audio')

  const libraryTracks = library === 'daily' ? DAILY_AUDIO_TRACKS : FREQUENCY_TRACKS
  const categories = useMemo(() => ['全部', ...Array.from(new Set(libraryTracks.map((track) => track.category.zh)))], [libraryTracks])
  const visibleTracks = useMemo(
    () => (category === '全部' ? libraryTracks : libraryTracks.filter((track) => track.category.zh === category)),
    [category, libraryTracks],
  )

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.load()
      audioRef.current = null
    }
    nodesRef.current.forEach((node) => { try { node.stop() } catch { void 0 } })
    nodesRef.current = []
    masterRef.current = null
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
  }, [])

  const playSynthTrack = useCallback((track: MusicTrack) => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const graph = createAmbientSound(ctx, track, volume)
    nodesRef.current = graph.nodes
    masterRef.current = graph.master
    setCurrentTrack(track)
    setPlaybackMode('synth')
    setPlaying(true)
  }, [volume])

  const playTrack = useCallback((track: MusicTrack) => {
    stopAudio()
    setCurrentTrack(track)

    if (!track.assetUrl) {
      playSynthTrack(track)
      return
    }

    const audio = new Audio(track.assetUrl)
    audio.loop = true
    audio.volume = volume
    audio.preload = 'auto'
    audioRef.current = audio

    audio.play()
      .then(() => {
        setPlaybackMode('audio')
        setPlaying(true)
      })
      .catch(() => {
        if (audioRef.current === audio) {
          audioRef.current = null
        }
        playSynthTrack(track)
      })
  }, [playSynthTrack, stopAudio, volume])

  const togglePlay = useCallback(() => {
    if (playing) {
      stopAudio()
      setPlaying(false)
    } else {
      playTrack(currentTrack)
    }
  }, [playing, currentTrack, playTrack, stopAudio])

  const skipTrack = useCallback((dir: number) => {
    const list = visibleTracks.length > 0 ? visibleTracks : MUSIC_TRACKS
    const idx = list.findIndex((track) => track.id === currentTrack.id)
    const next = list[(Math.max(0, idx) + dir + list.length) % list.length]
    if (playing) {
      playTrack(next)
    } else {
      setCurrentTrack(next)
    }
  }, [currentTrack, playing, playTrack, visibleTracks])

  useEffect(() => {
    if (masterRef.current && audioCtxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume * intensityGain[currentTrack.intensity], audioCtxRef.current.currentTime, 0.03)
    }
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume, currentTrack.intensity])

  useEffect(() => {
    const handleOpenMusic = (event: Event) => {
      const trackId = (event as CustomEvent<{ trackId?: string; autoPlay?: boolean }>).detail?.trackId
      const autoPlay = (event as CustomEvent<{ trackId?: string; autoPlay?: boolean }>).detail?.autoPlay
      const track = MUSIC_TRACKS.find((item) => item.id === trackId) ?? currentTrack
      setExpanded(true)
      setLibrary(track.kind === 'frequency' ? 'frequency' : 'daily')
      setCategory(track.category.zh)
      if (autoPlay) {
        playTrack(track)
      } else {
        setCurrentTrack(track)
      }
    }

    window.addEventListener('hos-open-music', handleOpenMusic)
    return () => window.removeEventListener('hos-open-music', handleOpenMusic)
  }, [currentTrack, playTrack])

  useEffect(() => {
    return () => { stopAudio() }
  }, [stopAudio])

  if (!expanded) {
    if (!playing) return null

    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-[82px] right-3 z-40 w-11 h-11 rounded-full border border-hos-cyan/30 flex items-center justify-center shadow-lg hover:border-hos-cyan/50 transition-all"
        style={{ background: 'rgba(255,253,249,0.96)', backdropFilter: 'blur(14px)', maxWidth: 'calc((100vw - 520px) / 2 + 520px - 12px)' }}
        aria-label="展开正在播放的心境音乐"
      >
        <Music size={17} className="text-hos-cyan" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-hos-green rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-[88px] right-3 left-3 z-40 max-w-[452px] mx-auto">
      <div className="border border-hos-border rounded-2xl p-4 shadow-2xl" style={{ background: 'rgba(255,253,249,0.98)', backdropFilter: 'blur(22px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-hos-cyan" />
            <div>
              <p className="text-[14px] font-semibold text-white leading-tight">{UI.musicPlayer.zh}</p>
              <p className="text-en">{UI.musicPlayer.en}</p>
            </div>
          </div>
          <button onClick={() => setExpanded(false)} className="w-8 h-8 rounded-xl border border-hos-border flex items-center justify-center text-hos-text-muted hover:text-white hover:border-hos-border-light transition-colors">
            <X size={15} />
          </button>
        </div>

        <section className="hos-card p-4 mb-4" style={{ borderLeft: `3px solid ${currentTrack.color}` }}>
          <div className="flex items-start gap-3 mb-3">
            <span className="w-11 h-11 rounded-2xl border border-hos-border flex items-center justify-center text-[18px]" style={{ color: currentTrack.color, background: `${currentTrack.color}18` }}>
              {currentTrack.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[15px] font-semibold text-white truncate">{currentTrack.name.zh}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-hos-border text-hos-text-muted shrink-0">{currentTrack.intensity}</span>
              </div>
              <p className="text-en truncate">{currentTrack.name.en} · {currentTrack.category.zh}</p>
              <p className="text-[10px] text-hos-cyan/80 mt-1">
                {playbackMode === 'audio'
                  ? currentTrack.kind === 'frequency' ? 'HOS 频率音场' : currentTrack.kind === 'instrumental' ? '冥想纯音乐' : '真实场景音'
                  : '实时合成兜底'} · {Math.floor((currentTrack.durationSec ?? 45) / 60)}:{String((currentTrack.durationSec ?? 45) % 60).padStart(2, '0')}
              </p>
              <p className="text-[12px] text-hos-text-dim leading-relaxed mt-2">{currentTrack.target.zh}</p>
            </div>
            {playing && (
              <div className="flex items-end gap-[3px] h-6 pt-1">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="w-[3px] bg-hos-cyan rounded-full"
                    style={{
                      animation: `wave 0.8s ease-in-out ${item * 0.15}s infinite alternate`,
                      height: `${WAVE_HEIGHTS[item]}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl border border-hos-border/70 bg-hos-bg/45 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] text-hos-text-muted mb-1">
                <Waves size={12} />
                <span>场景</span>
              </div>
              <p className="text-[11px] text-hos-text-dim leading-relaxed">{currentTrack.scene.zh}</p>
            </div>
            <div className="rounded-xl border border-hos-border/70 bg-hos-bg/45 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] text-hos-text-muted mb-1">
                <Sparkles size={12} />
                <span>标签</span>
              </div>
              <p className="text-[11px] text-hos-text-dim leading-relaxed">{currentTrack.tags.join(' · ')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => skipTrack(-1)} className="text-hos-text-muted hover:text-white transition-colors" aria-label="上一首">
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-hos-cyan/12 border border-hos-cyan/30 flex items-center justify-center hover:bg-hos-cyan/20 transition-all active:scale-95"
                aria-label={playing ? '暂停' : '播放'}
              >
                {playing ? <Pause size={19} className="text-hos-cyan" /> : <Play size={19} className="text-hos-cyan ml-0.5" />}
              </button>
              <button onClick={() => skipTrack(1)} className="text-hos-text-muted hover:text-white transition-colors" aria-label="下一首">
                <SkipForward size={20} />
              </button>
            </div>

            <label className="flex items-center gap-2 flex-1 max-w-[150px]">
              <Volume2 size={15} className="text-hos-text-muted shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-full accent-hos-cyan"
                aria-label="音量"
              />
            </label>
          </div>
        </section>

        <div className="player-library-tabs">
          <button
            onClick={() => { setLibrary('daily'); setCategory('全部') }}
            className={library === 'daily' ? 'active' : ''}
          >
            日常聆听 · {DAILY_AUDIO_TRACKS.length}
          </button>
          <button
            onClick={() => { setLibrary('frequency'); setCategory('全部') }}
            className={library === 'frequency' ? 'active' : ''}
          >
            频率合集 · {FREQUENCY_TRACKS.length}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`px-3 py-1.5 rounded-full border text-[11px] whitespace-nowrap transition-colors ${
                category === item
                  ? 'border-hos-cyan/40 bg-hos-cyan/12 text-hos-cyan'
                  : 'border-hos-border text-hos-text-muted hover:text-hos-text-dim hover:border-hos-border-light'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2">
          {visibleTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => playing ? playTrack(track) : setCurrentTrack(track)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all ${
                currentTrack.id === track.id
                  ? 'bg-hos-cyan/10 text-hos-text'
                  : 'text-hos-text-dim hover:bg-hos-bg hover:text-hos-text'
              }`}
            >
              <span className="w-8 h-8 rounded-xl border border-hos-border flex items-center justify-center text-[13px] shrink-0" style={{ color: track.color, background: `${track.color}14` }}>
                {track.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-semibold truncate">{track.name.zh}</span>
                <span className="block text-[10px] text-hos-text-muted truncate mt-0.5">
                  {track.category.zh} · {track.kind === 'frequency' ? track.frequency : track.kind === 'instrumental' ? '纯音乐' : '场景音'}
                </span>
              </span>
              <span className="text-[10px] text-hos-text-muted shrink-0">{track.intensity}</span>
              {currentTrack.id === track.id && playing && (
                <span className="w-2 h-2 rounded-full bg-hos-green animate-pulse shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
