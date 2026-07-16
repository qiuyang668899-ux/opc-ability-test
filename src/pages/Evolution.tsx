import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Focus,
  HeartPulse,
  Leaf,
  Save,
  Share2,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  buildEvolutionSnapshot,
  loadEvolutionProfile,
  loadEvolutionProgress,
  type EvolutionDimensionId,
  type EvolutionFeedback,
  type EvolutionProfile,
} from '../engines/evolutionEngine'
import { loadState, saveState } from '../stores/useStore'

type HabitRecipe = { anchor: string; behavior: string; celebration: string }

const defaultHabitRecipe: HabitRecipe = {
  anchor: '当我完成今天第一次状态打卡后',
  behavior: '我会做一次缓慢呼气，并打开今日路径',
  celebration: '我会轻声对自己说：很好，我已经开始了',
}

const dimensionIcons = {
  body: Activity,
  emotion: HeartPulse,
  clarity: BrainCircuit,
  action: Focus,
  meaning: Compass,
} satisfies Record<EvolutionDimensionId, typeof Activity>

export default function Evolution() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<EvolutionProfile>(loadEvolutionProfile)
  const [progress, setProgress] = useState(loadEvolutionProgress)
  const [direction, setDirection] = useState(profile.direction)
  const [reason, setReason] = useState(profile.reason)
  const [saved, setSaved] = useState(Boolean(profile.direction))
  const [habitRecipe, setHabitRecipe] = useState<HabitRecipe>(() => loadState('evolutionHabitRecipe', defaultHabitRecipe))
  const [recipeSaved, setRecipeSaved] = useState(() => Boolean(loadState<HabitRecipe | undefined>('evolutionHabitRecipe', undefined)))
  const [celebrating, setCelebrating] = useState(false)
  const [feedbackVersion, setFeedbackVersion] = useState(0)
  const [shareStatus, setShareStatus] = useState('')
  const feedback = loadState<EvolutionFeedback[]>('evolutionFeedback', [])
  const todayFeedback = feedback.find((item) => item.date === new Date().toLocaleDateString('en-CA'))?.difficulty
  const snapshot = useMemo(() => buildEvolutionSnapshot(profile, progress), [profile, progress, feedbackVersion])

  const toggleStep = (stepId: string) => {
    const wasComplete = progress.completedStepIds.includes(stepId)
    const completedStepIds = wasComplete
      ? progress.completedStepIds.filter((id) => id !== stepId)
      : [...progress.completedStepIds, stepId]
    const todayIds = snapshot.steps.map((step) => step.id)
    const completedToday = todayIds.every((id) => completedStepIds.includes(id))
    const completedDates = completedToday
      ? Array.from(new Set([...progress.completedDates, snapshot.date]))
      : progress.completedDates.filter((date) => date !== snapshot.date)
    const next = { completedStepIds, completedDates }
    setProgress(next)
    saveState('evolutionProgress', next)
    if (!wasComplete) {
      setCelebrating(true)
      window.setTimeout(() => setCelebrating(false), 2600)
    }
  }

  const saveRecipe = () => {
    saveState('evolutionHabitRecipe', habitRecipe)
    setRecipeSaved(true)
  }

  const saveDifficulty = (difficulty: EvolutionFeedback['difficulty']) => {
    const current = loadState<EvolutionFeedback[]>('evolutionFeedback', [])
    const next = [
      { date: snapshot.date, difficulty, createdAt: Date.now() },
      ...current.filter((item) => item.date !== snapshot.date),
    ].slice(0, 90)
    saveState('evolutionFeedback', next)
    setFeedbackVersion((value) => value + 1)
  }

  const shareReflection = async () => {
    const text = '我今天为自己完成了一次“调节 → 行动 → 复盘”的小闭环。微小但真实的进步，值得被看见。\n\n#HOS人类操作系统'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'HOS 今日成长回响', text })
        setShareStatus('已打开分享')
      } else {
        await navigator.clipboard.writeText(text)
        setShareStatus('分享文案已复制')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setShareStatus('暂时无法分享，请稍后重试')
    }
  }

  const saveDirection = () => {
    const now = Date.now()
    const next: EvolutionProfile = {
      direction: direction.trim(),
      reason: reason.trim(),
      startedAt: profile.startedAt || now,
      updatedAt: now,
    }
    setProfile(next)
    saveState('evolutionProfile', next)
    setSaved(true)
  }

  return (
    <div className="hos-page evolution-page animate-float-up">
      <header className="evolution-header">
        <div className="evolution-kicker"><span><Sparkles size={16} /></span><p>HOS · EVOLUTION CORE</p></div>
        <h1>个人进化中枢</h1>
        <p>把分散的练习连接成一条每天可执行、可以复盘、能够逐步积累的成长路径。</p>
      </header>

      <section className="evolution-hero">
        <div className="evolution-hero-top">
          <div>
            <p className="section-kicker">DAY {String(snapshot.day).padStart(2, '0')} · 当前重点</p>
            <h2>{snapshot.focusLabel}系统</h2>
            <span>{snapshot.headline}</span>
          </div>
          <div className="evolution-score" aria-label={`综合整合度 ${snapshot.integration}`}>
            <strong>{snapshot.integration}</strong><small>整合度</small>
          </div>
        </div>
        <p className="evolution-explanation">{snapshot.explanation}</p>
        <div className="evolution-source"><Leaf size={13} /><span>{snapshot.evidenceLine}</span></div>
      </section>

      {!snapshot.hasCheckIn && (
        <button className="evolution-checkin" onClick={() => navigate('/')}>
          <span><Target size={18} /></span>
          <div><strong>先完成今日状态自检</strong><small>30 秒打卡后，路径会根据能量、压力与清晰度重新生成。</small></div>
          <ArrowRight size={17} />
        </button>
      )}

      <section className="evolution-section">
        <div className="hos-section-title">
          <div><p className="section-kicker">五维状态</p><h2>不是能力评分，而是今天的资源分布</h2></div>
        </div>
        <div className="dimension-board">
          {snapshot.dimensions.map((dimension) => {
            const Icon = dimensionIcons[dimension.id]
            return (
              <article key={dimension.id} className={dimension.id === snapshot.focusId ? 'focus' : ''}>
                <div className="dimension-heading">
                  <span><Icon size={15} /></span>
                  <div><strong>{dimension.label}</strong><small>{dimension.en}</small></div>
                  <b>{dimension.score}</b>
                </div>
                <div className="dimension-track"><i style={{ width: `${dimension.score}%` }} /></div>
                <p>{dimension.observation}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="evolution-section">
        <div className="hos-section-title">
          <div><p className="section-kicker">今日路径</p><h2>调节 → 行动 → 复盘</h2></div>
          <span className="evolution-count">{snapshot.completedToday} / 3</span>
        </div>
        <div className="evolution-steps">
          {snapshot.steps.map((step, index) => {
            const complete = progress.completedStepIds.includes(step.id)
            return (
              <article key={step.id} className={complete ? 'complete' : ''}>
                <button className="step-check" onClick={() => toggleStep(step.id)} aria-label={complete ? `取消完成${step.title}` : `标记完成${step.title}`}>
                  {complete ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="step-copy">
                  <div><span>0{index + 1} · {step.phase}</span><small>{step.duration}</small></div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className="tiny-version"><Leaf size={12} /><span><strong>保底版：</strong>{step.tinyVersion}</span></div>
                  <button onClick={() => navigate(step.route)}>{step.action}<ArrowRight size={14} /></button>
                </div>
              </article>
            )
          })}
        </div>
        <div className={`ability-note ${snapshot.abilityMode === 'tiny' ? 'tiny' : ''}`}>
          <Leaf size={15} /><span>{snapshot.abilityMessage}</span>
        </div>
        {snapshot.completedToday > 0 && (
          <div className="difficulty-feedback">
            <div><strong>今天的难度合适吗？</strong><small>你的反馈会直接调整下一次路径。</small></div>
            <div>
              {([['hard', '有点难'], ['right', '刚刚好'], ['easy', '可再进阶']] as const).map(([value, label]) => (
                <button key={value} className={todayFeedback === value ? 'active' : ''} onClick={() => saveDifficulty(value)}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={`growth-echo ${snapshot.completedToday === 3 ? 'unlocked' : ''}`}>
        <div className="growth-echo-mark"><Sparkles size={22} /></div>
        <div className="growth-echo-copy">
          <p className="section-kicker">今日成长回响</p>
          <h2>{snapshot.completedToday === 3 ? '一个完整闭环，正在成为你的能力' : '完成三步，生成今日成长卡'}</h2>
          <p>{snapshot.completedToday === 3 ? '只分享“完成了一次成长闭环”，不会包含状态分数、日志、方向或其他私人数据。' : `还差 ${3 - snapshot.completedToday} 步。这里不催促，只在你完成后替你保存这一刻。`}</p>
        </div>
        <button onClick={shareReflection} disabled={snapshot.completedToday !== 3}><Share2 size={16} />{shareStatus || '安全分享'}</button>
      </section>

      <section className="habit-recipe hos-card">
        <div className="habit-recipe-heading">
          <span><Target size={20} /></span>
          <div><p className="section-kicker">行为配方 · B = MAP</p><h2>把改变安放进已有生活</h2><small>提示出现时，让行动足够容易；完成后立刻感受到“我做到了”。</small></div>
        </div>
        <div className="habit-formula">
          <label><b>01</b><span>锚点 · 当我……之后</span><input value={habitRecipe.anchor} onChange={(event) => { setHabitRecipe({ ...habitRecipe, anchor: event.target.value.slice(0, 80) }); setRecipeSaved(false) }} /></label>
          <i>→</i>
          <label><b>02</b><span>微行动 · 我会……</span><input value={habitRecipe.behavior} onChange={(event) => { setHabitRecipe({ ...habitRecipe, behavior: event.target.value.slice(0, 80) }); setRecipeSaved(false) }} /></label>
          <i>→</i>
          <label><b>03</b><span>庆祝 · 然后我……</span><input value={habitRecipe.celebration} onChange={(event) => { setHabitRecipe({ ...habitRecipe, celebration: event.target.value.slice(0, 80) }); setRecipeSaved(false) }} /></label>
        </div>
        <button className="secondary-action" onClick={saveRecipe} disabled={!habitRecipe.anchor.trim() || !habitRecipe.behavior.trim()}>
          {recipeSaved ? <Check size={16} /> : <Save size={16} />}{recipeSaved ? '微习惯配方已保存' : '保存我的微习惯配方'}
        </button>
        <p className="restart-note">漏做一天不会归零。不是你失败了，只是配方需要变得更容易，明天可以从保底版重新开始。</p>
      </section>

      <section className="evolution-section">
        <div className="hos-section-title">
          <div><p className="section-kicker">21 天进化路径</p><h2>先稳态，再重塑，最后整合</h2></div>
          <span className="evolution-days">已完整实践 {snapshot.practiceDays} 天</span>
        </div>
        <div className="evolution-stages">
          {snapshot.stages.map((stage) => (
            <article key={stage.index} className={`${stage.active ? 'active' : ''} ${stage.complete ? 'complete' : ''}`}>
              <div className="stage-index">{stage.complete ? <Check size={16} /> : stage.index}</div>
              <div><span>{stage.days}</span><h3>{stage.title} · {stage.subtitle}</h3><p>{stage.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="evolution-direction hos-card">
        <div className="direction-heading">
          <span><Compass size={20} /></span>
          <div><p className="section-kicker">阶段坐标</p><h2>未来 21 天，我想成为怎样的人？</h2></div>
        </div>
        <label>
          <span>我的阶段方向</span>
          <input value={direction} onChange={(event) => { setDirection(event.target.value.slice(0, 80)); setSaved(false) }} placeholder="例如：成为一个能稳定行动、照顾身体的创造者" />
        </label>
        <label>
          <span>这件事为什么重要</span>
          <textarea value={reason} onChange={(event) => { setReason(event.target.value.slice(0, 180)); setSaved(false) }} rows={3} placeholder="写给真实的自己，不必写得正确。" />
        </label>
        <button className="primary-action" onClick={saveDirection} disabled={!direction.trim()}>
          {saved ? <Check size={17} /> : <Save size={17} />}{saved ? '方向已保存' : '保存阶段方向'}
        </button>
      </section>

      <section className="evolution-principle">
        <BookOpenText size={18} />
        <p><strong>HOS 原则：</strong>科学帮助我们验证方法，传统智慧帮助我们安顿意义，真实反馈决定什么适合你。这里提供自我觉察与日常练习，不替代医疗、心理诊断或专业治疗。</p>
      </section>

      {celebrating && (
        <div className="habit-celebration" role="status">
          <span><Sparkles size={18} /></span>
          <div><strong>很好，你完成了一个小闭环</strong><small>{habitRecipe.celebration || '此刻，请允许自己感受一点完成的喜悦。'}</small></div>
        </div>
      )}
    </div>
  )
}
