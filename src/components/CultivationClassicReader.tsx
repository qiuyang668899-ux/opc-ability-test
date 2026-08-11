import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
  ShieldAlert,
  ShieldCheck,
  SunMedium,
  Volume2,
  X,
} from 'lucide-react'
import type { CultivationClassic, CultivationSafety } from '../data/cultivation'
import { CULTIVATION_TEXT_SOURCES } from '../data/cultivationReader'
import { fetchCultivationVolume, type LoadedCultivationVolume } from '../services/cultivationReader'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from './VoiceInputButton'

type ReaderTone = 'paper' | 'quiet' | 'night'
type PracticeNote = { passageId: string; text: string; createdAt: number }

const safetyCopy: Record<CultivationSafety, string> = {
  daily: '可作文化学习与温和日用观照；身体不适时停止。',
  guided: '丹法、存思与古代养生术语流派差异很大，全文用于研究，不据此自行追求火候、闭气或特殊体验。',
  archive: '仙传与方术材料用于文学、宗教史和思想史阅读，不作为超自然事实或现实功效承诺。',
}

export default function CultivationClassicReader({ book, onClose }: { book: CultivationClassic; onClose: () => void }) {
  const source = CULTIVATION_TEXT_SOURCES[book.id]
  const [volumeIndex, setVolumeIndex] = useState(0)
  const [content, setContent] = useState<LoadedCultivationVolume | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [tone, setTone] = useState<ReaderTone>(() => loadState('cultivationReaderTone', 'paper'))
  const [fontSize, setFontSize] = useState(() => loadState('cultivationReaderFontSize', 20))
  const [tocOpen, setTocOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressTimerRef = useRef<number | null>(null)
  const volume = source.volumes[volumeIndex]
  const noteId = `cultivation-classic:${book.id}`
  const priorNote = loadState<PracticeNote[]>('classicPracticeNotes', []).find((item) => item.passageId === noteId)
  const [note, setNote] = useState(priorNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(priorNote))

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      setLoading(true)
      setError('')
      setContent(null)
      fetchCultivationVolume(book.id, source, volume, controller.signal)
        .then(setContent)
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === 'AbortError') return
          setError(reason instanceof Error ? reason.message : '原典全文暂时无法读取')
        })
        .finally(() => setLoading(false))
    })
    return () => controller.abort()
  }, [book.id, retry, source, volume])

  useEffect(() => {
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = priorOverflow
      window.speechSynthesis?.cancel()
      if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const map = loadState<Record<string, number>>('cultivationReadingProgress', {})
    const stored = Math.max(0, Math.min(100, map[`${book.id}:${volume.id}`] ?? 0))
    window.requestAnimationFrame(() => {
      const node = contentRef.current
      setProgress(stored)
      if (node) node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight) * (stored / 100)
    })
  }, [book.id, content, volume.id])

  const chooseVolume = (index: number) => {
    setVolumeIndex(index)
    setTocOpen(false)
    contentRef.current?.scrollTo({ top: 0 })
  }

  const updateFont = (next: number) => {
    const value = Math.max(16, Math.min(30, next))
    setFontSize(value)
    saveState('cultivationReaderFontSize', value)
  }

  const cycleTone = () => {
    const next: ReaderTone = tone === 'paper' ? 'quiet' : tone === 'quiet' ? 'night' : 'paper'
    setTone(next)
    saveState('cultivationReaderTone', next)
  }

  const trackProgress = () => {
    const node = contentRef.current
    if (!node) return
    const value = Math.max(0, Math.min(100, Math.round((node.scrollTop / Math.max(1, node.scrollHeight - node.clientHeight)) * 100)))
    setProgress(value)
    if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    progressTimerRef.current = window.setTimeout(() => {
      const map = loadState<Record<string, number>>('cultivationReadingProgress', {})
      saveState('cultivationReadingProgress', { ...map, [`${book.id}:${volume.id}`]: value })
    }, 180)
  }

  const speak = () => {
    if (!content || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(content.fullText)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.76
    window.speechSynthesis.speak(utterance)
  }

  const jumpToSection = (sectionId: string) => {
    setTocOpen(false)
    document.getElementById(`cultivation-text-${book.id}-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    saveState('classicPracticeNotes', [{ passageId: noteId, text: note.trim(), createdAt: Date.now() }, ...current.filter((item) => item.passageId !== noteId)].slice(0, 100))
    setSaved(true)
  }

  return createPortal((
    <div className="classic-reader-layer complete-reader-layer" role="dialog" aria-modal="true" aria-label={`${book.title}全本原文阅读`}>
      <button className="classic-reader-backdrop" onClick={onClose} aria-label="关闭阅读器" />
      <section className={`classic-reader-sheet complete-reader-sheet cultivation-full-reader tone-${tone}`}>
        <div className="classic-reader-progress" aria-label={`本卷阅读进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <header className="classic-reader-header complete-reader-header">
          <button onClick={onClose} aria-label="返回修仙典藏"><ChevronLeft size={20} /></button>
          <div><small>{source.edition}</small><strong>{book.title}</strong></div>
          <button onClick={onClose} aria-label="关闭"><X size={19} /></button>
        </header>

        <div className="classic-reader-toolbar cultivation-reader-toolbar">
          <div className="cultivation-reader-volume-current"><BookOpenText size={14} /><span>{volume.title}</span><small>{volumeIndex + 1}/{source.volumes.length}</small></div>
          <div className="classic-reader-tools">
            <button onClick={() => setTocOpen((value) => !value)} aria-label="全本目录"><ListTree size={15} /></button>
            <button onClick={speak} aria-label="朗读本卷"><Volume2 size={15} /></button>
            <button onClick={() => updateFont(fontSize - 2)} aria-label="缩小字号"><Minus size={15} /></button><span>{fontSize}</span>
            <button onClick={() => updateFont(fontSize + 2)} aria-label="放大字号"><Plus size={15} /></button>
            <button onClick={cycleTone} aria-label="切换阅读底色">{tone === 'night' ? <Moon size={15} /> : <SunMedium size={15} />}</button>
          </div>
        </div>

        {tocOpen && <nav className="complete-reader-toc cultivation-reader-toc" aria-label="原典卷章目录">
          <div><strong>全本卷章</strong><small>{source.volumes.length} 卷 · 点选即可直读</small></div>
          <div>
            {source.volumes.map((item, index) => <button key={item.id} className={index === volumeIndex ? 'active volume' : 'volume'} onClick={() => chooseVolume(index)}>{item.title}</button>)}
            {content && content.sections.length > 1 && <div className="cultivation-reader-section-list"><small>本卷篇章</small>{content.sections.map((section) => <button key={section.id} onClick={() => jumpToSection(section.id)}>{section.title}</button>)}</div>}
          </div>
        </nav>}

        <div className="classic-reader-content" ref={contentRef} onScroll={trackProgress}>
          <article className="classic-reader-document complete-reader-document cultivation-reader-document" style={{ '--reader-font-size': `${fontSize}px` } as CSSProperties}>
            <div className="classic-reader-title complete-reader-title">
              <span>东方修仙 · 原典全本</span>
              <h1>{book.title}</h1>
              <p>{book.era} · {book.attribution} · {volume.title}</p>
              <div className="complete-reader-badges"><span><BookOpenText size={12} />原文全本</span><span><Check size={12} />{source.volumes.length} 卷齐备</span><span><ShieldCheck size={12} />免费直读</span></div>
              <p className="complete-reader-description">{book.description}</p>
            </div>

            <section className="complete-reader-original cultivation-reader-original" aria-label="完整原文">
              <header><span>原典原文 · {volume.title}</span><small>{source.sourceLabel}</small></header>
              {loading && <div className="complete-reader-status"><LoaderCircle className="spin" size={22} /><strong>正在展开本卷全文…</strong><p>首次读取后会自动缓存在本机。</p></div>}
              {!loading && error && <div className="complete-reader-status error"><RefreshCw size={22} /><strong>本卷全文读取未完成</strong><p>{error}</p><button onClick={() => setRetry((value) => value + 1)}>重新读取</button><a href={source.sourceUrl} target="_blank" rel="noreferrer">核对数字原典<ExternalLink size={13} /></a></div>}
              {!loading && content && content.sections.map((section) => <article key={section.id} id={`cultivation-text-${book.id}-${section.id}`} className="cultivation-reader-chapter"><h2>{section.title}</h2><div className="complete-reader-prose original-text">{section.text}</div></article>)}
            </section>

            {source.volumes.length > 1 && <nav className="cultivation-reader-page-nav" aria-label="前后卷导航"><button disabled={volumeIndex === 0} onClick={() => chooseVolume(volumeIndex - 1)}><ChevronLeft size={15} />上一卷</button><span>{volume.title}<small>{volumeIndex + 1} / {source.volumes.length}</small></span><button disabled={volumeIndex === source.volumes.length - 1} onClick={() => chooseVolume(volumeIndex + 1)}>下一卷<ChevronRight size={15} /></button></nav>}

            <section className="complete-reader-source"><ShieldCheck size={17} /><div><strong>原典来源与阅读边界</strong><p>此处呈现可连续阅读的公版古籍原文，不以摘要替代全本。{safetyCopy[book.safety]}</p><a href={source.sourceUrl} target="_blank" rel="noreferrer">核对数字底本<ExternalLink size={12} /></a>{source.catalogUrl && <a href={source.catalogUrl} target="_blank" rel="noreferrer">查看书目信息<ExternalLink size={12} /></a>}{content?.cached && <small>· 已从本机缓存读取</small>}</div></section>
            <section className="cultivation-reader-warning"><ShieldAlert size={16} /><p>古籍中的服食、外丹、辟谷、强闭气及其他身体操作仅作文献研究，不照做、不替代医疗。</p></section>

            <section className="classic-reader-note complete-reader-note"><div><span>闻 · 思 · 修 · 记</span><strong>记下本次阅读的一句体会</strong></div><div className="voice-enabled-control textarea"><textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 1000)); setSaved(false) }} placeholder="可以直接说，或写下来…" /><VoiceInputButton value={note} onChange={(value) => { setNote(value); setSaved(false) }} maxLength={1000} label="用语音记录原典阅读体会" /></div><button onClick={saveNote} disabled={!note.trim()}><Save size={14} />{saved ? '体会已存入档案' : '保存阅读体会'}</button></section>
          </article>
        </div>
      </section>
    </div>
  ), document.body)
}
