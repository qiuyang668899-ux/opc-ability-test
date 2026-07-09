import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Camera,
  ChevronRight,
  Focus,
  Gauge,
  LayoutDashboard,
  Lock,
  Music,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
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
  type FlowSession,
  type OnboardingState,
  type UserState,
} from '../stores/useStore'
import { UI } from '../utils/i18n'

const modules = [
  {
    id: 'activation', path: '/activation',
    icon: CalendarCheck, iconBg: 'bg-cyan-500/15', iconText: 'text-cyan-300',
    label: { zh: '7日启动', en: '7-Day Install' }, desc: { zh: '从清空环境到心流训练，建立第一套可执行系统。', en: 'Install the first executable loop.' },
  },
  {
    id: 'architect', path: '/architect',
    icon: BrainCircuit, iconBg: 'bg-violet-500/15', iconText: 'text-violet-300',
    label: UI.aiArchitect, desc: { zh: '状态感知教练，输出诊断、协议和下一步行动。', en: 'State-aware coaching engine.' },
  },
  {
    id: 'protocols', path: '/protocols',
    icon: ShieldCheck, iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-300',
    label: { zh: '协议库', en: 'Protocols' }, desc: { zh: '压力、过载、冲突、失眠场景快速调用。', en: 'Quick state-switching protocols.' },
  },
  {
    id: 'flow', path: '/flow',
    icon: Focus, iconBg: 'bg-fuchsia-500/15', iconText: 'text-fuchsia-300',
    label: { zh: '心流学习舱', en: 'Flow Lab' }, desc: { zh: '技能拆解、心象模拟、最小闭环练习。', en: 'Deliberate learning loops.' },
  },
  {
    id: 'journal', path: '/journal',
    icon: BookOpen, iconBg: 'bg-amber-500/15', iconText: 'text-amber-300',
    label: UI.patternRewrite, desc: UI.patternRewriteDesc,
  },
  {
    id: 'biosync', path: '/biosync',
    icon: Activity, iconBg: 'bg-lime-500/15', iconText: 'text-lime-300',
    label: UI.bioSyncModule, desc: UI.bioSyncDesc,
  },
  {
    id: 'visual', path: '/visual',
    icon: Camera, iconBg: 'bg-rose-500/15', iconText: 'text-rose-300',
    label: UI.visualDiag, desc: UI.visualDiagDesc,
  },
  {
    id: 'music', path: '/music',
    icon: Music, iconBg: 'bg-sky-500/15', iconText: 'text-sky-300',
    label: UI.moodMusic, desc: UI.moodMusicDesc,
  },
]

function FirstRunGuide({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="hos-page min-h-full animate-float-up">
      <header className="pt-2 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-hos-cyan" />
          <span className="text-[11px] text-hos-cyan font-mono tracking-wider">FIRST BOOT</span>
        </div>
        <h1 className="text-[30px] font-bold text-white leading-tight mb-3">人类操作系统首次启动</h1>
        <p className="text-[14px] text-hos-text-dim leading-relaxed">
          第一次打开不需要理解全部理论。先完成一轮最小训练：清空环境、稳定身体、记录反馈。
        </p>
      </header>

      <section className="hos-card-accent p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-hos-text-muted mb-1">今日入口 / Day 1</p>
            <h2 className="text-[20px] font-bold text-white">系统断电与物理清空</h2>
            <p className="text-en mt-1">Power Down & Clear Space</p>
          </div>
          <div className="w-14 h-14 rounded-2xl border border-hos-cyan/25 bg-hos-cyan/10 flex items-center justify-center text-hos-cyan">
            <CalendarCheck size={25} />
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {[
            ['1', '整理一平米空间', '减少环境噪音，释放注意力内存。'],
            ['2', '关闭一组通知', '先减少被动刺激，再谈高效输出。'],
            ['3', '写下睡前缓存', '把担忧从大脑移到纸上。'],
          ].map(([index, title, desc]) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-hos-border/70 bg-hos-bg/45 p-3.5">
              <span className="w-7 h-7 rounded-full bg-hos-cyan/10 border border-hos-cyan/20 text-hos-cyan text-[12px] font-mono flex items-center justify-center shrink-0">
                {index}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">{title}</p>
                <p className="text-[12px] text-hos-text-dim mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="w-full rounded-2xl bg-hos-cyan/15 border border-hos-cyan/30 px-5 py-4 text-hos-cyan font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <span>开始第一天训练</span>
          <ChevronRight size={17} />
        </button>
      </section>

      <button
        onClick={onSkip}
        className="w-full py-3 text-[12px] text-hos-text-muted hover:text-hos-text-dim transition-colors"
      >
        先进入主页浏览
      </button>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [user] = useState<UserState>(() => recomputeUserState())
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => loadState('onboarding', defaultOnboardingState))
  const activation = loadState('activation', defaultActivationProgress)
  const flow = loadState<FlowSession[]>('flowSessions', [])
  const chat = loadState<ChatMessage[]>('chat', [])
  const activationCompletion = getActivationCompletion(activation)
  const activeDay = getActiveActivationDay(activation)
  const nextTask = activeDay.tasks.find((task) => !activation.completedTaskIds.includes(task.id))
  const hasAnyActivity = activation.completedTaskIds.length > 0 || user.journalCount > 0 || flow.length > 0 || chat.length > 0
  const showFirstRun = !onboarding.completed && !hasAnyActivity

  const completeOnboarding = () => {
    const next = { completed: true, completedAt: Date.now() }
    saveState('onboarding', next)
    setOnboarding(next)
  }

  if (showFirstRun) {
    return (
      <FirstRunGuide
        onStart={() => {
          completeOnboarding()
          navigate('/activation')
        }}
        onSkip={completeOnboarding}
      />
    )
  }

  return (
    <div className="hos-page animate-float-up">
      <header className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LayoutDashboard size={18} className="text-hos-cyan" />
              <span className="text-[11px] text-hos-cyan font-mono tracking-wider">HUMAN OS</span>
            </div>
            <h1 className="text-[30px] font-bold tracking-tight leading-none text-white">
              系统总览
            </h1>
            <p className="text-en mt-2">{user.level.en} · Integration {user.integration}%</p>
          </div>
          <span className="hos-tag">{user.level.zh}</span>
        </div>

        <button
          onClick={() => navigate('/activation')}
          className="w-full hos-card-accent p-5 text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[11px] text-hos-text-muted mb-1">今日训练 / Next Loop</p>
              <h2 className="text-[20px] font-bold text-white">Day {activeDay.day} · {activeDay.title.zh}</h2>
              <p className="text-[12px] text-hos-text-dim mt-2 leading-relaxed">
                {nextTask ? `先完成：${nextTask.title.zh}` : '今日复盘已经完成，进入整合。'}
              </p>
            </div>
            <span className="text-[28px] font-bold text-hos-cyan">{activationCompletion}%</span>
          </div>
          <div className="hos-progress !mt-0">
            <div className="hos-progress-fill bg-hos-cyan" style={{ width: `${activationCompletion}%` }} />
          </div>
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/reset')}
          className="hos-card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <Zap size={20} className="text-hos-red glow-red mb-4" />
          <p className="text-[15px] font-bold text-white">{UI.systemReset.zh}</p>
          <p className="text-[11px] text-hos-text-muted mt-1">{UI.emergencyProtocol.zh}</p>
        </button>

        <button
          onClick={() => navigate('/architect')}
          className="hos-card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <BrainCircuit size={20} className="text-hos-purple mb-4" />
          <p className="text-[15px] font-bold text-white">AI 教练</p>
          <p className="text-[11px] text-hos-text-muted mt-1">诊断、协议、下一步</p>
        </button>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <div className="hos-metric">
          <TrendingUp size={14} className="text-hos-cyan" />
          <span>{user.streak}</span>
          <small>连续</small>
        </div>
        <div className="hos-metric">
          <Gauge size={14} className="text-hos-gold" />
          <span>{user.integration}%</span>
          <small>整合</small>
        </div>
        <div className="hos-metric">
          {user.depthLocked ? <Lock size={14} className="text-hos-text-muted" /> : <Unlock size={14} className="text-hos-green" />}
          <span className={user.depthLocked ? 'text-hos-text-dim' : 'text-hos-green'}>{user.depthLocked ? '锁定' : '开启'}</span>
          <small>深度</small>
        </div>
      </section>

      <section>
        <div className="hos-section-title">
          <div>
            <h2>{UI.coreModules.zh}</h2>
            <p>{UI.coreModules.en}</p>
          </div>
        </div>

        <div className="space-y-3">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className="w-full hos-card px-4 py-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
            >
              <div className={`hos-icon-box ${mod.iconBg}`}>
                <mod.icon size={20} className={mod.iconText} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[15px] font-semibold text-white leading-tight">{mod.label.zh}</p>
                <p className="text-en mt-0.5">{mod.label.en}</p>
                <p className="text-[12px] text-hos-text-dim mt-1.5 leading-relaxed">{mod.desc.zh}</p>
              </div>
              <ChevronRight size={16} className="text-hos-text-muted shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
