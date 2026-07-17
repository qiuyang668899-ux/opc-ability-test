import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Grid3X3,
  Headphones,
  Info,
  Leaf,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Target,
  Waves,
} from 'lucide-react'
import { buildHomeIntelligence, type SmartAction } from '../engines/homeIntelligence'
import { saveState, type DailyCheckIn } from '../stores/useStore'

const stateLabels = {
  energy: ['耗尽', '偏低', '平稳', '充足', '饱满'],
  clarity: ['混乱', '模糊', '可用', '清晰', '通透'],
  pressure: ['放松', '轻微', '适中', '偏高', '过载'],
} as const

const actionIcons = {
  initialize: Sparkles,
  align: Waves,
  stabilize: Waves,
  restore: Headphones,
  clarify: BrainCircuit,
  focus: Target,
  'close-day': BookOpenText,
  evolve: Sparkles,
} as const

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function StateSlider({ label, value, type, onChange }: {
  label: string
  value: number
  type: keyof typeof stateLabels
  onChange: (value: number) => void
}) {
  return (
    <label className="state-slider apple-state-slider">
      <span><strong>{label}</strong><em>{stateLabels[type][value - 1]}</em></span>
      <input type="range" min="1" max="5" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
    </label>
  )
}

function SmartActionRow({ item, onOpen }: { item: SmartAction; onOpen: (route: string) => void }) {
  const Icon = actionIcons[item.id]
  return (
    <button className="smart-action-row" onClick={() => onOpen(item.route)}>
      <span><Icon size={19} /></span>
      <span><strong>{item.cta}</strong><small>{item.reason} · {item.duration}</small></span>
      <ArrowRight size={16} />
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const initial = useMemo(() => buildHomeIntelligence(), [])
  const [intelligence, setIntelligence] = useState(initial)
  const [recommendationIndex, setRecommendationIndex] = useState(0)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [energy, setEnergy] = useState(initial.checkIn?.energy ?? 3)
  const [clarity, setClarity] = useState(initial.checkIn?.clarity ?? 3)
  const [pressure, setPressure] = useState(initial.checkIn?.pressure ?? 3)
  const [intention, setIntention] = useState(initial.checkIn?.intention ?? '')
  const actions = [intelligence.primary, ...intelligence.alternatives]
  const recommendation = actions[recommendationIndex % actions.length]
  const RecommendationIcon = actionIcons[recommendation.id]
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  const cycleRecommendation = () => {
    setRecommendationIndex((value) => (value + 1) % actions.length)
    setSavedMessage('')
    navigator.vibrate?.(18)
  }

  const saveCheckIn = () => {
    const next: DailyCheckIn = { date: todayKey(), energy, clarity, pressure, intention: intention.trim(), createdAt: Date.now() }
    saveState('dailyCheckIn', next)
    const refreshed = buildHomeIntelligence()
    setIntelligence(refreshed)
    setRecommendationIndex(0)
    setCheckInOpen(false)
    setSavedMessage('已根据新状态更新建议')
    navigator.vibrate?.([24, 32, 46])
  }

  return (
    <div className="hos-page home-intelligence-page animate-float-up">
      <header className="intelligence-header">
        <div>
          <p>{today}</p>
          <h1>{intelligence.greeting}</h1>
          <span>{intelligence.moment}</span>
        </div>
        <button onClick={() => navigate('/about')} className="apple-icon-button" aria-label="了解 HOS"><Info size={18} /></button>
      </header>

      <section className="intelligence-hero">
        <div className="intelligence-material" aria-hidden="true"><i /><i /></div>
        <header>
          <div className="intelligence-brand"><span><Sparkles size={15} /></span><p>HOS INTELLIGENCE</p></div>
          <button onClick={cycleRecommendation} aria-label="换一个建议"><RefreshCw size={14} /> 换一个</button>
        </header>

        <div className="intelligence-score" aria-label={`系统整合度 ${intelligence.integration}`}>
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="31" />
            <circle cx="36" cy="36" r="31" pathLength="100" style={{ strokeDasharray: `${intelligence.integration} 100` }} />
          </svg>
          <span><strong>{intelligence.integration}</strong><small>整合度</small></span>
        </div>

        <div className="intelligence-copy">
          <p>{recommendation.eyebrow}</p>
          <h2>{recommendation.title}</h2>
          <span>{recommendation.description}</span>
        </div>

        <div className="intelligence-reason"><CircleHelp size={14} /><span>{recommendation.reason}</span><em>{recommendation.duration}</em></div>
        <button className="intelligence-primary" onClick={() => navigate(recommendation.route)}>
          <RecommendationIcon size={18} />{recommendation.cta}<ArrowRight size={17} />
        </button>
        {savedMessage && <p className="intelligence-updated"><Check size={13} />{savedMessage}</p>}
      </section>

      <section className="system-glance">
        <header>
          <div><p>此刻状态</p><h2>{intelligence.isCheckedIn ? '系统已获得今日信号' : '告诉系统，你现在怎么样'}</h2></div>
          <button onClick={() => setCheckInOpen((value) => !value)}>{checkInOpen ? '收起' : intelligence.isCheckedIn ? '调整' : '30 秒记录'}{checkInOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
        </header>

        <div className="system-signals">
          {intelligence.signals.map((signal) => <div key={signal.label} className={signal.level}><span>{signal.label}</span><strong>{signal.value}</strong></div>)}
        </div>

        {checkInOpen && (
          <div className="apple-checkin-panel">
            <StateSlider label="身体能量" value={energy} type="energy" onChange={setEnergy} />
            <StateSlider label="思路清晰" value={clarity} type="clarity" onChange={setClarity} />
            <StateSlider label="内在压力" value={pressure} type="pressure" onChange={setPressure} />
            <label className="apple-intention"><span>今天最想守住的一件事</span><input value={intention} onChange={(event) => setIntention(event.target.value.slice(0, 60))} placeholder="例如：完成方案的第一页" /></label>
            <button className="apple-save-state" onClick={saveCheckIn}><Check size={16} />更新我的状态</button>
          </div>
        )}

        <div className="local-learning"><ShieldCheck size={14} /><span>{intelligence.insight}</span><small>仅在本机学习</small></div>
      </section>

      <section className="home-intelligence-section">
        <header><div><p>FOR THIS MOMENT</p><h2>你也可以自己决定</h2></div></header>
        <div className="smart-actions-list">
          {intelligence.alternatives.slice(0, 3).map((item) => <SmartActionRow key={item.id} item={item} onOpen={navigate} />)}
        </div>
      </section>

      <section className="home-intelligence-section">
        <header><div><p>YOUR SYSTEM</p><h2>系统正在逐渐理解你</h2></div><button onClick={() => navigate('/evolution')}>查看进化 <ArrowRight size={14} /></button></header>
        <div className="learning-card">
          <div><strong>{intelligence.learnedSignals}<small>/6</small></strong><span>数据维度</span></div>
          <div><strong>{intelligence.practiceDays}</strong><span>练习天数</span></div>
          <div><strong>{intelligence.integration}</strong><span>整合度</span></div>
        </div>
      </section>

      <section className="home-intelligence-section">
        <header><div><p>EXPLORE</p><h2>需要时，它们一直在</h2></div></header>
        <div className="minimal-tools">
          <button onClick={() => navigate('/visual')}><span><ScanFace size={20} /></span><strong>视觉诊断</strong><small>看见当下</small></button>
          <button onClick={() => navigate('/architect')}><span><BrainCircuit size={20} /></span><strong>AI 教练</strong><small>收束问题</small></button>
          <button onClick={() => navigate('/music')}><span><Headphones size={20} /></span><strong>音景</strong><small>调节状态</small></button>
          <button onClick={() => navigate('/classics')}><span><Leaf size={20} /></span><strong>经典</strong><small>阅读修习</small></button>
        </div>
      </section>

      <button onClick={() => navigate('/tools')} className="minimal-all-tools"><Grid3X3 size={18} /><span><strong>全部功能</strong><small>所有模块完整保留</small></span><ArrowRight size={16} /></button>
    </div>
  )
}
