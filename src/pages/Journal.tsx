import { useState, useCallback } from 'react'
import { BookOpen, Plus, ChevronDown, Sparkles, FileText } from 'lucide-react'
import { type JournalEntry, DISTORTIONS, loadState, saveState, recomputeUserState } from '../stores/useStore'
import { UI } from '../utils/i18n'

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

  return (
    <div className="hos-page journal-page animate-float-up">
      <header className="journal-header">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="journal-mark"><BookOpen size={21} /></span>
          <div>
            <p className="section-kicker">REFLECT · REWRITE · PRACTICE</p>
            <h1>{UI.habitRemodel.zh}</h1>
            <p>{UI.habitRemodel.en} · {UI.fastIntervention.en}</p>
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
            <input
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder='例如：“老板发来邮件时，我立刻感到紧张”'
              className="journal-control"
            />
          </div>

          <div className="journal-field">
            <label>
              <span><i className="orange">02</i>{UI.oldProgram.zh}</span>
              <small>Automatic response</small>
            </label>
            <textarea
              value={oldPattern}
              onChange={(event) => setOldPattern(event.target.value)}
              placeholder="这一刻，我脑中自动出现了什么想法或行为？"
              rows={3}
              className="journal-control journal-textarea"
            />
          </div>

          <div className="journal-field">
            <label>
              <span><i className="sage">03</i>{UI.hosProtocol.zh}</span>
              <small>{UI.hosProtocol.en}</small>
            </label>
            <textarea
              value={newResponse}
              onChange={(event) => setNewResponse(event.target.value)}
              placeholder="例如：先觉察呼吸 3 次，再打开邮件"
              rows={3}
              className="journal-control journal-textarea"
            />
          </div>

          <div className="journal-field">
            <label>
              <span>{UI.somaticMarker.zh}</span>
              <small>{UI.somaticMarker.en}</small>
            </label>
            <input
              value={somatic}
              onChange={(event) => setSomatic(event.target.value)}
              placeholder="身体哪里有感觉？（胸闷、肩颈紧张...）"
              className="journal-control"
            />
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

      {entries.length === 0 && !showForm && (
        <div className="text-center py-16">
          <FileText size={36} className="mx-auto mb-3 text-hos-text-muted opacity-30" />
          <p className="text-[13px] text-hos-text-dim">还没有日志记录</p>
          <p className="text-en mt-1">No journal entries yet</p>
        </div>
      )}

      <div className="journal-entries">
        {entries.map((entry) => (
          <div key={entry.id} className="journal-entry hos-card overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-5 py-4 flex items-center gap-3.5 text-left"
            >
              <div className="w-[3px] h-9 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, var(--color-hos-purple), var(--color-hos-cyan))' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white truncate">{entry.trigger}</p>
                <p className="text-[10.5px] text-hos-text-muted mt-1">{new Date(entry.timestamp).toLocaleString('zh-CN')}</p>
              </div>
              {entry.distortion && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-hos-purple/12 text-hos-purple border border-hos-purple/15 flex-shrink-0">{entry.distortion}</span>
              )}
              <ChevronDown size={14} className={`text-hos-text-muted transition-transform flex-shrink-0 ${expandedId === entry.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === entry.id && (
              <div className="px-5 pb-5 space-y-3 border-t border-hos-border/50 pt-4">
                <div>
                  <p className="text-[10px] text-hos-orange font-medium">{UI.oldProgram.zh}</p>
                  <p className="text-[12px] text-hos-text mt-1 leading-relaxed">{entry.oldPattern}</p>
                </div>
                {entry.newResponse && (
                  <div>
                    <p className="text-[10px] text-hos-cyan font-medium">{UI.hosProtocol.zh}</p>
                    <p className="text-[12px] text-hos-text mt-1 leading-relaxed">{entry.newResponse}</p>
                  </div>
                )}
                {entry.somatic && <p className="text-[10px] text-hos-text-muted">{UI.somaticMarker.zh}: {entry.somatic}</p>}
                {entry.analysis && (
                  <div className="mt-2 p-4 rounded-xl bg-hos-bg/70 border border-hos-border/40">
                    <pre className="whitespace-pre-wrap text-[11px] text-hos-text-dim leading-[1.8] font-sans">{entry.analysis}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
