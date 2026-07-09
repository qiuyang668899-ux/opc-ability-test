import { useMemo, useState } from 'react'
import { Music, Play, Sparkles, Volume2, Waves } from 'lucide-react'
import { MUSIC_TRACKS, type MusicTrack } from '../stores/useStore'

const scenes = [
  { id: 'focus', label: '深度专注', desc: '写作、学习、编码前进入单任务状态', tracks: ['alpha', 'deep-reading'] },
  { id: 'release', label: '压力释放', desc: '高压、烦躁、沟通前先降噪', tracks: ['pressure-release', 'heart-coherence'] },
  { id: 'sleep', label: '睡前修复', desc: '夜间过载、缓存清空、降低刺激', tracks: ['sleep-repair', 'rain'] },
  { id: 'create', label: '创造发散', desc: '选题、产品构思、灵感连接', tracks: ['gamma-spark', 'source-return'] },
]

function playTrack(track: MusicTrack, autoPlay = true) {
  window.dispatchEvent(new CustomEvent('hos-open-music', { detail: { trackId: track.id, autoPlay } }))
}

export default function MoodMusic() {
  const categories = useMemo(() => ['全部', ...Array.from(new Set(MUSIC_TRACKS.map((track) => track.category.zh)))], [])
  const [category, setCategory] = useState('全部')
  const filteredTracks = category === '全部' ? MUSIC_TRACKS : MUSIC_TRACKS.filter((track) => track.category.zh === category)

  return (
    <div className="hos-page animate-float-up">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Music size={18} className="text-hos-cyan" />
          <span className="text-[11px] text-hos-cyan font-mono tracking-wider">MOOD SOUND FIELD</span>
        </div>
        <h1 className="text-[27px] font-bold text-white leading-tight">心境音乐</h1>
        <p className="text-[13px] text-hos-text-dim leading-relaxed mt-2">
          用音场配合呼吸、专注、复盘和睡眠。这里不是医学治疗，而是状态管理的环境层。
        </p>
      </header>

      <section className="hos-card-accent p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-hos-text-muted mb-1">今日推荐 / Recommended</p>
            <h2 className="text-[19px] font-bold text-white">先选状态，再进入训练</h2>
            <p className="text-en mt-1">Choose a state before pressing play</p>
          </div>
          <div className="w-13 h-13 rounded-2xl border border-hos-cyan/25 bg-hos-cyan/10 flex items-center justify-center text-hos-cyan">
            <Waves size={24} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {scenes.map((scene) => {
            const firstTrack = MUSIC_TRACKS.find((track) => track.id === scene.tracks[0]) ?? MUSIC_TRACKS[0]
            return (
              <button
                key={scene.id}
                onClick={() => playTrack(firstTrack)}
                className="rounded-2xl border border-hos-border bg-hos-bg/45 p-3.5 text-left hover:border-hos-cyan/30 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center border border-hos-border" style={{ color: firstTrack.color, background: `${firstTrack.color}16` }}>
                    {firstTrack.icon}
                  </span>
                  <Play size={14} className="text-hos-cyan" />
                </div>
                <p className="text-[13px] font-semibold text-white">{scene.label}</p>
                <p className="text-[11px] text-hos-text-muted leading-relaxed mt-1">{scene.desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="hos-section-title">
          <div>
            <h2>音场分类</h2>
            <p>Sound Field Categories</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`px-3.5 py-2 rounded-full border text-[12px] whitespace-nowrap transition-colors ${
                category === item
                  ? 'border-hos-cyan/40 bg-hos-cyan/12 text-hos-cyan'
                  : 'border-hos-border text-hos-text-muted hover:text-hos-text-dim hover:border-hos-border-light'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {filteredTracks.map((track) => (
          <article key={track.id} className="hos-card p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border border-hos-border flex items-center justify-center text-[18px] shrink-0" style={{ color: track.color, background: `${track.color}16` }}>
                {track.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-white truncate">{track.name.zh}</h3>
                    <p className="text-en mt-0.5">{track.name.en} · {track.category.zh}</p>
                    <p className="text-[10px] text-hos-cyan/80 mt-1">
                      {track.source?.zh ?? '实时合成音场'} · {track.durationSec ?? 45}s WAV
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-hos-border text-hos-text-muted shrink-0">{track.intensity}</span>
                </div>
                <p className="text-[12px] text-hos-text-dim leading-relaxed mt-2">{track.target.zh}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl border border-hos-border/70 bg-hos-bg/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-hos-text-muted mb-1">
                      <Sparkles size={12} />
                      <span>适用</span>
                    </div>
                    <p className="text-[11px] text-hos-text-dim leading-relaxed">{track.scene.zh}</p>
                  </div>
                  <div className="rounded-xl border border-hos-border/70 bg-hos-bg/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-hos-text-muted mb-1">
                      <Volume2 size={12} />
                      <span>频率</span>
                    </div>
                    <p className="text-[11px] text-hos-text-dim leading-relaxed">{track.frequency}</p>
                  </div>
                </div>
                <button
                  onClick={() => playTrack(track)}
                  className="mt-3 rounded-xl border border-hos-cyan/25 bg-hos-cyan/10 text-hos-cyan px-4 py-2.5 text-[12px] font-semibold flex items-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Play size={13} />
                  <span>播放这个音场</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
