import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Circle, RotateCcw, Sparkles, Zap } from 'lucide-react'
import {
  ACTIVATION_DAYS,
  defaultActivationProgress,
  getActivationCompletion,
  loadState,
  recomputeUserState,
  saveState,
  type ActivationProgress,
} from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'

export default function Activation() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<ActivationProgress>(() => loadState('activation', defaultActivationProgress))

  const completion = getActivationCompletion(progress)
  const activeDayNumber = useMemo(() => {
    const firstOpen = ACTIVATION_DAYS.find((day) => day.tasks.some((task) => !progress.completedTaskIds.includes(task.id)))
    return firstOpen?.day ?? ACTIVATION_DAYS[ACTIVATION_DAYS.length - 1].day
  }, [progress.completedTaskIds])

  const [selectedDay, setSelectedDay] = useState(activeDayNumber)
  const day = ACTIVATION_DAYS.find((item) => item.day === selectedDay) ?? ACTIVATION_DAYS[0]
  const completedTasks = day.tasks.filter((task) => progress.completedTaskIds.includes(task.id)).length

  const updateProgress = (next: ActivationProgress) => {
    setProgress(next)
    saveState('activation', next)
    recomputeUserState()
  }

  const toggleTask = (taskId: string) => {
    const exists = progress.completedTaskIds.includes(taskId)
    const completedTaskIds = exists
      ? progress.completedTaskIds.filter((id) => id !== taskId)
      : [...progress.completedTaskIds, taskId]
    const next: ActivationProgress = {
      ...progress,
      completedTaskIds,
    }
    updateProgress(next)
  }

  const updateNote = (value: string) => {
    updateProgress({
      ...progress,
      notes: { ...progress.notes, [String(day.day)]: value },
    })
  }

  const resetActivation = () => {
    updateProgress(defaultActivationProgress)
    setSelectedDay(1)
  }

  return (
    <div className="hos-page animate-float-up">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-hos-cyan" />
            <span className="text-[11px] text-hos-cyan font-mono tracking-wider">GENESIS PROTOCOL</span>
          </div>
          <h1 className="text-[24px] font-bold text-hos-text leading-tight">7 日系统启动序列</h1>
          <p className="text-en mt-1">Seven-Day Human OS Installation</p>
        </div>
        <button
          onClick={resetActivation}
          className="w-9 h-9 rounded-xl border border-hos-border flex items-center justify-center text-hos-text-muted hover:text-hos-red hover:border-hos-red/30 transition-colors"
          aria-label="重置启动序列"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="hos-card-accent p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-hos-text-dim">系统安装进度 / Installation</p>
            <p className="text-[22px] font-bold text-hos-text mt-0.5">{completion}%</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-hos-text-dim">当前建议 / Next Step</p>
            <p className="text-[14px] font-semibold text-hos-cyan mt-0.5">Day {activeDayNumber}</p>
          </div>
        </div>
        <div className="h-[5px] bg-hos-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completion}%`, background: 'linear-gradient(90deg, var(--color-hos-cyan), var(--color-hos-purple))' }}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {ACTIVATION_DAYS.map((item) => {
          const isSelected = item.day === day.day
          const isDone = item.tasks.every((task) => progress.completedTaskIds.includes(task.id))
          return (
            <button
              key={item.day}
              onClick={() => setSelectedDay(item.day)}
              className={`min-w-[58px] rounded-2xl border px-3 py-2 text-left transition-all ${
                isSelected
                  ? 'border-hos-cyan/50 bg-hos-cyan/12 text-hos-cyan'
                  : isDone
                  ? 'border-hos-green/25 bg-hos-green/8 text-hos-green'
                  : 'border-hos-border text-hos-text-dim hover:border-hos-border-light'
              }`}
            >
              <p className="text-[10px] font-mono">DAY</p>
              <p className="text-[18px] font-bold leading-none">{item.day}</p>
            </button>
          )
        })}
      </div>

      <section className="hos-card p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-hos-cyan font-mono mb-1">DAY {day.day} · {day.subtitle.zh}</p>
            <h2 className="text-[20px] font-bold text-hos-text leading-tight">{day.title.zh}</h2>
            <p className="text-en mt-1">{day.title.en}</p>
          </div>
          <div className="w-16 h-16 rounded-full border border-hos-cyan/25 bg-hos-cyan/8 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold text-hos-cyan glow-cyan leading-none">{day.keyword}</span>
            <span className="text-[8px] text-hos-cyan/60 font-mono mt-1">{day.keywordEn}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-hos-border/60 bg-hos-bg/50 p-3">
            <p className="text-[10px] text-hos-text-muted">频率 / Frequency</p>
            <p className="text-[14px] font-mono font-bold text-hos-cyan mt-1">{day.frequency}</p>
          </div>
          <div className="rounded-xl border border-hos-border/60 bg-hos-bg/50 p-3">
            <p className="text-[10px] text-hos-text-muted">任务 / Tasks</p>
            <p className="text-[14px] font-mono font-bold text-hos-text mt-1">{completedTasks}/{day.tasks.length}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[10px] text-hos-text-muted uppercase tracking-wider mb-1">核心目标</p>
            <p className="text-[13px] text-hos-text leading-relaxed">{day.objective.zh}</p>
            <p className="text-en mt-1">{day.objective.en}</p>
          </div>
          <div>
            <p className="text-[10px] text-hos-text-muted uppercase tracking-wider mb-1">原理提示</p>
            <p className="text-[12px] text-hos-text-dim leading-relaxed">{day.science.zh}</p>
          </div>
        </div>
      </section>

      <div className="space-y-2.5 mb-4">
        {day.tasks.map((task) => {
          const checked = progress.completedTaskIds.includes(task.id)
          return (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`w-full hos-card px-4 py-3.5 flex items-start gap-3 text-left ${
                checked ? '!border-hos-green/35 bg-hos-green/5' : ''
              }`}
            >
              <span className={`mt-0.5 ${checked ? 'text-hos-green' : 'text-hos-text-muted'}`}>
                {checked ? <Check size={18} /> : <Circle size={18} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-semibold text-hos-text">{task.title.zh}</span>
                  <span className="text-[10px] font-mono text-hos-cyan whitespace-nowrap">{task.metric.zh}</span>
                </span>
                <span className="block text-[12px] text-hos-text-dim leading-relaxed mt-1">{task.detail.zh}</span>
                <span className="block text-en mt-0.5">{task.detail.en}</span>
              </span>
            </button>
          )
        })}
      </div>

      <section className="hos-card p-4 mb-4">
        <p className="text-[11px] text-hos-text-dim mb-2">今日复盘 / Daily Reflection</p>
        <div className="space-y-1.5 mb-3">
          {day.reflection.map((item) => (
            <p key={item.zh} className="text-[12px] text-hos-text-dim">• {item.zh}</p>
          ))}
        </div>
        <div className="voice-enabled-control textarea">
          <textarea
            value={progress.notes[String(day.day)] ?? ''}
            onChange={(event) => updateNote(event.target.value)}
            rows={3}
            placeholder="点话筒，直接说今天的系统日志..."
            className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-3 text-[13px] outline-none focus:border-hos-cyan/35 text-hos-text placeholder-hos-text-muted resize-none transition-colors"
          />
          <VoiceInputButton value={progress.notes[String(day.day)] ?? ''} onChange={updateNote} label="用语音完成今日复盘" />
        </div>
      </section>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button
          onClick={() => navigate(`/reset/${day.routeProtocol}`)}
          className="rounded-2xl bg-hos-cyan/12 border border-hos-cyan/25 px-4 py-3 text-hos-cyan font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Zap size={15} />
          <span>执行今日重置</span>
        </button>
        <button
          onClick={() => setSelectedDay(Math.min(7, day.day + 1))}
          className="w-12 rounded-2xl border border-hos-border text-hos-text-dim flex items-center justify-center hover:border-hos-border-light hover:text-hos-text transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
