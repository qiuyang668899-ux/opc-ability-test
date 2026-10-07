import { useEffect } from 'react'
import { accountSession } from '../services/accountSession'
import { cloudEnabled, enableCloud, syncCloud } from '../services/cloudArchive'

export default function CloudMemorySync() {
  useEffect(() => {
    let timer: number | undefined
    const reset = () => { window.clearTimeout(timer) }
    if (accountSession() && cloudEnabled()) void enableCloud().catch(() => { /* account page exposes retry */ })
    const changed = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { void syncCloud() }, 2500) }
    window.addEventListener('hos:state-saved', changed)
    window.addEventListener('online', changed)
    window.addEventListener('hos:account-changed', reset)
    return () => { window.clearTimeout(timer); window.removeEventListener('hos:state-saved', changed); window.removeEventListener('online', changed); window.removeEventListener('hos:account-changed',reset) }
  }, [])
  return null
}
