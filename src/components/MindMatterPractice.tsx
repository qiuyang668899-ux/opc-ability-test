import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, BellRing, Brain, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Save, ShieldAlert, Sparkles, X } from 'lucide-react'
import { MIND_MATTER_MANTRA, MIND_MATTER_PHASES, MIND_MATTER_STEPS } from '../data/mindMatterPractice'
import { loadState, saveState, type JournalEntry } from '../stores/useStore'
import VoiceInputButton from './VoiceInputButton'
import { playCultivationChime, prepareCultivationChime } from '../utils/cultivationChime'

type Observation = 'none' | 'uncertain' | 'directional'
type Interference = 'none' | 'air' | 'heat' | 'vibration' | 'touch' | 'other'

type MindMatterRecord = {
  id: string
  day: number
  completedAt: number
  focus: number
  observation: Observation
  interference: Interference
  notes: string
}

type ActiveSession = {
  date: string
  stepIndex: number
  remaining: number
  running: boolean
}

const RECORD_KEY = 'mindMatterPracticeRecords'
const SESSION_KEY = 'mindMatterActiveSession'

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function phaseFor(day: number) {
  if (day <= 30) return MIND_MATTER_PHASES[0]
  if (day <= 60) return MIND_MATTER_PHASES[1]
  return MIND_MATTER_PHASES[2]
}

function emptySession(): ActiveSession {
  return { date: todayKey(), stepIndex: 0, remaining: MIND_MATTER_STEPS[0].minutes * 60, running: false }
}

function streakFor(records: MindMatterRecord[]) {
  const dates = new Set(records.map((record) => new Date(record.completedAt).toLocaleDateString('en-CA')))
  const cursor = new Date()
  if (!dates.has(todayKey())) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (dates.has(cursor.toLocaleDateString('en-CA'))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function MindMatterPractice() {
  const [records, setRecords] = useState(() => loadState<MindMatterRecord[]>(RECORD_KEY, []))
  const [open, setOpen] = useState(false)
  const [showTheory, setShowTheory] = useState(false)
  const [session, setSession] = useState<ActiveSession>(() => {
    const stored = loadState<ActiveSession | null>(SESSION_KEY, null)
    return stored?.date === todayKey() ? stored : emptySession()
  })
  const [complete, setComplete] = useState(false)
  const [focus, setFocus] = useState(3)
  const [observation, setObservation] = useState<Observation>('none')
  const [interference, setInterference] = useState<Interference>('none')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const activeStep = MIND_MATTER_STEPS[session.stepIndex]
  const completedDays = Math.min(100, new Set(records.map((record) => new Date(record.completedAt).toLocaleDateString('en-CA'))).size)
  const currentDay = Math.min(100, completedDays + (records.some((record) => new Date(record.completedAt).toLocaleDateString('en-CA') === todayKey()) ? 0 : 1))
  const phase = phaseFor(Math.max(1, currentDay))
  const completedToday = records.some((record) => new Date(record.completedAt).toLocaleDateString('en-CA') === todayKey())
  const totalSeconds = MIND_MATTER_STEPS.reduce((sum, step) => sum + step.minutes * 60, 0)
  const elapsedPrior = MIND_MATTER_STEPS.slice(0, session.stepIndex).reduce((sum, step) => sum + step.minutes * 60, 0)
  const progress = complete ? 100 : Math.round(((elapsedPrior + activeStep.minutes * 60 - session.remaining) / totalSeconds) * 100)
  const cleanSessions = records.filter((record) => record.interference === 'none').length
  const averageFocus = records.length ? (records.reduce((sum, record) => sum + record.focus, 0) / records.length).toFixed(1) : '—'
  const streak = streakFor(records)
  const activeElapsed = activeStep.minutes * 60 - session.remaining
  const testRound = Math.min(15, Math.floor(activeElapsed / 60) + 1)
  const testMode = activeElapsed % 60 < 30 ? '聚 · 发' : '松'
  const contentRef = useRef<HTMLDivElement>(null)
  const previousSessionRef = useRef<ActiveSession | null>(null)

  const stageMessage = useMemo(() => {
    if (phase.id === 1) return '今天不以转物为目标，只练低噪声、稳定和清晰。'
    if (phase.id === 2) return '今天把四个脚手架绑成一个可快速调用的状态。'
    return '今天只做预先定义、可记录、可排除干扰的意—物观察。'
  }, [phase.id])

  useEffect(() => {
    if (!open || !session.running || complete) return undefined
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (!current.running) return current
        if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 }
        const nextIndex = current.stepIndex + 1
        if (nextIndex >= MIND_MATTER_STEPS.length) {
          return { ...current, remaining: 0, running: false }
        }
        return { ...current, stepIndex: nextIndex, remaining: MIND_MATTER_STEPS[nextIndex].minutes * 60, running: false }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [complete, open, session.running])

  useEffect(() => {
    const previous = previousSessionRef.current
    const endedNaturally = Boolean(open && previous?.running && previous.remaining === 1 && (
      session.stepIndex !== previous.stepIndex || session.remaining === 0
    ))
    if (endedNaturally) {
      playCultivationChime()
      navigator.vibrate?.([45, 90, 45, 90, 70])
    }
    previousSessionRef.current = session
  }, [open, session])

  useEffect(() => {
    if (session.stepIndex === MIND_MATTER_STEPS.length - 1 && session.remaining === 0) setComplete(true)
  }, [session.remaining, session.stepIndex])

  useEffect(() => {
    if (!open) return
    saveState(SESSION_KEY, session)
  }, [open, session])

  useEffect(() => {
    if (!open) return undefined
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [open])

  const start = () => {
    if (completedToday) return
    const stored = loadState<ActiveSession | null>(SESSION_KEY, null)
    const next = stored?.date === todayKey() ? stored : emptySession()
    setSession(next)
    setComplete(false)
    setSaved(false)
    setOpen(true)
  }

  const chooseStep = (index: number) => {
    setSession({ date: todayKey(), stepIndex: index, remaining: MIND_MATTER_STEPS[index].minutes * 60, running: false })
    setComplete(false)
    contentRef.current?.scrollTo({ top: 0 })
  }

  const restart = () => {
    const next = emptySession()
    setSession(next)
    saveState(SESSION_KEY, next)
    setComplete(false)
    setSaved(false)
  }

  const nextStep = () => {
    if (session.stepIndex >= MIND_MATTER_STEPS.length - 1) {
      setComplete(true)
      setSession((current) => ({ ...current, remaining: 0, running: false }))
      return
    }
    chooseStep(session.stepIndex + 1)
  }

  const toggleTimer = () => {
    if (!session.running) void prepareCultivationChime()
    setSession((current) => ({ ...current, running: !current.running }))
  }

  const savePractice = () => {
    if (saved || completedToday) return
    const now = Date.now()
    const record: MindMatterRecord = { id: `mind-matter-${now}`, day: Math.max(1, currentDay), completedAt: now, focus, observation, interference, notes: notes.trim() }
    const nextRecords = [record, ...records].slice(0, 180)
    saveState(RECORD_KEY, nextRecords)
    setRecords(nextRecords)
    saveState(SESSION_KEY, null)

    const observationLabel = observation === 'none' ? '未观察到移动' : observation === 'uncertain' ? '观察不确定' : '观察到与预设方向一致的微动'
    const interferenceLabel = interference === 'none' ? '未发现明显环境干扰' : `记录到干扰：${interference}`
    const journal = loadState<JournalEntry[]>('journal', [])
    const entry: JournalEntry = {
      id: record.id,
      timestamp: now,
      trigger: `东方修仙 · 守一百日 · 第 ${record.day} 日`,
      oldPattern: '训练前的注意状态由本人觉察',
      newResponse: notes.trim() || `${observationLabel}；${interferenceLabel}。`,
      somatic: '完成自然呼吸、凝视、观想、聚合、实验与收功',
      distortion: '不把主观强度、偶然微动或期待当作能力证据',
      analysis: `完成 60 分钟六步修习；专注自评 ${focus}/5；${observationLabel}；${interferenceLabel}。`,
      source: 'manual',
      organizedText: notes.trim() || `守一百日第 ${record.day} 日完成。${observationLabel}。`,
      regulationPath: ['静', '定', '观', '合', '发', '收'],
    }
    saveState('journal', [entry, ...journal].slice(0, 500))
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
    navigator.vibrate?.([30, 40, 65])
    setSaved(true)
  }

  return (
    <section className="mind-matter-card" id="mind-matter-practice">
      <header>
        <div><p className="section-kicker">ONE MIND · 100 DAYS</p><h2>守一 · 百日意识训练</h2><p>把“心能转物”作为待验证工作假说，真正训练低噪声、稳定集中、精确调用与及时退出。</p></div>
        <span><Brain size={15} />第 {currentDay} 日</span>
      </header>

      <div className="mind-matter-progress"><i style={{ width: `${completedDays}%` }} /><span>{completedDays}/100</span></div>
      <div className="mind-matter-phase">
        <span>阶段 {phase.id}</span><div><strong>{phase.title}</strong><p>{stageMessage}</p></div><em>第 {phase.days} 天</em>
      </div>
      <div className="mind-matter-mantra" aria-label="六字总诀">{MIND_MATTER_MANTRA.map((item, index) => <span key={item} className={index === 5 ? 'stop' : ''}>{item}<small>{index < 5 ? '·' : ''}</small></span>)}</div>

      <div className="mind-matter-steps-preview">{MIND_MATTER_STEPS.map((step) => <div key={step.id}><i>{step.character}</i><strong>{step.minutes}</strong><span>分钟</span></div>)}</div>

      <div className="mind-matter-actions">
        <button className="primary" onClick={start} disabled={completedToday}><Play size={16} />{completedToday ? '今日修习已归档' : session.stepIndex > 0 || session.remaining < activeStep.minutes * 60 ? '继续今日修习' : '开始60分钟修习'}</button>
        <button onClick={() => setShowTheory((value) => !value)}>{showTheory ? '收起原理' : '查看方法与边界'}<ChevronRight size={15} /></button>
      </div>

      {showTheory && <div className="mind-matter-theory">
        <div className="mind-matter-principles">
          <article><small>佛学所取</small><strong>戒 · 安那般那 · 止观定</strong><p>先使心不散，再看见念头如何生灭。</p></article>
          <article><small>道家所取</small><strong>松 · 静 · 守一 · 形神协调</strong><p>不逐奇效，让身、息、心回到一处。</p></article>
          <article><small>认知科学</small><strong>注意控制 · 条件化 · 运动意象</strong><p>用固定线索建立可重复进入与退出的状态。</p></article>
          <article><small>待验证假说</small><strong>状态编码 · 意识选择器</strong><p>只作实验框架，不把设想当成事实。</p></article>
        </div>
        <div className="mind-matter-variables"><small>真正优先训练的四个变量</small><span>念头纯度</span><span>稳定度</span><span>重复度</span><span>进入 / 退出速度</span></div>
        <div className="mind-matter-phases">{MIND_MATTER_PHASES.map((item) => <article key={item.id} className={item.id === phase.id ? 'active' : ''}><small>第 {item.days} 天</small><strong>{item.title}</strong><p>{item.goal}</p><em>{item.success}</em></article>)}</div>
        <div className="mind-matter-kit"><strong>百日固定，不再增加变量</strong><p>准备 1 个墙面黑点、1 个参数固定的白球表象、1 个带透明罩的轻质悬挂目标、1 个固定座位。目标物与座位 100 天不更换。</p></div>
        <div className="mind-matter-boundary"><ShieldAlert size={18} /><p><strong>科学与安全边界</strong>目前没有可靠证据证明意识可直接推动被隔离物体。训练不采用憋气、缺氧、禁食、失眠、撞击身体或火焰；目标物结果必须与气流、热对流、静电、桌面振动和无意识动作分开记录。</p></div>
      </div>}

      <footer><span><Sparkles size={13} />连续 {streak} 天</span><span>无干扰记录 {cleanSessions}</span><span>平均专注 {averageFocus}</span></footer>

      {open && createPortal((
        <div className="mind-matter-layer" role="dialog" aria-modal="true" aria-label="守一百日意识训练">
          <button className="cultivation-session-backdrop" onClick={() => setOpen(false)} aria-label="暂存并关闭" />
          <section className="mind-matter-sheet">
            <div className="mind-matter-session-progress"><i style={{ width: `${progress}%` }} /></div>
            <header><button onClick={() => setOpen(false)} aria-label="暂存并返回"><ChevronLeft size={20} /></button><div><small>守一百日 · 第 {currentDay} 日 · 阶段 {phase.id}</small><strong>{complete ? '如实记录，彻底收功' : `${activeStep.character} · ${activeStep.title}`}</strong></div><button onClick={() => setOpen(false)} aria-label="关闭"><X size={19} /></button></header>

            {!complete ? <div className="mind-matter-session-body" ref={contentRef}>
              <nav className="mind-matter-step-nav">{MIND_MATTER_STEPS.map((step, index) => <button key={step.id} className={index === session.stepIndex ? 'active' : index < session.stepIndex ? 'done' : ''} onClick={() => chooseStep(index)}><i>{index < session.stepIndex ? <Check size={11} /> : step.character}</i><span>{step.minutes}′</span></button>)}</nav>
              <div className="mind-matter-timer" style={{ '--mind-progress': `${Math.max(2, 100 - (session.remaining / (activeStep.minutes * 60)) * 100)}%` } as CSSProperties}><span><small>{activeStep.character}</small><strong>{formatTimer(session.remaining)}</strong><em>{session.running ? '正在修习' : '准备好再开始'}</em></span></div>
              {activeStep.id === 'test' && <div className={`mind-matter-rhythm ${testMode === '松' ? 'release' : ''}`}><span>第 {testRound}/15 轮</span><strong>{testMode}</strong><em>{testMode === '松' ? '完全放松 30 秒' : '只保留预设结果 30 秒'}</em></div>}
              <div className="mind-matter-step-copy"><small>第 {session.stepIndex + 1}/6 步 · {activeStep.objective}</small><h2>{activeStep.title}</h2><ol>{activeStep.instruction.map((item) => <li key={item}>{item}</li>)}</ol><blockquote>{activeStep.cue}</blockquote>{activeStep.safety && <p className="safety"><ShieldAlert size={14} />{activeStep.safety}</p>}</div>
              <div className="mind-matter-session-controls"><button className="primary" onClick={toggleTimer}>{session.running ? <Pause size={17} /> : <Play size={17} />}{session.running ? '暂停' : session.remaining === activeStep.minutes * 60 ? '开始这一步' : '继续'}</button><button onClick={nextStep}>{session.stepIndex === 5 ? '完成' : '下一步'}<ArrowRight size={16} /></button><button onClick={restart} aria-label="重新开始"><RotateCcw size={16} /></button></div>
              <p className="mind-matter-exit"><BellRing size={13} />本环节结束会响三声引磬；可暂停，退出会保留进度。</p>
            </div> : <div className="mind-matter-finish">
              <span><Check size={24} /></span><p className="section-kicker">PRACTICE COMPLETE</p><h2>一念已止，回到日常</h2><p>记录的目标不是证明能力，而是让长期数据逐渐比期待更可靠。</p>
              <label><strong>今天的专注稳定度</strong><div className="mind-matter-rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={focus === value ? 'active' : ''} onClick={() => setFocus(value)}>{value}</button>)}</div></label>
              <label><strong>目标物观察</strong><div className="mind-matter-choice">{([['none', '未移动'], ['uncertain', '不确定'], ['directional', '与预设方向一致']] as const).map(([value, label]) => <button key={value} className={observation === value ? 'active' : ''} onClick={() => setObservation(value)}>{label}</button>)}</div></label>
              <label><strong>是否发现环境干扰</strong><select value={interference} onChange={(event) => setInterference(event.target.value as Interference)}><option value="none">未发现明显干扰</option><option value="air">气流</option><option value="heat">热对流</option><option value="vibration">桌面或地面振动</option><option value="touch">触碰或无意识动作</option><option value="other">其他干扰</option></select></label>
              <label><strong>如实记录，可以直接说</strong><div className="voice-enabled-control textarea"><textarea value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 1000))} placeholder="例如：第8轮出现微动，但同时有人走过；今天观想容易散……" /><VoiceInputButton value={notes} onChange={setNotes} maxLength={1000} label="用语音记录本次修习" /></div></label>
              <button className="mind-matter-save" onClick={savePractice} disabled={saved || completedToday}><Save size={15} />{saved || completedToday ? '已存入个人日志档案' : '如实归档第 ' + currentDay + ' 日'}</button>
              <button className="mind-matter-close" onClick={() => setOpen(false)}>完成</button>
            </div>}
          </section>
        </div>
      ), document.body)}
    </section>
  )
}
