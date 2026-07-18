import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
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
import type { OpenClassicCatalogItem } from '../data/openClassicsCatalog'
import {
  fetchOpenCorpusChapter,
  fetchOpenCorpusManifest,
  type OpenCorpusChapterContent,
  type OpenCorpusManifest,
} from '../services/openCorpusReader'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from './VoiceInputButton'

type ReaderMode = 'original' | 'modern' | 'parallel'
type ReaderTone = 'paper' | 'quiet' | 'night'
type PracticeNote = { passageId: string; text: string; createdAt: number }

type Props = {
  book: OpenClassicCatalogItem
  onClose: () => void
}

export default function OpenCorpusReader({ book, onClose }: Props) {
  const [manifest, setManifest] = useState<OpenCorpusManifest | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [content, setContent] = useState<OpenCorpusChapterContent | null>(null)
  const [loadingManifest, setLoadingManifest] = useState(true)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)
  const [mode, setMode] = useState<ReaderMode>(() => loadState('openCorpusReaderMode', 'parallel'))
  const [tone, setTone] = useState<ReaderTone>(() => loadState('completeReaderTone', 'paper'))
  const [fontSize, setFontSize] = useState(() => loadState('completeReaderFontSize', 20))
  const [tocOpen, setTocOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [manifestRetry, setManifestRetry] = useState(0)
  const [chapterRetry, setChapterRetry] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const noteId = `open-corpus:${book.name}`
  const priorNote = loadState<PracticeNote[]>('classicPracticeNotes', []).find((item) => item.passageId === noteId)
  const [note, setNote] = useState(priorNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(priorNote))

  useEffect(() => {
    const controller = new AbortController()
    fetchOpenCorpusManifest(book, controller.signal)
      .then((result) => {
        setManifest(result)
        setCached(result.cached)
        setChapterIndex(0)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : '双语目录暂时无法读取')
      })
      .finally(() => setLoadingManifest(false))
    return () => controller.abort()
  }, [book, manifestRetry])

  useEffect(() => {
    const chapter = manifest?.chapters[chapterIndex]
    if (!chapter) return undefined
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setLoadingChapter(true)
      setContent(null)
      setError('')
      setProgress(0)
      fetchOpenCorpusChapter(chapter, controller.signal)
        .then((result) => {
          setContent(result)
          setCached((value) => value || result.cached)
          contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === 'AbortError') return
          setError(reason instanceof Error ? reason.message : '章节正文暂时无法读取')
        })
        .finally(() => setLoadingChapter(false))
    })
    return () => controller.abort()
  }, [chapterIndex, chapterRetry, manifest])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      window.speechSynthesis?.cancel()
    }
  }, [])

  const currentChapter = manifest?.chapters[chapterIndex]
  const pairs = useMemo(() => {
    if (!content) return []
    return Array.from({ length: Math.max(content.original.length, content.modern.length) }, (_, index) => ({
      original: content.original[index] ?? '',
      modern: content.modern[index] ?? '',
    })).filter((pair) => pair.original || pair.modern)
  }, [content])

  const updateMode = (next: ReaderMode) => {
    setMode(next)
    saveState('openCorpusReaderMode', next)
  }

  const updateFont = (next: number) => {
    const value = Math.max(16, Math.min(28, next))
    setFontSize(value)
    saveState('completeReaderFontSize', value)
  }

  const cycleTone = () => {
    const next: ReaderTone = tone === 'paper' ? 'quiet' : tone === 'quiet' ? 'night' : 'paper'
    setTone(next)
    saveState('completeReaderTone', next)
  }

  const speak = () => {
    if (!('speechSynthesis' in window) || !content) return
    window.speechSynthesis.cancel()
    const text = mode === 'original' ? content.original.join('。') : content.modern.join('。')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = mode === 'original' ? 0.76 : 0.9
    window.speechSynthesis.speak(utterance)
  }

  const trackProgress = () => {
    const node = contentRef.current
    if (!node) return
    const max = Math.max(1, node.scrollHeight - node.clientHeight)
    setProgress(Math.max(0, Math.min(100, Math.round((node.scrollTop / max) * 100))))
  }

  const chooseChapter = (index: number) => {
    setLoadingChapter(true)
    setContent(null)
    setError('')
    setProgress(0)
    setChapterIndex(index)
    setTocOpen(false)
    window.speechSynthesis?.cancel()
  }

  const retryReading = () => {
    setError('')
    if (manifest) {
      setLoadingChapter(true)
      setChapterRetry((value) => value + 1)
    } else {
      setLoadingManifest(true)
      setManifestRetry((value) => value + 1)
    }
  }

  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    saveState('classicPracticeNotes', [
      { passageId: noteId, text: note.trim(), createdAt: Date.now() },
      ...current.filter((item) => item.passageId !== noteId),
    ].slice(0, 100))
    setSaved(true)
  }

  const renderReading = () => {
    if (loadingManifest || loadingChapter) return <div className="complete-reader-status"><LoaderCircle className="spin" size={23} /><strong>正在展开完整章节…</strong><p>首次读取后会自动缓存在本机。</p></div>
    if (error) return <div className="complete-reader-status error"><RefreshCw size={22} /><strong>这一章暂时没有展开</strong><p>{error}</p><button onClick={retryReading}>重新读取</button></div>
    if (!content) return null

    if (mode === 'parallel') {
      return (
        <section className="open-corpus-pairs" aria-label="逐句原文今译对照">
          <header><span>逐句对照</span><small>{pairs.length} 组文白句对</small></header>
          <div>{pairs.map((pair, index) => (
            <article key={`${currentChapter?.id}-${index}`}>
              <div><i>原</i><p>{pair.original || '—'}</p></div>
              <div><i>译</i><p>{pair.modern || '—'}</p></div>
            </article>
          ))}</div>
        </section>
      )
    }

    const lines = mode === 'original' ? content.original : content.modern
    return (
      <section className={mode === 'original' ? 'complete-reader-original' : 'complete-reader-modern'}>
        <header><span>{mode === 'original' ? '原文全文' : '现代译文·全文'}</span><small>{currentChapter?.title}</small></header>
        <div className={`complete-reader-prose ${mode === 'original' ? 'original-text' : ''}`}>{lines.join('\n\n')}</div>
      </section>
    )
  }

  return createPortal((
    <div className="classic-reader-layer complete-reader-layer" role="dialog" aria-modal="true" aria-label={`${book.name}完整双语阅读`}>
      <button className="classic-reader-backdrop" onClick={onClose} aria-label="关闭阅读器" />
      <section className={`classic-reader-sheet complete-reader-sheet tone-${tone}`}>
        <div className="classic-reader-progress" aria-label={`本章阅读进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <header className="classic-reader-header complete-reader-header">
          <button onClick={onClose} aria-label="返回藏经阁"><ChevronLeft size={20} /></button>
          <div><small>开放文白经典 · {book.category}</small><strong>《{book.name}》</strong></div>
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

        {tocOpen && manifest && (
          <nav className="complete-reader-toc" aria-label="完整章节目录">
            <div><strong>《{book.name}》完整目录</strong><small>{manifest.chapters.length} 个双语章节</small></div>
            <div>{manifest.chapters.map((chapter, index) => <button key={chapter.id} className={index === chapterIndex ? 'active' : ''} onClick={() => chooseChapter(index)}>{chapter.title}</button>)}</div>
          </nav>
        )}

        <div className="classic-reader-content" ref={contentRef} onScroll={trackProgress}>
          <article className="classic-reader-document complete-reader-document open-corpus-document" style={{ '--reader-font-size': `${fontSize}px` } as CSSProperties}>
            <div className="classic-reader-title complete-reader-title">
              <span>{book.category} · 开放双语典籍</span>
              <h1>《{book.name}》</h1>
              <p>{currentChapter?.title ?? '正在读取目录'}</p>
              <div className="complete-reader-badges"><span><BookOpenText size={12} />完整目录</span><span><Check size={12} />逐句今译</span><span><ShieldCheck size={12} />永久免费</span></div>
              <p className="complete-reader-description">{book.description}</p>
            </div>

            {renderReading()}

            {manifest && manifest.chapters.length > 1 && (
              <div className="open-corpus-chapter-nav">
                <button onClick={() => chooseChapter(Math.max(0, chapterIndex - 1))} disabled={chapterIndex === 0}><ChevronLeft size={15} />上一章</button>
                <span><strong>{chapterIndex + 1} / {manifest.chapters.length}</strong><small>{currentChapter?.title}</small></span>
                <button onClick={() => chooseChapter(Math.min(manifest.chapters.length - 1, chapterIndex + 1))} disabled={chapterIndex === manifest.chapters.length - 1}>下一章<ChevronRight size={15} /></button>
              </div>
            )}

            <section className="complete-reader-source">
              <ShieldCheck size={17} />
              <div><strong>来源与使用边界</strong><p>文白句对来自 NiuTrans Classical-Modern 开放语料（MIT）；语料原始出处随原项目逐书标注。HOS 永久免费呈现，不把译文作为宗教或学术权威解释。</p><a href={`https://github.com/NiuTrans/Classical-Modern/tree/main/${encodeURIComponent('双语数据')}/${encodeURIComponent(book.name)}`} target="_blank" rel="noreferrer">核对开放语料<ExternalLink size={12} /></a>{cached && <small>· 本次已从本机缓存读取</small>}</div>
            </section>

            <section className="classic-reader-note complete-reader-note">
              <div><span>闻 · 思 · 修 · 记</span><strong>把这次阅读变成自己的理解</strong></div>
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
