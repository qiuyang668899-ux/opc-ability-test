import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpenText,
  Check,
  ChevronLeft,
  ExternalLink,
  ListTree,
  LoaderCircle,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SunMedium,
  Volume2,
  X,
} from 'lucide-react'
import type { CompleteClassicBook } from '../data/completeClassics'
import { fetchCompleteCbetaBook } from '../services/cbetaReader'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from './VoiceInputButton'

type CompleteReaderMode = 'original' | 'modern' | 'parallel'
type CompleteReaderTone = 'paper' | 'quiet' | 'night'
type PracticeNote = { passageId: string; text: string; createdAt: number }

type Props = {
  book: CompleteClassicBook
  onClose: () => void
}

export default function CompleteClassicReader({ book, onClose }: Props) {
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)
  const [mode, setMode] = useState<CompleteReaderMode>(() => loadState('completeReaderMode', 'parallel'))
  const [tone, setTone] = useState<CompleteReaderTone>(() => loadState('completeReaderTone', 'paper'))
  const [fontSize, setFontSize] = useState(() => loadState('completeReaderFontSize', 20))
  const [progress, setProgress] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  const noteId = `complete:${book.id}`
  const priorNote = loadState<PracticeNote[]>('classicPracticeNotes', []).find((item) => item.passageId === noteId)
  const [note, setNote] = useState(priorNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(priorNote))
  const contentRef = useRef<HTMLDivElement>(null)
  const progressTimerRef = useRef<number | null>(null)

  const loadBook = () => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchCompleteCbetaBook(book, controller.signal)
      .then((content) => {
        setOriginal(content.original)
        setCached(content.cached)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : '权威原典暂时无法读取')
      })
      .finally(() => setLoading(false))
    return controller
  }

  useEffect(() => {
    const controller = loadBook()
    return () => controller.abort()
    // The selected book is remounted by key; loading once keeps retries explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => {
    const progressMap = loadState<Record<string, number>>('completeReadingProgress', {})
    const value = Math.max(0, Math.min(100, progressMap[`${book.id}:${mode}`] ?? 0))
    window.requestAnimationFrame(() => {
      const content = contentRef.current
      setProgress(value)
      if (!content) return
      content.scrollTop = Math.max(0, content.scrollHeight - content.clientHeight) * (value / 100)
    })
  }, [book.id, mode])

  useEffect(() => () => {
    if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  const updateMode = (next: CompleteReaderMode) => {
    setMode(next)
    saveState('completeReaderMode', next)
  }

  const updateFont = (next: number) => {
    const value = Math.max(16, Math.min(28, next))
    setFontSize(value)
    saveState('completeReaderFontSize', value)
  }

  const cycleTone = () => {
    const next: CompleteReaderTone = tone === 'paper' ? 'quiet' : tone === 'quiet' ? 'night' : 'paper'
    setTone(next)
    saveState('completeReaderTone', next)
  }

  const trackProgress = () => {
    const content = contentRef.current
    if (!content) return
    const max = Math.max(1, content.scrollHeight - content.clientHeight)
    const value = Math.max(0, Math.min(100, Math.round((content.scrollTop / max) * 100)))
    setProgress(value)
    if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    progressTimerRef.current = window.setTimeout(() => {
      const progressMap = loadState<Record<string, number>>('completeReadingProgress', {})
      saveState('completeReadingProgress', { ...progressMap, [`${book.id}:${mode}`]: value })
    }, 180)
  }

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const modern = book.chapters.map((chapter) => `${chapter.title}。${chapter.modern}`).join('\n')
    const text = mode === 'original' ? original : modern
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = mode === 'original' ? 0.76 : 0.88
    window.speechSynthesis.speak(utterance)
  }

  const jumpToChapter = (chapterId: string) => {
    setTocOpen(false)
    const element = document.getElementById(`${book.id}-${chapterId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    saveState('classicPracticeNotes', [
      { passageId: noteId, text: note.trim(), createdAt: Date.now() },
      ...current.filter((item) => item.passageId !== noteId),
    ].slice(0, 100))
    setSaved(true)
  }

  const renderOriginal = () => (
    <section className="complete-reader-original" aria-label="完整原典">
      <header><span>原典全文</span><small>{book.sourceLabel}</small></header>
      {loading && <div className="complete-reader-status"><LoaderCircle className="spin" size={22} /><strong>正在读取权威原典…</strong><p>首次读取后会缓存在本机。</p></div>}
      {!loading && error && (
        <div className="complete-reader-status error"><RefreshCw size={22} /><strong>原典读取未完成</strong><p>{error}</p><button onClick={loadBook}>重试读取</button><a href={book.sourceUrl} target="_blank" rel="noreferrer">前往 CBETA 阅读<ExternalLink size={13} /></a></div>
      )}
      {!loading && !error && <div className="complete-reader-prose original-text">{original}</div>}
    </section>
  )

  const renderModern = () => (
    <section className="complete-reader-modern" aria-label="完整现代译文">
      <header><span>现代译文·全文</span><small>HOS 现代直译</small></header>
      {book.chapters.map((chapter) => (
        <article key={chapter.id} id={`${book.id}-${chapter.id}`} className="complete-reader-chapter">
          <h2>{chapter.title}</h2>
          <div className="complete-reader-prose">{chapter.modern}</div>
        </article>
      ))}
    </section>
  )

  return createPortal((
    <div className="classic-reader-layer complete-reader-layer" role="dialog" aria-modal="true" aria-label={`${book.title}完整阅读`}>
      <button className="classic-reader-backdrop" onClick={onClose} aria-label="关闭阅读器" />
      <section className={`classic-reader-sheet complete-reader-sheet tone-${tone}`}>
        <div className="classic-reader-progress" aria-label={`阅读进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <header className="classic-reader-header complete-reader-header">
          <button onClick={onClose} aria-label="返回藏经阁"><ChevronLeft size={20} /></button>
          <div><small>{book.edition}</small><strong>{book.title}</strong></div>
          <button onClick={onClose} aria-label="关闭"><X size={19} /></button>
        </header>

        <div className="classic-reader-toolbar complete-reader-toolbar">
          <div role="tablist" aria-label="阅读方式">
            <button role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => updateMode('original')}>原典</button>
            <button role="tab" aria-selected={mode === 'modern'} className={mode === 'modern' ? 'active' : ''} onClick={() => updateMode('modern')}>今译</button>
            <button role="tab" aria-selected={mode === 'parallel'} className={mode === 'parallel' ? 'active' : ''} onClick={() => updateMode('parallel')}>对照</button>
          </div>
          <div className="classic-reader-tools">
            <button onClick={() => setTocOpen((value) => !value)} aria-label="章节目录"><ListTree size={15} /></button>
            <button onClick={speak} aria-label="朗读当前内容"><Volume2 size={15} /></button>
            <button onClick={() => updateFont(fontSize - 2)} aria-label="缩小字号"><Minus size={15} /></button>
            <span>{fontSize}</span>
            <button onClick={() => updateFont(fontSize + 2)} aria-label="放大字号"><Plus size={15} /></button>
            <button onClick={cycleTone} aria-label="切换阅读底色">{tone === 'night' ? <Moon size={15} /> : <SunMedium size={15} />}</button>
          </div>
        </div>

        {tocOpen && (
          <nav className="complete-reader-toc" aria-label="现代译文目录">
            <div><strong>章节目录</strong><small>{book.chapters.length} 章·点击跳转</small></div>
            <div>{book.chapters.map((chapter) => <button key={chapter.id} onClick={() => { if (mode === 'original') updateMode('modern'); window.setTimeout(() => jumpToChapter(chapter.id), 40) }}>{chapter.title}</button>)}</div>
          </nav>
        )}

        <div className="classic-reader-content" ref={contentRef} onScroll={trackProgress}>
          <article className="classic-reader-document complete-reader-document" style={{ '--reader-font-size': `${fontSize}px` } as CSSProperties}>
            <div className="classic-reader-title complete-reader-title">
              <span>{book.category} · {book.tradition}</span>
              <h1>{book.title}</h1>
              <p>{book.edition}</p>
              <div className="complete-reader-badges"><span><BookOpenText size={12} />原典全文</span><span><Check size={12} />现代译文</span><span><ShieldCheck size={12} />永久免费</span></div>
              <p className="complete-reader-description">{book.description}</p>
            </div>

            <div className={mode === 'parallel' ? 'complete-reader-parallel' : ''}>
              {(mode === 'original' || mode === 'parallel') && renderOriginal()}
              {(mode === 'modern' || mode === 'parallel') && renderModern()}
            </div>

            <section className="complete-reader-source">
              <ShieldCheck size={17} />
              <div><strong>版本与边界</strong><p>原典由 CBETA 2026.R1 数字资料库提供，仅用于免费、非商业阅读；HOS 现代译文是学习辅助稿，不替代宗教传承或学术校注。</p><a href={book.sourceUrl} target="_blank" rel="noreferrer">在 CBETA 核对原典<ExternalLink size={12} /></a>{cached && <small>· 本次已从本机缓存读取</small>}</div>
            </section>

            <section className="classic-reader-note complete-reader-note">
              <div><span>闻 · 思 · 修 · 记</span><strong>记下这次阅读真正触动你的一句</strong></div>
              <div className="voice-enabled-control textarea">
                <textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 1000)); setSaved(false) }} placeholder="可以直接说，或写下来…" />
                <VoiceInputButton value={note} onChange={(value) => { setNote(value); setSaved(false) }} maxLength={1000} label="用语音记录全文阅读体会" />
              </div>
              <button onClick={saveNote} disabled={!note.trim()}><Save size={14} />{saved ? '体会已存入档案' : '保存阅读体会'}</button>
            </section>
          </article>
        </div>
      </section>
    </div>
  ), document.body)
}
