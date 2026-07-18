import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Route, X } from 'lucide-react'
import {
  completeRegulationJourney,
  loadActiveRegulationJourney,
  updateActiveRegulationJourney,
  type RegulationJourney,
} from '../engines/stateOrchestrator'

export default function ActiveGuidance() {
  const navigate = useNavigate()
  const location = useLocation()
  const [journey, setJourney] = useState<RegulationJourney | null>(loadActiveRegulationJourney)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const refresh = () => setJourney(loadActiveRegulationJourney())
    window.addEventListener('hos:journey-updated', refresh)
    return () => window.removeEventListener('hos:journey-updated', refresh)
  }, [])

  if (!journey) return null
  const step = journey.steps[journey.currentStep]
  if (!step) return null
  const isOnStep = location.pathname === step.route || (step.route.startsWith('/reset/') && location.pathname.startsWith('/reset/'))

  const openStep = () => {
    setExpanded(false)
    navigate(step.route)
  }

  const finishStep = () => {
    const nextIndex = journey.currentStep + 1
    if (nextIndex >= journey.steps.length) {
      completeRegulationJourney(journey)
      setJourney(null)
      return
    }
    const next = { ...journey, currentStep: nextIndex }
    updateActiveRegulationJourney(next)
    setJourney(next)
    setExpanded(false)
    navigate(next.steps[nextIndex].route)
  }

  return (
    <aside className={`active-guidance ${expanded ? 'expanded' : ''}`} aria-label="HOS 主动调试引导">
      <button className="active-guidance-main" onClick={() => setExpanded((value) => !value)}>
        <span><Route size={16} /></span>
        <div><small>HOS 正在陪你调试 · {journey.currentStep + 1}/{journey.steps.length}</small><strong>{step.title}</strong></div>
        <ArrowRight size={16} className={expanded ? 'rotate-90' : ''} />
      </button>
      {expanded && (
        <div className="active-guidance-detail">
          <p>{step.reason}</p>
          <div className="active-guidance-progress">{journey.steps.map((item, index) => <i key={item.id} className={index <= journey.currentStep ? 'active' : ''} />)}</div>
          <div>
            {!isOnStep && <button onClick={openStep}>{step.action}<ArrowRight size={14} /></button>}
            {isOnStep && <button onClick={finishStep}><Check size={14} />{journey.currentStep + 1 === journey.steps.length ? '完成本轮调试' : '完成这一步，继续'}</button>}
            <button className="quiet" onClick={() => { updateActiveRegulationJourney(null); setJourney(null) }}><X size={13} />暂时结束</button>
          </div>
        </div>
      )}
    </aside>
  )
}
