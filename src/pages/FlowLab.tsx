import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Focus, Pause, Play, RotateCcw, Save, TimerReset } from 'lucide-react'
import { loadState, recomputeUserState, saveStateBatch, type FlowSession, type JournalEntry } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'
import { usePracticeTimer } from '../hooks/usePracticeTimer'
import PracticeFeeling from '../components/PracticeFeeling'
import PracticeTimerSupport from '../components/PracticeTimerSupport'
import { appendPracticeOutcome } from '../engines/practiceOutcomeEngine'

const stages = [
  {
    title: '分解',
    en: 'Decompose',
    detail: '把技能拆成 4 个动作帧或认知步骤，只保留真实关键节点。',
  },
  {
    title: '心象',
    en: 'Rehearse',
    detail: '闭眼慢速模拟 3 轮，让大脑先看到正确路径。',
  },
  {
    title: '闭环',
    en: 'Loop',
    detail: '实体练习一个最小闭环，不追求完整，只追求反馈。',
  },
  {
    title: '固化',
    en: 'Consolidate',
    detail: '记录一个反馈，睡前再模拟一次，交给睡眠巩固。',
  },
]

export default function FlowLab() {
  const [sessions, setSessions] = useState<FlowSession[]>(() => loadState('flowSessions', []))
  const [skill, setSkill] = useState('')
  const [target, setTarget] = useState('')
  const [keyNode, setKeyNode] = useState('')
  const [rehearsal, setRehearsal] = useState('')
  const [practiceMinutes, setPracticeMinutes] = useState(15)
  const [feedback, setFeedback] = useState('')
  const timer = usePracticeTimer([practiceMinutes * 60], true, false)
  const { remaining, running } = timer.session
  const actualSeconds = timer.session.spent[0]
  const [beforeFeeling, setBeforeFeeling] = useState<number | null>(null)
  const [afterFeeling, setAfterFeeling] = useState<number | null>(null)
  const [savedMessage, setSavedMessage] = useState('')

  const filled = useMemo(() => [skill, target, keyNode, rehearsal, feedback].filter(Boolean).length, [skill, target, keyNode, rehearsal, feedback])

  const startTimer = () => {
    setSavedMessage('')
    if (timer.session.complete) timer.startFor([practiceMinutes * 60])
    else timer.toggle()
  }

  const resetTimer = () => {
    timer.reset()
  }

  const saveSession = () => {
    if (!skill.trim() || !target.trim() || !keyNode.trim() || running) return
    const session: FlowSession = {
      id: `flow-${Date.now()}`,
      timestamp: Date.now(),
      skill: skill.trim(),
      target: target.trim(),
      keyNode: keyNode.trim(),
      rehearsal: rehearsal.trim(),
      practiceMinutes: Math.floor(actualSeconds / 60),
      actualSeconds,
      feedback: feedback.trim(),
    }
    const updated = [session, ...sessions]
    const journalEntry: JournalEntry = { id: session.id, practiceOutcomeId: session.id, timestamp: session.timestamp, trigger: `专注练习 · ${session.skill}`, oldPattern: session.target, newResponse: session.keyNode, somatic: '', distortion: '', source: 'manual', organizedText: `本次目标：${session.target}。实际练习 ${actualSeconds} 秒。${feedback.trim() || '尚未补充感受。'}`, rawFragment: feedback.trim(), analysis: beforeFeeling !== null && afterFeeling !== null ? `舒适度自评 ${beforeFeeling} → ${afterFeeling}/5。` : '本次未完成前后自评。' }
    const values = { flowSessions: updated, ...(actualSeconds > 0 ? { journal: [journalEntry, ...loadState<JournalEntry[]>('journal', [])].slice(0, 500), practiceOutcomes: appendPracticeOutcome({ id: session.id, title: '专注 · 最小行动', route: '/flow', completedAt: session.timestamp, seconds: actualSeconds, before: beforeFeeling, after: afterFeeling, note: feedback.trim() }) } : {}) }
    if (!saveStateBatch(values)) { setSavedMessage('还没有保存成功，请先复制内容，检查存储空间后重试。'); return }
    setSessions(updated)
    recomputeUserState()
    setTarget('')
    setKeyNode('')
    setRehearsal('')
    setFeedback('')
    resetTimer()
    setBeforeFeeling(null)
    setAfterFeeling(null)
    setSavedMessage(actualSeconds > 0 ? '实际练习与反馈已归档。回首页可查看今日闭环。' : '已保存为练习计划，尚未计入完成次数。')
    window.dispatchEvent(new CustomEvent('hos:data-updated'))
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')

  return (
    <div className="hos-page animate-float-up">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Focus size={18} className="text-hos-purple" />
          <span className="text-[11px] text-hos-purple font-mono tracking-wider">FLOW LEARNING CABIN</span>
        </div>
        <h1 className="text-[24px] font-bold text-hos-text leading-tight">心流学习舱</h1>
        <p className="text-en mt-1">Skill compression through deliberate loops</p>
      </div>

      <section className="hos-card-accent p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-hos-cyan font-mono mb-1">NEO PROTOCOL · 现实版</p>
            <p className="text-[13px] text-hos-text leading-relaxed">
              不是把技能瞬间灌进大脑，而是用 AI 时代的方式压缩学习：拆解关键节点、心象预演、最小闭环、即时反馈、睡眠巩固。
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border border-hos-purple/25 bg-hos-purple/10 flex items-center justify-center text-hos-purple">
            <TimerReset size={24} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {stages.map((stage, index) => (
          <div key={stage.title} className="hos-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-hos-purple/12 border border-hos-purple/20 text-hos-purple text-[11px] font-mono flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-hos-text">{stage.title}</p>
                <p className="text-en">{stage.en}</p>
              </div>
            </div>
            <p className="text-[11px] text-hos-text-dim leading-relaxed">{stage.detail}</p>
          </div>
        ))}
      </div>

      <section className="hos-card p-4 mb-4 space-y-3">
        <div>
          <label className="text-[11px] text-hos-text-dim mb-1.5 block">要训练的技能 / Skill</label>
          <div className="voice-enabled-control"><input
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
              placeholder="点话筒，说出要训练的技能"
              className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-purple/40 text-hos-text placeholder-hos-text-muted transition-colors"
            /><VoiceInputButton value={skill} onChange={setSkill} label="用语音说出训练技能" /></div>
        </div>

        <div>
          <label className="text-[11px] text-hos-text-dim mb-1.5 block">本轮唯一目标 / One Target</label>
          <div className="voice-enabled-control"><input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="点话筒，说出本轮唯一目标"
              className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-cyan/40 text-hos-text placeholder-hos-text-muted transition-colors"
            /><VoiceInputButton value={target} onChange={setTarget} label="用语音说出本轮目标" /></div>
        </div>

        <div>
          <label className="text-[11px] text-hos-text-dim mb-1.5 block">关键节点 / Key Node</label>
          <div className="voice-enabled-control textarea"><textarea
              value={keyNode}
              onChange={(event) => setKeyNode(event.target.value)}
              rows={2}
              placeholder="点话筒，说出最重要的一帧"
              className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-orange/40 text-hos-text placeholder-hos-text-muted resize-none transition-colors"
            /><VoiceInputButton value={keyNode} onChange={setKeyNode} label="用语音说出关键节点" /></div>
        </div>

        <div>
          <label className="text-[11px] text-hos-text-dim mb-1.5 block">心象模拟 / Mental Rehearsal</label>
          <div className="voice-enabled-control textarea"><textarea
              value={rehearsal}
              onChange={(event) => setRehearsal(event.target.value)}
              rows={2}
              placeholder="点话筒，说出你想看到的画面"
              className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-green/40 text-hos-text placeholder-hos-text-muted resize-none transition-colors"
            /><VoiceInputButton value={rehearsal} onChange={setRehearsal} label="用语音描述心象模拟" /></div>
        </div>

        <div className="rounded-2xl border border-hos-border bg-hos-bg/60 p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-hos-text-dim">最小闭环计时 / Practice Loop</p>
              <p className="text-[24px] font-mono font-bold text-hos-text mt-1">
                {`${minutes}:${seconds}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end max-w-[210px]">
              {[2, 5, 15, 25, 45, 90].map((item) => (
                <button
                  key={item}
                  disabled={running}
                  onClick={() => { setPracticeMinutes(item); timer.resetFor([item * 60]) }}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors ${
                    practiceMinutes === item
                      ? 'border-hos-cyan/45 bg-hos-cyan/12 text-hos-cyan'
                      : 'border-hos-border text-hos-text-muted hover:border-hos-border-light'
                  }`}
                >
                  {item}m
                </button>
              ))}
            </div>
          </div>
          {actualSeconds === 0 && !running && <PracticeFeeling value={beforeFeeling} onChange={setBeforeFeeling} phase="before" />}
          <div className="flex gap-2">
            <button
              onClick={startTimer}
              className="flex-1 rounded-xl bg-hos-purple/15 border border-hos-purple/25 text-hos-purple px-4 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-35 active:scale-[0.98] transition-all"
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? '暂停练习' : actualSeconds > 0 && !timer.session.complete ? '继续练习' : '开始练习'}
            </button>
            <button
              onClick={resetTimer}
              aria-label="重置本次练习计时"
              className="w-11 rounded-xl border border-hos-border text-hos-text-muted flex items-center justify-center hover:border-hos-border-light hover:text-hos-text transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <PracticeTimerSupport running={running} audioReady={timer.audioReady} />
        </div>

        {actualSeconds > 0 && !running && <PracticeFeeling value={afterFeeling} onChange={setAfterFeeling} phase="after" />}

        <div>
          <label className="text-[11px] text-hos-text-dim mb-1.5 block">反馈固化 / Feedback</label>
          <div className="voice-enabled-control textarea"><textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={2}
              placeholder="点话筒，说出这一轮的发现"
              className="w-full bg-hos-bg/70 border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-cyan/40 text-hos-text placeholder-hos-text-muted resize-none transition-colors"
            /><VoiceInputButton value={feedback} onChange={setFeedback} label="用语音记录训练反馈" /></div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-[3px] bg-hos-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(filled / 5) * 100}%`, background: 'linear-gradient(90deg, var(--color-hos-purple), var(--color-hos-cyan))' }}
            />
          </div>
          <span className="text-[11px] text-hos-text-muted font-mono">{filled}/5</span>
        </div>

        <button
          onClick={saveSession}
          disabled={!skill.trim() || !target.trim() || !keyNode.trim() || running}
          className="w-full rounded-xl px-4 py-3 text-[#fffdf9] font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-25 active:scale-[0.97] transition-all"
          style={{ background: 'linear-gradient(135deg, var(--color-hos-purple), var(--color-hos-cyan))' }}
        >
          <Save size={15} />
          {running ? '先暂停，再保存实际练习' : actualSeconds > 0 ? '保存真实练习与反馈' : '保存练习计划'}
        </button>
        {savedMessage && <p role="status" className="text-sm text-hos-cyan leading-relaxed">{savedMessage}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[12px] font-semibold text-hos-text">训练记录</p>
          <span className="text-[10px] text-hos-text-muted font-mono">{sessions.length} loops</span>
        </div>
        {sessions.length === 0 ? (
          <div className="hos-card p-6 text-center">
            <Clock size={28} className="mx-auto text-hos-text-muted opacity-40 mb-2" />
            <p className="text-[13px] text-hos-text-dim">还没有心流训练记录</p>
            <p className="text-en mt-1">No flow loops saved yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session) => (
              <article key={session.id} className="hos-card p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={17} className="text-hos-green mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-hos-text truncate">{session.skill}</h3>
                      <span className="text-[10px] text-hos-text-muted font-mono whitespace-nowrap">{session.actualSeconds === 0 ? '计划' : `${session.practiceMinutes}m`}</span>
                    </div>
                    <p className="text-[12px] text-hos-text-dim mt-1 leading-relaxed">{session.target}</p>
                    <p className="text-[11px] text-hos-cyan mt-2">关键节点：{session.keyNode}</p>
                    {session.feedback && (
                      <p className="text-[11px] text-hos-text-muted mt-2 leading-relaxed">反馈：{session.feedback}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
