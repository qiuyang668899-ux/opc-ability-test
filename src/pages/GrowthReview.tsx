import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles, BookOpen, Activity, Bell, FlaskConical, Camera, Download, Mic, Plus, Trash2 } from 'lucide-react'
import { loadState, saveState, saveStateBatch } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'
import { accountIdentity, accountSessionMatches } from '../services/accountSession'
import { coachErrorMessage, hasHOSAIEndpoint } from '../services/aiCoachService'
import { analyzeGrowthReview } from '../services/growthReviewAI'
import { addDays, blankReview, calendarReminder, checkExperiment, dayKey, defaultReminder, GROWTH_DIMENSIONS, localReport, mergeEvidence, metricsBetween, NUDGES, parseHealthCSV, saveExperiments, saveReview, validateEvidence, weekKey, weeklyContext, type DailyEvidence, type Experiment, type GrowthProgram, type PhotoNote, type ReminderSettings, type ReviewInput, type WeeklyReview } from '../engines/growthReview'
import './GrowthReview.css'

function download(body: string, name: string, type = 'text/plain') { const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000) }
function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) { return <section id={id} className={`gr-panel ${className}`}>{children}</section> }
function TextField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string)=>void }) { return <div className="gr-field"><label><span>{label}</span><textarea rows={4} maxLength={1600} placeholder={hint} value={value} onChange={e=>onChange(e.target.value)} /></label><VoiceInputButton value={value} onChange={onChange} label={`说说${label}`} maxLength={1600}/></div> }
const steps = [
  { field: 'goal', title: '这周，你在意什么？', hint: '比如：我想按时睡觉，或交付一个拖了很久的方案。一个方向就够。', chips: ['身体更有能量','心情更平和','把重要的事往前推'] },
  { field: 'events', title: '带我回到一个具体时刻', hint: '在哪里、发生了什么、你做了什么、结果怎样？也可以说一次顺利的小事。', chips: ['最卡住的一次是：','我做得不错的一次是：','真正发生的事情是：'] },
  { field: 'emotions', title: '当时，你有什么感受？', hint: '可以只说一个词。它持续多久、后来如何恢复？不确定也可以。', chips: ['紧绷','平静','疲惫','有成就感','还说不清'] },
  { field: 'decisions', title: '你做了什么选择？', hint: '当时有哪些选项？为什么这样选？如果重来，愿意改哪一个小动作？', chips: ['我选择了：','我没有做的事是：','下次想试：'] },
  { field: 'body', title: '身体怎样？留下一点作品', hint: '睡眠、运动、饮食和恢复有什么变化？不要凭照片猜测健康结论。', chips: ['睡眠情况：','运动与恢复：','身体舒服的时刻：'] },
] as const

export default function GrowthReview() {
  const [params,setParams] = useSearchParams()
  const tab = ['review','experiments','data','coach'].includes(params.get('tab') || '') ? params.get('tab')! : 'review'
  const [draft,setDraft] = useState<ReviewInput>(()=>loadState('growthDraft',blankReview()))
  const [step,setStep] = useState(0)
  const [reviews,setReviews] = useState<WeeklyReview[]>(()=>loadState('growthReviews',[]))
  const [selected,setSelected] = useState<string | null>(null)
  const [experiments,setExperiments] = useState<Experiment[]>(()=>loadState('growthExperiments',[]))
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)
  const [cloud,setCloud] = useState(false)
  const [needsSupport,setNeedsSupport] = useState(false)
  const [action,setAction] = useState(()=>loadState<WeeklyReview[]>('growthReviews',[])[0]?.report.experiment || '')
  const [anchor,setAnchor] = useState(()=>GROWTH_DIMENSIONS.find(x=>x.id===loadState<WeeklyReview[]>('growthReviews',[])[0]?.input.dimension)?.anchor || '')
  const [target,setTarget] = useState(3)
  const [baseline,setBaseline] = useState('')
  const [expected,setExpected] = useState('')
  const [checkNote,setCheckNote] = useState('')
  const [program,setProgram] = useState<GrowthProgram | null>(()=>loadState('growthProgram',null))
  const [metric,setMetric] = useState<GrowthProgram['primaryMetric']>('focus')
  const [programTarget,setProgramTarget] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  useEffect(()=>()=>abortRef.current?.abort(),[])
  const patch = (value: Partial<ReviewInput>) => { const next={...draft,...value};setDraft(next);if(!saveState('growthDraft',next)) setMessage('草稿未能保存，请先复制文字。') }
  const switchTab = (value: string) => {setParams({tab:value});setMessage('')}
  const review = reviews.find(x=>x.id===selected) || reviews[0]
  const context = weeklyContext(draft.week)
  const createReview = async () => {
    if (!draft.goal.trim() || !draft.events.trim()) {setMessage('先说一句目标，再留下一个具体事件，就可以开始。');setStep(!draft.goal.trim()?0:1);return}
    if (busy) return
    if (/想自杀|想死|不想活|伤害自己|结束生命/.test([draft.goal,draft.events,draft.emotions].join(' '))) {setNeedsSupport(true);setMessage('先暂停成长任务。此刻更重要的是你的安全，请联系身边可信任的人或专业支持。');return}
    setNeedsSupport(false)
    const identity = accountIdentity(); const controller = new AbortController();abortRef.current=controller;setBusy(true);setMessage('')
    let report=localReport(draft);let notice='已生成本机复盘并写入日志。'
    try {
      if (cloud) { try {report=await analyzeGrowthReview(draft,controller.signal);notice='DeepSeek 复盘已写入日志，建议可继续修改。'} catch(error) {if(controller.signal.aborted) return;notice=`${coachErrorMessage(error)} 本机复盘和原始材料已保留。`} }
      if (!accountSessionMatches(identity) || controller.signal.aborted) return
      const current: WeeklyReview={id:crypto.randomUUID(),input:{...draft},report,createdAt:Date.now()}
      if (!saveReview(current)) {setMessage('没有保存成功，请复制草稿并检查设备存储。');return}
      setReviews(loadState('growthReviews',[]));setSelected(current.id);setAction(report.experiment);setAnchor(GROWTH_DIMENSIONS.find(x=>x.id===draft.dimension)!.anchor);setMessage(notice);window.setTimeout(()=>document.getElementById('gr-report')?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    } finally {if(!controller.signal.aborted) setBusy(false)}
  }
  const launchExperiment = () => {
    if (!review || !action.trim() || !anchor.trim() || !expected.trim()) {setMessage('请填写具体动作、生活锚点和可观察的成功标准。');return}
    const item: Experiment={id:crypto.randomUUID(),reviewId:review.id,dimension:review.input.dimension,action:action.trim(),anchor:anchor.trim(),target,start:dayKey(),end:addDays(dayKey(),6),baseline:baseline.trim(),expected:expected.trim(),result:'',checkIns:[],status:'active'}
    const next=[item,...loadState<Experiment[]>('growthExperiments',[])]
    if(saveExperiments(next)){setExperiments(next);setMessage('实验已开始：每天最多记一次，没完成也不会抹掉过去的努力。');setParams({tab:'experiments'})}
  }
  const updateExperiment = (next: Experiment) => {const values=experiments.map(x=>x.id===next.id?next:x);if(saveExperiments(values))setExperiments(values)}
  const startProgram = () => {if(!programTarget.trim()){setMessage('先写下你想用数据验证的一个变化。');return}const value={start:dayKey(),primaryMetric:metric,target:programTarget.trim()};if(saveState('growthProgram',value))setProgram(value)}
  const days=program?Math.max(1,Math.floor((Date.now()-new Date(`${program.start}T00:00:00`).getTime())/86400000)+1):0
  const lastWeek=addDays(weekKey(),-7)
  const firstMetrics=program?metricsBetween(program.start,addDays(program.start,6)):null
  const recentMetrics=metricsBetween(lastWeek,addDays(lastWeek,6))
  const metricLabels={completion:'到期实验完成率',errors:'同类情境重复错误率',recovery:'自报情绪恢复分钟',focus:'深度工作小时'}
  const metricValue=(m:ReturnType<typeof metricsBetween>,key:GrowthProgram['primaryMetric'])=>key==='completion'?m.completion.value:m[key]
  const progressReviews=program?new Set(reviews.filter(x=>dayKey(new Date(x.createdAt))>=program.start&&dayKey(new Date(x.createdAt))<=addDays(program.start,89)).map(x=>x.input.week)).size:0
  return <div className="hos-page gr-page">
    <header className="gr-header"><Link to="/" aria-label="返回首页"><ArrowLeft size={20}/></Link><span>HOS · 个人成长实验室</span><Link to="/journal" aria-label="打开个人日志"><BookOpen size={20}/></Link></header>
    <section className="gr-hero"><span className="gr-eyebrow">REFLECT. EXPERIMENT. EVOLVE.</span><h1>把经历，<br/>变成下一步。</h1><p>每周一次复盘，每次一个小实验。<br/>让变化留下证据，也给生活留点余地。</p><div className="gr-hero-bottom"><span><Sparkles size={15}/>AI 成长复盘代理</span><span>无需登录 · 本机记忆</span></div></section>
    <nav className="gr-tabs" aria-label="成长复盘导航">{[{id:'review',title:'每周复盘',icon:BookOpen},{id:'experiments',title:'我的实验',icon:FlaskConical},{id:'data',title:'生活记录',icon:Activity},{id:'coach',title:'陪伴提醒',icon:Bell}].map(x=><button key={x.id} aria-current={tab===x.id?'page':undefined} className={tab===x.id?'active':''} onClick={()=>switchTab(x.id)}><x.icon size={18}/>{x.title}</button>)}</nav>
    {message&&<p className="gr-status" role="status">{message}</p>}
    {needsSupport&&<Panel><h2>先照顾好你的安全</h2><p>如果现在可能伤害自己，请立即联系身边可信任的人，或当地紧急服务。</p><Link className="gr-primary" to="/support-now">打开即时支持</Link></Panel>}
    {tab==='review'&&<>
      <Panel><div className="gr-section-title"><div><span className="gr-eyebrow">01 / NOTICE</span><h2>不用会写，慢慢说。</h2></div><span className="gr-pill">{step+1} / 5</span></div><div className="gr-progress">{steps.map((s,i)=><button aria-label={`第${i+1}步 ${s.title}`} className={i===step?'active':draft[s.field].trim()?'done':''} key={s.field} onClick={()=>setStep(i)}/>)}</div>
      <label className="gr-inline">复盘周起始日<input type="date" value={draft.week} max={dayKey()} onChange={e=>{if(e.target.value)patch({week:weekKey(new Date(`${e.target.value}T12:00:00`))})}}/></label>
      {step===0&&<div className="gr-dimensions">{GROWTH_DIMENSIONS.map(d=><button className={draft.dimension===d.id?'selected':''} key={d.id} onClick={()=>patch({dimension:d.id})}><strong>{d.name}</strong><small>{d.detail}</small></button>)}</div>}
      <TextField label={steps[step].title} hint={steps[step].hint} value={draft[steps[step].field]} onChange={value=>patch({[steps[step].field]:value})}/>
      <div className="gr-chips">{steps[step].chips.map(x=><button key={x} onClick={()=>patch({[steps[step].field]:`${draft[steps[step].field]}${draft[steps[step].field]?'；':''}${x}`})}>{x}</button>)}</div>
      {step===4&&<TextField label="本周的小作品或生活体验（选填）" hint="一页方案、一顿认真吃的饭、一次散步，或者一个你愿意保留的瞬间。" value={draft.artifact} onChange={v=>patch({artifact:v})}/>}
      <div className="gr-actions"><button disabled={step===0} onClick={()=>setStep(step-1)}>上一步</button>{step<4?<button className="primary" onClick={()=>setStep(step+1)}>下一步<ArrowRight size={16}/></button>:<button className="primary" onClick={()=>document.getElementById('gr-generate')?.scrollIntoView({behavior:'smooth',block:'center'})}>准备复盘<Check size={16}/></button>}</div>
      <p className="gr-muted"><Mic size={14}/>每一栏都可以直接说，草稿自动留在当前设备。</p></Panel>
      <Panel><h2>已有记录，帮你回忆</h2><p>这一周：{context.journals.length} 条日志 · {context.flowMinutes} 分钟已计时专注 · {context.evidence.length} 条生活数据。</p><label className="gr-check"><input type="checkbox" checked={draft.includeHistory} onChange={e=>patch({includeHistory:e.target.checked})}/>本次复盘使用本周日志摘要和生活数据</label>{draft.includeHistory&&<details><summary>查看会使用的内容</summary>{context.journals.slice(0,5).map(x=><p key={x.id}>{(x.organizedText||x.rawFragment||x.trigger).slice(0,160)}</p>)}{context.evidence.slice(0,7).map(x=><p key={x.id}>{x.date} · {x.source} · 睡眠 {x.sleepHours??'未填'}h · 运动 {x.exerciseMinutes??'未填'}min</p>)}<small>云端最多使用 5 条日志摘要与 7 条生活数据。照片不上传。</small></details>}
      <label className="gr-check"><input type="checkbox" checked={cloud} disabled={!hasHOSAIEndpoint()||busy} onChange={e=>setCloud(e.target.checked)}/>使用 DeepSeek 深度复盘</label><p className="gr-muted">{hasHOSAIEndpoint()?'开启后，点生成会把本次表单和你勾选的摘要发送到 HOS 服务及 DeepSeek。关闭则仅在本机整理。':'当前环境未配置云端服务，本机复盘可正常使用。'}</p><button id="gr-generate" className="gr-primary" disabled={busy} onClick={createReview}><Sparkles size={18}/>{busy?'正在整理经历，最长约 30 秒…':'生成本周复盘'}</button></Panel>
      {review&&<Panel className="gr-report" id="gr-report"><div className="gr-section-title"><div><span className="gr-eyebrow">02 / UNDERSTAND</span><h2>给这一周，一次回望。</h2></div><span className="gr-pill">{review.report.engine==='deepseek'?'DeepSeek':'本机整理'}</span></div><p>{review.report.response}</p>{[['模式线索',review.report.pattern],['一个盲点提问',review.report.blindSpot],['反事实 · 换一个动作呢',review.report.counterfactual],['下周实验建议',review.report.experiment]].map(([title,text])=><div className="gr-insight" key={title}><h3>{title}</h3><p>{text}</p></div>)}<details><summary>依据与原始表达 · {review.input.week}</summary>{review.report.evidence.map((x,i)=><p key={i}>{x}</p>)}<p>作品 / 体验：{review.input.artifact||'未填'}</p></details><p className="gr-muted">模式和反事实是待验证的假设，可以不同意。不会据此给你贴人格或健康标签。</p>
      <TextField label="把建议改成你愿意做的动作" hint="一个可以两分钟开始的小动作" value={action} onChange={setAction}/><label>生活锚点<input value={anchor} placeholder="例如：每天午饭后" onChange={e=>setAnchor(e.target.value)}/></label><div className="gr-two"><label>七天内计划几次<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} 次</option>)}</select></label><label>目前基线（选填）<input value={baseline} onChange={e=>setBaseline(e.target.value)} placeholder="如：目前每周 1 次"/></label></div><label>怎样才算做到了<input value={expected} onChange={e=>setExpected(e.target.value)} placeholder="如：完成 3 次，并各留一句感受" maxLength={300}/></label><button className="gr-primary" onClick={launchExperiment}><FlaskConical size={18}/>开启七天实验</button></Panel>}
      {reviews.length>0&&<Panel><h2>复盘档案 · {reviews.length}</h2>{reviews.map(r=><div className="gr-history" key={r.id}><button onClick={()=>{setSelected(r.id);setAction(r.report.experiment);setAnchor(GROWTH_DIMENSIONS.find(d=>d.id===r.input.dimension)!.anchor)}}><strong>{r.input.week} 这一周</strong><small>{r.input.goal}</small></button><button aria-label="删除这份复盘" onClick={()=>{if(!confirm('删除这份复盘及日志副本？相关实验保留。'))return;const next=reviews.filter(x=>x.id!==r.id);const journals=loadState<{id:string}[]>('journal',[]).filter(x=>x.id!==`growth-${r.id}`);if(saveStateBatch({growthReviews:next,journal:journals})){setReviews(next);setSelected(null)}}}><Trash2 size={16}/></button></div>)}</Panel>}
    </>}
    {tab==='experiments'&&<>
      <Panel><span className="gr-eyebrow">03 / EXPERIMENT</span><h2>少一点计划，多一点证据。</h2><p>每次只改变一个小动作。结果不理想，也是一条有用的信息。</p>{!experiments.length&&<button className="gr-primary" onClick={()=>switchTab('review')}>从第一次复盘开始<ArrowRight size={16}/></button>}</Panel>
      {experiments.map(e=>{const todayDone=e.checkIns.some(c=>c.date===dayKey());const ended=e.end<dayKey();return <Panel key={e.id}><div className="gr-section-title"><span className="gr-pill">{e.status==='completed'?'已收尾':e.status==='stopped'?'已停止':ended?'待复盘':'进行中'}</span><small>{e.start} — {e.end}</small></div><h2>{e.action}</h2><p>在「{e.anchor}」之后开始。</p><div className="gr-experiment-count"><strong>{e.checkIns.length}<em> / {e.target}</em></strong><span>已记录 / 计划次数</span></div><p>成功标准：{e.expected}</p>{e.baseline&&<p>开始时：{e.baseline}</p>}{e.status==='active'&&!ended&&<><input aria-label="本次实验反馈" value={checkNote} onChange={ev=>setCheckNote(ev.target.value)} placeholder="做了什么？有帮助、没变化都可以。" maxLength={500}/><div className="gr-actions"><button className="primary" onClick={()=>{updateExperiment(checkExperiment(e,checkNote));setCheckNote('')}}><Check size={16}/>{todayDone?'更新今天的反馈':'记下今天完成'}</button>{todayDone&&<button onClick={()=>updateExperiment({...e,checkIns:e.checkIns.filter(c=>c.date!==dayKey())})}>撤销今日记录</button>}</div><Link className="gr-link" to={GROWTH_DIMENSIONS.find(d=>d.id===e.dimension)!.route}>打开对应练习 →</Link></>}
      <details><summary>查看记录与实验收尾</summary>{e.checkIns.map(c=><p key={c.date}>{c.date} · {c.note||'已完成，未补充感受'}</p>)}<TextField label="实际结果与下次调整" hint="什么有用？什么没发生？保留、缩小还是换一个实验？" value={e.result} onChange={value=>updateExperiment({...e,result:value})}/>{e.status==='active'&&<div className="gr-actions"><button onClick={()=>{if(!e.result.trim()){setMessage('留下一句真实结果，再为实验收尾。');return}updateExperiment({...e,status:'completed'})}}>完成复盘</button><button onClick={()=>updateExperiment({...e,status:'stopped'})}>停止这个实验</button></div>}</details></Panel>})}
      <Panel><span className="gr-eyebrow">90 DAYS / EVIDENCE</span><h2>用 90 天，验证一个改变。</h2><p>先记录首周基线，再观察每周变化。个人前后对比不能证明因果，但能帮助你决定是否继续。</p>{!program?<><label>主要观察指标<select value={metric} onChange={e=>setMetric(e.target.value as GrowthProgram['primaryMetric'])}>{Object.entries(metricLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>你想验证什么<input placeholder="例如：固定周复盘，能否让我每周稳定完成一个作品？" value={programTarget} onChange={e=>setProgramTarget(e.target.value)} maxLength={500}/></label><button className="gr-primary" onClick={startProgram}>开始我的 90 天观察</button></>:<><p className="gr-program-day">第 <strong>{Math.min(days,90)}</strong> / 90 天 · 已复盘 {progressReviews} 周</p><p>{program.target}</p><p>主要指标：{metricLabels[program.primaryMetric]}</p><div className="gr-two gr-metric"><div><small>首周基线</small><strong>{days<8?'记录中':firstMetrics?metricValue(firstMetrics,program.primaryMetric)??'暂无数据':'暂无数据'}</strong></div><div><small>最近完整一周</small><strong>{days<15?'等待两周':metricValue(recentMetrics,program.primaryMetric)??'暂无数据'}</strong></div></div><p className="gr-muted">起始周：{program.start}；最近完整周：{lastWeek}。缺失数据不按零计算，不同指标单位见下方。</p>{days>=90&&<p>90 天观察已结束。比较记录完整度、变化方向与其他影响因素，再决定下一轮；系统不会自动判定成功。</p>}</>}
      <h3>上周的四条线索</h3><div className="gr-stats">{[[`${recentMetrics.completion.value??'—'}%`,'到期实验完成率',`${recentMetrics.completion.numerator}/${recentMetrics.completion.denominator} 计划次数`],[`${recentMetrics.errors??'—'}%`,'重复错误率',`${recentMetrics.errorCount}/${recentMetrics.opportunities} 同类情境`],[`${recentMetrics.recovery??'—'} 分`,'情绪恢复时间',`${recentMetrics.recoverySamples} 天的自报均值`],[`${recentMetrics.focus??'—'} 小时`,'深度工作','实测计时或每日总量']].map(([value,label,note])=><div key={label}><strong>{value}</strong><span>{label}</span><small>{note}</small></div>)}</div><details><summary>指标怎么算</summary><p>完成率＝到期实验已记录次数（不超过计划）÷计划次数；停止的实验排除。提前收尾也不虚增次数。</p><p>重复错误率＝你标记的重复错误÷同类情境次数，不是 AI 对你的评分。恢复时间是每日自报典型值。</p><p>深度工作只用实际计时；填写每日总量时覆盖当日计时，避免重复相加。多个来源同一天优先手动记录，否则使用最近保存来源。</p></details><button className="gr-secondary" onClick={()=>download(JSON.stringify({exportedAt:new Date().toISOString(),program,reviews,experiments,evidence:loadState('growthEvidence',[])},null,2),'HOS-成长复盘档案.json','application/json')}><Download size={16}/>导出成长证据</button></Panel>
    </>}
    {tab==='data'&&<EvidencePanel notify={setMessage}/>}
    {tab==='coach'&&<ReminderPanel notify={setMessage}/>}
    <footer className="gr-footer">成长不是一条直线。让记录服务生活。</footer>
  </div>
}

function EvidencePanel({notify}:{notify:(s:string)=>void}) {
  const [rows,setRows]=useState<DailyEvidence[]>(()=>loadState('growthEvidence',[]))
  const [date,setDate]=useState(dayKey())
  const [values,setValues]=useState<Record<string,string>>({})
  const [note,setNote]=useState('')
  const [preview,setPreview]=useState<DailyEvidence[] | null>(null)
  const [photos,setPhotos]=useState<PhotoNote[]>(()=>loadState('growthPhotos',[]))
  const [photo,setPhoto]=useState('')
  const [caption,setCaption]=useState('')
  const [kind,setKind]=useState('姿态观察')
  const [photoBusy,setPhotoBusy]=useState(false)
  const importRef=useRef<HTMLInputElement>(null)
  const identity=useRef(accountIdentity())
  const fields=[['sleepHours','睡眠（小时）',24],['exerciseMinutes','运动（分钟）',1440],['steps','步数',150000],['deepWorkMinutes','深度工作总量（分钟）',1440],['recoveryMinutes','典型情绪恢复（分钟）',10080],['errorOpportunities','同类情境次数',1000],['repeatedErrors','重复错误次数',1000]] as const
  const persist=(incoming:DailyEvidence[])=>{const next=mergeEvidence(loadState('growthEvidence',[]),incoming);if(saveState('growthEvidence',next)){setRows(next);notify('生活数据已保存，复盘时可选择使用。');return true}return false}
  const save=()=>{const row:DailyEvidence={id:`manual-${date}`,date,source:'手动记录',note,...Object.fromEntries(Object.entries(values).filter(([,v])=>v!=='').map(([k,v])=>[k,Number(v)]))};const error=validateEvidence(row);if(error){notify(error);return}if(persist([row])){setValues({});setNote('')}}
  const readPhoto=async(file?:File)=>{
    if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){notify('请选择不超过 12MB 的 JPG、PNG 或 WebP 图片。');return}
    setPhotoBusy(true)
    const url=URL.createObjectURL(file)
    try {const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,720/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const c=canvas.getContext('2d');if(!c)throw new Error();c.drawImage(img,0,0,canvas.width,canvas.height);if(accountSessionMatches(identity.current))setPhoto(canvas.toDataURL('image/jpeg',0.7))}catch{notify('图片未能读取，请换一张再试。')}finally{URL.revokeObjectURL(url);setPhotoBusy(false)}
  }
  return <><Panel><span className="gr-eyebrow">LIFE / CAPTURE</span><h2>不必全靠回忆。</h2><p>先用少量真实数据了解生活。没记录的项目留空，零代表确实为零。</p><label>记录日期<input type="date" max={dayKey()} value={date} onChange={e=>setDate(e.target.value)}/></label><div className="gr-two">{fields.map(([key,label,max])=><label key={key}>{label}<input type="number" min="0" max={max} step={key==='sleepHours'?'0.1':'1'} value={values[key]??''} placeholder="可留空" onChange={e=>setValues({...values,[key]:e.target.value})}/></label>)}</div><TextField label="一句生活观察" hint="比如：午后散步后更容易回到工作；或昨晚睡得晚。恢复时间可记情绪升起到能继续日常活动的分钟数。" value={note} onChange={setNote}/><button className="gr-primary" onClick={save}><Plus size={17}/>保存今日数据</button><p className="gr-muted">同一天的手动记录会更新该日总量，不累加。设备数据、自报数据都可能有误差。</p></Panel>
  <Panel><h2>手环数据，先接得真实。</h2><p>可把设备导出数据按 HOS 模板整理后导入。此版本尚未连接小米或荣耀账户，不会假装读取手环。</p><div className="gr-actions"><button onClick={()=>download('date,source,sleepHours,exerciseMinutes,steps,deepWorkMinutes,recoveryMinutes,errorOpportunities,repeatedErrors,note\n','HOS-生活数据模板.csv','text/csv;charset=utf-8')}><Download size={16}/>下载 CSV 模板</button><button onClick={()=>importRef.current?.click()}>导入 CSV</button></div><input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>500000){notify('文件请小于 500KB。');return}try{const parsed=parseHealthCSV(await f.text());if(accountSessionMatches(identity.current))setPreview(parsed)}catch(error){notify(error instanceof Error?error.message:'文件读取失败')}}}/>{preview&&<div className="gr-import-preview"><h3>待导入 {preview.length} 条</h3><p>{preview[0].date} 至 {preview[preview.length-1].date} · 来源 {Array.from(new Set(preview.map(x=>x.source))).join('、')}</p><p>同日同来源将更新，重复导入不会重复累计。</p><button onClick={()=>{if(persist(preview))setPreview(null)}}>确认保存到本机</button><button onClick={()=>setPreview(null)}>取消</button></div>}
  <details><summary>小米 / 荣耀直连需要什么</summary><p>厂商要求应用先开通健康服务，再由使用者授权数据范围。待申请通过后可扩展自动同步；本轮不涉及购买设备或商业配置。</p><a href="https://dev.mi.com/xiaomihyperos/documentation/detail?pId=2333" target="_blank" rel="noreferrer">小米官方接入说明 ↗</a><br/><a href="https://developer.honor.com/cn/solution/page/sol2022110410360004" target="_blank" rel="noreferrer">荣耀官方健康服务 ↗</a></details></Panel>
  <Panel><h2>照片观察日记</h2><p>用同一光线、角度记录姿态、面部或舌象，补上你自己的感受。照片只保存在本机，不发送给 AI，也不用于判断疾病或推断真实情绪。</p><label>观察主题<select value={kind} onChange={e=>setKind(e.target.value)}>{['姿态观察','面部状态','舌象记录','生活与作品'].map(x=><option key={x}>{x}</option>)}</select></label><label className="gr-file"><Camera size={19}/>{photoBusy?'正在读取…':'拍照或选择照片'}<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={e=>{void readPhoto(e.target.files?.[0]);e.target.value=''}}/></label>{photo&&<img className="gr-photo" src={photo} alt="待保存的个人观察照片"/>}<TextField label="你观察到什么？" hint="姿态：肩膀是否放松、双脚有无支撑？面部：此刻自己感到怎样？舌象：只记录可见变化；持续不适请咨询医生。" value={caption} onChange={setCaption}/><button className="gr-secondary" disabled={!photo||photoBusy} onClick={()=>{if(photos.length>=12){notify('本机照片最多保存 12 张，请先下载并删除旧照片。');return}const next=[{id:crypto.randomUUID(),date:dayKey(),kind,caption,image:photo},...photos];if(saveState('growthPhotos',next)){setPhotos(next);setPhoto('');setCaption('');notify('照片观察已保存到本机，未上传。')}}}>保存照片观察</button>{photos.map(p=><details key={p.id}><summary>{p.date} · {p.kind}</summary><img className="gr-photo" src={p.image} alt={p.kind}/><p>{p.caption||'未补充观察'}</p><div className="gr-actions"><a href={p.image} download={`HOS-${p.date}-${p.kind}.jpg`}>下载照片</a><button onClick={()=>{const next=photos.filter(x=>x.id!==p.id);if(saveState('growthPhotos',next))setPhotos(next)}}>删除</button></div></details>)}</Panel>
  <Panel><h2>生活记录 · {rows.length} 条</h2>{!rows.length&&<p>从今天开始，有一条就比没有更清楚。</p>}{rows.slice(0,30).map(r=><details key={r.id}><summary>{r.date} · {r.source}</summary>{fields.filter(([k])=>r[k]!==undefined).map(([k,label])=><p key={k}>{label}：{r[k]}</p>)}<p>{r.note}</p><button onClick={()=>{setDate(r.date);setValues(Object.fromEntries(fields.map(([k])=>[k,r[k]===undefined?'':String(r[k])])));setNote(r.note);notify('数据已带入上方表单；保存后成为该日手动修正。')}}>修改这一天</button><button onClick={()=>{const next=rows.filter(x=>x.id!==r.id);if(saveState('growthEvidence',next))setRows(next)}}>删除这条数据</button></details>)}</Panel></>
}

function ReminderPanel({notify}:{notify:(s:string)=>void}) {
  const [settings,setSettings]=useState<ReminderSettings>(()=>loadState('growthReminder',defaultReminder))
  const [trial,setTrial]=useState(false)
  const [day,setDay]=useState(dayKey())
  const [time,setTime]=useState('20:30')
  const update=(patch:Partial<ReminderSettings>)=>{const value={...settings,...patch,lastAt:Date.now()};if(saveState('growthReminder',value))setSettings(value)}
  return <><Panel><span className="gr-eyebrow">COMPANION / ON YOUR TERMS</span><h2>适时提醒，也懂得安静。</h2><p>应用打开时，按你的节奏给一个轻提示。你决定提醒类型、频率和时段，随时可以暂停。</p><label className="gr-check"><input type="checkbox" checked={settings.enabled} onChange={e=>update({enabled:e.target.checked})}/>开启应用内陪伴提醒</label><label>你希望被怎样提醒<select value={settings.kind} onChange={e=>update({kind:e.target.value as ReminderSettings['kind']})}><option value="posture">坐姿与活动 · 身体换个姿势</option><option value="rest">恢复与音乐 · 松一口气</option><option value="focus">关键词与行动 · 只做一件事</option></select></label><label>间隔<select value={settings.interval} onChange={e=>update({interval:Number(e.target.value)})}>{[30,45,60,90,120].map(n=><option value={n} key={n}>{n} 分钟</option>)}</select></label><div className="gr-two"><label>开始时段<select value={settings.startHour} onChange={e=>{const h=Number(e.target.value);update({startHour:h,endHour:Math.max(h+1,settings.endHour)})}}>{Array.from({length:23},(_,h)=><option key={h} value={h}>{h}:00</option>)}</select></label><label>结束时段<select value={settings.endHour} onChange={e=>update({endHour:Number(e.target.value)})}>{Array.from({length:24-settings.startHour},(_,i)=>settings.startHour+i+1).map(h=><option key={h} value={h}>{h}:00</option>)}</select></label></div><button className="gr-secondary" onClick={()=>setTrial(!trial)}>看看提醒效果</button>{trial&&<div className="gr-insight"><h3>{NUDGES[settings.kind].title}</h3><p>{NUDGES[settings.kind].text}</p><Link to={NUDGES[settings.kind].route}>跟着做一下 →</Link></div>}<p className="gr-muted">网页关闭或退到后台时，不承诺准点提醒。不会偷偷打开摄像头或麦克风。</p></Panel><Panel><h2>每周，为自己留十五分钟。</h2><p>把复盘放进手机日历，离开网页也能由日历提醒你。导入后请检查日历的提醒设置。</p><div className="gr-two"><label>第一次复盘日期<input type="date" min={dayKey()} value={day} onChange={e=>setDay(e.target.value)}/></label><label>时间<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><button className="gr-primary" onClick={()=>{try{download(calendarReminder(day,time),'HOS-每周复盘.ics','text/calendar;charset=utf-8');notify('已生成 13 周日历邀请。请在手机日历中导入并确认提醒。')}catch{notify('请填写有效的日期和时间。')}}}><Bell size={17}/>加入每周复盘日历</button><p className="gr-muted">日历只包含复盘时间，不包含你的日记、状态或照片。</p></Panel><Panel><h2>把主动权留给你</h2><p>本轮先做好生活记录与动作提示。自动姿态识别、视频教练与手环持续同步尚未接通。你仍可使用现有镜像觉察、呼吸和音乐模块。</p><div className="gr-actions"><Link to="/visual">镜像觉察 →</Link><Link to="/music">选择陪伴音乐 →</Link><Link to="/reset">做一次呼吸 →</Link></div></Panel></>
}
