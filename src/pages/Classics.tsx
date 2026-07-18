import { useEffect, useMemo, useState } from 'react'
import {
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Heart,
  LibraryBig,
  Pause,
  Play,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react'
import {
  CLASSIC_CATEGORIES,
  CLASSIC_NEEDS,
  CLASSIC_PASSAGES,
  type ClassicCategory,
  type ClassicNeed,
} from '../data/classics'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'

type PracticeNote = { passageId: string; text: string; createdAt: number }
type PracticeCompletion = { passageId: string; createdAt: number; duration: number }

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function includesQuery(query: string, values: string[]) {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true
  return values.join(' ').toLocaleLowerCase().includes(normalized)
}

function currentTimestamp() {
  return Date.now()
}

export default function Classics() {
  const [dailyIndex] = useState(() => Math.floor(Date.now() / 86400000) % CLASSIC_PASSAGES.length)
  const [category, setCategory] = useState<'全部' | ClassicCategory>('全部')
  const [need, setNeed] = useState<'全部需要' | ClassicNeed>('全部需要')
  const [query, setQuery] = useState('')
  const [passageId, setPassageId] = useState(CLASSIC_PASSAGES[dailyIndex].id)
  const [favorites, setFavorites] = useState<string[]>(() => loadState<string[]>('classicFavorites', []))
  const [completionCount, setCompletionCount] = useState(() => loadState<PracticeCompletion[]>('classicPracticeCompletions', []).length)
  const passage = CLASSIC_PASSAGES.find((item) => item.id === passageId) ?? CLASSIC_PASSAGES[0]
  const notes = loadState<PracticeNote[]>('classicPracticeNotes', [])
  const existingNote = notes.find((item) => item.passageId === passage.id)
  const [note, setNote] = useState(existingNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(existingNote))
  const [seconds, setSeconds] = useState(passage.duration * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  const filtered = useMemo(() => CLASSIC_PASSAGES.filter((item) => {
    const inCategory = category === '全部' || item.category === category
    const forNeed = need === '全部需要' || item.needs.includes(need)
    const matchesQuery = includesQuery(query, [
      item.title,
      item.work,
      item.chapter,
      item.tradition,
      item.original,
      item.reflection,
      item.method,
      item.practice,
      ...item.tags,
    ])
    return inCategory && forNeed && matchesQuery
  }), [category, need, query])

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const choosePassage = (id: string) => {
    const next = CLASSIC_PASSAGES.find((item) => item.id === id) ?? passage
    const savedNotes = loadState<PracticeNote[]>('classicPracticeNotes', [])
    const prior = savedNotes.find((item) => item.passageId === id)
    const recent = loadState<string[]>('classicRecentReads', [])
    saveState('classicRecentReads', [id, ...recent.filter((item) => item !== id)].slice(0, 12))
    setPassageId(id)
    setNote(prior?.text ?? '')
    setSaved(Boolean(prior))
    setSeconds(next.duration * 60)
    setRunning(false)
    setCompleted(false)
    window.speechSynthesis?.cancel()
  }

  const currentFilteredIndex = filtered.findIndex((item) => item.id === passage.id)

  const movePassage = (direction: -1 | 1) => {
    if (!filtered.length) return
    const start = currentFilteredIndex < 0 ? 0 : currentFilteredIndex
    const nextIndex = (start + direction + filtered.length) % filtered.length
    choosePassage(filtered[nextIndex].id)
  }

  const speakOriginal = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(passage.original)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.78
    window.speechSynthesis.speak(utterance)
  }

  const toggleFavorite = () => {
    const next = favorites.includes(passage.id)
      ? favorites.filter((item) => item !== passage.id)
      : [passage.id, ...favorites]
    setFavorites(next)
    saveState('classicFavorites', next)
  }

  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    const next = [
      { passageId: passage.id, text: note.trim(), createdAt: currentTimestamp() },
      ...current.filter((item) => item.passageId !== passage.id),
    ].slice(0, 100)
    saveState('classicPracticeNotes', next)
    setSaved(true)
  }

  const finishPractice = () => {
    const current = loadState<PracticeCompletion[]>('classicPracticeCompletions', [])
    const next = [{ passageId: passage.id, createdAt: currentTimestamp(), duration: passage.duration }, ...current].slice(0, 365)
    saveState('classicPracticeCompletions', next)
    setCompletionCount(next.length)
    setRunning(false)
    setCompleted(true)
  }

  return (
    <div className="hos-page classics-page animate-float-up">
      <section className="classic-library-hero">
        <div className="classic-library-mark"><LibraryBig size={24} /></div>
        <div>
          <p className="section-kicker">HOS · 文明经典馆</p>
          <h1>从千年智慧，到此刻的一步</h1>
          <p>不急着相信某个答案。先读原意，再理解路径，最后用一次小练习亲自验证。</p>
        </div>
        <div className="classic-library-stats">
          <span><strong>{CLASSIC_PASSAGES.length}</strong>精读单元</span>
          <span><strong>{CLASSIC_CATEGORIES.length - 1}</strong>知识传统</span>
          <span><strong>{completionCount}</strong>完成修习</span>
        </div>
      </section>

      <section className="classic-three-layers" aria-label="道法术阅读路径">
        <div><span>道</span><strong>看见原则</strong><small>世界观 · 价值 · 规律</small></div>
        <div><span>法</span><strong>理解路径</strong><small>方法 · 次第 · 边界</small></div>
        <div><span>术</span><strong>此刻践行</strong><small>呼吸 · 反省 · 行动</small></div>
      </section>

      <section className="cbeta-portal">
        <div className="cbeta-portal-icon"><BookOpenText size={22} /></div>
        <div>
          <p className="section-kicker">佛典原典入口 · CBETA 2026.R1</p>
          <h2>需要深读时，回到完整原典</h2>
          <p>CBETA 收录 4,882 部、22,037 卷汉文佛典。HOS 提供轻量导读与修习转化，版本、上下文和校勘请以原站为准。</p>
        </div>
        <a href="https://cbetaonline.dila.edu.tw/" target="_blank" rel="noreferrer">进入全藏检索<ExternalLink size={14} /></a>
      </section>

      <section className="classic-discovery">
        <div className="hos-section-title">
          <div><p className="section-kicker">找到此刻需要的智慧</p><h2>可以说，也可以搜索</h2></div>
          <span className="classic-result-count">{filtered.length} 条</span>
        </div>
        <div className="voice-enabled-control classic-search-control">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} placeholder="例如：焦虑、行动、关系、呼吸……" />
          <VoiceInputButton value={query} onChange={setQuery} maxLength={80} label="说出你想寻找的经典主题" />
        </div>

        <div className="classic-filter-block">
          <span>传统</span>
          <div className="classic-categories">
            {CLASSIC_CATEGORIES.map((item) => (
              <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="classic-filter-block">
          <span>此刻需要</span>
          <div className="classic-categories classic-needs">
            {CLASSIC_NEEDS.map((item) => (
              <button key={item} className={need === item ? 'active' : ''} onClick={() => setNeed(item)}>{item}</button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="classic-shelf">
            {filtered.map((item) => (
              <button key={item.id} className={item.id === passage.id ? 'active' : ''} onClick={() => choosePassage(item.id)}>
                <span className="classic-shelf-index">{item.category.slice(0, 1)}</span>
                <span><small>{item.tradition} · {item.work}</small><strong>{item.title}</strong><em>{item.duration} 分钟 · {item.tags.slice(0, 2).join(' / ')}</em></span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="classic-empty"><Search size={22} /><strong>暂时没有匹配内容</strong><p>换一个关键词，或清除筛选后再找找。</p><button onClick={() => { setQuery(''); setCategory('全部'); setNeed('全部需要') }}>查看全部经典</button></div>
        )}
      </section>

      <article className="reading-card" id="classic-reading-card">
        <div className="reading-meta">
          <span>{passage.category} · {passage.tradition}</span>
          <span>{passage.work} · {passage.chapter}</span>
        </div>
        <div className="reading-title-row">
          <div><p>{passage.sourceKind}</p><h2>{passage.title}</h2></div>
          <button onClick={toggleFavorite} className={favorites.includes(passage.id) ? 'favorite active' : 'favorite'} aria-label={favorites.includes(passage.id) ? '取消收藏' : '收藏'}><Heart size={18} fill={favorites.includes(passage.id) ? 'currentColor' : 'none'} /></button>
        </div>
        <blockquote>{passage.original}</blockquote>
        <button onClick={speakOriginal} className="read-aloud"><Volume2 size={16} />慢速朗读这一段</button>

        <div className="reading-path-grid">
          <div className="reading-guide">
            <span>道</span><div><p className="section-kicker">看见原则</p><p>{passage.reflection}</p></div>
          </div>
          <div className="reading-method">
            <span>法</span><div><p className="section-kicker">理解路径</p><p>{passage.method}</p></div>
          </div>
          <div className="practice-card">
            <span>术</span><div><strong>此刻修习</strong><p>{passage.practice}</p></div>
          </div>
        </div>

        {passage.sourceNote && <p className="passage-source-note">{passage.sourceNote}</p>}
        {passage.sourceUrl && <a className="passage-source-link" href={passage.sourceUrl} target="_blank" rel="noreferrer">前往 CBETA 核对原典<ExternalLink size={13} /></a>}

        <div className="reading-nav">
          <button onClick={() => movePassage(-1)} aria-label="上一篇"><ChevronLeft size={18} /></button>
          <span>{currentFilteredIndex >= 0 ? currentFilteredIndex + 1 : '—'} / {filtered.length || '—'}</span>
          <button onClick={() => movePassage(1)} aria-label="下一篇"><ChevronRight size={18} /></button>
        </div>
      </article>

      <section className="practice-timer">
        <div><p className="section-kicker">安住计时</p><h2>{formatTime(seconds)}</h2><span><Clock3 size={13} />建议 {passage.duration} 分钟</span></div>
        <div>
          <button onClick={() => setRunning((current) => !current)} className="primary-action">{running ? <Pause size={17} /> : <Play size={17} />}{running ? '暂停' : '开始'}</button>
          <button onClick={() => { setRunning(false); setSeconds(passage.duration * 60); setCompleted(false) }} className="icon-action" aria-label="重置计时"><RotateCcw size={16} /></button>
        </div>
        <button onClick={finishPractice} className={completed ? 'practice-complete active' : 'practice-complete'}><Check size={15} />{completed ? '本次已完成' : '完成本次修习'}</button>
      </section>

      <section className="reflection-note">
        <div className="hos-section-title"><div><p className="section-kicker">闻 · 思 · 修 · 记</p><h2>这一段对今天的我意味着什么？</h2></div>{saved && <span className="check-badge"><Check size={12} />已保存</span>}</div>
        <div className="voice-enabled-control textarea">
          <textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 500)); setSaved(false) }} className="hos-input" placeholder="点话筒，说出这一段对今天的意义……" />
          <VoiceInputButton value={note} onChange={(value) => { setNote(value); setSaved(false) }} maxLength={500} label="用语音记录修习体会" />
        </div>
        <button onClick={saveNote} className="secondary-action w-full"><Save size={16} />保存本次体会</button>
      </section>

      <section className="classic-boundary">
        <Sparkles size={16} />
        <p><strong>保持开放，也保持严谨。</strong>古籍选段用于个人学习；义旨转述与科学模型均明确标注。HOS 的“今读”和练习不是宗教权威解释，也不替代学术研究、医疗或心理治疗。</p>
      </section>
    </div>
  )
}
