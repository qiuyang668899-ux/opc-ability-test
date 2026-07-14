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
    <div className="hos-page music-page animate-float-up">
      <header className="music-header">
        <div className="music-kicker">
          <span><Music size={18} /></span>
          <p>MOOD SOUND FIELD</p>
        </div>
        <h1>心境音乐</h1>
        <p>用音场配合呼吸、专注、复盘和睡眠。这里不是医学治疗，而是状态管理的环境层。</p>
      </header>

      <section className="music-scene-panel hos-card-accent">
        <div className="music-scene-heading">
          <div>
            <p>今日推荐 <span>Recommended</span></p>
            <h2>先选状态，再进入训练</h2>
            <small>Choose a state before pressing play</small>
          </div>
          <div className="music-wave-mark"><Waves size={24} /></div>
        </div>

        <div className="music-scenes">
          {scenes.map((scene) => {
            const firstTrack = MUSIC_TRACKS.find((track) => track.id === scene.tracks[0]) ?? MUSIC_TRACKS[0]
            return (
              <button key={scene.id} onClick={() => playTrack(firstTrack)} className="music-scene">
                <div>
                  <span className="music-scene-icon" style={{ color: firstTrack.color, background: `${firstTrack.color}16` }}>
                    {firstTrack.icon}
                  </span>
                  <span className="music-scene-play"><Play size={13} /></span>
                </div>
                <h3>{scene.label}</h3>
                <p>{scene.desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="music-categories-section">
        <div className="hos-section-title">
          <div>
            <h2>音场分类</h2>
            <p>Sound Field Categories</p>
          </div>
        </div>
        <div className="music-categories">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={category === item ? 'active' : ''}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="music-track-list">
        {filteredTracks.map((track) => (
          <article key={track.id} className="music-track-card hos-card">
            <div className="music-track-top">
              <div className="music-track-icon" style={{ color: track.color, background: `${track.color}16` }}>
                {track.icon}
              </div>
              <div className="music-track-main">
                <div className="music-track-title-row">
                  <div className="min-w-0">
                    <h3>{track.name.zh}</h3>
                    <p>{track.name.en} · {track.category.zh}</p>
                    <small>{track.source?.zh ?? '实时合成音场'} · {track.durationSec ?? 45}s WAV</small>
                  </div>
                  <span className="music-intensity">{track.intensity}</span>
                </div>
                <p className="music-track-target">{track.target.zh}</p>
              </div>
            </div>

            <div className="music-track-details">
              <div>
                <div><Sparkles size={12} /><span>适用</span></div>
                <p>{track.scene.zh}</p>
              </div>
              <div>
                <div><Volume2 size={12} /><span>频率</span></div>
                <p>{track.frequency}</p>
              </div>
            </div>

            <button onClick={() => playTrack(track)} className="music-play-button">
              <Play size={14} />
              <span>播放这个音场</span>
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
