import { useState, useCallback, useEffect, useMemo } from 'react'
import { AudioLines, BookOpen, Plus, ChevronDown, Sparkles, FileText, Mic, ShieldCheck, Trash2, ArrowRight } from 'lucide-react'
import { type JournalEntry, DISTORTIONS, loadState, saveState, recomputeUserState } from '../stores/useStore'
import { UI } from '../utils/i18n'
import { loadVoiceMemory, rebuildVoiceMemory, voiceMemoryInsight, type VoiceJournalRecord, type VoiceMemory } from '../engines/voiceJournalEngine'
import VoiceInputButton from '../components/VoiceInputButton'
import { openVoiceCompanion } from '../components/voiceCompanionBus'

function analyzeEntry(entry: JournalEntry): string {
  const distortion = entry.distortion || '未指定'
  return `[内核诊断报告 / Kernel Diagnostic Report]

>> 触发 "${entry.trigger}" 激活了自动响应 "${entry.oldPattern}"。
   认知扭曲类型："${distortion}"

>> 新响应 "${entry.newResponse || '待定'}" 引入前额叶有意识参与，
   打断杏仁核自动回路。有效率：72%

>> 建议：触发时增加3次深呼吸缓冲区，为新神经回路激活创造空间。`
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadState('journal', []))
  const [voiceRecords, setVoiceRecords] = useState<VoiceJournalRecord[]>(() => loadState('voiceJournal', []))
  const [voiceMemory, setVoiceMemory] = useState<VoiceMemory>(() => loadVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', undefined)))
  const [filter, setFilter] = useState<'all' | 'voice' | 'manual'>('all')
  const [showForm, setShowForm] = useState(entries.length === 0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [trigger, setTrigger] = useState('')
  const [oldPattern, setOldPattern] = useState('')
  const [newResponse, setNewResponse] = useState('')
  const [somatic, setSomatic] = useState('')
  const [distortion, setDistortion] = useState('')

  const submitEntry = useCallback(() => {
    if (!trigger.trim() || !oldPattern.trim()) return
    const entry: JournalEntry = {
      id: `j-${Date.now()}`, timestamp: Date.now(),
      trigger: trigger.trim(), oldPattern: oldPattern.trim(),
      newResponse: newResponse.trim(), somatic: somatic.trim(), distortion,
    }
    entry.analysis = analyzeEntry(entry)
    const updated = [entry, ...entries]
    setEntries(updated)
    saveState('journal', updated)
    recomputeUserState()
    setTrigger(''); setOldPattern(''); setNewResponse(''); setSomatic(''); setDistortion('')
    setShowForm(false); setExpandedId(entry.id)
  }, [trigger, oldPattern, newResponse, somatic, distortion, entries])

  const filled = [trigger, oldPattern, newResponse, somatic, distortion].filter(Boolean).length
  const filteredEntries = useMemo(() => entries.filter((entry) => filter === 'all' || (filter === 'voice' ? entry.source === 'voice' : entry.source !== 'voice')), [entries, filter])
  const archiveDays = useMemo(() => new Set(entries.map((entry) => new Date(entry.timestamp).toLocaleDateString('en-CA'))).size, [entries])

  useEffect(() => {
    const refreshArchive = () => {
      setEntries(loadState('journal', []))
      setVoiceRecords(loadState('voiceJournal', []))
      setVoiceMemory(loadVoiceMemory(loadState<VoiceMemory | undefined>('voiceMemory', undefined)))
    }
    window.addEventListener('hos:data-updated', refreshArchive)
    return () => window.removeEventListener('hos:data-updated', refreshArchive)
  }, [])

  const deleteEntry = (entry: JournalEntry) => {
    if (!window.confirm('删除这条个人日志？此操作无法撤销。')) return
    const nextEntries = entries.filter((item) => item.id !== entry.id)
    setEntries(nextEntries)
    saveState('journal', nextEntries)
    if (entry.voiceRecordId) {
      const nextVoiceRecords = voiceRecords.filter((record) => record.id !== entry.voiceRecordId)
      const nextMemory = rebuildVoiceMemory(nextVoiceRecords)
      setVoiceRecords(nextVoiceRecords)
      setVoiceMemory(nextMemory)
      saveState('voiceJournal', nextVoiceRecords)
      saveState('voiceMemory', nextMemory)
    }
    recomputeUserState()
  }

  return (
    <div className="hos-page journal-page animate-float-up">
      <header className="journal-header">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="journal-mark"><BookOpen size={21} /></span>
          <div>
            <p className="section-kicker">PERSONAL MEMORY · LOCAL ONLY</p>
            <h1>个人日志档案</h1>
            <p>状态、表达与成长轨迹</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`journal-toggle ${showForm ? 'active rotate-45' : ''}`}
          aria-label={showForm ? '收起习惯重塑表单' : '新建习惯重塑记录'}
        >
          <Plus size={19} />
        </button>
      </header>

      <section className="journal-archive-hero">
        <header><div><p>YOUR LIVING ARCHIVE</p><h2>系统从真实记录中了解你</h2></div><span><ShieldCheck size={13} />仅本机</span></header>
        <p>{voiceMemoryInsight(voiceMemory)}</p>
        <div className="journal-archive-stats">
          <article><strong>{entries.length}</strong><span>全部记录</span></article>
          <article><strong>{voiceRecords.length}</strong><span>语音日记</span></article>
          <article><strong>{archiveDays}</strong><span>真实记录日</span></article>
        </div>
        <div className="journal-archive-topics"><span>持续出现的关注</span><div>{voiceMemory.recurringTopics.length ? voiceMemory.recurringTopics.slice(0, 4).map((topic) => <em key={topic.label}>{topic.label}<small>{topic.count}</small></em>) : <em>从第一次语音日记开始</em>}</div></div>
        <button onClick={() => openVoiceCompanion({ context: '个人档案 · 此刻状态' })}><span><Mic size={20} /></span><div><strong>记录此刻的我</strong><small>直接说，HOS 会倾听、整理并保存</small></div><ArrowRight size={16} /></button>
      </section>

      <div className="journal-filter" role="tablist" aria-label="日志类型">
        {([['all', '全部'], ['voice', '语音日记'], ['manual', '重塑记录']] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {showForm && (
        <section className="journal-form hos-card">
          <div className="journal-intro">
            <span>01</span>
            <div>
              <h2>把自动反应，写成可以调整的路径</h2>
              <p>不急着分析对错，先如实记录当时发生了什么。</p>
            </div>
          </div>

          <div className="journal-field">
            <label>
              <span><i>*</i>{UI.triggerEvent.zh}</span>
              <small>{UI.triggerEvent.en}</small>
            </label>
            <div className="voice-enabled-control">
              <input
                value={trigger}
                onChange={(event) => setTrigger(event.target.value)}
                placeholder='点话筒说，例如：“老板发来邮件时……”'
                className="journal-control"
              />
              <VoiceInputButton value={trigger} onChange={setTrigger} label="用语音记录触发事件" />
            </div>
          </div>

          <div className="journal-field">
            <label>
              <span><i className="orange">02</i>{UI.oldProgram.zh}</span>
              <small>Automatic response</small>
            </label>
            <div className="voice-enabled-control textarea">
              <textarea
                value={oldPattern}
                onChange={(event) => setOldPattern(event.target.value)}
                placeholder="点话筒说：这一刻，我自动出现了什么想法或行为？"
                rows={3}
                className="journal-control journal-textarea"
              />
              <VoiceInputButton value={oldPattern} onChange={setOldPattern} label="用语音记录自动反应" />
            </div>
          </div>

          <div className="journal-field">
            <label>
              <span><i className="sage">03</i>{UI.hosProtocol.zh}</span>
              <small>{UI.hosProtocol.en}</small>
            </label>
            <div className="voice-enabled-control textarea">
              <textarea
                value={newResponse}
                onChange={(event) => setNewResponse(event.target.value)}
                placeholder="点话筒说下一次想怎样回应"
                rows={3}
                className="journal-control journal-textarea"
              />
              <VoiceInputButton value={newResponse} onChange={setNewResponse} label="用语音记录新的回应" />
            </div>
          </div>

          <div className="journal-field">
            <label>
              <span>{UI.somaticMarker.zh}</span>
              <small>{UI.somaticMarker.en}</small>
            </label>
            <div className="voice-enabled-control">
              <input
                value={somatic}
                onChange={(event) => setSomatic(event.target.value)}
                placeholder="点话筒说身体哪里有感觉"
                className="journal-control"
              />
              <VoiceInputButton value={somatic} onChange={setSomatic} label="用语音记录身体感受" />
            </div>
          </div>

          <div className="journal-field">
            <label>
              <span>{UI.cogDistortion.zh}</span>
              <small>{UI.cogDistortion.en} · 可选</small>
            </label>
            <div className="journal-chips">
              {DISTORTIONS.map((item) => (
                <button
                  key={item.zh}
                  onClick={() => setDistortion(distortion === item.zh ? '' : item.zh)}
                  className={`journal-chip ${distortion === item.zh ? 'selected' : ''}`}
                >
                  {item.zh}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-progress">
            <div>
              <div
                className="transition-all duration-500"
                style={{ width: `${(filled / 5) * 100}%`, background: 'linear-gradient(90deg, var(--color-hos-purple), var(--color-hos-cyan))' }}
              />
            </div>
            <span>{filled}/5 已填写</span>
          </div>

          <button
            onClick={submitEntry}
            disabled={!trigger.trim() || !oldPattern.trim()}
            className="journal-submit"
          >
            <Sparkles size={17} />
            <span>{UI.rewriteMode.zh} / {UI.rewriteMode.en}</span>
          </button>
        </section>
      )}

      {filteredEntries.length === 0 && !showForm && (
        <div className="text-center py-16">
          <FileText size={36} className="mx-auto mb-3 text-hos-text-muted opacity-30" />
          <p className="text-[13px] text-hos-text-dim">这个分类还没有记录</p>
          <p className="text-en mt-1">Your archive will grow with you</p>
        </div>
      )}

      <div className="journal-entries">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="journal-entry hos-card overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-5 py-4 flex items-center gap-3.5 text-left"
            >
              <div className="w-[3px] h-9 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, var(--color-hos-purple), var(--color-hos-cyan))' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-hos-text truncate flex items-center gap-1.5">{entry.source === 'voice' && <Mic size={12} />}{entry.trigger}</p>
                <p className="text-[10.5px] text-hos-text-muted mt-1">{new Date(entry.timestamp).toLocaleString('zh-CN')}</p>
              </div>
              {entry.distortion && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-hos-purple/12 text-hos-purple border border-hos-purple/15 flex-shrink-0">{entry.distortion}</span>
              )}
              <ChevronDown size={14} className={`text-hos-text-muted transition-transform flex-shrink-0 ${expandedId === entry.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === entry.id && (
              <div className="px-5 pb-5 space-y-3 border-t border-hos-border/50 pt-4">
                {entry.source === 'voice' && (entry.organizedText || entry.rawFragment) ? (
                  <div className="voice-archive-content">
                    <p className="voice-archive-label"><BookOpen size={12} />整理后的日记</p>
                    <p className="voice-organized-copy">{entry.organizedText || entry.oldPattern}</p>
                    <details><summary>查看原始表达碎片</summary><blockquote>{entry.rawFragment || entry.oldPattern}</blockquote></details>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-hos-orange font-medium">{entry.source === 'voice' ? '你当时说' : UI.oldProgram.zh}</p>
                    <p className="text-[12px] text-hos-text mt-1 leading-relaxed">{entry.oldPattern}</p>
                  </div>
                )}
                {entry.source === 'voice' && entry.voiceSignals && (
                  <div className="voice-journal-signals"><p><AudioLines size={12} />表达线索</p><div>{entry.voiceSignals.map((signal) => <span key={signal}>{signal}</span>)}</div></div>
                )}
                {entry.newResponse && (
                  <div>
                    <p className="text-[10px] text-hos-cyan font-medium">{entry.source === 'voice' ? '下一步调试' : UI.hosProtocol.zh}</p>
                    <p className="text-[12px] text-hos-text mt-1 leading-relaxed">{entry.newResponse}</p>
                  </div>
                )}
                {entry.somatic && <p className="text-[10px] text-hos-text-muted">{UI.somaticMarker.zh}: {entry.somatic}</p>}
                {entry.analysis && (
                  <div className="mt-2 p-4 rounded-xl bg-hos-bg/70 border border-hos-border/40">
                    <pre className="whitespace-pre-wrap text-[11px] text-hos-text-dim leading-[1.8] font-sans">{entry.analysis}</pre>
                  </div>
                )}
                <button className="journal-delete" onClick={() => deleteEntry(entry)}><Trash2 size={13} />删除这条记录</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
