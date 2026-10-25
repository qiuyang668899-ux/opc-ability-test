import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
const nativeRequire=createRequire(import.meta.url),cache=new Map(),storage=new Map(),session=new Map()
function load(path){const file=resolve(path);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=readFileSync(file,'utf8').replaceAll('import.meta.env','({BASE_URL:"/",DEV:false,VITE_HOS_AI_ENDPOINT:"https://hos.example/api/hos-coach"})');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const require=id=>id.startsWith('.')?load(resolve(dirname(file),`${id}.ts`)):nativeRequire(id);new Function('require','module','exports',code)(require,module,module.exports);return module.exports}
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
globalThis.sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)}
globalThis.window={localStorage,dispatchEvent:()=>{},setTimeout,clearTimeout,location:{hostname:'hos.example'}}
const g=load('src/engines/growthReview.ts'),store=load('src/stores/useStore.ts'),accounts=load('src/services/accountSession.ts')
assert.equal(g.weekKey(new Date('2026-10-25T12:00:00')),'2026-10-19')
assert.equal(g.validDay('2026-02-30'),false)
assert.equal(g.addDays('2026-12-30',3),'2027-01-02')
assert.match(g.validateEvidence({date:'2999-01-01',note:'future'}),/日期/)
assert.match(g.validateEvidence({date:'2026-10-01',repeatedErrors:2,errorOpportunities:1}),/重复错误/)
assert.match(g.validateEvidence({date:'2026-10-01',sleepHours:NaN}),/范围/)
const csv='date,source,sleepHours,deepWorkMinutes,recoveryMinutes,errorOpportunities,repeatedErrors\n2026-10-01,小米导出,7.2,60,20,4,1'
const rows=g.parseHealthCSV(csv);assert.equal(rows[0].sleepHours,7.2)
assert.equal(g.mergeEvidence(rows,rows).length,1)
assert.throws(()=>g.parseHealthCSV('date,sleepHours\n2026-02-30,7'),/日期/)
assert.throws(()=>g.parseHealthCSV('date,sleepHours\n2026-10-01,-1'),/范围/)
assert.throws(()=>g.parseHealthCSV('date,foo\n2026-10-01,7'),/模板/)
const e={id:'one',reviewId:'r1',dimension:'attention',action:'write',anchor:'after breakfast',target:3,start:'2026-10-01',end:'2026-10-07',baseline:'',expected:'3 times',result:'',checkIns:[],status:'active'}
const done=g.checkExperiment(e,'first','2026-10-01');const twice=g.checkExperiment(done,'corrected','2026-10-01')
assert.equal(twice.checkIns.length,1);assert.equal(twice.checkIns[0].note,'corrected')
assert.deepEqual(g.checkExperiment(e,'late','2026-10-08'),e)
assert.equal(g.experimentRate([twice],'2026-10-01','2026-10-07').value,33)
assert.equal(g.experimentRate([twice],'2026-10-01','2026-10-06').value,null)
assert.equal(g.experimentRate([{...twice,status:'stopped'}],'2026-10-01','2026-10-07').value,null)
store.saveState('growthEvidence',rows)
store.saveState('flowSessions',[{timestamp:new Date('2026-10-01T12:00:00').getTime(),actualSeconds:1200},{timestamp:new Date('2026-10-02T12:00:00').getTime(),practiceMinutes:90}])
const metrics=g.metricsBetween('2026-10-01','2026-10-07')
assert.equal(metrics.focus,1,'Manual daily total must replace flow timer, not double count; planned time excluded')
assert.equal(metrics.errors,25);assert.equal(metrics.recovery,20)
assert.equal(g.metricsBetween('2026-09-01','2026-09-07').focus,null)
store.saveState('growthEvidence',g.mergeEvidence(rows,[{...rows[0],source:'手动记录',deepWorkMinutes:0,recoveryMinutes:0}]))
assert.equal(g.metricsBetween('2026-10-01','2026-10-07').focus,0,'Explicit zero is not missing')
const input={...g.blankReview(),goal:'写一个方案',events:'总是被消息打断',week:'2026-10-19'}
const report=g.localReport(input),review={id:'r1',input,report,createdAt:Date.now()}
store.saveState('growthDraft',{...input,events:'new draft while AI is running'})
assert.equal(g.saveReview(review),true);assert.equal(g.saveReview(review),true)
assert.equal(store.loadState('growthDraft',{}).events,'new draft while AI is running','Late AI response must not overwrite a newer draft')
assert.equal(store.loadState('growthReviews',[]).length,1);assert.equal(store.loadState('journal',[]).length,1)
g.saveExperiments([twice]);g.saveExperiments([twice]);assert.equal(store.loadState('journal',[]).filter(x=>x.id==='growth-experiment-one').length,1,'Experiment journal must update without duplicates')
const previous=storage.get('hos_growthReviews'),setter=localStorage.setItem
localStorage.setItem=(k,v)=>{if(k==='hos_journal')throw new Error('quota');setter(k,v)}
assert.equal(g.saveReview({...review,id:'r2'}),false);assert.equal(storage.get('hos_growthReviews'),previous,'Batch rollback must preserve review history')
localStorage.setItem=setter
accounts.setAccountSession({token:'a'.repeat(64),expiresAt:Date.now()+60000,user:{id:'a'.repeat(36)}})
assert.equal(store.loadState('growthReviews',[]).length,0,'Guest review must not leak into a signed-in account')
accounts.setAccountSession(null)
const cal=g.calendarReminder('2026-10-25','20:30');assert.match(cal,/RRULE:FREQ=WEEKLY;COUNT=13/);assert.match(cal,/BEGIN:VALARM/)
assert.throws(()=>g.calendarReminder('2026-10-25','25:00'))
const now=new Date('2026-10-25T12:00:00').getTime()
assert.equal(g.reminderDue({...g.defaultReminder,enabled:true,lastAt:now-3600000},now),true)
assert.equal(g.reminderDue({...g.defaultReminder,enabled:false},now),false)
assert.equal(g.reminderDue({...g.defaultReminder,enabled:true,endHour:10},now),false)
const ai=load('src/services/growthReviewAI.ts')
let payload
fetch=async(_url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({engine:'deepseek',stateLabel:'复盘',mode:'reflect',confidence:75,coreNeed:'test',response:'test',hypothesis:'test',bodyStep:'test',actionStep:'test',reflectionStep:'test',reframe:'test',question:'test',commitment:'test',recommendedModules:['flow'],rationale:'test'}))}
store.saveState('personalPreferences',{secret:'not selected'})
const result=await ai.analyzeGrowthReview(input,new AbortController().signal)
assert.equal(result.engine,'deepseek');assert.equal(payload.context.personalPreferences,undefined)
assert.equal(payload.text.includes('not selected'),false);assert.ok(payload.text.length<=4000)
assert.equal(payload.text.includes('journalExcerpts'),false,'Unselected history must not be transmitted')
console.log('PASS: growth dates, validation, import idempotence, missing-vs-zero, actual focus time, rates, reversible daily check-ins, save rollback, account isolation, reminder quiet hours, calendar and AI data scope')
