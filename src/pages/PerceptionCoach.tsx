import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Download, Mic, Pause, ShieldCheck, Volume2 } from 'lucide-react'
import VoiceInputButton from '../components/VoiceInputButton'
import { LocalVisionSession } from '../services/localVisionSession'
import { accountIdentity, accountSessionMatches } from '../services/accountSession'
import { loadState, saveStateBatch } from '../stores/useStore'
import { advanceCoach, blankFrameState, calibratePose, comparePose, perceptionSummary, poseFeatures, savePerceptionSession, type Landmark, type PerceptionAlert, type PerceptionSession, type PoseFeatures } from '../engines/perceptionCoach'
import './PerceptionCoach.css'

const statusText = { missing: '请让头部和双肩完整入镜', uncalibrated: '先校准你自己的舒服姿态', reframe: '位置变化较大，请重新校准', changed: '观察到持续变化，先不打扰', steady: '画面与校准时接近' }
export default function PerceptionCoach() {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<LocalVisionSession | null>(null), baseline = useRef<PoseFeatures | null>(null)
  const calibration = useRef<PoseFeatures[] | null>(null), frameState = useRef(blankFrameState())
  const session = useRef<PerceptionSession | null>(null), owner = useRef(accountIdentity())
  const epoch = useRef(0), options = useRef({ enabled: true, speak: false, minutes: 25 })
  const [active, setActive] = useState(false), [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(''), [status, setStatus] = useState('尚未开启相机')
  const [task, setTask] = useState(''), [note, setNote] = useState(''), [minutes, setMinutes] = useState(25)
  const [enabled, setEnabled] = useState(true), [speak, setSpeak] = useState(false)
  const [progress, setProgress] = useState(0), [calibrating, setCalibrating] = useState(false), [calibrated, setCalibrated] = useState(false)
  const [elapsed, setElapsed] = useState(0), [alert, setAlert] = useState<PerceptionAlert | null>(null)
  const [records, setRecords] = useState<PerceptionSession[]>(() => loadState('perceptionSessions', []))
  const [last, setLast] = useState<PerceptionSession | null>(null)
  const noteRef = useRef('')
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) { setMessage('此浏览器不支持语音播报，文字提醒仍可使用。'); return }
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'zh-CN'; utterance.rate = .9
    speechSynthesis.cancel(); speechSynthesis.speak(utterance)
  }
  const finish = (reason: string, updateUI = true) => {
    epoch.current++; runtime.current?.stop(); runtime.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    calibration.current = null
    const current = session.current; session.current = null
    if (current && accountSessionMatches(owner.current)) {
      const final = { ...current, endedAt: Date.now(), observedSeconds: frameState.current.observedSeconds, changedSeconds: frameState.current.changedSeconds, note: noteRef.current, stopReason: reason }
      const ok = savePerceptionSession(final)
      if (updateUI) { setLast(final); setRecords(loadState('perceptionSessions', [])); setMessage(ok ? '相机已关闭，观察摘要与反馈已保存到日志。' : '相机已关闭，但存储失败。请先导出这次记录。') }
    } else if (updateUI) setMessage(reason)
    if (updateUI) { setActive(false); setLoading(false); setCalibrating(false); setStatus('相机已关闭'); setAlert(null) }
  }
  const finishRef = useRef(finish)
  useEffect(() => { finishRef.current = finish })
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') finishRef.current('切换到后台，已关闭相机') }
    document.addEventListener('visibilitychange', hide)
    const timer = window.setInterval(() => {
      const s = session.current
      if (!s) return
      setElapsed(Math.floor((Date.now() - s.startedAt) / 1000))
      if (Date.now() - s.startedAt >= options.current.minutes * 60_000) finishRef.current('本次陪伴时间已到')
    }, 1000)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', hide); finishRef.current('离开观察页面', false) }
  }, [])
  const draw = (points: Landmark[]) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const visible = (i: number) => points[i] && (points[i].visibility || 0) >= .75
    ctx.strokeStyle = '#d9edce'; ctx.lineWidth = 3; ctx.fillStyle = '#f4ffed'
    if (visible(11) && visible(12)) { ctx.beginPath();ctx.moveTo(points[11].x*640,points[11].y*480);ctx.lineTo(points[12].x*640,points[12].y*480);ctx.stroke() }
    for (const i of [0,11,12]) if(visible(i)){ctx.beginPath();ctx.arc(points[i].x*640,points[i].y*480,5,0,Math.PI*2);ctx.fill()}
  }
  const onPose = (points: Landmark[], aspect: number) => {
    if (!session.current || !accountSessionMatches(owner.current)) return
    draw(points)
    const feature = poseFeatures(points, aspect)
    if (calibration.current) {
      if (feature) calibration.current.push(feature); else calibration.current = []
      setProgress(Math.min(100, Math.round(calibration.current.length / 20 * 100)))
      if (calibration.current.length >= 20) {
        const result = calibratePose(calibration.current)
        calibration.current = null; setCalibrating(false)
        if (result) { baseline.current = result;frameState.current.falseAlarms=0;setCalibrated(true);setMessage('校准完成。自然活动即可，不需要保持僵硬。') }
        else setMessage('校准时变化较大。请固定相机，舒服坐好后再试一次。')
      }
    }
    const state = comparePose(feature, baseline.current)
    setStatus(statusText[state])
    const quiet = Boolean(document.querySelector('[role="dialog"]'))
    const result = advanceCoach(frameState.current, state, Date.now(), options.current.enabled, quiet)
    frameState.current = result.state
    if (result.offer) {
      const item: PerceptionAlert = { id: crypto.randomUUID(), at: Date.now(), reason: '头肩位置相对校准姿态持续变化约 20 秒。可能是自然活动，也可能需要调整。', response: 'pending' }
      session.current.alerts.push(item); setAlert(item)
      if (options.current.speak) speakText('轻轻松开肩膀，换个舒服的姿势。方便的话，看看远处。')
    }
  }
  const start = async () => {
    if (loading || active || !videoRef.current) return
    const currentEpoch = ++epoch.current
    owner.current = accountIdentity(); baseline.current = null; frameState.current = blankFrameState(); noteRef.current = note
    options.current = { enabled, speak, minutes }
    setLoading(true); setMessage('正在加载本机模型。首次约下载 20MB，请稍候…'); setLast(null); setElapsed(0); setCalibrated(false); setProgress(0)
    const service = new LocalVisionSession(onPose, text => { finishRef.current(text); setMessage(text) })
    runtime.current = service
    try {
      await service.start(videoRef.current)
      if (currentEpoch !== epoch.current || !accountSessionMatches(owner.current)) { service.stop(); return }
      session.current = { id: crypto.randomUUID(), startedAt: Date.now(), endedAt: 0, task: task.slice(0, 300), observedSeconds: 0, changedSeconds: 0, alerts: [], note: '', stopReason: '', source: 'local-camera' }
      setActive(true); setMessage('相机已开启。把头部和双肩放入画面，再点“校准舒服姿态”。')
    } catch (error) { if (currentEpoch === epoch.current) setMessage(error instanceof Error ? error.message : '未能启动相机') }
    finally { if (currentEpoch === epoch.current) setLoading(false) }
  }
  const feedback = (response: Exclude<PerceptionAlert['response'], 'pending'>) => {
    if (!alert || !session.current) return
    session.current.alerts = session.current.alerts.map(x => x.id === alert.id ? { ...x, response, respondedAt: Date.now() } : x)
    if (response === 'snoozed') frameState.current.snoozedUntil = Date.now() + 10 * 60_000
    if (response === 'false-alarm') {
      frameState.current.falseAlarms++
      if (frameState.current.falseAlarms >= 2) { options.current.enabled = false; setEnabled(false);setMessage('本次已标记两次误报，主动提醒自动暂停。可以重新校准。') }
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    setAlert(null)
  }
  const download = (items: PerceptionSession[]) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ application: 'HOS', type: 'perception-sessions', version: 1, sessions: items }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a');a.href=url;a.download='HOS-本机观察记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const updateNote = (value: string) => { setNote(value);noteRef.current = value }
  return <div className="hos-page pc-page">
    <header className="pc-header"><Link to="/growth?tab=coach"><ArrowLeft size={20}/>成长教练</Link><span>本机感知 · 试用版</span></header>
    <section className="pc-hero"><span>HERE, WITH YOU.</span><h1>让陪伴，<br/>发生在此刻。</h1><p>看见持续的变化，轻轻提醒一个小动作。<br/>从你的舒服姿态开始，不追求完美坐姿。</p></section>
    <section className="pc-card"><div className="pc-section-title"><h2>开启一段观察</h2><span><ShieldCheck size={15}/>画面仅在本机处理</span></div>
      <div className={`pc-camera ${active?'is-live':''}`}><video ref={videoRef} muted playsInline autoPlay aria-label="本机摄像头预览"/><canvas ref={canvasRef} width="640" height="480" aria-hidden="true"/>{!active&&!loading&&<div className="pc-camera-idle"><Camera size={34}/><strong>相机现在是关闭的</strong><small>支持电脑摄像头与手机前置摄像头</small></div>}{loading&&<div className="pc-camera-idle"><span className="pc-loader"/><strong>正在准备本机识别</strong></div>}{active&&<div className="pc-live"><i/>本机观察中 · {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</div>}</div>
      <p className="pc-signal" role="status">{status}</p>
      {!active&&!loading&&<><label className="pc-task">这段时间，你想做什么？<input value={task} maxLength={300} onChange={e=>setTask(e.target.value)} placeholder="例如：安静写一页方案"/><VoiceInputButton value={task} onChange={setTask} label="说说这段时间想做什么" maxLength={300}/></label><label className="pc-duration">观察时长<select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>{[15,25,45,60].map(m=><option key={m} value={m}>{m} 分钟</option>)}</select></label></>}
      <div className="pc-actions">{active?<><button className="pc-primary" disabled={calibrating} onClick={()=>{baseline.current=null;calibration.current=[];setCalibrating(true);setCalibrated(false);setProgress(0);setAlert(null);frameState.current.changedSince=0;setMessage('自然坐好，保持相机位置约 5–10 秒。')}}><Check size={17}/>{calibrating?`正在校准 ${progress}%`:calibrated?'重新校准':'校准舒服姿态'}</button><button onClick={()=>finish('主动结束')}><Pause size={17}/>结束并关闭相机</button></>:loading?<button onClick={()=>finish('已取消开启')}>取消开启</button>:<button className="pc-primary" onClick={()=>void start()}><Camera size={18}/>开启相机观察</button>}</div>
      <p className="pc-small">固定镜头，头部和双肩完整入镜，尽量光线均匀。仅判断相对校准位置的变化；距离变化或识别不清时不提醒。切到后台、离开页面或时间到，都会关闭相机。</p>
      {message&&<p className="pc-message" role="status">{message}</p>}
    </section>
    {alert&&<section className="pc-intervention" role="status"><span>一个轻提醒</span><h2>给肩膀，一点余地。</h2><p>松开肩膀和下颌，换一个舒服的姿势。方便的话，看看远处。</p><small>{alert.reason}</small><div className="pc-actions"><button className="pc-primary" onClick={()=>feedback('adjusted')}>我已调整</button><button onClick={()=>feedback('snoozed')}>十分钟后再说</button><button onClick={()=>feedback('false-alarm')}>这次是误报</button></div></section>}
    <section className="pc-card"><h2>提醒的分寸，你来定。</h2><label className="pc-check"><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);options.current.enabled=e.target.checked;frameState.current.changedSince=0;if(!e.target.checked){setAlert(null);if('speechSynthesis'in window)speechSynthesis.cancel()}}}/>持续变化时给轻提醒</label><label className="pc-check"><input type="checkbox" checked={speak} onChange={e=>{setSpeak(e.target.checked);options.current.speak=e.target.checked;if(!e.target.checked&&'speechSynthesis'in window)speechSynthesis.cancel()}}/>同时用一句短语音提醒</label><button className="pc-quiet" onClick={()=>speakText('轻轻松开肩膀，换个舒服的姿势。')}><Volume2 size={16}/>试听语音</button><p className="pc-small">每次至少间隔五分钟，一段会话最多三次；两次误报后自动暂停。语音使用系统当前音频输出，连接眼镜后需自行试听确认。</p></section>
    <section className="pc-card"><div className="pc-section-title"><h2>也听你说说。</h2><Mic size={19}/></div><p>身体舒服吗？这次提醒是否有帮助？语音入口会按现有录音与转写说明处理，确认后的文字归入本次记录。</p><div className="pc-task"><textarea rows={3} value={note} onChange={e=>updateNote(e.target.value)} maxLength={1500} placeholder="不必描述得专业，一句真实感受就好。"/><VoiceInputButton value={note} onChange={updateNote} label="说说此刻的感受" maxLength={1500}/></div>{last&&!active&&<button className="pc-quiet" onClick={()=>{const next={...last,note};if(savePerceptionSession(next)){setLast(next);setRecords(loadState('perceptionSessions',[]));setMessage('反馈已补充到观察日志。')}else setMessage('反馈未能保存，请先导出。')}}>补充到刚才的记录</button>}</section>
    {last&&<section className="pc-card"><h2>这一次，留下了什么？</h2><p>{perceptionSummary(last)}</p><div className="pc-actions"><Link to="/journal">查看个人日志 →</Link><button onClick={()=>download([last])}><Download size={16}/>导出本次</button></div></section>}
    <section className="pc-card"><div className="pc-section-title"><h2>观察档案</h2><span>{records.length} 次</span></div>{records.length===0?<p>完成一次观察后，这里会留下摘要和你的反馈，不保存视频或逐帧关键点。</p>:<><div className="pc-actions"><button onClick={()=>download(records)}>导出全部</button><Link to="/growth">带入每周复盘 →</Link></div>{records.slice(0,8).map(r=><details key={r.id}><summary>{new Date(r.startedAt).toLocaleString('zh-CN')} · {Math.round(r.observedSeconds)} 秒有效观察</summary><p>{perceptionSummary(r)}</p>{r.alerts.map(a=><p key={a.id}>{new Date(a.at).toLocaleTimeString('zh-CN')} · {a.response==='adjusted'?'自报已调整':a.response==='false-alarm'?'误报':a.response==='snoozed'?'稍后':'未反馈'}</p>)}<button className="pc-quiet" onClick={()=>{if(!confirm('删除这次观察摘要和对应日志？'))return;const next=records.filter(x=>x.id!==r.id);const journal=loadState<{id:string}[]>('journal',[]).filter(x=>x.id!==`perception-${r.id}`);if(saveStateBatch({perceptionSessions:next,journal})){setRecords(next);if(last?.id===r.id)setLast(null)}}}>删除这次记录</button></details>)}</>}</section>
    <details className="pc-device-plan"><summary>更多设备，按实际能力接入</summary><p>荣耀手环 9：实时步数、心率仍需官方 Health Kit 权限与手机端适配，目前未连接。</p><p>小米 AI 眼镜、书房云台 2K：视频与传感器开放接口待核实。目前先使用本机摄像头，不代表已连接这些设备。</p><p>本模块不识别身份、情绪或疾病，不作舌象诊断。照片观察仍可在“生活记录”中使用。</p></details>
  </div>
}
