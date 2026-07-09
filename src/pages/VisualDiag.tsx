import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, Play, RefreshCcw, ScanFace, Video, X, Zap } from 'lucide-react'
import { type EmotionState, BREATH_PROTOCOLS } from '../stores/useStore'
import { UI, EMOTIONS, VISUAL_FEATURES } from '../utils/i18n'

type DiagState = 'idle' | 'connecting' | 'preview' | 'analyzing' | 'complete' | 'error'

function simulateAnalysis(): { emotion: EmotionState; confidence: number } {
  const emotions: EmotionState[] = ['calm', 'anxious', 'focused', 'fatigued', 'confused', 'stressed']
  const weights = [30, 15, 25, 15, 5, 10]
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  let idx = 0
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i]
    if (r <= 0) { idx = i; break }
  }
  return { emotion: emotions[idx], confidence: 70 + Math.floor(Math.random() * 25) }
}

function getProtocolForEmotion(emotion: EmotionState) {
  const map: Record<EmotionState, { keyword: string; freq: string }> = {
    calm: { keyword: 'OBSERVE', freq: '528' },
    anxious: { keyword: 'VOID', freq: '417' },
    focused: { keyword: 'FLOW', freq: '963' },
    fatigued: { keyword: 'GATHER', freq: '528' },
    excited: { keyword: 'FLOW', freq: '963' },
    confused: { keyword: 'OBSERVE', freq: '528' },
    stressed: { keyword: 'VOID', freq: '417' },
  }
  return map[emotion]
}

function getSystemDiag(emotion: EmotionState): { zh: string; en: string } {
  const map: Record<EmotionState, { zh: string; en: string }> = {
    calm: { zh: '情绪稳定', en: 'Emotional stability' },
    anxious: { zh: '皮质醇过高', en: 'High cortisol levels' },
    focused: { zh: '前额叶高度活跃', en: 'Prefrontal cortex highly active' },
    fatigued: { zh: '疲劳迹象', en: 'Fatigue indicators' },
    excited: { zh: '多巴胺活跃', en: 'Dopamine active' },
    confused: { zh: '决策回路过载', en: 'Decision circuit overload' },
    stressed: { zh: '战斗或逃跑模式', en: 'Fight-or-flight mode' },
  }
  return map[emotion]
}

function cameraErrorText(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '浏览器没有摄像头权限。请在地址栏或浏览器设置里允许摄像头，然后重试。'
    if (error.name === 'NotFoundError') return '没有检测到可用摄像头。请确认设备摄像头已连接且没有被其他应用占用。'
    if (error.name === 'NotReadableError') return '摄像头暂时不可读，可能正在被其他应用占用。关闭其他视频应用后重试。'
  }
  return '摄像头启动失败。请检查浏览器权限、系统隐私设置，或刷新页面后重试。'
}

export default function VisualDiag() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<DiagState>('idle')
  const [result, setResult] = useState<{ emotion: EmotionState; confidence: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorText, setErrorText] = useState('')
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraLabel, setCameraLabel] = useState('Camera')
  const [snapshotUrl, setSnapshotUrl] = useState('')
  const [resolution, setResolution] = useState('1280x720')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setHasCamera(false)
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshotUrl(canvas.toDataURL('image/jpeg', 0.82))
  }, [])

  const startCamera = useCallback(async () => {
    setState('connecting')
    setErrorText('')
    setResult(null)
    setProgress(0)
    setSnapshotUrl('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera API unavailable', 'NotFoundError')
      }

      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings()
      setCameraLabel(track?.label || 'Front Camera')
      if (settings?.width && settings?.height) {
        setResolution(`${settings.width}x${settings.height}`)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setHasCamera(true)
      setState('preview')
    } catch (error) {
      stopCamera()
      setErrorText(cameraErrorText(error))
      setState('error')
    }
  }, [stopCamera])

  const startAnalysis = useCallback(() => {
    if (!hasCamera) {
      void startCamera()
      return
    }
    captureFrame()
    setResult(null)
    setProgress(0)
    setState('analyzing')
  }, [captureFrame, hasCamera, startCamera])

  const runSimulation = useCallback(() => {
    stopCamera()
    setSnapshotUrl('')
    setResult(null)
    setProgress(0)
    setHasCamera(false)
    setState('analyzing')
  }, [stopCamera])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    if (state !== 'analyzing') return undefined
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(interval)
          setResult(simulateAnalysis())
          setState('complete')
          return 100
        }
        return Math.min(100, current + 7 + Math.random() * 11)
      })
    }, 180)

    return () => window.clearInterval(interval)
  }, [state])

  const protocol = result ? getProtocolForEmotion(result.emotion) : null
  const diagText = result ? getSystemDiag(result.emotion) : null
  const showVideo = hasCamera && state !== 'idle' && state !== 'error'

  return (
    <div className="fixed inset-0 flex flex-col max-w-[480px] mx-auto bg-black z-50">
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-4 pb-3 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video size={14} className={hasCamera ? 'text-hos-green' : 'text-hos-text-muted'} />
            <span className={`text-[11px] font-mono tracking-wide ${hasCamera ? 'text-hos-green' : 'text-hos-text-muted'}`}>
              {hasCamera ? 'CAMERA LIVE' : 'CAMERA STANDBY'} // {state.toUpperCase()}
            </span>
          </div>
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-white/55 hover:text-white hover:border-white/30 transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-[9px] text-white/35 font-mono mt-1.5 tracking-wider">
          {UI.resolution.zh}: {resolution} // {UI.sensor.zh}: {hasCamera ? cameraLabel : '未连接'}
        </p>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {showVideo && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {!showVideo && (
          <div className="absolute inset-0 bg-[#070a11] flex items-center justify-center px-6">
            {state === 'idle' && (
              <div className="text-center max-w-[320px]">
                <div className="w-24 h-24 mx-auto mb-5 rounded-full border border-hos-cyan/25 bg-hos-cyan/8 flex items-center justify-center text-hos-cyan">
                  <Camera size={34} />
                </div>
                <h1 className="text-[23px] font-bold text-white mb-2">启动摄像头预览</h1>
                <p className="text-[13px] text-hos-text-dim leading-relaxed mb-5">
                  允许摄像头后，你会先看到自己的实时状态图像，再手动开始状态扫描。
                </p>
                <button
                  onClick={() => void startCamera()}
                  className="w-full rounded-2xl bg-hos-cyan/15 border border-hos-cyan/30 px-5 py-4 text-hos-cyan font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Camera size={17} />
                  <span>启动摄像头</span>
                </button>
              </div>
            )}

            {state === 'connecting' && (
              <div className="text-center">
                <div className="w-28 h-28 mx-auto mb-5 rounded-full border border-hos-cyan/20 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-hos-cyan/12 flex items-center justify-center animate-pulse">
                    <Camera size={26} className="text-hos-cyan" />
                  </div>
                </div>
                <p className="text-[13px] text-hos-text-dim">正在请求摄像头权限...</p>
                <p className="text-en mt-1">Waiting for camera permission</p>
              </div>
            )}

            {state === 'error' && (
              <div className="max-w-[330px] w-full">
                <div className="hos-card p-5 text-center">
                  <AlertTriangle size={30} className="mx-auto text-hos-orange mb-3" />
                  <h1 className="text-[20px] font-bold text-white mb-2">没有看到摄像头画面</h1>
                  <p className="text-[13px] text-hos-text-dim leading-relaxed mb-5">{errorText}</p>
                  <div className="grid gap-2.5">
                    <button
                      onClick={() => void startCamera()}
                      className="rounded-2xl bg-hos-cyan/15 border border-hos-cyan/30 px-5 py-3.5 text-hos-cyan font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <RefreshCcw size={15} />
                      <span>重新授权摄像头</span>
                    </button>
                    <button
                      onClick={runSimulation}
                      className="rounded-2xl border border-hos-border px-5 py-3.5 text-hos-text-dim font-semibold text-[13px] active:scale-[0.98] transition-all"
                    >
                      使用模拟数据体验流程
                    </button>
                  </div>
                </div>
              </div>
            )}

            {state === 'analyzing' && !hasCamera && (
              <div className="text-center px-8">
                <ScanFace size={38} className="mx-auto text-hos-cyan mb-4 animate-pulse" />
                <p className="text-[12px] text-hos-cyan font-mono tracking-wider mb-2">
                  SIMULATION PROCESSING... {Math.min(99, Math.floor(progress))}%
                </p>
                <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-hos-cyan rounded-full transition-all" style={{ width: `${Math.min(99, progress)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {showVideo && (state === 'preview' || state === 'analyzing' || state === 'complete') && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[19%] left-[13%] right-[13%] bottom-[25%] border border-hos-cyan/45 rounded-2xl">
              <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-hos-cyan rounded-tl-xl" />
              <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-hos-cyan rounded-tr-xl" />
              <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-hos-cyan rounded-bl-xl" />
              <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-hos-cyan rounded-br-xl" />
              {state === 'analyzing' && <div className="scan-line" />}
              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[9px] text-hos-cyan font-mono border border-hos-cyan/20">
                FACE REGION
              </div>
            </div>

            {state === 'analyzing' && (
              <div className="absolute bottom-[27%] left-0 right-0 text-center px-12">
                <p className="text-[11px] text-hos-cyan font-mono tracking-wider mb-2">
                  PROCESSING LIVE FRAME... {Math.min(99, Math.floor(progress))}%
                </p>
                <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-hos-cyan rounded-full transition-all" style={{ width: `${Math.min(99, progress)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'preview' && hasCamera && (
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-6 pt-12">
            <div className="hos-card p-4 mb-3">
              <p className="text-[12px] text-white font-semibold mb-1">实时摄像头已连接</p>
              <p className="text-[12px] text-hos-text-dim leading-relaxed">
                如果你现在能看到自己的画面，就可以开始扫描。分析结果用于状态训练提示，不作为医学或心理诊断。
              </p>
            </div>
            <button
              onClick={startAnalysis}
              className="w-full rounded-2xl bg-hos-cyan/15 border border-hos-cyan/30 px-5 py-4 text-hos-cyan font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Play size={16} />
              <span>开始状态扫描</span>
            </button>
          </div>
        )}
      </div>

      {state === 'complete' && result && protocol && diagText && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/95 to-transparent px-5 pb-5 pt-8 animate-float-up">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-hos-green animate-pulse" />
                <span className="text-[10px] text-hos-text-muted">
                  {UI.diagComplete.zh} / {UI.diagComplete.en}
                </span>
              </div>
              <h2 className="text-[24px] font-bold text-white leading-tight">
                {EMOTIONS[result.emotion]?.zh}
                <span className="text-[13px] text-white/40 ml-2 font-normal">{EMOTIONS[result.emotion]?.en}</span>
              </h2>
            </div>
            {snapshotUrl ? (
              <img src={snapshotUrl} alt="状态截图" className="w-16 h-16 rounded-xl border border-white/15 object-cover" />
            ) : (
              <div className="text-right">
                <p className="text-[9px] text-hos-text-muted mb-1">{UI.bioFeature.zh}</p>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-hos-cyan/12 border border-hos-cyan/20 text-[10px] text-hos-cyan font-medium">
                  {VISUAL_FEATURES[result.emotion]?.zh}
                </span>
              </div>
            )}
          </div>

          <div className="hos-card p-3.5 mb-3">
            <p className="text-[9px] text-hos-text-muted uppercase tracking-wider mb-1">{UI.systemDiag.zh} / {UI.systemDiag.en}</p>
            <p className="text-[13px] text-white font-medium">{diagText.zh} / {diagText.en}</p>
            <p className="text-[11px] text-hos-text-muted mt-1">置信度：{result.confidence}% · 训练提示版本</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] text-hos-text-muted uppercase tracking-wider">{UI.recommendProtocol.zh}</p>
              <p className="text-[15px] font-mono font-bold text-hos-cyan mt-0.5">
                {protocol.keyword} | {protocol.freq}Hz
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startAnalysis}
                className="w-10 h-10 rounded-xl border border-hos-border text-hos-text-dim flex items-center justify-center active:scale-95 transition-all"
                aria-label="重新扫描"
              >
                <RefreshCcw size={15} />
              </button>
              <button
                onClick={() => {
                  const bp = BREATH_PROTOCOLS.find((item) => item.keyword === protocol.keyword)
                  if (bp) navigate(`/reset/${bp.keyword.toLowerCase()}`)
                  else navigate('/reset')
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,245,0.8), rgba(167,139,250,0.6))' }}
              >
                <Zap size={15} className="text-white" />
                <span className="text-white">{UI.execute.zh}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
