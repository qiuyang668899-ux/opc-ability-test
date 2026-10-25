import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, Leaf } from 'lucide-react'
import { defaultReminder, NUDGES, reminderDue, type ReminderSettings } from '../engines/growthReview'
import { loadState, saveState } from '../stores/useStore'

export default function GrowthNudge() {
  const location = useLocation()
  const [kind,setKind] = useState<ReminderSettings['kind'] | null>(null)
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible' || ['/reset','/ritual','/cultivation','/flow','/visual'].some(p=>location.pathname.startsWith(p)) || document.querySelector('[role=dialog]')) return
      const s = loadState<ReminderSettings>('growthReminder', defaultReminder)
      if (reminderDue(s) && saveState('growthReminder', { ...s, lastAt: Date.now() })) setKind(s.kind)
    }
    const timer = window.setInterval(check, 15000)
    const updated = () => { if (!loadState<ReminderSettings>('growthReminder', defaultReminder).enabled) setKind(null) }
    window.addEventListener('hos:state-saved',updated)
    document.addEventListener('visibilitychange',check)
    return () => { clearInterval(timer);window.removeEventListener('hos:state-saved',updated);document.removeEventListener('visibilitychange',check) }
  }, [location.pathname])
  if (!kind) return null
  const n = NUDGES[kind]
  return <aside className="growth-nudge" role="status"><button aria-label="稍后提醒" onClick={()=>setKind(null)}><X size={18}/></button><strong><Leaf size={17}/>{n.title}</strong><p>{n.text}</p><Link to={n.route} onClick={()=>setKind(null)}>现在做一个小动作 →</Link><Link to="/growth?tab=coach" onClick={()=>setKind(null)}>调整提醒</Link></aside>
}
