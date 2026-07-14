import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Camera,
  Check,
  ChevronRight,
  CircleGauge,
  Focus,
  HeartHandshake,
  Info,
  LayoutDashboard,
  Music,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  defaultActivationProgress,
  defaultOnboardingState,
  getActivationCompletion,
  getActiveActivationDay,
  loadState,
  recomputeUserState,
  saveState,
  type ChatMessage,
  type DailyCheckIn,
  type FlowSession,
  type OnboardingState,
  type UserState,
} from '../stores/useStore'

type ModuleCard = {
  id: string;
  path: string;
  icon: typeof Activity;
  color: string;
  title: string;
  eyebrow: string;
  desc: string;
}

const regulateModules: ModuleCard[] = [
  { id: 'reset', path: '/reset', icon: RotateCcw, color: 'text-rose-300', title: '系统重置', eyebrow: 'RESET', desc: '呼吸、着陆与快速降载' },
  { id: 'protocols', path: '/protocols', icon: ShieldCheck, color: 'text-emerald-300', title: '协议库', eyebrow: 'PROTOCOLS', desc: '按压力、冲突与睡眠调用' },
  { id: 'music', path: '/music', icon: Music, color: 'text-sky-300', title: '心境音乐', eyebrow: 'SOUND', desc: '按任务与状态选择声音场' },
  { id: 'biosync', path: '/biosync', icon: Activity, color: 'text-lime-300', title: '生物同步', eyebrow: 'BIO-SYNC', desc: '结合节律安排工作与恢复' },
]

const growModules: ModuleCard[] = [
  { id: 'activation', path: '/activation', icon: CalendarCheck, color: 'text-cyan-300', title: '7 日启动', eyebrow: 'INSTALL', desc: '建立第一套可执行训练闭环' },
  { id: 'flow', path: '/flow', icon: Focus, color: 'text-fuchsia-300', title: '心流学习舱', eyebrow: 'FLOW LAB', desc: '技能拆解、预演与即时反馈' },
  { id: 'journal', path: '/journal', icon: BookOpen, color: 'text-amber-300', title: '模式日志', eyebrow: 'REWRITE', desc: '识别触发，重写自动反应' },
  { id: 'visual', path: '/visual', icon: Camera, color: 'text-orange-300', title: '视觉自检', eyebrow: 'MIRROR', desc: '用摄像头观察当下外显状态' },
]

const stateLabels: Record<'energy' | 'clarity' | 'pressure', string[]> = {
  energy: ['耗尽', '偏低', '一般', '充足', '饱满'],
  clarity: ['混乱', '模糊', '可用', '清晰', '通透'],
  pressure: ['放松', '轻微', '适中', '偏高', '过载'],
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function getPrescription(energy: number, clarity: number, pressure: number) {
  if (pressure >= 4) {
    return { title: '先稳态，再行动', desc: '降低生理唤醒，暂停新增输入，完成 3 分钟压力释放。', route: '/reset/pressure', action: '开始稳态协议', icon: ShieldCheck, color: 'text-rose-300' }
  }
  if (energy <= 2) {
    return { title: '进入恢复模式', desc: '当前不适合硬推高负荷任务，先做短时修复与身体唤醒。', route: '/reset/repair', action: '开始恢复', icon: Activity, color: 'text-lime-300' }
  }
  if (clarity <= 2) {
    return { title: '清空认知缓存', desc: '把所有输入放到一处，只保留一个可以看见的下一步。', route: '/architect', action: '让 AI 帮我澄清', icon: BrainCircuit, color: 'text-violet-300' }
  }
  return { title: '适合进入深度输出', desc: '状态已进入可调度区，选择一个关键技能节点完成最小闭环。', route: '/flow', action: '进入心流学习舱', icon: Focus, color: 'text-cyan-300' }
}

function StateSlider({
  label,
  value,
  type,
  onChange,
}: {
  label: string
  value: number
  type: keyof typeof stateLabels
  onChange: (value: number) => void
}) {
  return (
    <label className="state-slider">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-white">{label}</span>
        <span className="text-[12px] text-hos-cyan">{value} · {stateLabels[type][value - 1]}</span>
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
      <span className="flex justify-between text-[9px] text-hos-text-muted" aria-hidden="true">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </span>
    </label>
  )
}

function ModuleGrid({ items }: { items: ModuleCard[] }) {
  const navigate = useNavigate()
  return (
    <div className="module-grid">
      {items.map((item) => (
        <button key={item.id} onClick={() => navigate(item.path)} className="module-tile">
          <div className="flex items-start justify-between gap-3">
            <item.icon size={20} className={item.color} />
            <ChevronRight size={15} className="text-hos-text-muted" />
          </div>
          <div className="mt-auto text-left">
            <p className="text-[9px] font-mono text-hos-text-muted">{item.eyebrow}</p>
            <h3 className="mt-1 text-[15px] font-semibold text-white">{item.title}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-hos-text-dim">{item.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function FirstRunGuide({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="hos-page min-h-full animate-float-up">
      <header className="brand-lockup">
        <img src={`${import.meta.env.BASE_URL}hos-icon-192-v2.png`} alt="HOS 标志" />
        <div>
          <p className="brand-kicker">HUMAN OPERATING SYSTEM</p>
          <h1>人类操作系统</h1>
          <p>先稳定状态，再训练能力；从今天的一次最小闭环开始。</p>
        </div>
      </header>

      <section className="hos-card-accent p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">FIRST BOOT · DAY 1</p>
            <h2 className="mt-2 text-[21px] font-bold text-white">系统断电与物理清空</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-hos-text-dim">不需要先理解全部理论。清出一平米空间、关闭一组通知、写下睡前缓存。</p>
          </div>
          <CalendarCheck size={25} className="shrink-0 text-hos-cyan" />
        </div>

        <div className="my-6 space-y-3">
          {['整理一平米空间', '关闭一组通知', '写下睡前缓存'].map((item, index) => (
            <div key={item} className="flex items-center gap-3 border-b border-hos-border/70 pb-3 last:border-0 last:pb-0">
              <span className="step-index">{index + 1}</span>
              <span className="text-[13px] text-hos-text">{item}</span>
            </div>
          ))}
        </div>

        <button onClick={onStart} className="primary-action w-full">
          开始第一天训练 <ArrowRight size={17} />
        </button>
      </section>

      <button onClick={onSkip} className="mx-auto py-2 text-[12px] text-hos-text-muted">先进入主页</button>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [user] = useState<UserState>(() => recomputeUserState())
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => loadState('onboarding', defaultOnboardingState))
  const savedCheckIn = loadState<DailyCheckIn | undefined>('dailyCheckIn', undefined)
  const [energy, setEnergy] = useState(savedCheckIn?.date === todayKey() ? savedCheckIn.energy : 3)
  const [clarity, setClarity] = useState(savedCheckIn?.date === todayKey() ? savedCheckIn.clarity : 3)
  const [pressure, setPressure] = useState(savedCheckIn?.date === todayKey() ? savedCheckIn.pressure : 3)
  const [intention, setIntention] = useState(savedCheckIn?.date === todayKey() ? savedCheckIn.intention : '')
  const [checkedIn, setCheckedIn] = useState(savedCheckIn?.date === todayKey())

  const activation = loadState('activation', defaultActivationProgress)
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const chat = loadState<ChatMessage[]>('chat', [])
  const activationCompletion = getActivationCompletion(activation)
  const activeDay = getActiveActivationDay(activation)
  const nextTask = activeDay.tasks.find((task) => !activation.completedTaskIds.includes(task.id))
  const hasAnyActivity = activation.completedTaskIds.length > 0 || user.journalCount > 0 || flow.length > 0 || chat.length > 0
  const showFirstRun = !onboarding.completed && !hasAnyActivity
  const prescription = useMemo(() => getPrescription(energy, clarity, pressure), [energy, clarity, pressure])

  const completeOnboarding = () => {
    const next = { completed: true, completedAt: Date.now() }
    saveState('onboarding', next)
    setOnboarding(next)
  }

  const saveCheckIn = () => {
    const next: DailyCheckIn = {
      date: todayKey(), energy, clarity, pressure,
      intention: intention.trim(),
      createdAt: Date.now(),
    }
    saveState('dailyCheckIn', next)
    setCheckedIn(true)
  }

  if (showFirstRun) {
    return (
      <FirstRunGuide
        onStart={() => { completeOnboarding(); navigate('/activation') }}
        onSkip={completeOnboarding}
      />
    )
  }

  return (
    <div className="hos-page animate-float-up">
      <header className="home-header">
        <div className="brand-lockup compact">
          <img src={`${import.meta.env.BASE_URL}hos-icon-192-v2.png`} alt="HOS 标志" />
          <div>
            <p className="brand-kicker">HOS · HUMAN OS</p>
            <h1>今日系统</h1>
            <p>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
          </div>
        </div>
        <button onClick={() => navigate('/about')} className="icon-action" aria-label="关于 HOS" title="关于 HOS">
          <Info size={18} />
        </button>
      </header>

      <section className="status-hero">
        <div className="relative z-10">
          <p className="section-kicker">TODAY'S ORIENTATION</p>
          <h2>先照顾系统，<br />再推动目标。</h2>
          <p>不追求时刻满格，只训练觉察、调节与行动之间的连接。</p>
        </div>
        <CircleGauge size={116} strokeWidth={0.8} aria-hidden="true" />
      </section>

      <section className="section-block">
        <div className="hos-section-title">
          <div>
            <p className="section-kicker">DAILY CHECK-IN</p>
            <h2>30 秒状态校准</h2>
          </div>
          {checkedIn && <span className="check-badge"><Check size={12} /> 今日已记录</span>}
        </div>

        <div className="checkin-panel">
          <StateSlider label="身体能量" value={energy} type="energy" onChange={(value) => { setEnergy(value); setCheckedIn(false) }} />
          <StateSlider label="思维清晰" value={clarity} type="clarity" onChange={(value) => { setClarity(value); setCheckedIn(false) }} />
          <StateSlider label="当前压力" value={pressure} type="pressure" onChange={(value) => { setPressure(value); setCheckedIn(false) }} />
          <label className="block">
            <span className="mb-2 block text-[12px] text-hos-text-dim">今天最想守住的一件事</span>
            <input
              value={intention}
              onChange={(event) => { setIntention(event.target.value); setCheckedIn(false) }}
              placeholder="例如：完成提案，不被零散消息带走"
              className="hos-input"
            />
          </label>
          <button onClick={saveCheckIn} className="secondary-action w-full">
            {checkedIn ? '更新今日状态' : '生成今日处方'} <Sparkles size={16} />
          </button>
        </div>

        {checkedIn && (
          <div className="prescription-panel animate-float-up">
            <prescription.icon size={21} className={prescription.color} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-white">{prescription.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-hos-text-dim">{prescription.desc}</p>
            </div>
            <button onClick={() => navigate(prescription.route)} className="icon-action" aria-label={prescription.action} title={prescription.action}>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="hos-section-title">
          <div>
            <p className="section-kicker">NEXT LOOP</p>
            <h2>今日训练</h2>
          </div>
          <strong className="text-[22px] text-hos-cyan">{activationCompletion}%</strong>
        </div>
        <button onClick={() => navigate('/activation')} className="training-strip">
          <span className="step-index">{activeDay.day}</span>
          <span className="min-w-0 flex-1 text-left">
            <strong>Day {activeDay.day} · {activeDay.title.zh}</strong>
            <small>{nextTask ? `下一步：${nextTask.title.zh}` : '今日复盘已经完成'}</small>
          </span>
          <ChevronRight size={17} />
        </button>
        <div className="hos-progress">
          <div className="hos-progress-fill bg-hos-cyan" style={{ width: `${activationCompletion}%` }} />
        </div>
      </section>

      <section className="quick-actions">
        <button onClick={() => navigate('/reset')}>
          <Zap size={20} className="text-rose-300" />
          <span><strong>立即稳态</strong><small>3 分钟协议</small></span>
        </button>
        <button onClick={() => navigate('/architect')}>
          <BrainCircuit size={20} className="text-violet-300" />
          <span><strong>AI 教练</strong><small>诊断下一步</small></span>
        </button>
      </section>

      <section className="section-block">
        <div className="hos-section-title">
          <div><p className="section-kicker">REGULATE</p><h2>先回到可调度状态</h2></div>
        </div>
        <ModuleGrid items={regulateModules} />
      </section>

      <section className="section-block">
        <div className="hos-section-title">
          <div><p className="section-kicker">GROW</p><h2>再进入能力训练</h2></div>
        </div>
        <ModuleGrid items={growModules} />
      </section>

      <section className="principle-band">
        <LayoutDashboard size={20} className="text-hos-gold" />
        <div>
          <p className="section-kicker">HOS PRINCIPLE</p>
          <blockquote>真正的升级，不是一直兴奋，而是更快觉察、更准调节、更稳行动。</blockquote>
          <button onClick={() => navigate('/about')}>查看方法边界与项目缘起 <ArrowRight size={13} /></button>
        </div>
      </section>

      <button onClick={() => navigate('/support')} className="support-entry">
        <HeartHandshake size={22} className="text-rose-300" />
        <span className="min-w-0 flex-1 text-left">
          <strong>共建人类操作系统</strong>
          <small>支持开放迭代，进入赞赏记录与共建榜</small>
        </span>
        <ArrowRight size={17} />
      </button>
    </div>
  )
}
