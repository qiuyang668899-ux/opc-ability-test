import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AudioLines,
  ArrowRight,
  BatteryLow,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Compass,
  Heart,
  LockKeyhole,
  MessageCircle,
  Mic,
  PencilLine,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Volume2,
  Waves,
} from 'lucide-react'
import { type ChatMessage, type JournalEntry, loadState, recomputeUserState, saveState } from '../stores/useStore'
import {
  buildCoachGreeting,
  buildCoachSnapshot,
  createCoachPlan,
  formatCoachMessage,
  refineCoachPlanWithAI,
  shrinkCoachPlan,
  type CoachPlan,
  type CoachReplyOption,
} from '../engines/coachEngine'
import {
  analyzeVoiceJournal,
  calibrateVoiceMemory,
  loadVoiceMemory,
  organizeVoiceDiary,
  polishVoiceTranscript,
  updateVoiceMemory,
  voiceMemoryInsight,
  type VoiceJournalRecord,
  type VoiceMemory,
} from '../engines/voiceJournalEngine'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import VoiceInputButton from '../components/VoiceInputButton'
import {
  activateRegulationJourney,
  buildRegulationJourney,
  buildTextRegulationJourney,
  type RegulationJourney,
} from '../engines/stateOrchestrator'
import { hasHOSAIEndpoint, requestHOSCoachAnalysis } from '../services/aiCoachService'

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
  const voice = useVoiceCapture()
  const openVoiceManualFallback = voice.useManualFallback
  const initialMessages = useMemo(() => loadState<ChatMessage[]>('chat', []).slice(-12), [])
  const initialUser = latestUserMessage(initialMessages)
  const initialSnapshot = useMemo(() => buildCoachSnapshot(), [])
  const rememberedVoice = initialSnapshot.latestVoice?.date === new Date().toLocaleDateString('en-CA')
    ? initialSnapshot.latestVoice
    : undefined
  const initialContext = initialUser?.content ?? rememberedVoice?.transcript
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(Boolean(initialContext))
  const [thinkingStage, setThinkingStage] = useState<number | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [voiceReviewText, setVoiceReviewText] = useState('')
  const [voiceAutoFinalize, setVoiceAutoFinalize] = useState(false)
  const [voiceRecord, setVoiceRecord] = useState<VoiceJournalRecord | null>(rememberedVoice ?? null)
  const [voiceCalibration, setVoiceCalibration] = useState('')
  const [voiceIntelligence, setVoiceIntelligence] = useState<'idle' | 'analyzing' | 'deepseek' | 'local'>(rememberedVoice?.intelligence === 'deepseek' ? 'deepseek' : 'idle')
  const [voiceMemory, setVoiceMemory] = useState<VoiceMemory>(() => loadVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', undefined)))
  const [coachPlan, setCoachPlan] = useState<CoachPlan>(() => createCoachPlan(initialContext ?? '我需要一个清晰的下一步', initialSnapshot))
  const [coachJourney, setCoachJourney] = useState<RegulationJourney | null>(rememberedVoice?.journey ?? null)
  const aiEnhanced = hasHOSAIEndpoint()
  const timersRef = useRef<number[]>([])
  const analysisRequestRef = useRef(0)
  const livePlanRef = useRef<HTMLElement>(null)
  const saveVoiceJournalRef = useRef<(override?: string) => void>(() => undefined)
  const snapshot = buildCoachSnapshot()
  const userTrail = messages.filter((message) => message.role === 'user').slice(-3)

  useEffect(() => { saveState('chat', messages.slice(-20)) }, [messages])
  useEffect(() => {
    const heard = polishVoiceTranscript(`${voice.transcript}${voice.interimTranscript}`)
    if (heard) setVoiceReviewText(heard)
  }, [voice.interimTranscript, voice.transcript])
  useEffect(() => () => {
    analysisRequestRef.current += 1
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    window.speechSynthesis?.cancel()
  }, [])

  const finishResponse = useCallback((
    nextPlan: CoachPlan,
    currentSnapshot: ReturnType<typeof buildCoachSnapshot>,
    nextJourney?: RegulationJourney,
  ) => {
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: formatCoachMessage(nextPlan),
      timestamp: Date.now(),
    }
    recomputeUserState()
    setCoachPlan(nextPlan)
    if (nextJourney) setCoachJourney(nextJourney)
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
    const localPlan = createCoachPlan(content, currentSnapshot, coachPlan)
    const requestId = ++analysisRequestRef.current
    const startedAt = Date.now()
    setMessages((previous) => [...previous, userMsg])
    setInput('')
    setThinkingStage(0)
    setFeedbackStatus('')
    navigator.vibrate?.(16)
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = [
      window.setTimeout(() => setThinkingStage(1), 260),
      window.setTimeout(() => setThinkingStage(2), 560),
    ]
    const complete = (nextPlan: CoachPlan, deepInsight?: Awaited<ReturnType<typeof requestHOSCoachAnalysis>>) => {
      if (analysisRequestRef.current !== requestId) return
      const checkIn = currentSnapshot.checkIn
      const journey = buildTextRegulationJourney(content, nextPlan, checkIn, deepInsight)
      const delay = Math.max(0, 880 - (Date.now() - startedAt))
      const timer = window.setTimeout(() => finishResponse(nextPlan, currentSnapshot, journey), delay)
      timersRef.current.push(timer)
    }
    if (localPlan.isCrisis || !aiEnhanced) {
      complete(localPlan)
      return
    }
    void requestHOSCoachAnalysis({
      text: content,
      source: 'text',
      snapshot: currentSnapshot,
      recentUserMessages: [
        ...messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content),
        content,
      ],
    })
      .then((insight) => complete(refineCoachPlanWithAI(localPlan, insight), insight))
      .catch(() => complete(localPlan))
  }, [aiEnhanced, coachPlan, finishResponse, input, messages, thinkingStage])

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
    analysisRequestRef.current += 1
    setStarted(false)
    setThinkingStage(null)
    setSpeaking(false)
    setFeedbackStatus('')
    setVoiceRecord(null)
    setCoachJourney(null)
    setVoiceCalibration('')
    setVoiceIntelligence('idle')
    voice.reset()
    setCoachPlan(createCoachPlan('我需要一个清晰的下一步', buildCoachSnapshot()))
  }

  const startVoiceJournal = () => {
    setVoiceRecord(null)
    setVoiceCalibration('')
    setVoiceIntelligence('idle')
    setVoiceReviewText('')
    setVoiceAutoFinalize(false)
    void voice.start()
  }

  const stopVoiceJournal = () => {
    const heard = `${voice.transcript}${voice.interimTranscript}`
    setVoiceReviewText(polishVoiceTranscript(heard) || heard)
    setVoiceAutoFinalize(true)
    voice.stop()
  }

  const saveVoiceJournal = (override?: string) => {
    const transcript = polishVoiceTranscript(override ?? voiceReviewText)
    if (!transcript) return
    const currentMemory = loadVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', voiceMemory))
    const analysis = analyzeVoiceJournal(transcript, voice.metrics, currentMemory)
    const now = Date.now()
    const currentSnapshot = buildCoachSnapshot()
    const inferredCheckIn = {
      date: new Date().toLocaleDateString('en-CA'),
      energy: analysis.energy,
      clarity: analysis.clarity,
      pressure: analysis.pressure,
      intention: analysis.summary,
      createdAt: now,
      source: 'voice' as const,
      confidence: analysis.confidence,
    }
    const nextPlan = createCoachPlan(transcript, { ...currentSnapshot, checkIn: inferredCheckIn }, coachPlan)
    const journey = buildRegulationJourney(analysis, nextPlan)
    const organizedText = organizeVoiceDiary(analysis, nextPlan.commitment)
    const record: VoiceJournalRecord = {
      id: `vj-${now}`,
      timestamp: now,
      date: new Date().toLocaleDateString('en-CA'),
      rawTranscript: voice.transcript || transcript,
      transcript,
      metrics: voice.metrics,
      analysis,
      coachMode: nextPlan.mode,
      commitment: nextPlan.commitment,
      organizedText,
      journey,
      intelligence: 'local',
    }
    const voiceRecords = loadState<VoiceJournalRecord[]>('voiceJournal', [])
    saveState('voiceJournal', [record, ...voiceRecords].slice(0, 180))
    const nextMemory = updateVoiceMemory(currentMemory, record)
    saveState('voiceMemory', nextMemory)
    setVoiceMemory(nextMemory)

    const journal = loadState<JournalEntry[]>('journal', [])
    const journalEntry: JournalEntry = {
      id: `j-${now}`,
      timestamp: now,
      trigger: `语音日记 · ${analysis.stateLabel}`,
      oldPattern: transcript,
      newResponse: nextPlan.commitment,
      somatic: analysis.deliverySignals.join(' · '),
      distortion: '',
      analysis: `${analysis.response}\n\n状态推测：能量 ${analysis.energy}/5 · 清晰 ${analysis.clarity}/5 · 压力 ${analysis.pressure}/5\n依据：${analysis.deliverySignals.join('；')}。\n\n这些是自我觉察线索，不是医学或心理诊断。`,
      source: 'voice',
      voiceRecordId: record.id,
      voiceSignals: analysis.deliverySignals,
      organizedText,
      rawFragment: voice.transcript || transcript,
      regulationPath: journey.steps.map((step) => step.title),
    }
    saveState('journal', [journalEntry, ...journal].slice(0, 365))
    saveState('dailyCheckIn', inferredCheckIn)

    const voiceUserMessage: ChatMessage = { id: `u-${now}`, role: 'user', content: transcript, timestamp: now }
    const voiceCoachMessage: ChatMessage = { id: `a-${now + 1}`, role: 'assistant', content: formatCoachMessage(nextPlan), timestamp: now + 1 }
    setMessages((previous) => [...previous, voiceUserMessage, voiceCoachMessage])
    setCoachPlan(nextPlan)
    setCoachJourney(journey)
    setStarted(true)
    setVoiceRecord(record)
    setVoiceIntelligence(aiEnhanced ? 'analyzing' : 'local')
    setVoiceAutoFinalize(false)
    setFeedbackStatus('')
    recomputeUserState()
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
    voice.reset()
    navigator.vibrate?.([24, 36, 48])

    if (!aiEnhanced) return

    void requestHOSCoachAnalysis({
      text: transcript,
      source: 'voice',
      snapshot: { ...currentSnapshot, checkIn: inferredCheckIn },
      recentUserMessages: messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content),
    })
      .then((insight) => {
        const refinedPlan = refineCoachPlanWithAI(nextPlan, insight)
        const refinedAnalysis = {
          ...analysis,
          stateLabel: insight.stateLabel,
          confidence: Math.max(analysis.confidence, insight.confidence),
          summary: insight.hypothesis,
          response: insight.response,
        }
        const refinedJourney = buildRegulationJourney(refinedAnalysis, refinedPlan, insight)
        const refinedOrganizedText = organizeVoiceDiary(refinedAnalysis, refinedPlan.commitment)
        const refinedRecord: VoiceJournalRecord = {
          ...record,
          analysis: refinedAnalysis,
          coachMode: refinedPlan.mode,
          commitment: refinedPlan.commitment,
          organizedText: refinedOrganizedText,
          journey: refinedJourney,
          intelligence: 'deepseek',
        }
        const currentRecords = loadState<VoiceJournalRecord[]>('voiceJournal', [])
        saveState('voiceJournal', currentRecords.map((item) => item.id === refinedRecord.id ? refinedRecord : item))
        const currentJournal = loadState<JournalEntry[]>('journal', [])
        saveState('journal', currentJournal.map((entry) => entry.voiceRecordId === refinedRecord.id
          ? {
              ...entry,
              trigger: `语音日记 · ${refinedAnalysis.stateLabel}`,
              newResponse: refinedPlan.commitment,
              analysis: `${refinedAnalysis.response}\n\n状态推测：能量 ${refinedAnalysis.energy}/5 · 清晰 ${refinedAnalysis.clarity}/5 · 压力 ${refinedAnalysis.pressure}/5\n\n这些是自我觉察线索，不是医学或心理诊断。`,
              organizedText: refinedOrganizedText,
              regulationPath: refinedJourney.steps.map((step) => step.title),
            }
          : entry))
        setVoiceRecord((current) => current?.id === refinedRecord.id ? refinedRecord : current)
        setCoachPlan(refinedPlan)
        setCoachJourney(refinedJourney)
        setVoiceIntelligence('deepseek')
        recomputeUserState()
        window.dispatchEvent(new CustomEvent('hos:data-updated'))
      })
      .catch(() => setVoiceIntelligence('local'))
  }
  saveVoiceJournalRef.current = saveVoiceJournal

  useEffect(() => {
    if (voice.status !== 'review' || !voiceAutoFinalize) return undefined
    const heard = polishVoiceTranscript(voiceReviewText || `${voice.transcript}${voice.interimTranscript}`)
    const timer = window.setTimeout(() => {
      if (heard) saveVoiceJournalRef.current(heard)
      else {
        setVoiceAutoFinalize(false)
        openVoiceManualFallback()
      }
    }, heard ? 280 : 2400)
    return () => window.clearTimeout(timer)
  }, [openVoiceManualFallback, voice.interimTranscript, voice.status, voice.transcript, voiceAutoFinalize, voiceReviewText])

  const calibrateVoiceRead = (value: -1 | 0 | 1) => {
    if (!voiceRecord) return
    const records = loadState<VoiceJournalRecord[]>('voiceJournal', [])
    saveState('voiceJournal', records.map((record) => record.id === voiceRecord.id ? { ...record, calibration: value } : record))
    const nextMemory = calibrateVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', voiceMemory), value)
    saveState('voiceMemory', nextMemory)
    setVoiceMemory(nextMemory)
    setVoiceRecord({ ...voiceRecord, calibration: value })
    setVoiceCalibration(value === 0 ? '已确认，下次会沿用这组判断' : '已校准，系统会逐渐贴近你的真实基线')
  }

  const beginCoachPractice = () => {
    const journey = voiceRecord?.journey ?? coachJourney
    if (journey) {
      activateRegulationJourney(journey)
      navigate(journey.steps[0].route)
      return
    }
    navigate(coachPlan.route)
  }

  const clearVoiceMemory = () => {
    if (!window.confirm('清除语音记录、声音基线与相关语音日志？此操作无法撤销。')) return
    saveState('voiceJournal', [])
    window.localStorage.removeItem('hos_voiceMemory')
    const checkIn = loadState<{ source?: string } | undefined>('dailyCheckIn', undefined)
    if (checkIn?.source === 'voice') window.localStorage.removeItem('hos_dailyCheckIn')
    const journal = loadState<JournalEntry[]>('journal', []).filter((entry) => entry.source !== 'voice')
    saveState('journal', journal)
    const cleared = loadVoiceMemory()
    setVoiceMemory(cleared)
    setVoiceRecord(null)
    setVoiceIntelligence('idle')
    setVoiceCalibration('语音记忆已从当前设备清除')
    recomputeUserState()
  }

  return (
    <div className="hos-page coach-vnext-page animate-float-up">
      <header className="coach-vnext-header">
        <div className="coach-vnext-brand">
          <span><BrainCircuit size={19} /></span>
          <div><p>HOS ADAPTIVE COACH</p><h1>状态教练</h1><small>连续理解，不急着回答 · {aiEnhanced ? 'DeepSeek 增强' : '本机隐私模式'}</small></div>
        </div>
        {started && <button onClick={resetSession} aria-label="开始新对话"><RefreshCw size={17} /></button>}
      </header>

      {voice.status === 'idle' && !voiceRecord && !started && (
        <section className="voice-invitation">
          <div className="voice-invitation-copy">
            <p>VOICE JOURNAL · 今日倾听</p>
            <h2>不用整理语言，<br />直接说说今天的你。</h2>
            <span>像写一篇只给自己的日记。HOS 会先听完，再回应。</span>
          </div>
          <button className="voice-orb-button" onClick={startVoiceJournal} aria-label="开始语音日记">
            <i /><i />
            <span><Mic size={28} /></span>
            <strong>按一下，直接说</strong>
          </button>
          <div className="voice-invitation-privacy"><LockKeyhole size={13} /><span>原始录音不保存 · 转写与状态仅留在本机</span></div>
          {voiceMemory.voiceCount > 0 && (
            <div className="voice-memory-peek"><AudioLines size={14} /><span>{voiceMemoryInsight(voiceMemory)}</span><button onClick={clearVoiceMemory}>管理</button></div>
          )}
        </section>
      )}

      {voice.status === 'idle' && !voiceRecord && started && (
        <button className="voice-quick-entry" onClick={startVoiceJournal}>
          <span><Mic size={19} /></span>
          <div><strong>继续用声音说</strong><small>我会把这一段也收进状态日志</small></div>
          <AudioLines size={17} />
        </button>
      )}

      {(voice.status === 'requesting' || voice.status === 'listening' || voice.status === 'finalizing' || voice.status === 'review' || voice.status === 'manual' || voice.status === 'error') && (
        <section className={`voice-studio ${voice.status}`}>
          {voice.status === 'requesting' && (
            <div className="voice-permission"><span><Mic size={25} /></span><h2>正在打开倾听</h2><p>请在浏览器提示中允许麦克风。原始声音不会被保存。</p></div>
          )}
          {voice.status === 'listening' && (
            <>
              <header><div><span className="voice-live-dot" />正在倾听</div><time>{String(Math.floor(voice.elapsedSec / 60)).padStart(2, '0')}:{String(voice.elapsedSec % 60).padStart(2, '0')}</time></header>
              <div className="voice-listening-orb" style={{ '--voice-level': `${Math.max(96, 96 + voice.liveLevel * 0.72)}px` } as CSSProperties}>
                <i /><span><Mic size={30} /></span>
              </div>
              <p className="voice-listening-prompt">慢慢说，我不会打断你。</p>
              <div className="voice-live-transcript" aria-live="polite">
                {voice.transcript || voice.interimTranscript
                  ? <p>{voice.transcript}<em>{voice.interimTranscript}</em></p>
                  : <span>可以从“我今天……”开始</span>}
              </div>
              {voice.error && <p className="voice-inline-error">{voice.error}</p>}
              <button className="voice-stop" onClick={stopVoiceJournal}><Square size={15} />我说完了</button>
            </>
          )}
          {voice.status === 'finalizing' && (
            <div className="voice-permission"><span><Sparkles size={25} /></span><h2>正在整理刚才的话</h2><p>等待浏览器交回最后一段文字，完成后会自动归入日志并让教练回应。</p></div>
          )}
          {(voice.status === 'review' || voice.status === 'manual') && (
            <>
              <header><div><PencilLine size={15} />收好这段真实表达</div><button onClick={voice.reset} aria-label="取消语音日记">取消</button></header>
              <div className="voice-review-heading"><span><AudioLines size={20} /></span><div><h2>{voiceReviewText ? '这是我听到的' : '用手机自带话筒继续说'}</h2><p>{voiceReviewText ? '正在自动整理；你也可以先修正错字。' : voice.error}</p></div></div>
              <textarea autoFocus={voice.status === 'manual'} value={voiceReviewText} onChange={(event) => setVoiceReviewText(event.target.value)} rows={7} aria-label="语音日记转写内容" placeholder="点这里，再点手机键盘上的话筒继续说……" />
              <div className="voice-review-meta"><span>{Math.round(voice.metrics.durationSec)} 秒表达</span><span>不保存原始音频</span></div>
              <button className="voice-save" onClick={() => saveVoiceJournal()} disabled={!voiceReviewText.trim()}><Save size={16} />收进今日日志并让教练回应</button>
            </>
          )}
          {voice.status === 'error' && (
            <div className="voice-error-state"><span><Mic size={24} /></span><h2>这次没有连接上麦克风</h2><p>{voice.error}</p><div><button onClick={startVoiceJournal}><RotateCcw size={15} />重新尝试</button><button onClick={openVoiceManualFallback}>用系统话筒输入</button></div></div>
          )}
        </section>
      )}

      {voiceRecord && (
        <section className="voice-readback">
          <header><div><p>I HEARD YOU</p><h2>我听见了</h2></div><span>{voiceRecord.analysis.confidence}%<small>当前推测</small></span></header>
          <div className={`companion-intelligence ${voiceIntelligence}`}>
            <BrainCircuit size={14} />
            <span>{voiceIntelligence === 'analyzing' ? '正在进行 DeepSeek 深层分析…' : voiceIntelligence === 'deepseek' ? 'DeepSeek 已完成深层理解与模块编排' : 'HOS 本机状态引擎已完成分析 · 私人记录不出设备'}</span>
          </div>
          <blockquote>{voiceRecord.analysis.response}</blockquote>
          <div className="voice-state-cube">
            <article><small>能量</small><strong>{voiceRecord.analysis.energy}<em>/5</em></strong></article>
            <article><small>清晰</small><strong>{voiceRecord.analysis.clarity}<em>/5</em></strong></article>
            <article><small>压力</small><strong>{voiceRecord.analysis.pressure}<em>/5</em></strong></article>
          </div>
          <div className="voice-evidence">
            <p>我参考了什么</p>
            <div>{[...voiceRecord.analysis.keywords.map((keyword) => `内容 · ${keyword}`), ...voiceRecord.analysis.deliverySignals].map((signal) => <span key={signal}>{signal}</span>)}</div>
            <small>{voiceRecord.analysis.acousticNote}。这些是可校准线索，不是医学或心理诊断。</small>
          </div>
          <div className="voice-calibration">
            <p>这个判断接近真实的你吗？</p>
            <div>
              <button className={voiceRecord.calibration === -1 ? 'active' : ''} onClick={() => calibrateVoiceRead(-1)}>我更平静</button>
              <button className={voiceRecord.calibration === 0 ? 'active' : ''} onClick={() => calibrateVoiceRead(0)}>比较接近</button>
              <button className={voiceRecord.calibration === 1 ? 'active' : ''} onClick={() => calibrateVoiceRead(1)}>我更紧绷</button>
            </div>
            {voiceCalibration && <span>{voiceCalibration}</span>}
          </div>
          <button className="voice-enter-coaching" onClick={() => livePlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <span><BrainCircuit size={18} /></span><div><small>带着这份真实状态</small><strong>进入下一步调试</strong></div><ArrowRight size={17} />
          </button>
          <button className="voice-record-again" onClick={startVoiceJournal}><Mic size={14} />再记录一段</button>
        </section>
      )}

      {(started || voiceRecord) && <section className={`coach-presence ${started ? 'compact' : ''}`}>
        <div className="coach-presence-orb" aria-hidden="true"><i /><i /><span><Sparkles size={22} /></span></div>
        <div>
          <p>{started ? '我正在和你一起收窄问题' : '你不需要把问题说得完整'}</p>
          <h2>{started ? `当前更接近「${coachPlan.stateLabel}」` : '我在。先从最接近的感觉开始。'}</h2>
          <span>{buildCoachGreeting(snapshot)}</span>
        </div>
      </section>}

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
        <section ref={livePlanRef} className={`coach-live-plan ${coachPlan.isCrisis ? 'crisis' : ''}`}>
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

          <button className="coach-commitment" onClick={beginCoachPractice}>
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
            <button onClick={beginCoachPractice}><Play size={16} />进入实践</button>
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

      {voice.status === 'idle' && <footer className="coach-vnext-compose">
        <div className="coach-vnext-input">
          <MessageCircle size={17} />
          <input
            aria-label="告诉教练你现在怎么了"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            placeholder={started ? '继续说，我会沿着上一轮理解…' : '或者，直接说此刻最卡的事…'}
          />
          <VoiceInputButton value={input} onChange={setInput} label="用语音继续和教练说" />
        </div>
        <button onClick={() => sendMessage()} disabled={!input.trim() || thinkingStage !== null} aria-label="发送"><Send size={17} /></button>
        <div className="coach-privacy"><ShieldCheck size={12} /><span>对话与状态仅保存在当前设备</span></div>
      </footer>}
    </div>
  )
}
