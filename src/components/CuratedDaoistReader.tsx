import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { BookOpenText, Check, ChevronLeft, ExternalLink, ListTree, LoaderCircle, Minus, Moon, Plus, RefreshCw, Save, ShieldCheck, SunMedium, Volume2, X } from 'lucide-react'
import type { CuratedDaoistBook } from '../data/curatedDaoist'
import { fetchCuratedDaoistVolume } from '../services/curatedDaoistReader'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from './VoiceInputButton'

type ReaderMode = 'original' | 'guide' | 'parallel'
type ReaderTone = 'paper' | 'quiet' | 'night'
type PracticeNote = { passageId: string; text: string; createdAt: number }

export default function CuratedDaoistReader({ book, onClose }: { book: CuratedDaoistBook; onClose: () => void }) {
  const [volumeIndex, setVolumeIndex] = useState(0)
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)
  const [retry, setRetry] = useState(0)
  const [mode, setMode] = useState<ReaderMode>(() => loadState('jingmingReaderMode', 'parallel'))
  const [tone, setTone] = useState<ReaderTone>(() => loadState('completeReaderTone', 'paper'))
  const [fontSize, setFontSize] = useState(() => loadState('completeReaderFontSize', 20))
  const [tocOpen, setTocOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const volume = book.volumes[volumeIndex]
  const noteId = `curated:${book.id}`
  const priorNote = loadState<PracticeNote[]>('classicPracticeNotes', []).find((item) => item.passageId === noteId)
  const [note, setNote] = useState(priorNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(priorNote))

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      setLoading(true)
      setError('')
      setOriginal('')
      setProgress(0)
      fetchCuratedDaoistVolume(volume, controller.signal)
        .then((result) => { setOriginal(result.original); setCached(result.cached) })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === 'AbortError') return
          setError(reason instanceof Error ? reason.message : '开放原典暂时无法读取')
        })
        .finally(() => setLoading(false))
    })
    return () => controller.abort()
  }, [retry, volume])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous; window.speechSynthesis?.cancel() }
  }, [])

  const setReaderMode = (next: ReaderMode) => { setMode(next); saveState('jingmingReaderMode', next) }
  const updateFont = (next: number) => { const value = Math.max(16, Math.min(28, next)); setFontSize(value); saveState('completeReaderFontSize', value) }
  const cycleTone = () => { const next: ReaderTone = tone === 'paper' ? 'quiet' : tone === 'quiet' ? 'night' : 'paper'; setTone(next); saveState('completeReaderTone', next) }
  const chooseVolume = (index: number) => { setVolumeIndex(index); setTocOpen(false); contentRef.current?.scrollTo({ top: 0 }) }
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(mode === 'original' ? original : volume.guide)
    utterance.lang = 'zh-CN'
    utterance.rate = mode === 'original' ? 0.76 : 0.9
    window.speechSynthesis.speak(utterance)
  }
  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    saveState('classicPracticeNotes', [{ passageId: noteId, text: note.trim(), createdAt: Date.now() }, ...current.filter((item) => item.passageId !== noteId)].slice(0, 100))
    setSaved(true)
  }

  const originalSection = (
    <section className="complete-reader-original">
      <header><span>原典·全卷</span><small>{book.sourceLabel}</small></header>
      {loading && <div className="complete-reader-status"><LoaderCircle className="spin" size={22} /><strong>正在展开开放原典…</strong><p>首次读取后会缓存在本机。</p></div>}
      {!loading && error && <div className="complete-reader-status error"><RefreshCw size={22} /><strong>原典读取未完成</strong><p>{error}</p><button onClick={() => setRetry((value) => value + 1)}>重试读取</button></div>}
      {!loading && !error && <div className="complete-reader-prose original-text">{original}</div>}
    </section>
  )
  const guideSection = (
    <section className="complete-reader-modern">
      <header><span>现代导读·分卷</span><small>结构与边界导读，非逐句全译</small></header>
      <article className="complete-reader-chapter"><h2>{volume.title}</h2><div className="complete-reader-prose">{volume.guide}</div></article>
    </section>
  )

  return createPortal((
    <div className="classic-reader-layer complete-reader-layer" role="dialog" aria-modal="true" aria-label={`${book.title}应用内阅读`}>
      <button className="classic-reader-backdrop" onClick={onClose} aria-label="关闭阅读器" />
      <section className={`classic-reader-sheet complete-reader-sheet tone-${tone}`}>
        <div className="classic-reader-progress"><span style={{ width: `${progress}%` }} /></div>
        <header className="classic-reader-header complete-reader-header">
          <button onClick={onClose} aria-label="返回道家典藏"><ChevronLeft size={20} /></button>
          <div><small>{book.edition}</small><strong>{book.title}</strong></div>
          <button onClick={onClose} aria-label="关闭"><X size={19} /></button>
        </header>
        <div className="classic-reader-toolbar complete-reader-toolbar">
          <div role="tablist" aria-label="阅读方式">
            <button className={mode === 'original' ? 'active' : ''} onClick={() => setReaderMode('original')}>原典</button>
            <button className={mode === 'guide' ? 'active' : ''} onClick={() => setReaderMode('guide')}>导读</button>
            <button className={mode === 'parallel' ? 'active' : ''} onClick={() => setReaderMode('parallel')}>对照</button>
          </div>
          <div className="classic-reader-tools">
            <button onClick={() => setTocOpen((value) => !value)} aria-label="卷次目录"><ListTree size={15} /></button>
            <button onClick={speak} aria-label="朗读"><Volume2 size={15} /></button>
            <button onClick={() => updateFont(fontSize - 2)} aria-label="缩小字号"><Minus size={15} /></button><span>{fontSize}</span>
            <button onClick={() => updateFont(fontSize + 2)} aria-label="放大字号"><Plus size={15} /></button>
            <button onClick={cycleTone} aria-label="切换底色">{tone === 'night' ? <Moon size={15} /> : <SunMedium size={15} />}</button>
          </div>
        </div>
        {tocOpen && <nav className="complete-reader-toc"><div><strong>原典卷次</strong><small>{book.volumes.length} 卷·应用内直读</small></div><div>{book.volumes.map((item, index) => <button key={item.id} className={index === volumeIndex ? 'active' : ''} onClick={() => chooseVolume(index)}>{item.title}</button>)}</div></nav>}
        <div className="classic-reader-content" ref={contentRef} onScroll={() => { const node = contentRef.current; if (!node) return; setProgress(Math.round((node.scrollTop / Math.max(1, node.scrollHeight - node.clientHeight)) * 100)) }}>
          <article className="classic-reader-document complete-reader-document" style={{ '--reader-font-size': `${fontSize}px` } as CSSProperties}>
            <div className="classic-reader-title complete-reader-title">
              <span>道家 · {book.tradition}</span><h1>{book.title}</h1><p>{volume.title}</p>
              <div className="complete-reader-badges"><span><BookOpenText size={12} />两卷原典</span><span><Check size={12} />分卷导读</span><span><ShieldCheck size={12} />免费阅读</span></div>
              <p className="complete-reader-description">{book.description}</p>
            </div>
            <div className={mode === 'parallel' ? 'complete-reader-parallel' : ''}>{(mode === 'original' || mode === 'parallel') && originalSection}{(mode === 'guide' || mode === 'parallel') && guideSection}</div>
            <div className="jingming-volume-nav">{book.volumes.map((item, index) => <button key={item.id} className={index === volumeIndex ? 'active' : ''} onClick={() => chooseVolume(index)}>{item.title}</button>)}</div>
            <section className="complete-reader-source"><ShieldCheck size={17} /><div><strong>来源与阅读边界</strong><p>原典采用 Kanripo 汉籍开放数字底本；HOS 仅提供学习导读，不将神异描述当作科学、医疗或现实功效承诺。</p><a href={book.sourceUrl} target="_blank" rel="noreferrer">核对数字原典<ExternalLink size={12} /></a><a href={book.catalogUrl} target="_blank" rel="noreferrer">查看权威书目<ExternalLink size={12} /></a>{cached && <small>· 已从本机缓存读取</small>}</div></section>
            <section className="classic-reader-note complete-reader-note"><div><span>闻 · 思 · 修 · 记</span><strong>记下这次阅读的一句体会</strong></div><div className="voice-enabled-control textarea"><textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 1000)); setSaved(false) }} placeholder="可以直接说，或写下来…" /><VoiceInputButton value={note} onChange={(value) => { setNote(value); setSaved(false) }} maxLength={1000} label="用语音记录阅读体会" /></div><button onClick={saveNote} disabled={!note.trim()}><Save size={14} />{saved ? '体会已存入档案' : '保存阅读体会'}</button></section>
          </article>
        </div>
      </section>
    </div>
  ), document.body)
}

