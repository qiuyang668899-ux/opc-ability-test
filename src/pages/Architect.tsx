import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, BrainCircuit, ChevronRight, Focus, Gauge, MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { type ChatMessage, recomputeUserState, saveState, loadState } from '../stores/useStore'
import { buildCoachGreeting, buildCoachSnapshot, createCoachPlan, formatCoachMessage, type CoachPlan } from '../engines/coachEngine'

const quickPrompts = [
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
  const scrollRef = useRef<HTMLDivElement>(null)

  const snapshot = buildCoachSnapshot()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
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

    setMessages((prev) => [...prev, userMsg])
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
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 520)
  }, [input, isTyping])

  return (
    <div className="hos-page flex flex-col h-[calc(100vh-88px)] animate-float-up">
      <header className="shrink-0 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot size={18} className="text-hos-cyan" />
              <span className="text-[11px] text-hos-cyan font-mono tracking-wider">AI COACH ENGINE</span>
            </div>
            <h1 className="text-[26px] font-bold text-white leading-tight">AI 架构师</h1>
            <p className="text-en mt-1">State-aware coaching, not scripted replies</p>
          </div>
          <button
            onClick={() => navigate(coachPlan.route)}
            className="rounded-2xl border border-hos-cyan/25 bg-hos-cyan/10 px-3.5 py-2.5 text-hos-cyan text-[12px] font-semibold flex items-center gap-2 active:scale-[0.98] transition-all"
          >
            <span>执行</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <section className="hos-card-accent p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] text-hos-text-muted mb-1">当前判断 / Current Read</p>
              <h2 className="text-[17px] font-bold text-white">{coachPlan.stateLabel}</h2>
              <p className="text-[12px] text-hos-text-dim mt-1 leading-relaxed">{coachPlan.protocol.title.zh}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl border border-hos-purple/25 bg-hos-purple/10 flex items-center justify-center text-hos-purple">
              <BrainCircuit size={23} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
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

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-5 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="max-w-[92%]">
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-hos-text-muted">
                  <Sparkles size={12} className="text-hos-cyan" />
                  <span>HOS Coach Kernel</span>
                </div>
                <div className="hos-card px-4 py-4 !rounded-tl-md">
                  <pre className="whitespace-pre-wrap text-[13px] leading-[1.75] font-sans text-hos-text">{msg.content}</pre>
                </div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="max-w-[86%]">
                <div className="bg-hos-cyan/10 border border-hos-cyan/20 rounded-2xl rounded-tr-md px-4 py-3">
                  <p className="text-[13px] text-white leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="hos-card px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="w-[6px] h-[6px] bg-hos-cyan/60 rounded-full" style={{ animation: `dot-pulse 1.4s ease-in-out ${item * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="shrink-0 pt-3 border-t border-hos-border/70">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => sendMessage(prompt.text)}
              className="rounded-xl border border-hos-border bg-hos-card/70 px-3 py-2.5 text-left text-[12px] text-hos-text-dim hover:text-white hover:border-hos-border-light transition-colors"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center hos-card !rounded-2xl px-4 py-3 focus-within:!border-hos-cyan/35 transition-colors">
            <MessageCircle size={16} className="text-hos-text-muted mr-2.5 shrink-0" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              placeholder="告诉我：你现在最卡住的是什么？"
              className="flex-1 bg-transparent text-[14px] outline-none text-white placeholder-hos-text-muted"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 rounded-2xl bg-hos-cyan/15 border border-hos-cyan/25 flex items-center justify-center text-hos-cyan disabled:opacity-25 hover:bg-hos-cyan/25 active:scale-[0.96] transition-all"
            aria-label="发送"
          >
            <Send size={17} />
          </button>
        </div>
      </footer>
    </div>
  )
}
