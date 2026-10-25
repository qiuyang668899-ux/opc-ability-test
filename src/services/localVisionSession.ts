import type { Landmark } from '../engines/perceptionCoach'

export class LocalVisionSession {
  private generation = 0
  private stream: MediaStream | null = null
  private worker: Worker | null = null
  private timer = 0
  private timeout = 0
  private cancelReady: (() => void) | null = null
  private pose: (points: Landmark[], aspect: number) => void
  private error: (message: string) => void
  constructor(pose: (points: Landmark[], aspect: number) => void, error: (message: string) => void) { this.pose = pose; this.error = error }

  async start(video: HTMLVideoElement) {
    this.stop()
    const generation = this.generation
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext || !window.createImageBitmap || !window.Worker) throw new Error('请在 HTTPS 地址中使用新版 Chrome、Edge 或系统浏览器打开。')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 12, max: 15 } }, audio: false })
      if (this.generation !== generation) { stream.getTracks().forEach(t => t.stop()); throw new Error('已取消开启') }
      this.stream = stream
      stream.getVideoTracks().forEach(track => { track.onended = () => { if (this.generation === generation) { this.stop(); this.error('摄像头连接已结束。观察已停止。') } } })
      video.srcObject = stream
      await video.play()
      if (this.generation !== generation) throw new Error('已取消开启')
      const worker = new Worker(`${import.meta.env.BASE_URL}vision/posture-worker.js`)
      this.worker = worker
      await new Promise<void>((resolve, reject) => {
        this.cancelReady = () => reject(new Error('已取消开启'))
        this.timeout = window.setTimeout(() => reject(new Error('模型加载超时。相机已关闭，请检查网络后重试。')), 45_000)
        worker.onerror = () => reject(new Error('本机识别无法启动，请更新浏览器后重试。'))
        worker.onmessage = ({ data }) => {
          if (data.type === 'ready') resolve()
          if (data.type === 'error') reject(new Error(data.message))
        }
        worker.postMessage({ type: 'init' })
      })
      clearTimeout(this.timeout); this.cancelReady = null
      if (this.generation !== generation) throw new Error('已取消开启')
      const next = () => { this.timer = window.setTimeout(() => void capture(), 250) }
      const fail = (message: string) => { if (this.generation === generation) { this.stop(); this.error(message) } }
      const capture = async () => {
        if (this.generation !== generation || document.visibilityState !== 'visible') return
        if (video.readyState < 2 || video.paused) { next(); return }
        try {
          const bitmap = await createImageBitmap(video)
          if (this.generation !== generation) { bitmap.close(); return }
          this.timeout = window.setTimeout(() => fail('识别响应超时，已关闭相机。'), 10_000)
          worker.postMessage({ type: 'frame', bitmap, timestamp: performance.now() }, [bitmap])
        } catch { fail('未能读取相机画面，已停止观察。') }
      }
      worker.onmessage = ({ data }) => {
        if (this.generation !== generation) return
        clearTimeout(this.timeout)
        if (data.type === 'error') { fail(data.message); return }
        if (data.type === 'pose') { this.pose(data.landmarks, video.videoWidth / video.videoHeight); next() }
      }
      worker.onerror = () => fail('本机识别已中断，相机已关闭。')
      next()
    } catch (error) {
      if (this.generation === generation) this.stop()
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw new Error('未获得摄像头权限。请在浏览器地址栏中允许相机，然后重试。')
      if (error instanceof DOMException && ['NotFoundError','NotReadableError'].includes(error.name)) throw new Error('摄像头不可用或正被其他应用占用。请关闭占用它的应用后重试。')
      throw error
    }
  }

  stop() {
    this.generation++
    clearTimeout(this.timer); clearTimeout(this.timeout)
    this.cancelReady?.(); this.cancelReady = null
    this.worker?.terminate(); this.worker = null
    this.stream?.getTracks().forEach(t => { t.onended = null; t.stop() }); this.stream = null
  }
}
