import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Zap, Heart, ChevronRight } from 'lucide-react'
import { getCurrentBioPhase, loadState, defaultUserState } from '../stores/useStore'
import { UI } from '../utils/i18n'

function saveLocal<T>(key: string, value: T): void {
  try { localStorage.setItem(`hos_${key}`, JSON.stringify(value)) } catch { void 0 }
}

export default function BioSync() {
  const navigate = useNavigate()
  const phase = getCurrentBioPhase()
  const user = loadState('user', defaultUserState)
  const [energy, setEnergy] = useState(user.energy)

  const adjustEnergy = (delta: number) => {
    setEnergy((prev) => {
      const next = Math.max(0, Math.min(user.maxEnergy, prev + delta))
      const u = loadState('user', defaultUserState)
      u.energy = next
      saveLocal('user', u)
      return next
    })
  }

  const getRecommendation = () => {
    const p = phase.name.zh
    if (p === '认知高峰' && energy < 4) return { protocol: '417Hz + 快速呼吸', action: '激活', en: 'Activate' }
    if (p === '降噪期' && energy > 7) return { protocol: '852Hz + 观想', action: '镇静', en: 'Calm' }
    if (p === '整合期' || p === '修复期') return { protocol: '528Hz + NSDR', action: '修复', en: 'Repair' }
    return { protocol: phase.protocol, action: '维持', en: 'Maintain' }
  }
  const rec = getRecommendation()
  const energyPct = (energy / user.maxEnergy) * 100

  return (
    <div className="px-5 pt-6 pb-6 animate-float-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <Activity size={18} className="text-hos-orange" />
        <div>
          <h1 className="text-[15px] font-bold text-white">{UI.bioSyncModule.zh}</h1>
          <p className="text-en">{UI.bioSyncModule.en}</p>
        </div>
      </div>

      {/* Current Phase */}
      <div className="hos-card-accent p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-hos-text-muted uppercase tracking-wider mb-1">{UI.currentPhase.zh} / {UI.currentPhase.en}</p>
            <h2 className="text-[22px] font-bold text-white leading-tight">{phase.name.zh}</h2>
            <p className="text-en">{phase.name.en}</p>
            <p className="text-[12px] text-hos-text-dim mt-2">{phase.description.zh}</p>
            <p className="text-en">{phase.description.en}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-hos-orange/10 flex items-center justify-center">
            <Activity size={18} className="text-hos-orange" />
          </div>
        </div>
        <p className="text-[10px] font-mono text-hos-text-muted mt-3">{phase.timeRange}</p>
      </div>

      {/* Energy */}
      <div className="hos-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-hos-text-dim">{UI.energyState.zh} / {UI.energyState.en}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-bold text-white">{energy}</span>
            <span className="text-[12px] text-hos-text-muted">/ {user.maxEnergy}</span>
          </div>
        </div>

        <div className="relative h-[6px] bg-hos-border rounded-full overflow-hidden mb-3">
          <div
            className="absolute h-full rounded-full transition-all duration-500"
            style={{
              width: `${energyPct}%`,
              background: energyPct < 30 ? 'var(--color-hos-red)' : energyPct < 60 ? 'var(--color-hos-orange)' : 'var(--color-hos-green)',
            }}
          />
        </div>
        <div className="flex justify-between">
          <button onClick={() => adjustEnergy(-1)} className="w-8 h-8 rounded-lg border border-hos-border text-hos-text-dim hover:border-hos-red/30 hover:text-hos-red transition-colors flex items-center justify-center text-sm">−</button>
          <button onClick={() => adjustEnergy(1)} className="w-8 h-8 rounded-lg border border-hos-border text-hos-text-dim hover:border-hos-green/30 hover:text-hos-green transition-colors flex items-center justify-center text-sm">+</button>
        </div>
      </div>

      {/* Diagnosis & Protocol */}
      <div className="hos-card p-5 mb-4">
        <p className="text-[10px] text-hos-text-muted uppercase tracking-wider mb-2">{UI.systemDiag.zh} / {UI.systemDiag.en}</p>
        <p className="text-[13px] text-white leading-relaxed mb-1">能量与节律匹配。保持当前心流状态。</p>
        <p className="text-en mb-4">Energy aligned with rhythm. Maintain flow state.</p>

        <div className="flex items-center justify-between bg-hos-bg/60 rounded-xl p-3.5 border border-hos-border/50">
          <div>
            <p className="text-[10px] text-hos-text-muted">{UI.recommendProtocol.zh}</p>
            <p className="text-[14px] font-mono font-bold text-hos-cyan mt-0.5">{rec.protocol}</p>
          </div>
          <button
            onClick={() => navigate(`/reset/${rec.action}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-hos-cyan/12 border border-hos-cyan/20 text-hos-cyan text-[13px] font-medium hover:bg-hos-cyan/20 transition-all active:scale-95"
          >
            <Zap size={13} />
            <span>{UI.execute.zh}</span>
          </button>
        </div>
      </div>

      {/* Tools */}
      <div>
        <p className="text-[11px] text-hos-text-dim mb-2.5">{UI.practicalTools.zh} / {UI.practicalTools.en}</p>
        <button
          onClick={() => navigate('/reset/coherence')}
          className="w-full hos-card px-4 py-3.5 flex items-center gap-3.5 active:scale-[0.98] transition-transform"
        >
          <div className="hos-icon-box bg-rose-500/12">
            <Heart size={18} className="text-rose-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold text-white">{UI.heartBrain.zh}</p>
            <p className="text-en">{UI.heartBrain.en}</p>
            <p className="text-[11px] text-hos-text-dim mt-0.5">心率变异性 · 平衡 ANS</p>
          </div>
          <ChevronRight size={15} className="text-hos-text-muted" />
        </button>
      </div>
    </div>
  )
}
