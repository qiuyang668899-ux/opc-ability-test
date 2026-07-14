import { useEffect, useState } from 'react'
import { BookOpenText, Check, ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw, Save, Volume2 } from 'lucide-react'
import { CLASSIC_PASSAGES, type ClassicCategory } from '../data/classics'
import { loadState, saveState } from '../stores/useStore'

type PracticeNote = { passageId: string; text: string; createdAt: number }
const categories: Array<'全部' | ClassicCategory> = ['全部', '道家', '禅修', '儒家']

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

export default function Classics() {
  const [dailyIndex] = useState(() => Math.floor(Date.now() / 86400000) % CLASSIC_PASSAGES.length)
  const [category, setCategory] = useState<'全部' | ClassicCategory>('全部')
  const [passageId, setPassageId] = useState(CLASSIC_PASSAGES[dailyIndex].id)
  const passage = CLASSIC_PASSAGES.find((item) => item.id === passageId) ?? CLASSIC_PASSAGES[0]
  const notes = loadState<PracticeNote[]>('classicPracticeNotes', [])
  const existingNote = notes.find((item) => item.passageId === passage.id)
  const [note, setNote] = useState(existingNote?.text ?? '')
  const [saved, setSaved] = useState(Boolean(existingNote))
  const [seconds, setSeconds] = useState(passage.duration * 60)
  const [running, setRunning] = useState(false)

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
    setPassageId(id)
    setNote(prior?.text ?? '')
    setSaved(Boolean(prior))
    setSeconds(next.duration * 60)
    setRunning(false)
    window.speechSynthesis?.cancel()
  }

  const filtered = category === '全部' ? CLASSIC_PASSAGES : CLASSIC_PASSAGES.filter((item) => item.category === category)
  const currentFilteredIndex = Math.max(0, filtered.findIndex((item) => item.id === passage.id))

  const movePassage = (direction: -1 | 1) => {
    const nextIndex = (currentFilteredIndex + direction + filtered.length) % filtered.length
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

  const saveNote = () => {
    const current = loadState<PracticeNote[]>('classicPracticeNotes', [])
    const next = [
      { passageId: passage.id, text: note.trim(), createdAt: Date.now() },
      ...current.filter((item) => item.passageId !== passage.id),
    ].slice(0, 100)
    saveState('classicPracticeNotes', next)
    setSaved(true)
  }

  return (
    <div className="hos-page classics-page animate-float-up">
      <header className="tools-header">
        <p className="section-kicker">经典修习</p>
        <h1>每天读一小段，安顿一颗心</h1>
        <p>从传统经典中取一束光，经过理解、练习与记录，落回今天真实的生活。</p>
      </header>

      <div className="classic-categories">
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => { setCategory(item); const first = item === '全部' ? CLASSIC_PASSAGES[dailyIndex] : CLASSIC_PASSAGES.find((passageItem) => passageItem.category === item); if (first) choosePassage(first.id) }}>{item}</button>)}
      </div>

      <article className="reading-card">
        <div className="reading-meta"><span>{passage.category}</span><span>{passage.work} · {passage.chapter}</span></div>
        <h2>{passage.title}</h2>
        <blockquote>{passage.original}</blockquote>
        <button onClick={speakOriginal} className="read-aloud"><Volume2 size={16} />慢速朗读原文</button>

        <div className="reading-guide">
          <p className="section-kicker">今读</p>
          <p>{passage.reflection}</p>
        </div>
        <div className="practice-card">
          <BookOpenText size={20} />
          <div><strong>今日修习</strong><p>{passage.practice}</p></div>
        </div>

        <div className="reading-nav">
          <button onClick={() => movePassage(-1)} aria-label="上一篇"><ChevronLeft size={18} /></button>
          <span>{currentFilteredIndex + 1} / {filtered.length}</span>
          <button onClick={() => movePassage(1)} aria-label="下一篇"><ChevronRight size={18} /></button>
        </div>
      </article>

      <section className="practice-timer">
        <div><p className="section-kicker">安住计时</p><h2>{formatTime(seconds)}</h2><span><Clock3 size={13} />建议 {passage.duration} 分钟</span></div>
        <div>
          <button onClick={() => setRunning((current) => !current)} className="primary-action">{running ? <Pause size={17} /> : <Play size={17} />}{running ? '暂停' : '开始'}</button>
          <button onClick={() => { setRunning(false); setSeconds(passage.duration * 60) }} className="icon-action" aria-label="重置计时"><RotateCcw size={16} /></button>
        </div>
      </section>

      <section className="reflection-note">
        <div className="hos-section-title"><div><p className="section-kicker">修习记录</p><h2>这一段对今天的我意味着什么？</h2></div>{saved && <span className="check-badge"><Check size={12} />已保存</span>}</div>
        <textarea value={note} onChange={(event) => { setNote(event.target.value.slice(0, 500)); setSaved(false) }} className="hos-input" placeholder="写下一句话也可以……" />
        <button onClick={saveNote} className="secondary-action w-full"><Save size={16} />保存本次体会</button>
      </section>

      <p className="classic-source-note">原文选自公版古籍；“今读”与修习提示由 HOS 编写，仅用于个人学习与自我觉察，不作为宗教权威解释。</p>
    </div>
  )
}
