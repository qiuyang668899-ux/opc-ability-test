import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Leaf,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  getRitualAspiration,
  getRitualState,
  getTodayRitualRecord,
  loadRitualProfile,
  loadRitualRecords,
  ritualTodayKey,
  RITUAL_ASPIRATIONS,
  RITUAL_STATES,
  type RitualAspirationId,
  type RitualProfile,
  type RitualRecord,
  type RitualStateId,
} from '../engines/ritualEngine'
import { saveState } from '../stores/useStore'

type RitualStage = 'identity' | 'sense' | 'breathe' | 'align' | 'act' | 'seal'

const stageOrder: RitualStage[] = ['sense', 'breathe', 'align', 'act']
const breathPhases = [
  { label: '吸气', cue: '让气息进入身体', seconds: 4, className: 'inhale' },
  { label: '停留', cue: '不抓取，也不推开', seconds: 2, className: 'hold' },
  { label: '呼气', cue: '把不需要的重量放下', seconds: 6, className: 'exhale' },
] as const

export default function DailyRitual() {
  const navigate = useNavigate()
  const storedProfile = loadRitualProfile()
  const todayRecord = getTodayRitualRecord()
  const [profile, setProfile] = useState<RitualProfile | undefined>(storedProfile)
  const [stage, setStage] = useState<RitualStage>(todayRecord ? 'seal' : storedProfile ? 'sense' : 'identity')
  const [aspirationId, setAspirationId] = useState<RitualAspirationId>(storedProfile?.aspirationId ?? 'steady')
  const [stateId, setStateId] = useState<RitualStateId>(todayRecord?.stateId ?? 'scattered')
  const [stateChosen, setStateChosen] = useState(Boolean(todayRecord))
  const [microAction, setMicroAction] = useState(todayRecord?.microAction ?? '')
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [remaining, setRemaining] = useState<number>(breathPhases[0].seconds)
  const [cycle, setCycle] = useState(1)
  const [soundOn, setSoundOn] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const aspiration = getRitualAspiration(profile?.aspirationId ?? aspirationId)
  const ritualState = getRitualState(stateId)
  const breath = breathPhases[phaseIndex]
  const progressIndex = stageOrder.indexOf(stage)

  const stopSound = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.src = ''
    audioRef.current = null
    setSoundOn(false)
  }

  const startSound = async () => {
    stopSound()
    const audio = new Audio(`${import.meta.env.BASE_URL}${ritualState.soundAsset}`)
    audio.loop = true
    audio.volume = 0.28
    audioRef.current = audio
    try {
      await audio.play()
      setSoundOn(true)
    } catch {
      setSoundOn(false)
    }
  }

  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  useEffect(() => {
    if (stage !== 'breathe') return undefined
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1
        if (phaseIndex < breathPhases.length - 1) {
          const nextIndex = phaseIndex + 1
          setPhaseIndex(nextIndex)
          return breathPhases[nextIndex].seconds
        }
        if (cycle < 3) {
          setCycle((value) => value + 1)
          setPhaseIndex(0)
          return breathPhases[0].seconds
        }
        window.clearInterval(timer)
        setStage('align')
        return 0
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cycle, phaseIndex, stage])

  const saveIdentity = () => {
    const selected = getRitualAspiration(aspirationId)
    const now = Date.now()
    const next: RitualProfile = {
      aspirationId: selected.id,
      word: selected.word,
      title: selected.title,
      identity: selected.identity,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    }
    saveState('ritualProfile', next)
    setProfile(next)
    setStage('sense')
  }

  const beginBreathing = () => {
    setPhaseIndex(0)
    setRemaining(breathPhases[0].seconds)
    setCycle(1)
    void startSound()
    setStage('breathe')
  }

  const speakGuidance = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${ritualState.keyword}。${ritualState.title}。${ritualState.guidance}`)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.78
    utterance.pitch = 0.92
    window.speechSynthesis.speak(utterance)
  }

  const completeRitual = () => {
    if (!profile || !microAction) return
    const record: RitualRecord = {
      id: `ritual-${Date.now()}`,
      date: ritualTodayKey(),
      stateId,
      keyword: ritualState.keyword,
      stateLabel: ritualState.label,
      microAction,
      aspirationId: profile.aspirationId,
      completedAt: Date.now(),
    }
    const current = loadRitualRecords()
    saveState('ritualRecords', [record, ...current.filter((item) => item.date !== record.date)].slice(0, 365))
    navigator.vibrate?.([45, 35, 80])
    setStage('seal')
  }

  const restartRitual = () => {
    setStateChosen(false)
    setMicroAction('')
    setShareStatus('')
    setStage('sense')
  }

  const shareRitual = async () => {
    const text = `今天，我用「${ritualState.keyword}」重新校准了自己。\n\n${ritualState.seal}\n\n#HOS人类操作系统`
    try {
      if (navigator.share) {
        await navigator.share({ title: `今日关键词 · ${ritualState.keyword}`, text })
        setShareStatus('已打开分享')
      } else {
        await navigator.clipboard.writeText(text)
        setShareStatus('文字已复制')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setShareStatus('暂时无法分享')
    }
  }

  const stageLabel = useMemo(() => {
    if (stage === 'sense') return '觉察'
    if (stage === 'breathe') return '调息'
    if (stage === 'align') return '对齐'
    if (stage === 'act') return '落地'
    return ''
  }, [stage])

  if (stage === 'identity') {
    return (
      <main className="ritual-shell identity-screen">
        <div className="ritual-ambient" aria-hidden="true"><i /><i /><i /></div>
        <button className="ritual-close" onClick={() => navigate('/')} aria-label="返回首页"><ArrowLeft size={18} /></button>
        <section className="identity-content">
          <div className="ritual-brand"><span><Sparkles size={16} /></span><p>HOS · INITIALIZE SELF</p></div>
          <p className="identity-eyebrow">不是成为另一个人</p>
          <h1>唤醒你本来<br />就拥有的力量</h1>
          <p className="identity-lead">接下来的 21 天，你最想让哪一种力量成为自己的底色？没有正确答案，只选择此刻真正需要的。</p>

          <div className="aspiration-grid" role="radiogroup" aria-label="选择想唤醒的力量">
            {RITUAL_ASPIRATIONS.map((item) => (
              <button key={item.id} className={aspirationId === item.id ? 'active' : ''} onClick={() => setAspirationId(item.id)} role="radio" aria-checked={aspirationId === item.id}>
                <b style={{ color: item.color }}>{item.word}</b>
                <span><strong>{item.title}</strong><small>{item.en}</small></span>
                {aspirationId === item.id && <Check size={15} />}
              </button>
            ))}
          </div>

          <div className="identity-preview">
            <span>你正在选择成为</span>
            <p>{getRitualAspiration(aspirationId).identity}</p>
          </div>
          <button className="ritual-primary" onClick={saveIdentity}>初始化我的 HOS <ArrowRight size={17} /></button>
          <small className="ritual-boundary">你的选择只保存在当前设备，随时可以重新定义。</small>
        </section>
      </main>
    )
  }

  if (stage === 'seal') {
    return (
      <main className="ritual-shell seal-screen">
        <div className="seal-radiance" aria-hidden="true"><i /><i /><i /></div>
        <button className="ritual-close" onClick={() => navigate('/')} aria-label="返回首页"><ArrowLeft size={18} /></button>
        <section className="seal-content">
          <p className="seal-kicker">TODAY · SYSTEM ALIGNED</p>
          <div className="seal-symbol"><span>{ritualState.keyword}</span></div>
          <p className="seal-date">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · 今日关键词</p>
          <h1>{ritualState.seal}</h1>
          <blockquote>{ritualState.classic}</blockquote>
          <div className="seal-action"><span><Check size={15} /></span><div><small>接下来，我只做</small><strong>{microAction || todayRecord?.microAction}</strong></div></div>
          <div className="identity-seal"><Leaf size={16} /><p>每一次微小选择，都在让你成为<br /><strong>{aspiration.identity}</strong></p></div>
          <button className="ritual-primary" onClick={() => navigate('/flow')}>带着「{ritualState.keyword}」开始行动 <ChevronRight size={17} /></button>
          <div className="seal-secondary">
            <button onClick={restartRitual}><RotateCcw size={15} />再校准一次</button>
            <button onClick={shareRitual}><Share2 size={15} />{shareStatus || '分享今日印记'}</button>
          </div>
          <button className="ritual-home-link" onClick={() => navigate('/')}>回到首页</button>
        </section>
      </main>
    )
  }

  return (
    <main className={`ritual-shell practice-screen stage-${stage}`}>
      <div className="ritual-ambient" aria-hidden="true"><i /><i /><i /></div>
      <header className="ritual-topbar">
        <button onClick={() => navigate('/')} aria-label="退出今日校准"><ArrowLeft size={18} /></button>
        <div><span>{stageLabel}</span><strong>{Math.max(1, progressIndex + 1)} / 4</strong></div>
        <button onClick={() => soundOn ? stopSound() : void startSound()} aria-label={soundOn ? '关闭声音' : '打开声音'}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
      </header>
      <div className="ritual-progress">{stageOrder.map((item, index) => <i key={item} className={index <= progressIndex ? 'active' : ''} />)}</div>

      {stage === 'sense' && (
        <section className="sense-content ritual-stage-content">
          <div className="stage-orbit small"><span>{aspiration.word}</span></div>
          <p className="ritual-stage-kicker">先不分析，只是如实看见</p>
          <h1>此刻，哪一种状态<br />最接近你？</h1>
          <p className="ritual-stage-lead">选择不是诊断，只是为今天找到合适的入口。</p>
          <div className="state-choices">
            {RITUAL_STATES.map((item) => (
              <button key={item.id} className={stateChosen && stateId === item.id ? 'active' : ''} onClick={() => { setStateId(item.id); setStateChosen(true) }}>
                <span>{item.keyword}</span><div><strong>{item.label}</strong><small>{item.hint}</small></div><ChevronRight size={15} />
              </button>
            ))}
          </div>
          <button className="ritual-primary" disabled={!stateChosen} onClick={beginBreathing}>进入今日校准 <ArrowRight size={17} /></button>
        </section>
      )}

      {stage === 'breathe' && (
        <section className="breathe-content ritual-stage-content">
          <p className="ritual-stage-kicker">第一步 · 让身体先知道</p>
          <h1>{ritualState.title}</h1>
          <div className={`breath-orb ${breath.className}`} key={`${cycle}-${phaseIndex}`}>
            <i /><i /><i />
            <div><span>{breath.label}</span><strong>{remaining}</strong><small>{breath.cue}</small></div>
          </div>
          <div className="breath-cycles">{[1, 2, 3].map((item) => <i key={item} className={item <= cycle ? 'active' : ''} />)}<span>第 {cycle} / 3 轮</span></div>
          <p className="sound-caption">{soundOn ? `正在播放 · ${ritualState.soundName}` : '声音未开启 · 仍可完成练习'}</p>
          <button className="ritual-quiet-link" onClick={() => setStage('align')}>跳过呼吸，继续</button>
        </section>
      )}

      {stage === 'align' && (
        <section className="align-content ritual-stage-content">
          <p className="ritual-stage-kicker">第二步 · 为今天留一个字</p>
          <div className="keyword-reveal"><span>{ritualState.keyword}</span><small>{ritualState.keywordEn}</small></div>
          <h1>{ritualState.title}</h1>
          <p className="ritual-guidance">{ritualState.guidance}</p>
          <article className="classic-whisper">
            <span>{ritualState.tradition}</span>
            <blockquote>{ritualState.classic}</blockquote>
            <p>{ritualState.interpretation}</p>
          </article>
          <button className="voice-guide" onClick={speakGuidance}><Play size={15} />听见今日引导</button>
          <button className="ritual-primary" onClick={() => setStage('act')}>让这个字落到现实 <ArrowRight size={17} /></button>
        </section>
      )}

      {stage === 'act' && (
        <section className="act-content ritual-stage-content">
          <div className="stage-orbit"><span>{ritualState.keyword}</span></div>
          <p className="ritual-stage-kicker">第三步 · 能小到立刻发生</p>
          <h1>现在，只选择<br />一个微小动作</h1>
          <p className="ritual-stage-lead">不需要等动力出现。先让行动容易到几乎不会失败。</p>
          <div className="micro-actions" role="radiogroup" aria-label="选择一个微行动">
            {ritualState.microActions.map((action, index) => (
              <button key={action} className={microAction === action ? 'active' : ''} onClick={() => setMicroAction(action)} role="radio" aria-checked={microAction === action}>
                <span>0{index + 1}</span><strong>{action}</strong>{microAction === action ? <Check size={17} /> : <ChevronRight size={16} />}
              </button>
            ))}
          </div>
          <div className="fogg-line"><Leaf size={14} /><p><strong>保底规则：</strong>只完成最小版本，也算完整成功。</p></div>
          <button className="ritual-primary" disabled={!microAction} onClick={completeRitual}>封存今天的校准 <Sparkles size={17} /></button>
        </section>
      )}
    </main>
  )
}
