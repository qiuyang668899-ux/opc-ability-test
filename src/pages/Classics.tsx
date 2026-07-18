import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  BookMarked,
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
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SunMedium,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import {
  CLASSIC_CATEGORIES,
  CLASSIC_NEEDS,
  CLASSIC_PASSAGES,
  type ClassicCategory,
  type ClassicNeed,
} from '../data/classics'
import { COMPLETE_CLASSIC_BOOKS, findCompleteClassicBook } from '../data/completeClassics'
import {
  OPEN_CLASSICS_CATALOG,
  OPEN_CLASSIC_CATEGORIES,
  findOpenClassic,
  type OpenClassicCategory,
} from '../data/openClassicsCatalog'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'
import CompleteClassicReader from '../components/CompleteClassicReader'
import OpenCorpusReader from '../components/OpenCorpusReader'

type PracticeNote = { passageId: string; text: string; createdAt: number }
type PracticeCompletion = { passageId: string; createdAt: number; duration: number }
type ReaderMode = 'original' | 'guide' | 'parallel'
type ReaderTone = 'paper' | 'quiet' | 'night'

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
  const [readerOpen, setReaderOpen] = useState(false)
  const [completeBookId, setCompleteBookId] = useState<string | null>(null)
  const [openBookName, setOpenBookName] = useState<string | null>(null)
  const [corpusQuery, setCorpusQuery] = useState('')
  const [corpusCategory, setCorpusCategory] = useState<'全部' | OpenClassicCategory>('全部')
  const [showAllCorpus, setShowAllCorpus] = useState(false)
  const [readerMode, setReaderMode] = useState<ReaderMode>(() => loadState<ReaderMode>('classicReaderMode', 'parallel'))
  const [readerTone, setReaderTone] = useState<ReaderTone>(() => loadState<ReaderTone>('classicReaderTone', 'paper'))
  const [readerFontSize, setReaderFontSize] = useState(() => loadState<number>('classicReaderFontSize', 20))
  const [readerProgress, setReaderProgress] = useState(0)
  const readerContentRef = useRef<HTMLDivElement>(null)
  const progressSaveTimerRef = useRef<number | null>(null)
  const completeBook = findCompleteClassicBook(completeBookId)
  const openBook = findOpenClassic(openBookName)
  const openCorpusCatalog = useMemo(() => OPEN_CLASSICS_CATALOG.filter((book) => book.name !== '心经'), [])
  const corpusFiltered = useMemo(() => openCorpusCatalog.filter((book) => {
    const categoryMatches = corpusCategory === '全部' || book.category === corpusCategory
    const queryMatches = includesQuery(corpusQuery, [book.name, book.category, book.description])
    return categoryMatches && queryMatches
  }), [corpusCategory, corpusQuery, openCorpusCatalog])
  const visibleCorpus = showAllCorpus || corpusQuery.trim() || corpusCategory !== '全部' ? corpusFiltered : corpusFiltered.slice(0, 12)
  const bilingualTitleCount = openCorpusCatalog.length + COMPLETE_CLASSIC_BOOKS.length

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

  useEffect(() => {
    if (!readerOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [readerOpen])

  useEffect(() => {
    if (!readerOpen) return
    const progressMap = loadState<Record<string, number>>('classicReadingProgress', {})
    const savedProgress = Math.max(0, Math.min(100, progressMap[passage.id] ?? 0))
    window.requestAnimationFrame(() => {
      setReaderProgress(savedProgress)
      const content = readerContentRef.current
      if (!content) return
      const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight)
      content.scrollTop = maxScroll * (savedProgress / 100)
    })
  }, [passage.id, readerOpen])

  useEffect(() => () => {
    if (progressSaveTimerRef.current) window.clearTimeout(progressSaveTimerRef.current)
  }, [])

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

  const openPassage = (id: string) => {
    choosePassage(id)
    setReaderOpen(true)
  }

  const closeReader = () => {
    window.speechSynthesis?.cancel()
    setReaderOpen(false)
  }

  const updateReaderMode = (mode: ReaderMode) => {
    setReaderMode(mode)
    saveState('classicReaderMode', mode)
  }

  const updateReaderFontSize = (next: number) => {
    const size = Math.max(16, Math.min(28, next))
    setReaderFontSize(size)
    saveState('classicReaderFontSize', size)
  }

  const cycleReaderTone = () => {
    const next: ReaderTone = readerTone === 'paper' ? 'quiet' : readerTone === 'quiet' ? 'night' : 'paper'
    setReaderTone(next)
    saveState('classicReaderTone', next)
  }

  const trackReaderProgress = () => {
    const content = readerContentRef.current
    if (!content) return
    const maxScroll = Math.max(1, content.scrollHeight - content.clientHeight)
    const progress = Math.max(0, Math.min(100, Math.round((content.scrollTop / maxScroll) * 100)))
    setReaderProgress(progress)
    if (progressSaveTimerRef.current) window.clearTimeout(progressSaveTimerRef.current)
    progressSaveTimerRef.current = window.setTimeout(() => {
      const progressMap = loadState<Record<string, number>>('classicReadingProgress', {})
      saveState('classicReadingProgress', { ...progressMap, [passage.id]: progress })
    }, 160)
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

  const showWorldReligionGuides = () => {
    setCategory('世界宗教')
    setNeed('全部需要')
    setQuery('')
    window.requestAnimationFrame(() => {
      document.getElementById('classic-discovery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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
          <span><strong>{bilingualTitleCount}</strong>双语典籍</span>
          <span><strong>{CLASSIC_PASSAGES.length}</strong>智慧导读</span>
          <span><strong>{completionCount}</strong>完成修习</span>
        </div>
      </section>

      <div className="classic-path-heading">
        <p className="section-kicker">DAO · FA · SHU</p>
        <h2>先找到此刻真正需要的一段</h2>
        <p>这里是精华导读：用“道”看原则，用“法”理清路径，再用“术”完成一个可执行的小练习。</p>
      </div>

      <section className="classic-three-layers" aria-label="道法术阅读路径">
        <div><span>道</span><strong>看见原则</strong><small>世界观 · 价值 · 规律</small></div>
        <div><span>法</span><strong>理解路径</strong><small>方法 · 次第 · 边界</small></div>
        <div><span>术</span><strong>此刻践行</strong><small>呼吸 · 反省 · 行动</small></div>
      </section>

      <section className="classic-discovery" id="classic-discovery">
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
              <button key={item.id} className={item.id === passage.id ? 'active' : ''} onClick={() => openPassage(item.id)}>
                <span className="classic-shelf-index">{item.category.slice(0, 1)}</span>
                <span><small>{item.tradition} · {item.work}</small><strong>{item.title}</strong><em>智慧导读 · {item.duration} 分钟 · {item.tags.slice(0, 2).join(' / ')}</em></span>
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
        <button onClick={() => openPassage(passage.id)} className="reader-open-action"><BookMarked size={16} />进入沉浸阅读</button>

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

      <section className="classic-tradition-gateway" aria-labelledby="classic-tradition-title">
        <div className="hos-section-title">
          <div><p className="section-kicker">CIVILIZATION CANON · 文明原典</p><h2 id="classic-tradition-title">儒 · 释 · 道 · 科 · 宗</h2></div>
          <span className="complete-library-free"><ShieldCheck size={13} />原文译文分明</span>
        </div>
        <p className="classic-tradition-intro">先选传统，再进入原典。已校核的内容直接提供全文与现代译文；尚在核对版本的内容只作导读，并明确标注，不把义旨转述冒充原典。</p>
        <div className="classic-tradition-grid">
          <button onClick={() => setOpenBookName('中庸')}>
            <span>儒</span><div><strong>修身与关系</strong><small>《中庸》· 原文今译</small></div><ChevronRight size={17} />
          </button>
          <button onClick={() => setCompleteBookId('heart-sutra-complete')}>
            <span>释</span><div><strong>观照与解脱</strong><small>《心经》· CBETA 校勘</small></div><ChevronRight size={17} />
          </button>
          <button onClick={() => setOpenBookName('老子')}>
            <span>道</span><div><strong>规律与自然</strong><small>《老子》· 原文今译</small></div><ChevronRight size={17} />
          </button>
          <button onClick={() => setOpenBookName('黄帝内经')}>
            <span>科</span><div><strong>古代身体知识</strong><small>《黄帝内经》· 文化学习</small></div><ChevronRight size={17} />
          </button>
          <button className="tradition-religion-guide" onClick={showWorldReligionGuides}>
            <span>宗</span><div><strong>世界宗教导读</strong><small>权威原文与译本持续校核</small></div><ChevronRight size={17} />
          </button>
        </div>
        <p className="classic-tradition-note"><ShieldCheck size={14} />“宗”暂保留来源状态清楚的跨宗教导读；待具体版本校核完成后，再收入完整双语书库。</p>
      </section>

      <section className="complete-library-section">
        <div className="hos-section-title">
          <div><p className="section-kicker">IMMERSIVE ORIGINAL READING · 沉浸原典</p><h2>经典原文沉浸式阅读</h2></div>
          <span className="complete-library-free"><ShieldCheck size={13} />永久免费</span>
        </div>
        <p className="complete-library-intro">先以《心经》《金刚经》进入可切换原文、今译与对照的完整阅读体验；正文采用 CBETA 2026.R1 校勘本，HOS 提供完整现代学习译文。</p>
        <div className="complete-library-grid">
          {COMPLETE_CLASSIC_BOOKS.map((book, index) => (
            <button key={book.id} onClick={() => setCompleteBookId(book.id)}>
              <span className="complete-library-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="complete-library-copy"><small>{book.tradition} · {book.sourceWork}</small><strong>{book.title}</strong><em>{book.edition}</em><span><i><BookOpenText size={12} />原典全文</i><i><Check size={12} />{book.chapters.length} 章今译</i></span></span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="open-corpus-library">
        <div className="hos-section-title">
          <div><p className="section-kicker">FULL BILINGUAL LIBRARY · 全量双语书库</p><h2>{bilingualTitleCount} 部原文与现代译文</h2></div>
          <span className="complete-library-free"><ShieldCheck size={13} />全部可直接阅读</span>
        </div>
        <p className="open-corpus-intro">不再把导读摘录当作整本书。每一部都按原书目录展开，点击章节即可阅读原文、今译或逐句对照；译文与原文分栏呈现，阅读进度和体会保存在本机。</p>
        <div className="open-corpus-search">
          <div className="voice-enabled-control">
            <Search size={16} />
            <input value={corpusQuery} onChange={(event) => setCorpusQuery(event.target.value.slice(0, 60))} placeholder="搜索 98 部完整双语经典…" />
            <VoiceInputButton value={corpusQuery} onChange={setCorpusQuery} maxLength={60} label="说出想读的完整经典" />
          </div>
          <div>{OPEN_CLASSIC_CATEGORIES.map((item) => <button key={item} className={corpusCategory === item ? 'active' : ''} onClick={() => setCorpusCategory(item)}>{item}</button>)}</div>
        </div>
        <div className="open-corpus-grid">
          {visibleCorpus.map((book) => (
            <button key={book.id} onClick={() => setOpenBookName(book.name)}>
              <span>{book.category}</span>
              <div><strong>《{book.name}》</strong><p>{book.description}</p><small><BookOpenText size={11} />完整目录 <i /> <Check size={11} />原文今译</small></div>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
        {!showAllCorpus && !corpusQuery.trim() && corpusCategory === '全部' && (
          <button className="open-corpus-more" onClick={() => setShowAllCorpus(true)}>展开全部 {openCorpusCatalog.length} 部开放双语典籍<ChevronRight size={15} /></button>
        )}
        {showAllCorpus && !corpusQuery.trim() && corpusCategory === '全部' && (
          <button className="open-corpus-more" onClick={() => setShowAllCorpus(false)}>收起，保留核心推荐</button>
        )}
      </section>

      <section className="classic-boundary">
        <Sparkles size={16} />
        <p><strong>保持开放，也保持严谨。</strong>古籍选段用于个人学习；义旨转述与科学模型均明确标注。HOS 的“今读”和练习不是宗教权威解释，也不替代学术研究、医疗或心理治疗。</p>
      </section>

      <section className="cbeta-portal">
        <div className="cbeta-portal-icon"><BookOpenText size={22} /></div>
        <div>
          <p className="section-kicker">佛典原典入口 · CBETA 2026.R1</p>
          <h2>4,882 部佛典原典研究入口</h2>
          <p>CBETA 的 22,037 卷作为外部权威校勘总库，放在最后供深度研究与版本核对。HOS 经文阅读永久免费；学术异文与版本记录以 CBETA 原站为准。</p>
        </div>
        <div className="cbeta-portal-actions">
          <a href="https://cbetaonline.cn/" target="_blank" rel="noreferrer">进入 CBETA 全藏检索<ExternalLink size={14} /></a>
          <a href="https://cbeta.org/" target="_blank" rel="noreferrer">CBETA 官方网站<ExternalLink size={13} /></a>
        </div>
      </section>

      {readerOpen && createPortal((
        <div className="classic-reader-layer" role="dialog" aria-modal="true" aria-label={`${passage.work}应用内阅读`}>
          <button className="classic-reader-backdrop" onClick={closeReader} aria-label="关闭阅读器" />
          <section className={`classic-reader-sheet tone-${readerTone}`}>
            <div className="classic-reader-progress" aria-label={`阅读进度 ${readerProgress}%`}><span style={{ width: `${readerProgress}%` }} /></div>
            <header className="classic-reader-header">
              <button onClick={closeReader} aria-label="返回藏经阁"><ChevronLeft size={20} /></button>
              <div><small>{passage.work}</small><strong>{passage.chapter}</strong></div>
              <button onClick={closeReader} aria-label="关闭"><X size={19} /></button>
            </header>

            <div className="classic-reader-toolbar">
              <div role="tablist" aria-label="阅读方式">
                <button role="tab" aria-selected={readerMode === 'original'} className={readerMode === 'original' ? 'active' : ''} onClick={() => updateReaderMode('original')}>原文</button>
                <button role="tab" aria-selected={readerMode === 'guide'} className={readerMode === 'guide' ? 'active' : ''} onClick={() => updateReaderMode('guide')}>今读</button>
                <button role="tab" aria-selected={readerMode === 'parallel'} className={readerMode === 'parallel' ? 'active' : ''} onClick={() => updateReaderMode('parallel')}>对照</button>
              </div>
              <div className="classic-reader-tools">
                <button onClick={() => updateReaderFontSize(readerFontSize - 2)} aria-label="缩小字号"><Minus size={15} /></button>
                <span>{readerFontSize}</span>
                <button onClick={() => updateReaderFontSize(readerFontSize + 2)} aria-label="放大字号"><Plus size={15} /></button>
                <button onClick={cycleReaderTone} aria-label="切换阅读底色">{readerTone === 'night' ? <Moon size={15} /> : <SunMedium size={15} />}</button>
              </div>
            </div>

            <div className="classic-reader-content" ref={readerContentRef} onScroll={trackReaderProgress}>
              <article className="classic-reader-document" style={{ '--reader-font-size': `${readerFontSize}px` } as CSSProperties}>
                <div className="classic-reader-title">
                  <span>{passage.category} · {passage.tradition}</span>
                  <h1>{passage.title}</h1>
                  <p>{passage.work} · {passage.chapter}</p>
                  <button onClick={toggleFavorite} className={favorites.includes(passage.id) ? 'active' : ''}><Heart size={15} fill={favorites.includes(passage.id) ? 'currentColor' : 'none'} />{favorites.includes(passage.id) ? '已收藏' : '收藏本篇'}</button>
                </div>

                {(readerMode === 'original' || readerMode === 'parallel') && (
                  <section className="classic-reader-original">
                    <header><span>原文</span><button onClick={speakOriginal}><Volume2 size={14} />朗读</button></header>
                    <blockquote>{passage.original}</blockquote>
                    {passage.sourceNote && <small>{passage.sourceNote}</small>}
                  </section>
                )}

                {(readerMode === 'guide' || readerMode === 'parallel') && (
                  <section className="classic-reader-guide">
                    <header><span>今读</span><small>HOS 修习导读</small></header>
                    <div><b>道</b><article><strong>看见原则</strong><p>{passage.reflection}</p></article></div>
                    <div><b>法</b><article><strong>理解路径</strong><p>{passage.method}</p></article></div>
                    <div><b>术</b><article><strong>此刻践行</strong><p>{passage.practice}</p></article></div>
                  </section>
                )}

                <section className="classic-reader-note">
                  <div><span>闻 · 思 · 修 · 记</span><strong>留下一句此刻的体会</strong></div>
                  <div className="voice-enabled-control textarea">
                    <textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 500)); setSaved(false) }} placeholder="可以直接说，或写下一句……" />
                    <VoiceInputButton value={note} onChange={(value) => { setNote(value); setSaved(false) }} maxLength={500} label="用语音记录阅读体会" />
                  </div>
                  <button onClick={saveNote} disabled={!note.trim()}><Save size={14} />{saved ? '体会已保存' : '保存阅读体会'}</button>
                </section>

                <footer className="classic-reader-footer">
                  <button onClick={() => movePassage(-1)}><ChevronLeft size={15} /><span>上一篇</span></button>
                  <div><strong>{currentFilteredIndex >= 0 ? currentFilteredIndex + 1 : '—'} / {filtered.length || '—'}</strong><small>进度自动保存在本机</small></div>
                  <button onClick={() => movePassage(1)}><span>下一篇</span><ChevronRight size={15} /></button>
                </footer>
              </article>
            </div>
          </section>
        </div>
      ), document.body)}

      {completeBook && <CompleteClassicReader key={completeBook.id} book={completeBook} onClose={() => setCompleteBookId(null)} />}
      {openBook && <OpenCorpusReader key={openBook.id} book={openBook} onClose={() => setOpenBookName(null)} />}
    </div>
  )
}
