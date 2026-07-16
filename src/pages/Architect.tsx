import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, BrainCircuit, ChevronRight, Focus, Gauge, MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { type ChatMessage, recomputeUserState, saveState, loadState } from '../stores/useStore'
import { buildCoachGreeting, buildCoachSnapshot, createCoachPlan, formatCoachMessage, type CoachPlan } from '../engines/coachEngine'

const quickPrompts = [
  { label: '今日路径', text: '请根据我今天的状态和已有记录，帮我确定今天最重要的一条成长路径。' },
  { label: '压力过载', text: '我现在压力很大，脑子很乱，马上要处理重要事情。' },
  { label: '无法开始', text: '我一直拖延，明明知道该做什么，但就是无法开始。' },
  { label: '学习加速', text: '我想快速学习一个新技能，希望进入高效训练状态。' },
  { label: '睡前过载', text: '我晚上睡不着，大脑一直在跑程序。' },
]

function createInitialMessage(): ChatMessage {
  const snapshot = buildCoachSnapshot()
  return {
    id: 'coach-0',
    role: 'assistant',
    content: buildCoachGreeting(snapshot),
    timestamp: Date.now(),
  }
}

export default function Architect() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadState<ChatMessage[]>('chat', [])
    return saved.length > 0 ? saved : [createInitialMessage()]
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [coachPlan, setCoachPlan] = useState<CoachPlan>(() => {
    const snapshot = buildCoachSnapshot()
    return createCoachPlan('我需要一个清晰的下一步', snapshot)
  })
  const endRef = useRef<HTMLDivElement>(null)
  const initialMessageCountRef = useRef(messages.length)

  const snapshot = buildCoachSnapshot()

  useEffect(() => {
    if (messages.length === initialMessageCountRef.current && !isTyping) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isTyping])

  useEffect(() => { saveState('chat', messages) }, [messages])

  const sendMessage = useCallback((override?: string) => {
    const content = (override ?? input).trim()
    if (!content || isTyping) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    const currentSnapshot = buildCoachSnapshot()
    const nextPlan = createCoachPlan(content, currentSnapshot)

    setMessages((previous) => [...previous, userMsg])
    setInput('')
    setCoachPlan(nextPlan)
    setIsTyping(true)

    window.setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: formatCoachMessage(nextPlan, currentSnapshot),
        timestamp: Date.now(),
      }
      recomputeUserState()
      setMessages((previous) => [...previous, aiMsg])
      setIsTyping(false)
    }, 520)
  }, [input, isTyping])

  return (
    <div className="hos-page coach-page animate-float-up">
      <header className="coach-header">
        <div className="coach-title-row">
          <div>
            <div className="coach-kicker">
              <span><Bot size={17} /></span>
              <p>AI COACH ENGINE</p>
            </div>
            <h1>AI 架构师</h1>
            <p>理解当前状态，给出一个可执行的下一步</p>
          </div>
          <button onClick={() => navigate(coachPlan.route)} className="coach-execute">
            <span>执行</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <section className="coach-overview hos-card-accent">
          <div className="coach-read">
            <div>
              <p>当前判断 <span>Current Read</span></p>
              <h2>{coachPlan.stateLabel}</h2>
              <small>{coachPlan.protocol.title.zh}</small>
            </div>
            <div className="coach-brain"><BrainCircuit size={23} /></div>
          </div>

          <div className="coach-metrics">
            <div className="hos-metric">
              <Gauge size={14} className="text-hos-cyan" />
              <span>{snapshot.user.integration}%</span>
              <small>整合度</small>
            </div>
            <div className="hos-metric">
              <ShieldCheck size={14} className="text-hos-green" />
              <span>{snapshot.activationCompletion}%</span>
              <small>启动</small>
            </div>
            <div className="hos-metric">
              <Focus size={14} className="text-hos-purple" />
              <span>{snapshot.flowCount}</span>
              <small>心流</small>
            </div>
          </div>
        </section>
      </header>

      <section className="coach-thread" aria-label="教练对话">
        <div className="coach-thread-heading">
          <div>
            <p className="section-kicker">COACHING NOTE</p>
            <h2>此刻的行动处方</h2>
          </div>
          <MessageCircle size={18} />
        </div>

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="coach-message assistant">
                <div className="coach-message-label">
                  <Sparkles size={12} className="text-hos-cyan" />
                  <span>HOS Coach Kernel</span>
                </div>
                <div className="coach-bubble"><pre>{message.content}</pre></div>
              </div>
            )}
            {message.role === 'user' && (
              <div className="coach-message user">
                <div className="coach-bubble"><p>{message.content}</p></div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="coach-typing">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="w-[6px] h-[6px] bg-hos-cyan/60 rounded-full" style={{ animation: `dot-pulse 1.4s ease-in-out ${item * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </section>

      <footer className="coach-compose">
        <div className="coach-compose-heading">
          <div>
            <p className="section-kicker">START HERE</p>
            <h2>你现在最需要处理什么？</h2>
          </div>
          <span>选择或直接输入</span>
        </div>

        <div className="coach-prompts">
          {quickPrompts.map((prompt) => (
            <button key={prompt.label} onClick={() => sendMessage(prompt.text)} className="coach-prompt">
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="coach-input-row">
          <div className="coach-input">
            <MessageCircle size={17} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              placeholder="告诉我：你现在最卡住的是什么？"
            />
          </div>
          <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping} className="coach-send" aria-label="发送">
            <Send size={17} />
          </button>
        </div>
      </footer>
    </div>
  )
}
