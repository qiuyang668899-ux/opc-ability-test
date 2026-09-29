import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Feather, History, Pause, Play, ShieldCheck } from 'lucide-react'
import { QIMEN_GATES, QIMEN_SOURCE_NOTES, QIMEN_VERSES, newQimenDraft, qimenJournalText, type QimenDraft, type QimenRecord } from '../data/qimenPractice'
import { loadState, saveState, saveStateBatch, type JournalEntry } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'
import PracticeFeeling from '../components/PracticeFeeling'
import PracticeTimerSupport from '../components/PracticeTimerSupport'
import { usePracticeTimer } from '../hooks/usePracticeTimer'
import { practiceDate, tickPracticeTimer, type PracticeTimerState } from '../utils/practiceTimer'
import { appendPracticeOutcome } from '../engines/practiceOutcomeEngine'
import '../qimen.css'

function VoiceField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = `qimen-${label}`
  return <div className="qimen-field"><div><label htmlFor={id}>{label}</label><VoiceInputButton value={value} onChange={onChange} label={`语音记录：${label}`} maxLength={2000} /></div><textarea id={id} value={value} maxLength={2000} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || '可以点麦克风说，也可以直接写……'} rows={3} /></div>
}

export default function QimenPractice() {
  const [date] = useState(practiceDate)
  const [draft, setDraft] = useState<QimenDraft>(() => loadState<Record<string, QimenDraft>>('qimenDrafts', {})[date] ?? newQimenDraft(date))
  const [tab, setTab] = useState<'practice' | 'source' | 'history'>('practice')
  const [records, setRecords] = useState(() => loadState<QimenRecord[]>('qimenRecords', []))
  const [message, setMessage] = useState('')
  const [draftSaved, setDraftSaved] = useState(true)
  const saving = useRef(false)
  const initialTimer = useRef(loadState<Record<string, PracticeTimerState>>('qimenTimers', {})[date])
  const timer = usePracticeTimer([120], true, false, initialTimer.current)
  const gate = QIMEN_GATES[draft.selected] ?? QIMEN_GATES[0]
  const allDone = draft.done.length === QIMEN_GATES.length
  const days = new Set(records.filter((record) => record.done.length > 0).map((record) => record.date)).size

  useEffect(() => {
    setDraftSaved(saveState('qimenDrafts', { ...loadState<Record<string, QimenDraft>>('qimenDrafts', {}), [date]: draft }))
  }, [draft, date])
  useEffect(() => {
    if (timer.session.spent[0] > 0 || timer.session.running) saveState('qimenTimers', { ...loadState<Record<string, PracticeTimerState>>('qimenTimers', {}), [date]: timer.session })
  }, [timer.session, date])
  const update = (change: Partial<QimenDraft>) => {
    setDraft((old) => ({ ...old, ...change, ...(change.joys?.some((joy) => !joy.trim()) ? { done: old.done.filter((id) => id !== 'reframe') } : {}), updatedAt: Date.now() }))
    setMessage('')
  }
  const updateNote = (value: string) => update({ notes: draft.notes.map((note, index) => index === draft.selected ? value : note) })
  const toggleDone = () => {
    if (!draft.done.includes(gate.id) && gate.id === 'reframe' && draft.joys.some((joy) => !joy.trim())) {
      setMessage('这一门包含日录三吉。请先留下三件小事；暂时想不到也没关系，可以先保存进度。')
      return
    }
    update({ done: draft.done.includes(gate.id) ? draft.done.filter((id) => id !== gate.id) : [...draft.done, gate.id] })
  }
  const archive = () => {
    if (saving.current) return
    if (!draft.done.length && !draft.notes.some((note) => note.trim()) && !draft.joys.some((joy) => joy.trim()) && !draft.reflection.trim()) { setMessage('先实践一门，或留下一句话，再归档。'); return }
    saving.current = true
    const now = Date.now()
    const id = `qimen-${date}`
    const timed = tickPracticeTimer(timer.session, [120], now, false)
    if (timer.session.running) timer.pause()
    const seconds = timed.spent.reduce((sum, value) => sum + value, 0)
    const record: QimenRecord = { ...draft, id, completedAt: now, seconds }
    const nextRecords = [record, ...loadState<QimenRecord[]>('qimenRecords', []).filter((item) => item.id !== id)]
    const entry: JournalEntry = {
      id, timestamp: now, trigger: `奇门修运 · ${allDone ? '六门日课完成' : `${draft.done.length}/6 门进度`}`,
      oldPattern: draft.notes.filter(Boolean).join('\n'), newResponse: draft.reflection || '以真实行动，留下今天的修习。', somatic: '', distortion: '', source: 'manual', practiceOutcomeId: id,
      organizedText: qimenJournalText(draft), rawFragment: [...draft.notes.filter(Boolean), ...draft.joys.filter(Boolean), draft.reflection].filter(Boolean).join('\n\n'),
      analysis: '按六门行动与三吉记录整理。此处是记录归纳，不是命理预测或科学效力验证。',
    }
    const ok = saveStateBatch({
      qimenRecords: nextRecords,
      qimenDrafts: { ...loadState<Record<string, QimenDraft>>('qimenDrafts', {}), [date]: draft },
      journal: [entry, ...loadState<JournalEntry[]>('journal', []).filter((item) => item.id !== id)],
      practiceOutcomes: appendPracticeOutcome({ id, title: '奇门修运 · 六门日课', route: '/cultivation/qimen', completedAt: now, seconds, before: draft.before, after: draft.after, note: draft.reflection || draft.notes.filter(Boolean).join('\n') }),
    })
    saving.current = false
    if (!ok) { setMessage('保存失败，请先复制文字，检查设备存储后重试。'); return }
    setRecords(nextRecords)
    setDraftSaved(true)
    setMessage(allDone ? '六门日课已完成，整理版与原始表达已写入个人日志。' : '当前进度已归档，可以随时回来继续；再次保存会更新同一天的记录。')
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
  }

  return <div className="hos-page qimen-page">
    <Link to="/cultivation" className="qimen-back"><ArrowLeft size={17} />东方修仙</Link>
    <header className="qimen-hero">
      <span className="qimen-seal" aria-hidden="true">修<br />运</span>
      <p className="qimen-eyebrow">日常即道场 · 六门日课</p>
      <h1>奇门修运</h1>
      <p className="qimen-lead">修一颗清净心<br />把善意，落在今天的一小步。</p>
      <div className="qimen-hero-meta"><span>{date}</span><span>已实践 {days} 天 · 不必连续</span></div>
    </header>
    <div className="qimen-tabs" role="tablist" aria-label="奇门修运内容">
      {([['practice', '今日修习', Feather], ['source', '原文与图解', BookOpen], ['history', '修习档案', History]] as const).map(([value, label, Icon]) => <button key={value} role="tab" id={`qimen-tab-${value}`} aria-controls={`qimen-panel-${value}`} aria-selected={tab === value} onClick={() => setTab(value)}><Icon size={16} />{label}</button>)}
    </div>

    {tab === 'practice' && <div role="tabpanel" id="qimen-panel-practice" aria-labelledby="qimen-tab-practice">
      <section className="qimen-intro"><ShieldCheck size={18} /><p>保留口诀的文化意境，以清洁、善交、反思、学习和善行来实践。“转运、气场、星位”等属信念表达，不承诺超自然效果。</p></section>
      <section className="qimen-progress"><div><strong>今日六门</strong><span>{draft.done.length} / 6 已实践</span></div><progress max={6} value={draft.done.length} aria-label="六门修习进度" /><p>从任意一门开始，分开做也可以。完成后亲自确认。</p></section>
      <PracticeFeeling phase="before" value={draft.before} onChange={(before) => update({ before })} />
      <nav className="qimen-gates" aria-label="选择修习门类">{QIMEN_GATES.map((item, index) => <button key={item.id} aria-current={draft.selected === index ? 'step' : undefined} onClick={() => update({ selected: index })}><span>{draft.done.includes(item.id) ? <Check size={23} /> : item.short}</span><small>{item.name}</small></button>)}</nav>
      <article className="qimen-card qimen-current" key={gate.id}>
        <p className="qimen-eyebrow">第 {draft.selected + 1} 门 · {gate.subtitle}</p><h2>{gate.name}</h2>
        <blockquote>{gate.verses.map((index) => <p key={index}>{QIMEN_VERSES[index]}</p>)}</blockquote>
        <p className="qimen-meaning">{gate.meaning}</p>
        <h3>把这一门，过进生活</h3><ol className="qimen-actions">{gate.actions.map((action) => <li key={action}>{action}</li>)}</ol>
        <VoiceField label={gate.prompt} value={draft.notes[draft.selected] ?? ''} onChange={updateNote} placeholder={gate.placeholder} />
        {gate.id === 'reframe' && <div className="qimen-joys"><h3>日录三吉</h3><p>被关心、吃到热饭、及时停下来，都可以。</p>{draft.joys.map((joy, index) => <VoiceField key={index} label={`第 ${index + 1} 件小确幸`} value={joy} onChange={(value) => update({ joys: draft.joys.map((item, i) => i === index ? value : item) })} />)}</div>}
        <details className="qimen-boundary"><summary>温和实践的边界</summary><p>{gate.boundary}</p></details>
        <button className="qimen-primary" aria-pressed={draft.done.includes(gate.id)} onClick={toggleDone}><Check size={18} />{draft.done.includes(gate.id) ? '已实践 · 点此撤销' : '我已完成这一门的行动'}</button>
        {message.startsWith('这一门') && <p role="status" className="qimen-inline-hint">{message}</p>}
        <div className="qimen-step-nav"><button disabled={draft.selected === 0} onClick={() => update({ selected: draft.selected - 1 })}><ArrowLeft size={16} />上一门</button><button disabled={draft.selected === 5} onClick={() => update({ selected: draft.selected + 1 })}>下一门<ArrowRight size={16} /></button></div>
      </article>
      <details className="qimen-card qimen-timer"><summary>可选 · 两分钟静心与收束 <span>{timer.session.running ? '计时中' : timer.session.complete ? '已到时' : '三声引磬'}</span></summary><p>自然呼吸，松开肩膀。计时不代替真实行动，也不自动勾选六门。</p><div className="qimen-clock"><output aria-label="静心剩余时间">{Math.floor(timer.session.remaining / 60).toString().padStart(2, '0')}:{(timer.session.remaining % 60).toString().padStart(2, '0')}</output><button onClick={timer.toggle} disabled={timer.session.complete}>{timer.session.running ? <Pause size={18} /> : <Play size={18} />}{timer.session.complete ? '本日静心已完成' : timer.session.running ? '暂停' : '开始静心'}</button></div><PracticeTimerSupport running={timer.session.running} audioReady={timer.audioReady} /></details>
      <section className="qimen-card"><p className="qimen-eyebrow">收功 · 回到日常</p><h2>{allDone ? '六门走过，回归平常' : '做到这里，也值得留下'}</h2><PracticeFeeling phase="after" value={draft.after} onChange={(after) => update({ after })} /><VoiceField label="今天的体会与明天的一小步" value={draft.reflection} onChange={(reflection) => update({ reflection })} /><p className="qimen-storage">{draftSaved ? '草稿已保存在本机。归档后可在个人日志查看整理版和原始表达。' : '草稿未能保存，请先复制文字。'} 换设备不会自动同步，可在日志中导出备份。</p><button className="qimen-primary" onClick={archive}>{allDone ? '完成日课并写入日志' : '保存当前进度到日志'}<ArrowRight size={18} /></button></section>
      {message && <div className="qimen-feedback" role="status">{message}<Link to="/journal">查看个人日志<ChevronRight size={14} /></Link></div>}
    </div>}

    {tab === 'source' && <section role="tabpanel" id="qimen-panel-source" aria-labelledby="qimen-tab-source" className="qimen-source">
      <div className="qimen-card"><p className="qimen-eyebrow">来源与阅读说明</p><h2>原意保留，实践有界</h2><p>本篇来自你提供的《修运奇门口诀》与《奇门修运》图解。出处、作者与年代未考证，不冒充古籍校勘本，也不代表奇门遁甲的权威教程。</p><p>下方“原释义”忠实保留来源观点；其中婴儿纯阳、金属化煞、心念生物磁场改运等说法没有在本应用中获得科学验证，不应据此作医疗、消费或投资决定。修习页另提供日常行动版。</p></div>
      <article className="qimen-card"><h2>修运奇门口诀 · 完整版</h2><ol className="qimen-verses">{QIMEN_VERSES.map((verse, index) => <li key={verse}><span>{String(index + 1).padStart(2, '0')}</span><p>{verse}</p></li>)}</ol></article>
      <article className="qimen-card"><h2>来源原释义</h2><p>以下为用户提供材料的观点转录，不是 HOS 的事实断言。</p>{QIMEN_SOURCE_NOTES.map((item) => <details className="qimen-source-note" key={item.title}><summary>{item.title}</summary><div className="qimen-quoted"><small>来源观点 · 非科学结论</small><p>{item.text}</p></div></details>)}</article>
      <details className="qimen-card qimen-original"><summary>查看完整原图 · 奇门修运</summary><p>原图含六个板块及原释义，点开图片可放大查看。</p><a href={`${import.meta.env.BASE_URL}images/qimen-xiuyun-source.png`} target="_blank" rel="noreferrer"><img src={`${import.meta.env.BASE_URL}images/qimen-xiuyun-source.png`} loading="lazy" alt="用户提供的奇门修运原图：净身净居、择人交往、逆思三吉、亲孺持器游廛居馆、心念与气运、藏锋守拙。完整口诀和原释义已在上方转录。" /></a></details>
    </section>}

    {tab === 'history' && <section role="tabpanel" id="qimen-panel-history" aria-labelledby="qimen-tab-history" className="qimen-card"><p className="qimen-eyebrow">留下行动，不评判运势</p><h2>我的修运日课</h2><p>同一天再次归档会更新记录，不会重复累加。今日草稿自动续接，往日草稿可回看和备份。</p>{Object.values(loadState<Record<string, QimenDraft>>('qimenDrafts', {})).filter((item) => item.date !== date && item.updatedAt > 0 && !records.some((record) => record.date === item.date && record.updatedAt >= item.updatedAt)).sort((a, b) => b.date.localeCompare(a.date)).map((item) => <details className="qimen-history-item" key={item.date}><summary>{item.date} · 未归档草稿</summary><pre>{qimenJournalText(item)}</pre><p>这份草稿保留于本机，可在日志的完整备份中导出。</p></details>)}{!records.length && <p className="qimen-empty">还没有归档。先实践一门，或者记录一句体会，不必一次做完。</p>}{records.map((record) => <details key={record.id} className="qimen-history-item"><summary><span>{record.date}</span><span>{record.done.length === 6 ? '六门完成' : `${record.done.length}/6 门`}</span></summary><pre>{qimenJournalText(record)}</pre></details>)}<Link className="qimen-archive-link" to="/journal">进入个人日志与备份<ArrowRight size={16} /></Link></section>}
  </div>
}
