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
    <div className="px-5 pt-6 pb-6 animate-float-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <BookOpen size={18} className="text-hos-purple" />
          <div>
            <h1 className="text-[15px] font-bold text-white">{UI.habitRemodel.zh}</h1>
            <p className="text-en">{UI.habitRemodel.en} · {UI.fastIntervention.en}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
            showForm ? 'border-hos-purple bg-hos-purple/15 text-hos-purple rotate-45' : 'border-hos-border text-hos-text-dim hover:border-hos-purple/30'
          }`}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="space-y-3 mb-6">
          {/* Trigger */}
          <div>
            <label className="text-[11px] text-hos-text-dim mb-1.5 block">
              <span className="text-hos-red mr-1">*</span>{UI.triggerEvent.zh} / {UI.triggerEvent.en}
            </label>
            <input
              value={trigger} onChange={(e) => setTrigger(e.target.value)}
              placeholder='例如："老板发来邮件，感到无聊"'
              className="w-full bg-hos-card border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-purple/40 text-white placeholder-hos-text-muted transition-colors"
            />
          </div>

          {/* Old Pattern */}
          <div>
            <label className="text-[11px] text-hos-text-dim mb-1.5 block">
              <span className="text-hos-orange mr-1">⚡</span>{UI.oldProgram.zh}
            </label>
            <textarea
              value={oldPattern} onChange={(e) => setOldPattern(e.target.value)}
              placeholder="描述这一刻你的自动想法或行为..."
              rows={2}
              className="w-full bg-hos-card border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-orange/40 text-white placeholder-hos-text-muted resize-none transition-colors"
            />
          </div>

          {/* HOS Protocol */}
          <div>
            <label className="text-[11px] text-hos-text-dim mb-1.5 block">
              <span className="text-hos-cyan mr-1">⚡</span>{UI.hosProtocol.zh} / {UI.hosProtocol.en}
            </label>
            <textarea
              value={newResponse} onChange={(e) => setNewResponse(e.target.value)}
              placeholder="例如：觉察呼吸3次，然后打开邮件"
              rows={2}
              className="w-full bg-hos-card border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-cyan/40 text-white placeholder-hos-text-muted resize-none transition-colors"
            />
          </div>

          {/* Somatic */}
          <div>
            <label className="text-[11px] text-hos-text-dim mb-1.5 block">{UI.somaticMarker.zh} / {UI.somaticMarker.en}</label>
            <input
              value={somatic} onChange={(e) => setSomatic(e.target.value)}
              placeholder="身体哪里有感觉？（胸闷、肩颈紧张...）"
              className="w-full bg-hos-card border border-hos-border rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-hos-border-light text-white placeholder-hos-text-muted transition-colors"
            />
          </div>

          {/* Distortion */}
          <div>
            <label className="text-[11px] text-hos-text-dim mb-1.5 block">{UI.cogDistortion.zh} / {UI.cogDistortion.en}</label>
            <div className="flex flex-wrap gap-1.5">
              {DISTORTIONS.map((d) => (
                <button
                  key={d.zh}
                  onClick={() => setDistortion(distortion === d.zh ? '' : d.zh)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                    distortion === d.zh
                      ? 'border-hos-purple/50 bg-hos-purple/15 text-hos-purple'
                      : 'border-hos-border text-hos-text-muted hover:border-hos-border-light hover:text-hos-text-dim'
                  }`}
                >
                  {d.zh}
                </button>
              ))}
            </div>
          </div>

          {/* Progress + Submit */}
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
            onClick={submitEntry}
            disabled={!trigger.trim() || !oldPattern.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-20 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.8), rgba(0,212,245,0.8))' }}
          >
            <Sparkles size={15} />
            <span>{UI.rewriteMode.zh} / {UI.rewriteMode.en}</span>
          </button>
        </div>
      )}

      {/* Entry List */}
      {entries.length === 0 && !showForm && (
        <div className="text-center py-16">
          <FileText size={36} className="mx-auto mb-3 text-hos-text-muted opacity-30" />
          <p className="text-[13px] text-hos-text-dim">还没有日志记录</p>
          <p className="text-en mt-1">No journal entries yet</p>
        </div>
      )}

      <div className="space-y-2.5">
        {entries.map((entry) => (
          <div key={entry.id} className="hos-card overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
            >
              <div className="w-[3px] h-7 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, var(--color-hos-purple), var(--color-hos-cyan))' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{entry.trigger}</p>
                <p className="text-[10px] text-hos-text-muted">{new Date(entry.timestamp).toLocaleString('zh-CN')}</p>
              </div>
              {entry.distortion && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-hos-purple/12 text-hos-purple border border-hos-purple/15 flex-shrink-0">{entry.distortion}</span>
              )}
              <ChevronDown size={14} className={`text-hos-text-muted transition-transform flex-shrink-0 ${expandedId === entry.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === entry.id && (
              <div className="px-4 pb-4 space-y-2 border-t border-hos-border/50 pt-3">
                <div>
                  <p className="text-[10px] text-hos-orange font-medium">{UI.oldProgram.zh}</p>
                  <p className="text-[12px] text-hos-text mt-0.5">{entry.oldPattern}</p>
                </div>
                {entry.newResponse && (
                  <div>
                    <p className="text-[10px] text-hos-cyan font-medium">{UI.hosProtocol.zh}</p>
                    <p className="text-[12px] text-hos-text mt-0.5">{entry.newResponse}</p>
                  </div>
                )}
                {entry.somatic && (
                  <p className="text-[10px] text-hos-text-muted">{UI.somaticMarker.zh}: {entry.somatic}</p>
                )}
                {entry.analysis && (
                  <div className="mt-2 p-3 rounded-lg bg-hos-bg/70 border border-hos-border/40">
                    <pre className="whitespace-pre-wrap text-[11px] text-hos-text-dim leading-relaxed font-sans">{entry.analysis}</pre>
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
