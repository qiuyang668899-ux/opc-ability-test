import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, Check, Eye, RefreshCcw, ScanFace, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { type EmotionState, BREATH_PROTOCOLS } from '../stores/useStore'
import { EMOTIONS } from '../utils/i18n'

type DiagState = 'idle' | 'connecting' | 'preview' | 'reflecting' | 'analyzing' | 'complete' | 'error'

const emotionOptions: { id: EmotionState; label: string; hint: string }[] = [
  { id: 'calm', label: '平静', hint: '呼吸平稳，面部放松' },
  { id: 'focused', label: '专注', hint: '注意集中，准备行动' },
  { id: 'anxious', label: '焦虑', hint: '紧绷、担心或坐立不安' },
  { id: 'stressed', label: '压力高', hint: '身体发紧，急于应对' },
  { id: 'fatigued', label: '疲惫', hint: '眼神倦怠，能量偏低' },
  { id: 'confused', label: '混乱', hint: '思路打结，难以选择' },
]

const guidance: Record<EmotionState, { observation: string; suggestion: string; keyword: string; freq: string }> = {
  calm: { observation: '你观察到自己处在相对平稳、开放的状态。', suggestion: '适合做一次短复盘，或开始一件需要耐心的任务。', keyword: 'OBSERVE', freq: '528' },
  focused: { observation: '你观察到注意力已经收束，行动准备度较好。', suggestion: '保护这段专注窗口，只推进一个清晰目标。', keyword: 'FLOW', freq: '963' },
  anxious: { observation: '你观察到担忧或紧绷感正在占用注意力。', suggestion: '先延长呼气、降低输入，再处理具体问题。', keyword: 'VOID', freq: '417' },
  stressed: { observation: '你观察到身体和情绪的负荷偏高。', suggestion: '暂停新增任务，用几分钟把身体带回可调节区。', keyword: 'VOID', freq: '417' },
  fatigued: { observation: '你观察到疲劳或低能量的外显迹象。', suggestion: '优先补水、活动和短暂离屏，不建议继续硬撑。', keyword: 'GATHER', freq: '528' },
  confused: { observation: '你观察到思路分散，暂时难以做出选择。', suggestion: '把所有事项写下来，只圈出一个最小下一步。', keyword: 'OBSERVE', freq: '528' },
  excited: { observation: '你观察到能量和兴奋度较高。', suggestion: '把能量导向一个具体输出，并设置停止点。', keyword: 'FLOW', freq: '963' },
}

function cameraErrorText(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '浏览器没有摄像头权限。请在地址栏或系统隐私设置中允许摄像头后重试。'
    if (error.name === 'NotFoundError') return '没有检测到可用摄像头。你仍可以使用无摄像头觉察模式。'
    if (error.name === 'NotReadableError') return '摄像头可能正被其他应用占用。关闭其他视频应用后再试。'
  }
  return '摄像头暂时无法启动。你可以检查权限，或直接使用无摄像头觉察模式。'
}

export default function VisualDiag() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<DiagState>('idle')
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionState | null>(null)
  const [result, setResult] = useState<EmotionState | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorText, setErrorText] = useState('')
  const [hasCamera, setHasCamera] = useState(false)
  const [snapshotUrl, setSnapshotUrl] = useState('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
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
    setSelectedEmotion(null)
    setResult(null)
    setSnapshotUrl('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('Camera API unavailable', 'NotFoundError')
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
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

  const useReflectionMode = useCallback(() => {
    stopCamera()
    setSelectedEmotion(null)
    setResult(null)
    setSnapshotUrl('')
    setState('reflecting')
  }, [stopCamera])

  const completeReflection = useCallback(() => {
    if (!selectedEmotion) return
    if (hasCamera) captureFrame()
    setProgress(0)
    setState('analyzing')
  }, [captureFrame, hasCamera, selectedEmotion])

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (state !== 'analyzing' || !selectedEmotion) return undefined
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(interval)
          setResult(selectedEmotion)
          stopCamera()
          setState('complete')
          return 100
        }
        return Math.min(100, current + 16)
      })
    }, 120)
    return () => window.clearInterval(interval)
  }, [selectedEmotion, state, stopCamera])

  const resultGuidance = result ? guidance[result] : null
  const showChoice = state === 'preview' || state === 'reflecting'

  return (
    <div className="hos-page visual-page animate-float-up">
      <header className="tools-header">
        <p className="section-kicker">视觉觉察</p>
        <h1>视觉状态诊断</h1>
        <p>通过实时镜像、表情与身体感受的自我观察，看见此刻状态，并获得下一步练习建议。</p>
      </header>

      <div className="privacy-note">
        <ShieldCheck size={17} />
        <span><strong>隐私与边界：</strong>画面只在当前设备处理，不会上传。当前版本采用镜像觉察与自我标注，不自动推断疾病或心理诊断。</span>
      </div>

      <section className={`visual-camera-card ${hasCamera ? 'is-live' : ''}`}>
        <div className="camera-status">
          <span className={hasCamera ? 'live' : ''}><i />{hasCamera ? '摄像头已连接' : '本地觉察模式'}</span>
          <Eye size={17} />
        </div>

        {(state === 'connecting' || state === 'preview' || state === 'analyzing') && (
          <video ref={videoRef} className={hasCamera ? 'visual-video' : 'hidden'} playsInline muted autoPlay style={{ transform: 'scaleX(-1)' }} />
        )}

        {snapshotUrl && state === 'complete' && <img src={snapshotUrl} alt="本次状态快照" className="visual-video" />}

        {!hasCamera && !snapshotUrl && (
          <div className="camera-placeholder">
            {state === 'idle' && <><span><Camera size={30} /></span><h2>先看一眼此刻的自己</h2><p>你可以打开摄像头，也可以不使用摄像头直接完成状态觉察。</p></>}
            {state === 'connecting' && <><span className="soft-pulse"><Camera size={28} /></span><h2>正在等待摄像头权限</h2><p>请在浏览器提示中选择允许。</p></>}
            {state === 'reflecting' && <><span><Eye size={30} /></span><h2>闭眼感受十秒也可以</h2><p>观察呼吸、面部、肩颈和脑中的速度，然后选择最接近的状态。</p></>}
            {state === 'analyzing' && <><span className="soft-pulse"><ScanFace size={29} /></span><h2>正在整理你的观察</h2><p>把感受转化成温和、可执行的下一步。</p></>}
            {state === 'error' && <><span className="warning"><AlertTriangle size={29} /></span><h2>暂时没有摄像头画面</h2><p>{errorText}</p></>}
          </div>
        )}

        {state === 'idle' && (
          <div className="camera-actions">
            <button onClick={() => void startCamera()} className="primary-action"><Camera size={17} />打开摄像头</button>
            <button onClick={useReflectionMode} className="secondary-action"><Eye size={17} />不使用摄像头</button>
          </div>
        )}

        {state === 'error' && (
          <div className="camera-actions">
            <button onClick={() => void startCamera()} className="secondary-action"><RefreshCcw size={16} />重试</button>
            <button onClick={useReflectionMode} className="primary-action"><Eye size={16} />继续觉察</button>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="visual-progress"><div style={{ width: `${progress}%` }} /><span>{Math.min(100, progress)}%</span></div>
        )}
      </section>

      {showChoice && (
        <section className="reflection-panel animate-float-up">
          <div className="hos-section-title"><div><p className="section-kicker">自我观察</p><h2>此刻更接近哪种状态？</h2><p>没有标准答案，选择你真实感受到的即可。</p></div></div>
          <div className="emotion-choice-grid">
            {emotionOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedEmotion(option.id)}
                className={selectedEmotion === option.id ? 'selected' : ''}
                aria-pressed={selectedEmotion === option.id}
              >
                <span>{selectedEmotion === option.id && <Check size={13} />}</span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
          <button onClick={completeReflection} disabled={!selectedEmotion} className="primary-action w-full">
            <Sparkles size={17} />生成我的状态建议
          </button>
        </section>
      )}

      {state === 'complete' && result && resultGuidance && (
        <section className="visual-result animate-float-up">
          <div className="result-heading">
            <span className="shortcut-icon sage"><Check size={20} /></span>
            <div><p className="section-kicker">本次觉察</p><h2>{EMOTIONS[result]?.zh}</h2></div>
          </div>
          <p className="result-observation">{resultGuidance.observation}</p>
          <div className="result-suggestion"><Sparkles size={18} /><p><strong>现在可以这样做</strong><span>{resultGuidance.suggestion}</span></p></div>
          <div className="result-actions">
            <button
              onClick={() => {
                const protocol = BREATH_PROTOCOLS.find((item) => item.keyword === resultGuidance.keyword)
                navigate(protocol ? `/reset/${protocol.keyword.toLowerCase()}` : '/reset')
              }}
              className="primary-action"
            >
              <Zap size={16} />开始建议练习
            </button>
            <button onClick={() => { setResult(null); setSelectedEmotion(null); setSnapshotUrl(''); setState('idle') }} className="secondary-action">
              <RefreshCcw size={16} />重新觉察
            </button>
          </div>
          <small className="result-boundary">此结果来自你的自我标注，用于日常觉察与训练，不替代医疗或心理专业判断。</small>
        </section>
      )}
    </div>
  )
}
