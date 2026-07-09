import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, CheckCircle2, Clock, FlaskConical, Shield, Zap } from 'lucide-react'
import { HOS_PROTOCOLS, type HOSProtocol } from '../stores/useStore'

const evidenceMeta: Record<HOSProtocol['evidence'], { color: string; label: string }> = {
  强证据: { color: 'text-hos-green border-hos-green/25 bg-hos-green/8', label: '强证据' },
  中证据: { color: 'text-hos-orange border-hos-orange/25 bg-hos-orange/8', label: '中证据' },
  体验探索: { color: 'text-hos-purple border-hos-purple/25 bg-hos-purple/8', label: '体验探索' },
}

export default function Protocols() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<HOSProtocol>(HOS_PROTOCOLS[0])

  return (
    <div className="hos-page animate-float-up">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-hos-green" />
          <span className="text-[11px] text-hos-green font-mono tracking-wider">PROTOCOL LIBRARY</span>
        </div>
        <h1 className="text-[24px] font-bold text-white leading-tight">HOS 协议库</h1>
        <p className="text-en mt-1">State-switching protocols for real moments</p>
      </div>

      <div className="rounded-2xl border border-hos-border bg-hos-card/50 p-3 mb-4">
        <p className="text-[11px] text-hos-text-dim leading-relaxed">
          协议库不是医学治疗工具，而是状态管理训练：用呼吸、语言、注意力和微行动，把自动反应切换为有意识响应。
        </p>
        <p className="text-en mt-1">
          This library trains state regulation through breath, language, attention, and micro-actions.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {HOS_PROTOCOLS.map((protocol) => {
          const isSelected = protocol.id === selected.id
          return (
            <button
              key={protocol.id}
              onClick={() => setSelected(protocol)}
              className={`min-w-[168px] rounded-2xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-hos-cyan/50 bg-hos-cyan/12'
                  : 'border-hos-border bg-hos-card/60 hover:border-hos-border-light'
              }`}
            >
              <p className="text-[13px] font-semibold text-white leading-tight">{protocol.title.zh}</p>
              <p className="text-en mt-1 line-clamp-2">{protocol.scene.en}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[18px] font-bold text-hos-cyan">{protocol.keyword}</span>
                <span className="text-[10px] font-mono text-hos-text-muted">{protocol.frequency}</span>
              </div>
            </button>
          )
        })}
      </div>

      <section className="hos-card-accent p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] text-hos-cyan font-mono mb-1">ACTIVE PROTOCOL</p>
            <h2 className="text-[21px] font-bold text-white leading-tight">{selected.title.zh}</h2>
            <p className="text-en mt-1">{selected.title.en}</p>
          </div>
          <div className="w-16 h-16 rounded-full border border-hos-cyan/25 bg-hos-cyan/8 flex items-center justify-center">
            <span className="text-[30px] font-bold text-hos-cyan glow-cyan">{selected.keyword}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl bg-hos-bg/60 border border-hos-border/60 p-3">
            <div className="flex items-center gap-1.5 text-hos-text-muted mb-1">
              <Clock size={12} />
              <span className="text-[10px]">时长 / Duration</span>
            </div>
            <p className="text-[13px] font-semibold text-white">{selected.duration.zh}</p>
          </div>
          <div className="rounded-xl bg-hos-bg/60 border border-hos-border/60 p-3">
            <div className="flex items-center gap-1.5 text-hos-text-muted mb-1">
              <Brain size={12} />
              <span className="text-[10px]">频率 / Frequency</span>
            </div>
            <p className="text-[13px] font-semibold text-white">{selected.frequency}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] text-hos-text-muted uppercase tracking-wider mb-1">适用场景</p>
          <p className="text-[13px] text-hos-text leading-relaxed">{selected.scene.zh}</p>
          <p className="text-en mt-0.5">{selected.scene.en}</p>
        </div>

        <div className="rounded-xl border border-hos-cyan/20 bg-hos-cyan/8 p-3.5 mb-4">
          <p className="text-[10px] text-hos-cyan/70 mb-1">启动语 / Command</p>
          <p className="text-[14px] font-semibold text-white leading-relaxed">“{selected.command.zh}”</p>
          <p className="text-en mt-1">“{selected.command.en}”</p>
        </div>

        <div className="space-y-2.5 mb-5">
          {selected.steps.map((step, index) => (
            <div key={step.zh} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-hos-cyan/12 border border-hos-cyan/20 text-hos-cyan text-[11px] font-mono flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <div>
                <p className="text-[13px] text-hos-text leading-relaxed">{step.zh}</p>
                <p className="text-en mt-0.5">{step.en}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] ${evidenceMeta[selected.evidence].color}`}>
            <FlaskConical size={12} />
            {evidenceMeta[selected.evidence].label}
          </span>
          <button
            onClick={() => navigate(`/reset/${selected.routeProtocol}`)}
            className="px-5 py-2.5 rounded-xl bg-hos-cyan/15 border border-hos-cyan/25 text-hos-cyan font-semibold text-[13px] flex items-center gap-2 active:scale-[0.97] transition-all"
          >
            <Zap size={15} />
            执行
          </button>
        </div>
      </section>

      <section className="hos-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-hos-green" />
          <h3 className="text-[14px] font-semibold text-white">使用原则</h3>
        </div>
        <div className="space-y-2 text-[12px] text-hos-text-dim leading-relaxed">
          <p>1. 先稳定身体，再处理问题。高压状态下不要直接做重大决定。</p>
          <p>2. 每个协议只追求“状态改善 10%”，持续训练比一次完美更重要。</p>
          <p>3. 若出现持续失眠、惊恐、抑郁或创伤反应，应寻求专业医疗或心理支持。</p>
        </div>
      </section>
    </div>
  )
}
