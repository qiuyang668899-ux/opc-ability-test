import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  LockKeyhole,
  Mic,
  PencilLine,
  RotateCcw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import {
  analyzeVoiceJournal,
  calibrateVoiceMemory,
  loadVoiceMemory,
  organizeVoiceDiary,
  polishVoiceTranscript,
  updateVoiceMemory,
  type VoiceJournalRecord,
  type VoiceMemory,
} from '../engines/voiceJournalEngine'
import { buildCoachSnapshot, createCoachPlan, refineCoachPlanWithAI, type CoachPlan } from '../engines/coachEngine'
import { activateRegulationJourney, buildRegulationJourney } from '../engines/stateOrchestrator'
import { loadState, recomputeUserState, saveState, saveStateBatch, type JournalEntry } from '../stores/useStore'
import { openVoiceCompanion, registerVoiceCompanion, type VoiceCompanionRequest } from './voiceCompanionBus'
import { hasHOSAIEndpoint, requestHOSCoachAnalysis } from '../services/aiCoachService'
import { loadVoiceDraft, saveVoiceDraft, voiceDraftUpdate } from '../engines/voiceDraftStore'

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

export default function VoiceCompanion() {
  const navigate = useNavigate()
  const {
    status: voiceStatus,
    transcript: voiceTranscript,
    interimTranscript: voiceInterimTranscript,
    elapsedSec: voiceElapsedSec,
    liveLevel: voiceLiveLevel,
    metrics: voiceMetrics,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
    useManualFallback: openManualFallback,
  } = useVoiceCapture()
  const [request, setRequest] = useState<VoiceCompanionRequest | null>(null)
  const [draft, setDraft] = useState('')
  const [record, setRecord] = useState<VoiceJournalRecord | null>(null)
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null)
  const [calibrationNote, setCalibrationNote] = useState('')
  const [autoFinalize, setAutoFinalize] = useState(false)
  const [intelligenceState, setIntelligenceState] = useState<'idle' | 'analyzing' | 'deepseek' | 'local'>('idle')
  const aiEnhanced = hasHOSAIEndpoint()
  const requestVersion = useRef(0)
  const saving = useRef(false)
  const analysisAbort = useRef<AbortController | null>(null)
  const [saveError, setSaveError] = useState('')
  const [recoveredDraft, setRecoveredDraft] = useState(false)

  const begin = useCallback((nextRequest: VoiceCompanionRequest) => {
    requestVersion.current += 1
    analysisAbort.current?.abort()
    saving.current = false
    setSaveError('')
    setRequest(nextRequest)
    const stored = loadVoiceDraft(nextRequest.context)
    setDraft(stored?.text ?? '')
    setRecoveredDraft(Boolean(stored?.text))
    setRecord(null)
    setCoachPlan(null)
    setCalibrationNote('')
    setAutoFinalize(false)
    setIntelligenceState('idle')
    if (stored?.text) openManualFallback()
    else void startVoice()
  }, [openManualFallback, startVoice])

  useEffect(() => registerVoiceCompanion(begin), [begin])

  const close = () => {
    requestVersion.current += 1
    analysisAbort.current?.abort()
    const currentDraft = ['listening', 'finalizing'].includes(voiceStatus) ? `${voiceTranscript}${voiceInterimTranscript}`.trim() || draft : draft
    if (!record && request && currentDraft.trim()) saveVoiceDraft(request.context, currentDraft)
    resetVoice()
    setRequest(null)
    setDraft('')
    setRecord(null)
    setCoachPlan(null)
    setAutoFinalize(false)
    setIntelligenceState('idle')
  }

  const stopListening = () => {
    setAutoFinalize(true)
    stopVoice()
  }

  useEffect(() => {
    if (!request || record) return
    const heard = polishVoiceTranscript(`${voiceTranscript}${voiceInterimTranscript}`)
    if (heard) setDraft(heard)
  }, [record, request, voiceInterimTranscript, voiceTranscript])

  useEffect(() => {
    if (!request || record || !draft.trim()) return
    const timer = window.setTimeout(() => saveVoiceDraft(request.context, draft), 400)
    return () => window.clearTimeout(timer)
  }, [draft, record, request])

  const saveAndAnalyze = useCallback((override?: string) => {
    if (!request || saving.current) return
    const transcript = polishVoiceTranscript(override ?? draft)
    if (!transcript) return
    saving.current = true
    const version = requestVersion.current
    const rawHeard = `${voiceTranscript}${voiceInterimTranscript}`.trim() || (override ?? draft).trim()
    if (request.mode === 'dictation') {
      const entry: JournalEntry = {
        id: `dictation-${crypto.randomUUID()}`, timestamp: Date.now(),
        trigger: `语音碎片 · ${request.context}`, oldPattern: transcript,
        newResponse: '', somatic: '', distortion: '', source: 'voice',
        organizedText: transcript, rawFragment: rawHeard,
        analysis: '这是填写当前表单时留下的表达，没有据此推断或修改你的今日状态。',
      }
      if (!saveStateBatch({ journal: [entry, ...loadState<JournalEntry[]>('journal', [])], ...voiceDraftUpdate(request.context, null) })) {
        saving.current = false
        setAutoFinalize(false)
        setSaveError('未能保存。文字仍在，请复制备份后重试。')
        return
      }
      resetVoice()
      setRequest(null)
      setDraft('')
      setAutoFinalize(false)
      request.onComplete?.(transcript)
      window.dispatchEvent(new CustomEvent('hos:data-updated'))
      return
    }
    const memory = loadVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', undefined))
    const analysis = analyzeVoiceJournal(transcript, voiceMetrics, memory)
    const now = Date.now()
    const inferredCheckIn = {
      date: todayKey(),
      energy: analysis.energy,
      clarity: analysis.clarity,
      pressure: analysis.pressure,
      intention: analysis.summary,
      createdAt: now,
      source: 'voice' as const,
      confidence: analysis.confidence,
    }
    const snapshot = buildCoachSnapshot()
    const plan = createCoachPlan(transcript, { ...snapshot, checkIn: inferredCheckIn })
    const journey = buildRegulationJourney(analysis, plan)
    const organizedText = organizeVoiceDiary(analysis, plan.commitment)
    const nextRecord: VoiceJournalRecord = {
      id: `vj-${now}`,
      timestamp: now,
      date: inferredCheckIn.date,
      rawTranscript: rawHeard,
      transcript,
      metrics: voiceMetrics,
      analysis,
      coachMode: plan.mode,
      commitment: plan.commitment,
      organizedText,
      journey,
      intelligence: 'local',
      context: request.context,
    }
    const voiceRecords = loadState<VoiceJournalRecord[]>('voiceJournal', [])
    const nextMemory = updateVoiceMemory(memory, nextRecord)

    const journal = loadState<JournalEntry[]>('journal', [])
    const journalEntry: JournalEntry = {
      id: `j-${now}`,
      timestamp: now,
      trigger: `语音日记 · ${analysis.stateLabel}`,
      oldPattern: transcript,
      newResponse: plan.commitment,
      somatic: analysis.deliverySignals.join(' · '),
      distortion: '',
      analysis: `${analysis.response}\n\n这些是可校准的自我觉察线索，不是医学或心理诊断。`,
      source: 'voice',
      voiceRecordId: nextRecord.id,
      voiceSignals: analysis.deliverySignals,
      organizedText,
      rawFragment: rawHeard,
      regulationPath: journey.steps.map((step) => step.title),
    }
    const currentCheckIn = snapshot.checkIn
    if (!saveStateBatch({ voiceJournal: [nextRecord, ...voiceRecords], voiceMemory: nextMemory, dailyCheckIn: currentCheckIn && currentCheckIn.source !== 'voice' ? currentCheckIn : inferredCheckIn, journal: [journalEntry, ...journal], ...voiceDraftUpdate(request.context, null) })) {
      saving.current = false
      setAutoFinalize(false)
      setSaveError('还没有保存成功。文字仍在这里，请先复制备份，检查设备空间后重试。')
      return
    }
    setSaveError('')
    recomputeUserState()
    request.onComplete?.(transcript, nextRecord)
    setRecord(nextRecord)
    setCoachPlan(plan)
    setIntelligenceState(aiEnhanced && !plan.isCrisis ? 'analyzing' : 'local')
    setAutoFinalize(false)
    resetVoice()
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
    navigator.vibrate?.([20, 28, 44])

    if (!aiEnhanced || plan.isCrisis) return
    analysisAbort.current = new AbortController()

    void requestHOSCoachAnalysis({ text: transcript, source: 'voice', snapshot: { ...snapshot, checkIn: inferredCheckIn }, signal: analysisAbort.current.signal })
      .then((insight) => {
        if (version !== requestVersion.current) return
        const refinedPlan = refineCoachPlanWithAI(plan, insight)
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
          ...nextRecord,
          analysis: refinedAnalysis,
          coachMode: refinedPlan.mode,
          commitment: refinedPlan.commitment,
          organizedText: refinedOrganizedText,
          journey: refinedJourney,
          intelligence: 'deepseek',
        }
        const currentRecords = loadState<VoiceJournalRecord[]>('voiceJournal', [])
        const currentJournal = loadState<JournalEntry[]>('journal', [])
        if (!currentRecords.some((item) => item.id === refinedRecord.id)) return
        const saved = saveStateBatch({ voiceJournal: currentRecords.map((item) => item.id === refinedRecord.id ? refinedRecord : item), journal: currentJournal.map((entry) => entry.voiceRecordId === refinedRecord.id
          ? {
              ...entry,
              trigger: `语音日记 · ${refinedAnalysis.stateLabel}`,
              newResponse: refinedPlan.commitment,
              analysis: `${refinedAnalysis.response}\n\n这些是可校准的自我觉察线索，不是医学或心理诊断。`,
              organizedText: refinedOrganizedText,
              regulationPath: refinedJourney.steps.map((step) => step.title),
            }
          : entry) })
        if (!saved) { setIntelligenceState('local'); setSaveError('已保留本机记录；云端补充未能保存。'); return }
        if (version === requestVersion.current) {
          setRecord((current) => current?.id === refinedRecord.id ? refinedRecord : current)
          setCoachPlan(refinedPlan)
          setIntelligenceState('deepseek')
        }
        recomputeUserState()
        window.dispatchEvent(new CustomEvent('hos:data-updated'))
      })
      .catch(() => { if (version === requestVersion.current) { setIntelligenceState('local'); setSaveError('云端暂时未响应。日记已安全保存在本机，可以直接开始本机建议。') } })
  }, [aiEnhanced, draft, request, resetVoice, voiceInterimTranscript, voiceMetrics, voiceTranscript])

  useEffect(() => {
    if (voiceStatus !== 'review') return undefined
    const heard = `${voiceTranscript}${voiceInterimTranscript}`
    const cleaned = polishVoiceTranscript(autoFinalize ? heard : draft) || polishVoiceTranscript(draft) || heard.trim()
    const timer = window.setTimeout(() => {
      if (cleaned) setDraft(cleaned)
      if (autoFinalize && cleaned) saveAndAnalyze(cleaned)
      else if (autoFinalize) {
        setAutoFinalize(false)
        openManualFallback()
      }
    }, autoFinalize && cleaned ? 260 : autoFinalize ? 2400 : 0)
    return () => window.clearTimeout(timer)
  }, [autoFinalize, draft, openManualFallback, saveAndAnalyze, voiceInterimTranscript, voiceStatus, voiceTranscript])

  const calibrate = (value: -1 | 0 | 1) => {
    if (!record) return
    const records = loadState<VoiceJournalRecord[]>('voiceJournal', [])
    saveState('voiceJournal', records.map((item) => item.id === record.id ? { ...item, calibration: value } : item))
    const memory = calibrateVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', undefined), value)
    saveState('voiceMemory', memory)
    setRecord({ ...record, calibration: value })
    setCalibrationNote(value === 0 ? '已确认这次判断' : '已校准，下一次会更贴近你')
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
  }

  const openEverywhere = () => openVoiceCompanion({ context: '随时记录 · 此刻的我' })

  const beginJourney = () => {
    if (!record?.journey) return
    const firstStep = record.journey.steps[0]
    activateRegulationJourney(record.journey)
    close()
    navigate(firstStep.route)
  }

  return (
    <>
      <button className="voice-companion-fab" onClick={openEverywhere} aria-label="随时用语音记录">
        <span><Mic size={19} /></span><small>说说</small>
      </button>

      {request && (
        <div className="voice-companion-layer" role="dialog" aria-modal="true" aria-label="HOS 语音陪伴" onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close() }
          if (event.key !== 'Tab') return
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input, summary')).filter((element) => element.offsetParent !== null)
          const first = controls[0]; const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }}>
          <button className="voice-companion-backdrop" onClick={close} aria-label="关闭语音陪伴" />
          <section className={`voice-companion-sheet ${record ? 'result' : voiceStatus}`}>
            <header className="voice-companion-header">
              <div><span><Sparkles size={16} /></span><div><p>HOS VOICE COMPANION</p><strong>我在，慢慢说</strong></div></div>
              <button onClick={close} aria-label="关闭"><X size={18} /></button>
            </header>
            {saveError && <p className="voice-save-error" role="alert">{saveError}</p>}

            {!record && voiceStatus === 'requesting' && (
              <div className="companion-permission"><span><Mic size={27} /></span><h2>正在打开倾听</h2><p>首次使用请允许麦克风。不会保存原始音频。</p><button onClick={openManualFallback}>也可以直接打字或用键盘话筒</button></div>
            )}

            {!record && voiceStatus === 'listening' && (
              <div className="companion-listening">
                <div className="companion-context"><span className="voice-live-dot" />{request.context}<time>{String(Math.floor(voiceElapsedSec / 60)).padStart(2, '0')}:{String(voiceElapsedSec % 60).padStart(2, '0')}</time></div>
                <div className="companion-orb" style={{ '--companion-level': `${Math.max(108, 108 + voiceLiveLevel * 0.62)}px` } as CSSProperties}><i /><span><Mic size={30} /></span></div>
                <h2>不用组织语言，我会先听完。</h2>
                <div className="companion-transcript" aria-live="polite">{voiceTranscript || voiceInterimTranscript ? <p>{voiceTranscript}<em>{voiceInterimTranscript}</em></p> : <span>可以从“我现在……”开始</span>}</div>
                {voiceError && <p className="voice-inline-error">{voiceError}</p>}
                <button className="companion-stop" onClick={stopListening}><Square size={15} />我说完了</button>
                <p className="companion-privacy"><LockKeyhole size={12} />HOS 不保存原始音频。浏览器可能联网转写；{aiEnhanced ? '文字会发送到已配置的 AI 服务分析。' : '文字分析在本机完成。'}</p>
                {voiceElapsedSec > 12 && !voiceTranscript && !voiceInterimTranscript && <button className="companion-open-journal" onClick={openManualFallback}>还没有文字？切换到键盘话筒输入</button>}
              </div>
            )}

            {!record && (voiceStatus === 'finalizing' || (voiceStatus === 'review' && autoFinalize)) && (
              <div className="companion-finalizing"><span><Sparkles size={27} /></span><h2>正在整理刚才的话</h2><p>我在等待浏览器交回最后一段文字，随后会自动分析并保存到个人日志。</p></div>
            )}

            {!record && voiceStatus === 'review' && !autoFinalize && (
              <div className="companion-review">
                <div className="companion-review-title"><span><PencilLine size={19} /></span><div><h2>{draft ? '确认一下我听到的内容' : '这次没有收到可用文字'}</h2><p>{draft ? '可以修正错字，再重新整理保存。' : '点下方输入框，再用手机键盘上的话筒补说一次；这次不会跳转页面。'}</p></div></div>
                <textarea autoFocus={!draft} value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} aria-label="语音转写内容" placeholder="点这里，再点手机键盘上的话筒继续说……" />
                <div className="companion-review-meta"><span>{Math.round(voiceMetrics.durationSec)} 秒</span><span>原始碎片会附在整理日记下方</span></div>
                <button className="companion-save" onClick={() => saveAndAnalyze()} disabled={!draft.trim()}><Save size={16} />整理并保存到日志</button>
              </div>
            )}

            {!record && voiceStatus === 'manual' && (
              <div className="companion-review companion-manual">
                <div className="companion-review-title"><span><Mic size={19} /></span><div><h2>{recoveredDraft ? '刚才的话还在，继续就好' : '用手机自带的话筒继续说'}</h2><p>{recoveredDraft ? '已恢复上次未保存的草稿。可以补充、修改，再整理归档。' : voiceError}</p></div></div>
                <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} aria-label="语音转写内容" placeholder="点这里，再点手机键盘上的话筒开始说……" />
                <div className="companion-review-meta"><span>仍在当前页面</span><span>完成后会归入个人档案</span></div>
                <button className="companion-save" onClick={() => saveAndAnalyze()} disabled={!draft.trim()}><Save size={16} />整理并保存到日志</button>
                {recoveredDraft && <button className="companion-open-journal" onClick={() => { if (!window.confirm('放弃这份未保存的草稿，重新开始录入？')) return; saveVoiceDraft(request.context, null); setDraft(''); setRecoveredDraft(false); void startVoice() }}>放弃草稿，重新说</button>}
              </div>
            )}

            {!record && voiceStatus === 'error' && (
              <div className="companion-error"><span><Mic size={25} /></span><h2>这次没有连接上麦克风</h2><p>{voiceError}</p><div><button onClick={() => void startVoice()}><RotateCcw size={15} />重新尝试</button><button onClick={openManualFallback}><PencilLine size={15} />用系统话筒输入</button></div></div>
            )}

            {record && coachPlan && (
              <div className="companion-result">
                <div className="companion-result-mark"><span><Check size={21} /></span><div><p>已自动归入个人档案</p><h2>我听见了，也替你整理好了。</h2></div></div>
                <div className={`companion-intelligence ${intelligenceState}`}>
                  <BrainCircuit size={14} />
                  <span>{intelligenceState === 'analyzing' ? '正在进行 DeepSeek 深层分析…' : intelligenceState === 'deepseek' ? 'DeepSeek 已完成深层理解与模块编排' : 'HOS 本机状态引擎已完成分析 · 无需上传私人记录'}</span>
                </div>
                <blockquote>{record.analysis.response}</blockquote>
                <div className="companion-state-row"><span>能量 <strong>{record.analysis.energy}/5</strong></span><span>清晰 <strong>{record.analysis.clarity}/5</strong></span><span>压力 <strong>{record.analysis.pressure}/5</strong></span></div>
                <article className="companion-diary-preview"><header><BookOpenText size={15} /><span>整理后的日记</span></header><p>{record.organizedText}</p><details><summary>查看原始表达碎片</summary><blockquote>{record.rawTranscript}</blockquote></details></article>
                {record.journey && (
                  <section className="companion-journey">
                    <header><span><Route size={16} /></span><div><small>HOS 主动调试路径</small><strong>我会一步步陪你调整</strong></div></header>
                    <p>{record.journey.rationale}</p>
                    <div>{record.journey.steps.map((step, index) => <article key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><small>{step.action} · {step.minutes} 分钟</small></div></article>)}</div>
                    <button onClick={beginJourney}>从第一步开始<ArrowRight size={15} /></button>
                  </section>
                )}
                <div className="companion-calibration"><p>这次判断接近真实的你吗？</p><div><button className={record.calibration === -1 ? 'active' : ''} onClick={() => calibrate(-1)}>我更平静</button><button className={record.calibration === 0 ? 'active' : ''} onClick={() => calibrate(0)}>比较接近</button><button className={record.calibration === 1 ? 'active' : ''} onClick={() => calibrate(1)}>我更紧绷</button></div>{calibrationNote && <span>{calibrationNote}</span>}</div>
                <button className="companion-next" onClick={close}><span><BrainCircuit size={17} /></span><div><small>此刻最小下一步</small><strong>{coachPlan.commitment}</strong></div><Check size={16} /></button>
                <button className="companion-open-journal" onClick={() => { close(); navigate('/journal') }}><ShieldCheck size={13} />打开个人日志档案<ArrowRight size={14} /></button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
