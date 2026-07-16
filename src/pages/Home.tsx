import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  BookOpenText,
  CalendarCheck,
  Camera,
  Check,
  Grid3X3,
  HeartHandshake,
  Info,
  Leaf,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  defaultActivationProgress,
  getActivationCompletion,
  getActiveActivationDay,
  loadState,
  saveState,
  type DailyCheckIn,
} from '../stores/useStore'
import { buildEvolutionSnapshot } from '../engines/evolutionEngine'

const stateLabels = {
  energy: ['耗尽', '偏低', '平稳', '充足', '饱满'],
  clarity: ['混乱', '模糊', '可用', '清晰', '通透'],
  pressure: ['放松', '轻微', '适中', '偏高', '过载'],
} as const

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function getPrescription(energy: number, clarity: number, pressure: number) {
  if (pressure >= 4) {
    return { title: '先让身体慢下来', desc: '减少输入，用 3 分钟呼吸把系统带回安全、可调节的区间。', route: '/reset/pressure', action: '开始放松', icon: RotateCcw }
  }
  if (energy <= 2) {
    return { title: '今天先恢复，不必硬撑', desc: '降低任务强度，先补水、活动身体，再决定下一步。', route: '/biosync', action: '查看恢复建议', icon: Leaf }
  }
  if (clarity <= 2) {
    return { title: '把混乱变成一个下一步', desc: '把脑中的事情说出来，让 AI 教练帮你收束成一件可执行的小事。', route: '/architect', action: '请 AI 帮我梳理', icon: BrainCircuit }
  }
  return { title: '状态不错，适合完成一个小闭环', desc: '选择最重要的一件事，专注完成 25 分钟，再回来记录反馈。', route: '/flow', action: '进入心流练习', icon: Sparkles }
}

function StateSlider({ label, value, type, onChange }: {
  label: string
  value: number
  type: keyof typeof stateLabels
  onChange: (value: number) => void
}) {
  return (
    <label className="state-slider">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-hos-text">{label}</span>
        <span className="text-[12px] font-medium text-hos-cyan">{value} · {stateLabels[type][value - 1]}</span>
      </span>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </label>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const savedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const hasTodayCheckIn = savedCheckIn?.date === todayKey()
  const [energy, setEnergy] = useState(hasTodayCheckIn ? savedCheckIn.energy : 3)
  const [clarity, setClarity] = useState(hasTodayCheckIn ? savedCheckIn.clarity : 3)
  const [pressure, setPressure] = useState(hasTodayCheckIn ? savedCheckIn.pressure : 3)
  const [intention, setIntention] = useState(hasTodayCheckIn ? savedCheckIn.intention : '')
  const [checkedIn, setCheckedIn] = useState(hasTodayCheckIn)

  const activation = loadState('activation', defaultActivationProgress)
  const activationCompletion = getActivationCompletion(activation)
  const activeDay = getActiveActivationDay(activation)
  const nextTask = activeDay.tasks.find((task) => !activation.completedTaskIds.includes(task.id))
  const prescription = useMemo(() => getPrescription(energy, clarity, pressure), [energy, clarity, pressure])
  const evolution = useMemo(() => buildEvolutionSnapshot(), [checkedIn, energy, clarity, pressure])

  const saveCheckIn = () => {
    const next: DailyCheckIn = {
      date: todayKey(),
      energy,
      clarity,
      pressure,
      intention: intention.trim(),
      createdAt: Date.now(),
    }
    saveState('dailyCheckIn', next)
    setCheckedIn(true)
  }

  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="hos-page animate-float-up">
      <header className="home-header">
        <div className="brand-lockup compact">
          <img src={`${import.meta.env.BASE_URL}hos-icon-192-v2.png`} alt="HOS 标志" />
          <div>
            <p className="brand-kicker">HOS · 人类操作系统</p>
            <h1>你好，今天辛苦了</h1>
            <p>{today}</p>
          </div>
        </div>
        <button onClick={() => navigate('/about')} className="icon-action" aria-label="了解 HOS">
          <Info size={18} />
        </button>
      </header>

      <section className="warm-hero">
        <div>
          <span className="warm-hero-icon"><Leaf size={18} /></span>
          <h2>先照顾好此刻的自己，<br />再慢慢推动重要的事。</h2>
          <p>这里不要求你时刻满格，只陪你更清楚地觉察、调节和行动。</p>
        </div>
      </section>

      <button className="evolution-entry" onClick={() => navigate('/evolution')}>
        <div className="evolution-entry-top">
          <span><Sparkles size={18} /></span>
          <div><p>今日进化路径</p><strong>{evolution.headline}</strong></div>
          <ArrowRight size={18} />
        </div>
        <div className="evolution-entry-meta">
          <span>重点 · {evolution.focusLabel}</span>
          <span>DAY {String(evolution.day).padStart(2, '0')}</span>
          <span>{evolution.completedToday} / 3 已完成</span>
        </div>
        <div className="evolution-entry-progress"><i style={{ width: `${(evolution.completedToday / 3) * 100}%` }} /></div>
      </button>

      <section className="section-block">
        <div className="hos-section-title">
          <div><p className="section-kicker">每日状态</p><h2>用 30 秒听见自己</h2></div>
          {checkedIn && <span className="check-badge"><Check size={12} /> 已记录</span>}
        </div>

        <div className="checkin-panel">
          <StateSlider label="身体能量" value={energy} type="energy" onChange={(value) => { setEnergy(value); setCheckedIn(false) }} />
          <StateSlider label="思路清晰" value={clarity} type="clarity" onChange={(value) => { setClarity(value); setCheckedIn(false) }} />
          <StateSlider label="内在压力" value={pressure} type="pressure" onChange={(value) => { setPressure(value); setCheckedIn(false) }} />
          <label className="block">
            <span className="mb-2 block text-[12px] text-hos-text-dim">今天最想守住的一件事</span>
            <input
              className="hos-input"
              value={intention}
              onChange={(event) => { setIntention(event.target.value.slice(0, 60)); setCheckedIn(false) }}
              placeholder="例如：做完最重要的一页方案"
            />
          </label>
          <button onClick={saveCheckIn} className="secondary-action w-full">
            <Check size={16} /> 保存今日状态
          </button>
        </div>

        <div className="prescription-panel">
          <prescription.icon size={20} className="shrink-0 text-hos-cyan" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-hos-text">{prescription.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-hos-text-dim">{prescription.desc}</p>
          </div>
          <button onClick={() => navigate(prescription.route)} className="icon-action" aria-label={prescription.action}>
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="hos-section-title"><div><p className="section-kicker">快速开始</p><h2>你现在需要什么？</h2></div></div>
        <div className="home-shortcuts">
          <button className="home-shortcut featured" onClick={() => navigate('/visual')}>
            <span className="shortcut-icon peach"><Camera size={22} /></span>
            <span><strong>视觉状态诊断</strong><small>打开摄像头，看见此刻的外显状态</small></span>
            <ArrowRight size={17} />
          </button>
          <button className="home-shortcut" onClick={() => navigate('/architect')}>
            <span className="shortcut-icon lavender"><BrainCircuit size={20} /></span>
            <span><strong>AI 成长教练</strong><small>梳理问题与下一步</small></span>
          </button>
          <button className="home-shortcut" onClick={() => navigate('/reset')}>
            <span className="shortcut-icon sage"><RotateCcw size={20} /></span>
            <span><strong>快速放松</strong><small>呼吸与稳态练习</small></span>
          </button>
          <button className="home-shortcut" onClick={() => navigate('/classics')}>
            <span className="shortcut-icon sand"><BookOpenText size={20} /></span>
            <span><strong>经典修习</strong><small>每日一段，阅读、静心与记录</small></span>
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="hos-section-title">
          <div><p className="section-kicker">今日成长</p><h2>7 日启动 · 第 {activeDay.day} 天</h2></div>
          <strong className="text-[20px] text-hos-cyan">{activationCompletion}%</strong>
        </div>
        <button onClick={() => navigate('/activation')} className="training-strip">
          <span className="step-index"><CalendarCheck size={15} /></span>
          <span className="min-w-0 flex-1 text-left">
            <strong>{activeDay.title.zh}</strong>
            <small>{nextTask ? `下一步：${nextTask.title.zh}` : '今天的训练已完成，可以轻松复盘。'}</small>
          </span>
          <ArrowRight size={17} />
        </button>
        <div className="hos-progress"><div className="hos-progress-fill bg-hos-cyan" style={{ width: `${activationCompletion}%` }} /></div>
      </section>

      <button onClick={() => navigate('/tools')} className="all-tools-entry">
        <span className="shortcut-icon sage"><Grid3X3 size={21} /></span>
        <span><strong>查看全部功能</strong><small>视觉诊断、经典修习、协议库、心流、日志等 10 个模块</small></span>
        <ArrowRight size={18} />
      </button>

      <button onClick={() => navigate('/support')} className="support-entry">
        <HeartHandshake size={21} className="text-hos-red" />
        <span className="min-w-0 flex-1 text-left"><strong>一起共建 HOS</strong><small>查看项目缘起、更新方向与真实支持记录</small></span>
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
