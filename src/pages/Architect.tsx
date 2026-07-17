import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BatteryLow,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Compass,
  Heart,
  MessageCircle,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  Waves,
} from 'lucide-react'
import { type ChatMessage, loadState, recomputeUserState, saveState } from '../stores/useStore'
import {
  buildCoachGreeting,
  buildCoachSnapshot,
  createCoachPlan,
  formatCoachMessage,
  shrinkCoachPlan,
  type CoachPlan,
  type CoachReplyOption,
} from '../engines/coachEngine'

const starterPrompts = [
  { label: '脑子停不下来', desc: '压力、紧绷、想得太多', icon: Waves, text: '我现在压力很大，脑子停不下来，想先稳定状态。' },
  { label: '知道却无法开始', desc: '拖延、抗拒、缺少启动', icon: Play, text: '我知道该做什么，但一直拖延，无法开始。' },
  { label: '不知道先做什么', desc: '选项、信息与目标混在一起', icon: Compass, text: '我现在信息和选择太多，很混乱，不知道先做什么。' },
  { label: '身体已经没电', desc: '疲惫、耗尽、无法真正休息', icon: BatteryLow, text: '我很累，感觉身体没电了，但又不敢停下来。' },
  { label: '一段关系让我内耗', desc: '委屈、愤怒、边界和表达', icon: Heart, text: '我在一段关系中很内耗，有情绪和委屈，想理清自己。' },
  { label: '想更快掌握技能', desc: '专注、练习、反馈与迭代', icon: BookOpen, text: '我想更快学会一项技能，但不知道该练什么。' },
]

type CoachFeedback = { date: string; mode: string; result: 'helpful' | 'tiny'; createdAt: number }

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')
}

export default function Architect() {
  const navigate = useNavigate()
  const initialMessages = useMemo(() => loadState<ChatMessage[]>('chat', []).slice(-12), [])
  const initialUser = latestUserMessage(initialMessages)
  const initialSnapshot = useMemo(() => buildCoachSnapshot(), [])
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(Boolean(initialUser))
  const [thinkingStage, setThinkingStage] = useState<number | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [coachPlan, setCoachPlan] = useState<CoachPlan>(() => createCoachPlan(initialUser?.content ?? '我需要一个清晰的下一步', initialSnapshot))
  const timersRef = useRef<number[]>([])
  const snapshot = buildCoachSnapshot()
  const userTrail = messages.filter((message) => message.role === 'user').slice(-3)

  useEffect(() => { saveState('chat', messages.slice(-20)) }, [messages])
  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    window.speechSynthesis?.cancel()
  }, [])

  const finishResponse = useCallback((nextPlan: CoachPlan, currentSnapshot: ReturnType<typeof buildCoachSnapshot>) => {
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: formatCoachMessage(nextPlan),
      timestamp: Date.now(),
    }
    recomputeUserState()
    setCoachPlan(nextPlan)
    setMessages((previous) => [...previous, aiMsg])
    setThinkingStage(null)
    setStarted(true)
    setFeedbackStatus('')
    void currentSnapshot
  }, [])

  const sendMessage = useCallback((analysisText?: string, displayText?: string) => {
    const content = (analysisText ?? input).trim()
    if (!content || thinkingStage !== null) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: displayText ?? content,
      timestamp: Date.now(),
    }
    const currentSnapshot = buildCoachSnapshot()
    const nextPlan = createCoachPlan(content, currentSnapshot, coachPlan)
    setMessages((previous) => [...previous, userMsg])
    setInput('')
    setThinkingStage(0)
    setFeedbackStatus('')
    navigator.vibrate?.(16)
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = [
      window.setTimeout(() => setThinkingStage(1), 260),
      window.setTimeout(() => setThinkingStage(2), 560),
      window.setTimeout(() => finishResponse(nextPlan, currentSnapshot), 880),
    ]
  }, [coachPlan, finishResponse, input, thinkingStage])

  const chooseReply = (option: CoachReplyOption) => sendMessage(option.value, option.label)

  const speakPlan = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    if (speaking) {
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(`${coachPlan.hypothesis}。此刻只做：${coachPlan.commitment}。${coachPlan.question}`)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.82
    utterance.pitch = 0.94
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const recordFeedback = (result: CoachFeedback['result']) => {
    const current = loadState<CoachFeedback[]>('coachFeedback', [])
    const next: CoachFeedback = { date: new Date().toLocaleDateString('en-CA'), mode: coachPlan.mode, result, createdAt: Date.now() }
    saveState('coachFeedback', [next, ...current].slice(0, 120))
    if (result === 'tiny') {
      setCoachPlan((plan) => shrinkCoachPlan(plan))
      setFeedbackStatus('已切换为 30 秒保底版')
    } else {
      setFeedbackStatus('已记住，下次会继续使用这种节奏')
      navigator.vibrate?.([20, 28, 38])
    }
  }

  const resetSession = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    window.speechSynthesis?.cancel()
    setMessages([])
    saveState('chat', [])
    setStarted(false)
    setThinkingStage(null)
    setSpeaking(false)
    setFeedbackStatus('')
    setCoachPlan(createCoachPlan('我需要一个清晰的下一步', buildCoachSnapshot()))
  }

  return (
    <div className="hos-page coach-vnext-page animate-float-up">
      <header className="coach-vnext-header">
        <div className="coach-vnext-brand">
          <span><BrainCircuit size={19} /></span>
          <div><p>HOS ADAPTIVE COACH</p><h1>状态教练</h1><small>连续理解，不急着回答</small></div>
        </div>
        {started && <button onClick={resetSession} aria-label="开始新对话"><RefreshCw size={17} /></button>}
      </header>

      <section className={`coach-presence ${started ? 'compact' : ''}`}>
        <div className="coach-presence-orb" aria-hidden="true"><i /><i /><span><Sparkles size={22} /></span></div>
        <div>
          <p>{started ? '我正在和你一起收窄问题' : '你不需要把问题说得完整'}</p>
          <h2>{started ? `当前更接近「${coachPlan.stateLabel}」` : '我在。先从最接近的感觉开始。'}</h2>
          <span>{buildCoachGreeting(snapshot)}</span>
        </div>
      </section>

      {!started && (
        <section className="coach-starters">
          <header><div><p>CHOOSE A SIGNAL</p><h2>此刻哪一种感觉最接近你？</h2></div><small>点一下即可</small></header>
          <div>
            {starterPrompts.map((prompt) => (
              <button key={prompt.label} onClick={() => sendMessage(prompt.text, prompt.label)}>
                <span><prompt.icon size={20} /></span>
                <strong>{prompt.label}</strong>
                <small>{prompt.desc}</small>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
      )}

      {started && userTrail.length > 0 && (
        <section className="coach-context-trail" aria-label="对话语境">
          <p>你刚才说过</p>
          <div>{userTrail.map((message) => <span key={message.id}>{message.content}</span>)}</div>
        </section>
      )}

      {thinkingStage !== null && (
        <section className="coach-thinking-card" aria-live="polite">
          <div className="coach-thinking-orb"><BrainCircuit size={23} /></div>
          <p>教练正在理解语境</p>
          <h2>{['识别状态信号…', '与今日记录对齐…', '把行动压缩到可开始…'][thinkingStage]}</h2>
          <div>{[0, 1, 2].map((index) => <i key={index} className={index <= thinkingStage ? 'active' : ''} />)}</div>
        </section>
      )}

      {started && thinkingStage === null && (
        <section className={`coach-live-plan ${coachPlan.isCrisis ? 'crisis' : ''}`}>
          <header>
            <div><p>CURRENT READ</p><h2>{coachPlan.stateLabel}</h2><span>核心需要：{coachPlan.coreNeed}</span></div>
            <div className="coach-confidence"><strong>{coachPlan.confidence}</strong><small>匹配度</small></div>
          </header>

          <div className="coach-signal-row">{coachPlan.signals.map((signal) => <span key={signal}>{signal}</span>)}</div>

          <article className="coach-hypothesis">
            <p>我的当前理解</p>
            <h3>{coachPlan.hypothesis}</h3>
            <blockquote>{coachPlan.reframe}</blockquote>
          </article>

          <div className="coach-protocol-stack">
            <article><span>01</span><div><small>身体先行</small><strong>{coachPlan.bodyStep}</strong></div></article>
            <article className="primary"><span>02</span><div><small>此刻行动</small><strong>{coachPlan.actionStep}</strong></div></article>
            <article><span>03</span><div><small>留下反馈</small><strong>{coachPlan.reflectionStep}</strong></div></article>
          </div>

          <button className="coach-commitment" onClick={() => navigate(coachPlan.route)}>
            <span><Target size={18} /></span><div><small>{coachPlan.isTiny ? '保底版' : '现在只承诺'}</small><strong>{coachPlan.commitment}</strong></div><ArrowRight size={18} />
          </button>

          {!coachPlan.isCrisis && (
            <div className="coach-next-question">
              <p>ONE QUESTION DEEPER</p>
              <h3>{coachPlan.question}</h3>
              <div>{coachPlan.replyOptions.map((option) => <button key={option.label} onClick={() => chooseReply(option)}>{option.label}</button>)}</div>
            </div>
          )}

          <div className="coach-plan-actions">
            <button onClick={speakPlan}><Volume2 size={16} />{speaking ? '停止播放' : '听教练说'}</button>
            <button onClick={() => navigate(coachPlan.route)}><Play size={16} />进入实践</button>
          </div>

          {!coachPlan.isCrisis && (
            <div className="coach-feedback">
              <span>这个建议的难度如何？</span>
              <div><button onClick={() => recordFeedback('tiny')}>有点难</button><button onClick={() => recordFeedback('helpful')}><Check size={13} />刚刚好</button></div>
              {feedbackStatus && <p>{feedbackStatus}</p>}
            </div>
          )}
        </section>
      )}

      <footer className="coach-vnext-compose">
        <div className="coach-vnext-input">
          <MessageCircle size={17} />
          <input
            aria-label="告诉教练你现在怎么了"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            placeholder={started ? '继续说，我会沿着上一轮理解…' : '或者，直接说此刻最卡的事…'}
          />
        </div>
        <button onClick={() => sendMessage()} disabled={!input.trim() || thinkingStage !== null} aria-label="发送"><Send size={17} /></button>
        <div className="coach-privacy"><ShieldCheck size={12} /><span>对话与状态仅保存在当前设备</span></div>
      </footer>
    </div>
  )
}
