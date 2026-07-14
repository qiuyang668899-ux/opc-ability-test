import { useMemo, useState } from 'react'
import { Headphones, Info, Music, Play, Radio, Sparkles, Volume2, Waves } from 'lucide-react'
import { DAILY_AUDIO_TRACKS, FREQUENCY_TRACKS, type MusicTrack } from '../stores/useStore'

type LibraryMode = 'daily' | 'frequency'

const scenes = [
  { id: 'breathe', label: '海岸呼吸', desc: '焦虑时降速，跟随海浪延长呼气', trackId: 'ocean-birds' },
  { id: 'meditate', label: '静心冥想', desc: '纯音乐承接情绪，回到内在空间', trackId: 'valley-sunset' },
  { id: 'sleep', label: '睡前放空', desc: '连续雨声遮蔽突发噪音，慢慢收尾', trackId: 'rain-long-loop' },
  { id: 'work', label: '轻松工作', desc: '咖啡馆环境声，营造温和陪伴感', trackId: 'quiet-cafe' },
]

const frequencyGuide = [
  { value: '174–417Hz', title: '低刺激与情绪切换', use: '放松身体、呼吸练习、结束高压任务' },
  { value: '432Hz', title: '柔和睡前音色', use: '夜间降刺激、拉伸、准备休息' },
  { value: '528Hz', title: '慢呼吸与慈心练习', use: '情绪恢复、自我照顾、身心同步' },
  { value: '639Hz', title: '关系与表达场景', use: '沟通前稳定、慈心与连接练习' },
  { value: '741–852Hz', title: '专注与清晰感', use: '阅读、复盘、单任务工作前' },
  { value: '963Hz', title: '冥想与内省', use: '静坐、价值校准、结束一天' },
]

function playTrack(track: MusicTrack, autoPlay = true) {
  window.dispatchEvent(new CustomEvent('hos-open-music', { detail: { trackId: track.id, autoPlay } }))
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

export default function MoodMusic() {
  const [library, setLibrary] = useState<LibraryMode>('daily')
  const [category, setCategory] = useState('全部')
  const activeTracks = library === 'daily' ? DAILY_AUDIO_TRACKS : FREQUENCY_TRACKS
  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(activeTracks.map((track) => track.category.zh)))],
    [activeTracks],
  )
  const filteredTracks = category === '全部' ? activeTracks : activeTracks.filter((track) => track.category.zh === category)

  const switchLibrary = (next: LibraryMode) => {
    setLibrary(next)
    setCategory('全部')
  }

  return (
    <div className="hos-page music-page animate-float-up">
      <header className="music-header">
        <div className="music-kicker">
          <span><Music size={18} /></span>
          <p>MOOD SOUND FIELD</p>
        </div>
        <h1>心境音乐</h1>
        <p>真实场景音、冥想纯音乐与频率音场分区呈现。日常聆听不需要理解参数，只要选择此刻需要的环境。</p>
      </header>

      <section className="music-library-switch" role="tablist" aria-label="声音内容类型">
        <button role="tab" aria-selected={library === 'daily'} className={library === 'daily' ? 'active' : ''} onClick={() => switchLibrary('daily')}>
          <span><Headphones size={18} /></span>
          <div><strong>日常聆听</strong><small>场景音与纯音乐</small></div>
          <em>{DAILY_AUDIO_TRACKS.length}</em>
        </button>
        <button role="tab" aria-selected={library === 'frequency'} className={library === 'frequency' ? 'active' : ''} onClick={() => switchLibrary('frequency')}>
          <span><Radio size={18} /></span>
          <div><strong>频率合集</strong><small>按体验场景选择</small></div>
          <em>{FREQUENCY_TRACKS.length}</em>
        </button>
      </section>

      {library === 'daily' ? (
        <section className="music-scene-panel hos-card-accent">
          <div className="music-scene-heading">
            <div>
              <p>今天想进入什么环境 <span>Choose a scene</span></p>
              <h2>先选场景，再按下播放</h2>
              <small>自然声与纯音乐均可循环播放</small>
            </div>
            <div className="music-wave-mark"><Waves size={24} /></div>
          </div>

          <div className="music-scenes">
            {scenes.map((scene) => {
              const track = DAILY_AUDIO_TRACKS.find((item) => item.id === scene.trackId) ?? DAILY_AUDIO_TRACKS[0]
              return (
                <button key={scene.id} onClick={() => playTrack(track)} className="music-scene">
                  <div>
                    <span className="music-scene-icon" style={{ color: track.color, background: `${track.color}16` }}>{track.icon}</span>
                    <span className="music-scene-play"><Play size={13} /></span>
                  </div>
                  <h3>{scene.label}</h3>
                  <p>{scene.desc}</p>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="frequency-guide-panel hos-card-accent">
          <div className="frequency-guide-heading">
            <div>
              <p className="section-kicker">FREQUENCY FIELD GUIDE</p>
              <h2>频率体验场景参考</h2>
              <span>保留原有频率音场，按使用情境集中整理</span>
            </div>
            <Radio size={22} />
          </div>
          <div className="frequency-guide-grid">
            {frequencyGuide.map((item) => (
              <article key={item.value}>
                <strong>{item.value}</strong>
                <h3>{item.title}</h3>
                <p>{item.use}</p>
              </article>
            ))}
          </div>
          <div className="frequency-boundary">
            <Info size={14} />
            <p>这里标注的是声音体验与使用场景，不代表特定频率具有已经证实的医疗功效，也不能替代治疗。</p>
          </div>
        </section>
      )}

      <section className="music-categories-section">
        <div className="hos-section-title">
          <div>
            <h2>{library === 'daily' ? '日常声音分类' : '频率音场分类'}</h2>
            <p>{library === 'daily' ? 'Scenes & Instrumentals' : 'Frequency Collection'}</p>
          </div>
          <span className="music-result-count">{filteredTracks.length} 条</span>
        </div>
        <div className="music-categories">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={category === item ? 'active' : ''}>{item}</button>
          ))}
        </div>
      </section>

      <section className="music-track-list">
        {filteredTracks.map((track) => (
          <article key={track.id} className="music-track-card hos-card">
            <div className="music-track-top">
              <div className="music-track-icon" style={{ color: track.color, background: `${track.color}16` }}>{track.icon}</div>
              <div className="music-track-main">
                <div className="music-track-title-row">
                  <div className="min-w-0">
                    <div className="music-track-kind">{track.kind === 'scene' ? '真实场景音' : track.kind === 'instrumental' ? '冥想纯音乐' : '程序化频率音场'}</div>
                    <h3>{track.name.zh}</h3>
                    <p>{track.name.en} · {track.category.zh}</p>
                    <small>{track.source?.zh} · {formatDuration(track.durationSec)}</small>
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
                <div><Volume2 size={12} /><span>{track.kind === 'frequency' ? '频率标记' : '声音类型'}</span></div>
                <p>{track.frequency}</p>
              </div>
            </div>

            <button onClick={() => playTrack(track)} className="music-play-button">
              <Play size={14} />
              <span>播放并循环</span>
            </button>
          </article>
        ))}
      </section>

      <div className="music-source-note">
        <Info size={13} />
        <p>{library === 'daily' ? '场景音与纯音乐来自 Mixkit 免费许可素材，已随应用部署；曲名、作者与来源保留在每条音频中。' : '频率合集为 HOS 原创程序化音场，仅用于环境营造与个人体验。'}</p>
      </div>
    </div>
  )
}
