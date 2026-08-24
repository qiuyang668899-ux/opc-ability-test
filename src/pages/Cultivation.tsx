import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  ExternalLink,
  Feather,
  Footprints,
  HeartHandshake,
  History,
  LibraryBig,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Waves,
  X,
} from 'lucide-react'
import {
  CULTIVATION_CLASSICS,
  CULTIVATION_METHODS,
  CULTIVATION_ROUTINES,
  CULTIVATION_SOURCES,
  IMMORTAL_STORIES,
  type CultivationAxis,
  type CultivationClassic,
  type CultivationRoutine,
  type CultivationSafety,
  type ImmortalStory,
} from '../data/cultivation'
import { CULTIVATION_TEXT_SOURCES } from '../data/cultivationReader'
import { loadState, saveState, type DailyCheckIn, type JournalEntry } from '../stores/useStore'
import CultivationClassicReader from '../components/CultivationClassicReader'
import MindMatterPractice from '../components/MindMatterPractice'
import VoiceInputButton from '../components/VoiceInputButton'
import { playCultivationChime, prepareCultivationChime } from '../utils/cultivationChime'

type PracticeRecord = {
  id: string
  routineId: string
  routineTitle: string
  minutes: number
  reflection: string
  completedAt: number
}

type SessionState = {
  stepIndex: number
  remaining: number
  running: boolean
  complete: boolean
}

const axisIcons = {
  肉身: Footprints,
  元神: Sparkles,
  合修: Waves,
  德行: HeartHandshake,
  经学: BookOpenText,
} as const

const safetyMeta: Record<CultivationSafety, { label: string; detail: string }> = {
  daily: { label: '可安全日用', detail: '以温和、舒适、可停止为原则' },
  guided: { label: '需辨析或指导', detail: '先读历史与流派，不自行追求火候、周天或特殊体验' },
  archive: { label: '仅作文献研究', detail: '不转化为服食、闭气、辟谷或其他身体操作' },
}

function formatTimer(seconds: number) {
  const minute = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minute}:${rest}`
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function stageFor(records: PracticeRecord[]) {
  const days = new Set(records.map((record) => new Date(record.completedAt).toLocaleDateString('en-CA'))).size
  if (days >= 21) return { name: '性命合修', next: '守住节律，回到生活验证', level: 4 }
  if (days >= 7) return { name: '凝神', next: `再完成 ${21 - days} 个练习日`, level: 3 }
  if (days >= 3) return { name: '炼己', next: `再完成 ${7 - days} 个练习日`, level: 2 }
  if (days >= 1) return { name: '筑基', next: `再完成 ${3 - days} 个练习日`, level: 1 }
  return { name: '启炉', next: '完成第一次身心合修', level: 0 }
}

function recommendedRoutine(checkIn: DailyCheckIn | null) {
  if (!checkIn) return CULTIVATION_ROUTINES[0]
  if (checkIn.pressure >= 4) return CULTIVATION_ROUTINES[2]
  if (checkIn.energy <= 2 || checkIn.clarity <= 2) return CULTIVATION_ROUTINES[1]
  return CULTIVATION_ROUTINES[0]
}

export default function Cultivation() {
  const navigate = useNavigate()
  const [records, setRecords] = useState(() => loadState<PracticeRecord[]>('cultivationPracticeRecords', []))
  const [selectedRoutine, setSelectedRoutine] = useState<CultivationRoutine | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [reflection, setReflection] = useState('')
  const [savedSession, setSavedSession] = useState(false)
  const [axis, setAxis] = useState<'全部' | CultivationAxis>('全部')
  const [classicQuery, setClassicQuery] = useState('')
  const [classicSafety, setClassicSafety] = useState<'全部' | CultivationSafety>('全部')
  const [selectedClassic, setSelectedClassic] = useState<CultivationClassic | null>(null)
  const [storyMotif, setStoryMotif] = useState<'全部' | ImmortalStory['motif']>('全部')
  const [selectedStory, setSelectedStory] = useState<ImmortalStory | null>(null)
  const checkIn = loadState<DailyCheckIn | null>('dailyCheckIn', null)
  const recommended = recommendedRoutine(checkIn?.date === todayKey() ? checkIn : null)
  const stage = stageFor(records)
  const practicedToday = records.some((record) => new Date(record.completedAt).toLocaleDateString('en-CA') === todayKey())
  const totalMinutes = records.reduce((sum, record) => sum + record.minutes, 0)
  const practiceDays = new Set(records.map((record) => new Date(record.completedAt).toLocaleDateString('en-CA'))).size

  const visibleMethods = axis === '全部' ? CULTIVATION_METHODS : CULTIVATION_METHODS.filter((method) => method.axis === axis)
  const visibleClassics = useMemo(() => CULTIVATION_CLASSICS.filter((book) => {
    const query = classicQuery.trim().toLocaleLowerCase()
    const matchesQuery = !query || [book.title, book.focus, book.attribution, book.description].join(' ').toLocaleLowerCase().includes(query)
    const matchesSafety = classicSafety === '全部' || book.safety === classicSafety
    return matchesQuery && matchesSafety
  }), [classicQuery, classicSafety])
  const motifs = useMemo(() => ['全部', ...new Set(IMMORTAL_STORIES.map((story) => story.motif))] as Array<'全部' | ImmortalStory['motif']>, [])
  const visibleStories = storyMotif === '全部' ? IMMORTAL_STORIES : IMMORTAL_STORIES.filter((story) => story.motif === storyMotif)
  const previousSessionRef = useRef<SessionState | null>(null)

  useEffect(() => {
    if (!session?.running) return undefined
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (!current?.running || !selectedRoutine) return current
        if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 }
        const nextIndex = current.stepIndex + 1
        if (nextIndex >= selectedRoutine.steps.length) return { ...current, remaining: 0, running: false, complete: true }
        return { stepIndex: nextIndex, remaining: selectedRoutine.steps[nextIndex].durationSec, running: true, complete: false }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [selectedRoutine, session?.running])

  useEffect(() => {
    const previous = previousSessionRef.current
    const endedNaturally = Boolean(previous?.running && previous.remaining === 1 && session && (
      session.stepIndex !== previous.stepIndex || session.complete
    ))
    if (endedNaturally) {
      playCultivationChime()
      navigator.vibrate?.([45, 90, 45, 90, 70])
    }
    previousSessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!selectedRoutine && !selectedClassic && !selectedStory) return undefined
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prior }
  }, [selectedClassic, selectedRoutine, selectedStory])

  const openRoutine = (routine: CultivationRoutine) => {
    setSelectedRoutine(routine)
    setSession({ stepIndex: 0, remaining: routine.steps[0].durationSec, running: false, complete: false })
    setReflection('')
    setSavedSession(false)
  }

  const closeRoutine = () => {
    setSelectedRoutine(null)
    setSession(null)
  }

  const restartRoutine = () => {
    if (!selectedRoutine) return
    setSession({ stepIndex: 0, remaining: selectedRoutine.steps[0].durationSec, running: false, complete: false })
    setSavedSession(false)
  }

  const toggleRoutineTimer = () => {
    if (!session?.running) void prepareCultivationChime()
    setSession((current) => current ? { ...current, running: !current.running } : current)
  }

  const saveCompletedSession = () => {
    if (!selectedRoutine || savedSession) return
    const now = Date.now()
    const record: PracticeRecord = {
      id: `cultivation-${now}`,
      routineId: selectedRoutine.id,
      routineTitle: selectedRoutine.title,
      minutes: selectedRoutine.duration,
      reflection: reflection.trim(),
      completedAt: now,
    }
    const nextRecords = [record, ...records].slice(0, 365)
    saveState('cultivationPracticeRecords', nextRecords)
    setRecords(nextRecords)

    const journal = loadState<JournalEntry[]>('journal', [])
    const entry: JournalEntry = {
      id: record.id,
      timestamp: now,
      trigger: `东方修仙 · ${selectedRoutine.title}`,
      oldPattern: '开始前的状态由本人觉察',
      newResponse: reflection.trim() || '完成一次形神合修，先把体验留在身体里。',
      somatic: selectedRoutine.axes.includes('肉身') ? '已完成温和肉身练习' : '本次以心神修习为主',
      distortion: '不追逐神异，以日常变化验证',
      analysis: `完成 ${selectedRoutine.duration} 分钟修习：${selectedRoutine.steps.map((step) => step.title).join('、')}。`,
      source: 'manual',
      organizedText: reflection.trim() || `完成${selectedRoutine.title}。`,
      regulationPath: ['东方修仙', ...selectedRoutine.steps.map((step) => step.title)],
    }
    saveState('journal', [entry, ...journal].slice(0, 500))
    setSavedSession(true)
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
    navigator.vibrate?.([24, 30, 44])
  }

  const openClassic = (book: CultivationClassic) => {
    if (CULTIVATION_TEXT_SOURCES[book.id]) {
      setSelectedClassic(book)
      return
    }
    if (book.readerBook) {
      navigate(`/classics?book=${encodeURIComponent(book.readerBook)}`)
      return
    }
  }

  const sessionProgress = selectedRoutine && session
    ? Math.round(((selectedRoutine.steps.slice(0, session.stepIndex).reduce((sum, step) => sum + step.durationSec, 0)
      + (selectedRoutine.steps[session.stepIndex]?.durationSec ?? 0) - session.remaining)
      / selectedRoutine.steps.reduce((sum, step) => sum + step.durationSec, 0)) * 100)
    : 0

  return (
    <div className="hos-page cultivation-page animate-float-up">
      <section className="cultivation-hero">
        <div className="cultivation-sun" aria-hidden="true"><span /><i /></div>
        <p className="section-kicker">EASTERN CULTIVATION · 东方修仙</p>
        <h1>修形，也修神<br /><span>把古老仙道，落回今日生活</span></h1>
        <p>读中国道家古籍，辨仙传故事，练一套安全、清醒、可持续的性命合修。这里尊重传统，也明确区分信仰、文学、历史与可验证的日常练习。</p>
        <div className="cultivation-hero-actions">
          <button onClick={() => openRoutine(recommended)}><Play size={16} />开始今日修行</button>
          <button onClick={() => document.querySelector('#cultivation-classics')?.scrollIntoView({ behavior: 'smooth' })}><LibraryBig size={16} />进入修仙典藏</button>
        </div>
        <div className="cultivation-hero-stats">
          <div><strong>{stage.name}</strong><span>当前境阶</span></div>
          <div><strong>{practiceDays}</strong><span>真实练习日</span></div>
          <div><strong>{totalMinutes}</strong><span>累计分钟</span></div>
        </div>
      </section>

      <section className="cultivation-today">
        <header>
          <div><p className="section-kicker">TODAY'S CULTIVATION</p><h2>{practicedToday ? '今日功课已归档' : '今日只修这一炉'}</h2></div>
          <span>{practicedToday ? <Check size={14} /> : <SunMedium size={14} />}{practicedToday ? '已完成' : `${recommended.duration} 分钟`}</span>
        </header>
        <article>
          <div className="cultivation-recommend-mark"><Waves size={24} /></div>
          <div><small>{recommended.subtitle}</small><h3>{recommended.title}</h3><p>{recommended.description}</p></div>
          <button onClick={() => openRoutine(recommended)}>{practicedToday ? '再修一轮' : '开始'}<ArrowRight size={15} /></button>
        </article>
        <div className="cultivation-stage-track" aria-label={`修行进阶：${stage.name}`}>
          {['启炉', '筑基', '炼己', '凝神', '合修'].map((item, index) => <span key={item} className={index <= stage.level ? 'active' : ''}><i>{index < stage.level ? <Check size={10} /> : index + 1}</i><em>{item}</em></span>)}
        </div>
        <p className="cultivation-stage-next"><ShieldCheck size={13} />{stage.next} · 境阶只记录持续性，不代表超自然能力</p>
      </section>

      <MindMatterPractice />

      <section className="cultivation-dual-path">
        <div className="cultivation-section-heading">
          <p className="section-kicker">BODY · SPIRIT · VIRTUE</p>
          <h2>肉身是炉，元神是主</h2>
          <p>传统中的“性命双修”不是只练身体，也不是只追求意识体验。HOS 将它整理成五条互相校正的路径。</p>
        </div>
        <div className="cultivation-axis-tabs" role="tablist" aria-label="修炼路径筛选">
          {(['全部', '肉身', '元神', '合修', '德行', '经学'] as const).map((item) => <button key={item} role="tab" aria-selected={axis === item} className={axis === item ? 'active' : ''} onClick={() => setAxis(item)}>{item}</button>)}
        </div>
        <div className="cultivation-method-grid">
          {visibleMethods.map((method) => {
            const Icon = axisIcons[method.axis]
            return (
              <article key={method.id} className={`safety-${method.safety}`}>
                <header><span><Icon size={19} /></span><div><small>{method.classicalName}</small><h3>{method.title}</h3></div><em>{method.axis}</em></header>
                <p>{method.description}</p>
                <div><strong>今日可做</strong><span>{method.todayPractice}</span></div>
                <footer><ShieldCheck size={12} /><span>{safetyMeta[method.safety].label}</span><i>{method.source}</i></footer>
              </article>
            )
          })}
        </div>
      </section>

      <section className="cultivation-routines">
        <div className="cultivation-section-heading"><p className="section-kicker">DAILY PRACTICE</p><h2>三套可直接开始的日课</h2><p>不需要器具，不用追逐气感。任何不适都可以停下，坐着、站着或减量完成都算修习。</p></div>
        <div className="cultivation-routine-list">
          {CULTIVATION_ROUTINES.map((routine, index) => (
            <button key={routine.id} onClick={() => openRoutine(routine)}>
              <span className="cultivation-routine-number">{String(index + 1).padStart(2, '0')}</span>
              <span><small>{routine.axes.join(' · ')} · {routine.duration} 分钟</small><strong>{routine.title}</strong><em>{routine.suitableFor.join(' / ')}</em></span>
              <CirclePlay size={22} />
            </button>
          ))}
        </div>
      </section>

      <section className="cultivation-classics" id="cultivation-classics">
        <div className="cultivation-section-heading"><p className="section-kicker">DAOIST CANON · 修仙典藏</p><h2>{CULTIVATION_CLASSICS.length} 部核心古籍 · 原文与译文</h2><p>从哲学、养形、存思到内丹与仙传。点击任意一部，直接阅读全本原文、对应现代译文或逐段对照，不再用摘要代替正文。</p></div>
        <div className="cultivation-library-controls">
          <label><Search size={16} /><input value={classicQuery} onChange={(event) => setClassicQuery(event.target.value.slice(0, 50))} placeholder="搜索典籍、作者或修炼主题" /><VoiceInputButton value={classicQuery} onChange={setClassicQuery} maxLength={50} label="说出想寻找的修仙古籍" /></label>
          <div role="tablist" aria-label="按阅读安全层级筛选">
            {(['全部', 'daily', 'guided', 'archive'] as const).map((item) => <button key={item} role="tab" aria-selected={classicSafety === item} className={classicSafety === item ? 'active' : ''} onClick={() => setClassicSafety(item)}>{item === '全部' ? '全部' : safetyMeta[item].label}</button>)}
          </div>
        </div>
        <div className="cultivation-book-grid">
          {visibleClassics.map((book, index) => (
            <button key={book.id} onClick={() => openClassic(book)}>
              <span className="cultivation-book-seal">{book.axis.slice(0, 1)}</span>
              <span><small>{book.era} · {book.attribution}</small><strong>{book.title}</strong><p>{book.focus}</p><em className={`safety-${book.safety}`}>{safetyMeta[book.safety].label}</em></span>
              <span className="cultivation-book-index"><small>文译</small>{String(index + 1).padStart(2, '0')}<ChevronRight size={15} /></span>
            </button>
          ))}
        </div>
        {!visibleClassics.length && <div className="cultivation-empty"><Search size={21} /><strong>暂时没有匹配典籍</strong><button onClick={() => { setClassicQuery(''); setClassicSafety('全部') }}>查看全部</button></div>}
      </section>

      <section className="cultivation-stories">
        <div className="cultivation-section-heading"><p className="section-kicker">IMMORTAL TALES · 仙传故事</p><h2>从白日飞升，到壶中天地</h2><p>这些故事是中国宗教、文学与集体想象的一部分。我们保留它们的神奇，也标清哪些是传说、哪些有人物史实基础。</p></div>
        <div className="cultivation-story-tabs" role="tablist" aria-label="仙传故事母题">
          {motifs.map((motif) => <button key={motif} role="tab" aria-selected={storyMotif === motif} className={storyMotif === motif ? 'active' : ''} onClick={() => setStoryMotif(motif)}>{motif}</button>)}
        </div>
        <div className="cultivation-story-grid">
          {visibleStories.map((story) => (
            <button key={story.id} onClick={() => setSelectedStory(story)}>
              <span><Feather size={18} /></span>
              <small>{story.motif} · {story.source}</small>
              <strong>{story.title}</strong>
              <p>{story.figure}</p>
              <em>展开故事 <ArrowRight size={12} /></em>
            </button>
          ))}
        </div>
      </section>

      <section className="cultivation-boundary">
        <ShieldAlert size={20} />
        <div><strong>修仙不以伤身为代价</strong><p>外丹、服食、来历不明药物、长期辟谷、强闭气、追求眩晕或幻觉的练法，仅作历史研究。冥想也并非对所有人都同样舒适；若出现持续恐慌、失眠、解离或身体不适，请停止并寻求专业帮助。</p></div>
      </section>

      <section className="cultivation-sources">
        <div className="cultivation-section-heading"><p className="section-kicker">SOURCE MAP</p><h2>资料从哪里来</h2></div>
        <div>{CULTIVATION_SOURCES.map((source) => <a key={source.title} href={source.url} target={source.url.startsWith('http') ? '_blank' : undefined} rel={source.url.startsWith('http') ? 'noreferrer' : undefined}><span><strong>{source.title}</strong><small>{source.detail}</small></span><ExternalLink size={15} /></a>)}</div>
      </section>

      {selectedRoutine && session && createPortal((
        <div className="cultivation-session-layer" role="dialog" aria-modal="true" aria-label={`${selectedRoutine.title}练习`}>
          <button className="cultivation-session-backdrop" onClick={closeRoutine} aria-label="关闭练习" />
          <section className="cultivation-session-sheet">
            <div className="cultivation-session-progress"><i style={{ width: `${session.complete ? 100 : Math.max(0, sessionProgress)}%` }} /></div>
            <header><button onClick={closeRoutine} aria-label="返回"><ChevronLeft size={20} /></button><div><small>东方修仙 · 安全日课</small><strong>{selectedRoutine.title}</strong></div><button onClick={closeRoutine} aria-label="关闭"><X size={19} /></button></header>
            {!session.complete ? (
              <div className="cultivation-session-body">
                <div className="cultivation-session-orbit" style={{ '--practice-progress': `${Math.max(4, sessionProgress)}%` } as CSSProperties}><span><strong>{formatTimer(session.remaining)}</strong><small>{session.running ? '正在修习' : '准备好再开始'}</small></span></div>
                <div className="cultivation-current-step"><small>第 {session.stepIndex + 1} / {selectedRoutine.steps.length} 步 · {selectedRoutine.steps[session.stepIndex].axis}</small><h2>{selectedRoutine.steps[session.stepIndex].title}</h2><p>{selectedRoutine.steps[session.stepIndex].instruction}</p></div>
                <div className="cultivation-step-dots">{selectedRoutine.steps.map((step, index) => <span key={step.title} className={index < session.stepIndex ? 'done' : index === session.stepIndex ? 'active' : ''}><i>{index < session.stepIndex ? <Check size={10} /> : index + 1}</i><em>{step.title}</em></span>)}</div>
                <div className="cultivation-session-controls">
                  <button className="primary" onClick={toggleRoutineTimer}>{session.running ? <Pause size={18} /> : <Play size={18} />}{session.running ? '暂停' : session.remaining === selectedRoutine.steps[session.stepIndex].durationSec ? '开始修习' : '继续'}</button>
                  <button onClick={restartRoutine} aria-label="从头开始"><RotateCcw size={17} /></button>
                </div>
                <p className="cultivation-session-safety"><BellRing size={13} />本环节结束会响三声引磬 · 全程自然呼吸，不适立即停止。</p>
              </div>
            ) : (
              <div className="cultivation-session-finish">
                <span><Check size={25} /></span>
                <p className="section-kicker">PRACTICE COMPLETE</p>
                <h2>这一炉，已经收好</h2>
                <p>不用评价有没有“感觉”。能清醒地完成、回到生活，本身就是修行。</p>
                <label><strong>此刻身心有什么变化？可以直接说</strong><div className="voice-enabled-control textarea"><textarea value={reflection} onChange={(event) => setReflection(event.target.value.slice(0, 500))} placeholder="例如：肩膀松了一点，思路没有那么挤……" /><VoiceInputButton value={reflection} onChange={setReflection} maxLength={500} label="用语音记录本次修行感受" /></div></label>
                <button className="cultivation-save-practice" onClick={saveCompletedSession} disabled={savedSession}>{savedSession ? <Check size={16} /> : <Mic size={16} />}{savedSession ? '已存入个人日志档案' : '收功并存入档案'}</button>
                <button className="cultivation-close-practice" onClick={closeRoutine}>{savedSession ? '完成' : '稍后再记录'}</button>
              </div>
            )}
          </section>
        </div>
      ), document.body)}

      {selectedClassic && <CultivationClassicReader book={selectedClassic} onClose={() => setSelectedClassic(null)} />}

      {selectedStory && createPortal((
        <div className="cultivation-detail-layer" role="dialog" aria-modal="true" aria-label={`${selectedStory.title}故事`}>
          <button className="cultivation-session-backdrop" onClick={() => setSelectedStory(null)} aria-label="关闭故事" />
          <article className="cultivation-detail-sheet cultivation-story-sheet">
            <header><button onClick={() => setSelectedStory(null)}><ChevronLeft size={19} />返回仙传</button><span><History size={12} />{selectedStory.motif}</span></header>
            <div className="cultivation-detail-title"><small>{selectedStory.era}</small><h1>{selectedStory.title}</h1><p>{selectedStory.figure} · {selectedStory.source}</p></div>
            <section><small>故事</small><p>{selectedStory.story}</p></section>
            <section className="story-insight"><small>今天如何读</small><p>{selectedStory.insight}</p></section>
            <div className="cultivation-detail-safety"><ShieldCheck size={16} /><p>{selectedStory.historicalNote}</p></div>
            <a href={selectedStory.sourceUrl} target="_blank" rel="noreferrer">查看原始出处<ExternalLink size={14} /></a>
          </article>
        </div>
      ), document.body)}
    </div>
  )
}
