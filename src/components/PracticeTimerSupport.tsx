import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { getChimeVolume, playCultivationChime, setChimeVolume } from '../utils/cultivationChime'

export default function PracticeTimerSupport({ running, audioReady }: { running: boolean; audioReady: boolean | null }) {
  const [volume, setVolume] = useState(getChimeVolume)
  const [preview, setPreview] = useState('')
  const [keepAwake, setKeepAwake] = useState(true)
  const [awake, setAwake] = useState(false)
  useEffect(() => {
    if (!running || !keepAwake || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let disposed = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || disposed || (lock && !lock.released)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (disposed) { await next.release(); return }
        lock = next
        setAwake(true)
        next.addEventListener('release', () => setAwake(false))
      } catch { setAwake(false) }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => { disposed = true; void lock?.release(); document.removeEventListener('visibilitychange', acquire) }
  }, [running, keepAwake])
  return <div className="practice-timer-support">
    <div><button onClick={async () => setPreview(await playCultivationChime() ? '已试听，请确认设备音量合适' : '声音未开启，请检查设备音量或换用系统浏览器')}><BellRing size={15} />试听三声引磬</button><label>音量<input aria-label="引磬音量" type="range" min="0.1" max="1" step="0.1" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); setChimeVolume(next) }} /></label></div>
    <label className="practice-awake"><input type="checkbox" checked={keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} />练习时保持亮屏 <span>{running && awake && keepAwake ? '已生效' : '设备支持时生效'}</span></label>
    <p role="status">{audioReady === false ? '提示音未能开启，请点“试听”重试。' : preview || '到时响三声。建议保持本页前台；锁屏可能阻止声音，返回后会校准计时。'}</p>
  </div>
}
