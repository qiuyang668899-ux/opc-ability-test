import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Cloud, Download, Heart, LogOut, RefreshCw, Share2, ShieldCheck, Smartphone, Sparkles, UserRound } from 'lucide-react'
import { accountAPI, getAccountConfig, signIn, signOut, type AccountConfig, type Benefits, type Order, type Product } from '../services/accountService'
import { accountIdentity, accountSession, setAccountSession } from '../services/accountSession'
import { cloudEnabled, cloudStatus, collectArchive, downloadCloudCopy, downloadJSON, enableCloud, importGuestArchive, resolveCloud, setCloudEnabled, syncCloud } from '../services/cloudArchive'
import { loadState, saveState } from '../stores/useStore'
import VoiceInputButton from '../components/VoiceInputButton'
import './Account.css'

const money = (fen: number) => `¥${(fen / 100).toFixed(2)}`
const date = (time: number) => new Date(time).toLocaleDateString('zh-CN')
const orderState: Record<string,string> = { pending: '待支付／待确认', paid: '已支付', refund_requested: '退款申请待处理', refunded: '已退款' }

export default function Account() {
  const [config, setConfig] = useState<AccountConfig | null>(null)
  const [session, setSession] = useState(accountSession)
  const [benefits, setBenefits] = useState<Benefits | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [terms, setTerms] = useState(false)
  const [adult, setAdult] = useState(false)
  const [cloudConsent, setCloudConsent] = useState(false)
  const [sync, setSync] = useState(cloudStatus)
  const [preferences, setPreferences] = useState(() => loadState<string>('personalPreferences', ''))
  const [provider, setProvider] = useState('wechat')
  const [rewards, setRewards] = useState(0)
  const orderKey = useRef<{ product: string; provider: string; key: string } | null>(null)
  const run = async (name: string, fn: () => Promise<void>) => {
    if (busy) return
    setBusy(name); setError(''); setNotice('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : '暂时未能完成，请稍后再试。') } finally { setBusy('') }
  }
  const refresh = async () => {
    const next = await getAccountConfig(); setConfig(next)
    if (next.paymentChannels?.length) setProvider(next.paymentChannels[0])
    if (accountSession()) {
      const me = await accountAPI<{entitlements: Benefits}>('/api/account/me'); setBenefits(me.entitlements)
      const data = await accountAPI<{orders:Order[]}>('/api/commerce/orders'); setOrders(data.orders)
      if(next.referrals) {const referrals=await accountAPI<{rewarded:number}>('/api/account/referrals');setRewards(referrals.rewarded)}
    }
  }
  useEffect(() => {
    void refresh().catch(e => setError(e instanceof Error ? e.message : '服务连接失败'))
    const changed = () => setSession(accountSession())
    const synced = () => setSync({...cloudStatus()})
    window.addEventListener('hos:account-changed',changed); window.addEventListener('hos:cloud-status',synced)
    return () => { window.removeEventListener('hos:account-changed',changed);window.removeEventListener('hos:cloud-status',synced) }
  }, [])
  useEffect(() => { if (!cooldown) return; const timer=window.setTimeout(()=>setCooldown(v=>Math.max(0,v-1)),1000);return ()=>window.clearTimeout(timer) }, [cooldown])
  const authBody = { phone, acceptedTerms:terms, adult, policyVersion:config?.policyVersion }
  const requestCode = () => run('code',async()=>{
    const data=await accountAPI<{challengeId:string;retryAfter:number}>('/api/account/send-code','POST',authBody)
    setChallenge(data.challengeId);setCooldown(data.retryAfter);setNotice('验证码已发送，请查看手机短信。')
  })
  const login = () => run('login',async()=>{
    const inviteCode=new URLSearchParams(window.location.search).get('invite') || ''
    await signIn({...authBody,code,challengeId:challenge,inviteCode}); await refresh();setNotice('已登录。你的访客记录仍保留，是否导入由你决定。')
  })
  const purchase = (product: Product) => run(`buy:${product.id}`,async()=>{
    if(!session || product.amountFen===null) throw new Error('请先登录并确认商品价格。')
    if(!window.confirm(`确认购买「${product.name}」，支付 ${money(product.amountFen)}？不自动续费。`)) return
    if(orderKey.current?.product!==product.id || orderKey.current.provider!==provider) orderKey.current={product:product.id,provider,key:crypto.randomUUID()}
    const result=await accountAPI<{status:string;checkoutUrl?:string}>('/api/commerce/orders','POST',{productId:product.id,expectedAmountFen:product.amountFen,provider,requestKey:orderKey.current.key})
    if(result.status==='paid') {await refresh();setNotice('该订单已经支付，权益已更新。');return}
    if(!result.checkoutUrl) throw new Error('未获得支付链接，没有扣款确认。请查看订单。')
    const url=new URL(result.checkoutUrl)
    if(url.protocol!=='https:' || !['wx.tenpay.com','openapi.alipay.com'].includes(url.hostname)) throw new Error('支付链接不受信任，已阻止跳转。')
    window.location.assign(url.href)
  })
  const share = () => run('share',async()=>{
    const url=new URL(import.meta.env.BASE_URL,window.location.origin)
    if(config?.referrals && session) url.searchParams.set('invite',session.user.inviteCode)
    url.hash=config?.referrals && session ? '/account' : '/'
    if(navigator.share) await navigator.share({title:'HOS · 给自己一点空间',text:'从说出今天的状态开始，找到适合自己的下一步。',url:url.href})
    else {await navigator.clipboard.writeText(url.href);setNotice('分享链接已复制，不包含你的日记或个人资料。')}
  })
  return <main className="hos-page account-page animate-float-up">
    <header className="account-heading"><p className="section-kicker">MY HOS · 与自己好好相处</p><h1>每一步，都属于你。</h1><p>让记录成为理解，让陪伴慢慢积累。</p></header>
    <section className="account-card account-profile">
      <span className="account-avatar"><UserRound size={26}/></span><div><h2>{session ? session.user.phoneMasked : '你好，欢迎来到 HOS'}</h2><p>{session ? '账户已验证 · 本机记录按账号独立保存' : accountIdentity() ? '登录已过期，记录仍在原账号空间中' : '先体验，再决定是否登录。已有功能继续开放。'}</p></div>
      <span className="account-status">{session ? '已登录' : '体验模式'}</span>
    </section>
    {(error || notice) && <div className={`account-notice ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    {!config && <div className="account-card"><p>正在连接账户服务；这不会影响原有练习。</p><button className="account-button" disabled={!!busy} onClick={()=>void run('refresh',refresh)}><RefreshCw size={16}/>重新连接</button></div>}
    {!session && <section className="account-card"><div className="account-section-head"><Smartphone size={21}/><div><h2>手机号登录</h2><p>一个账号，衔接你的成长记录</p></div><span className="account-status">{config?.login ? '已开放' : '待开通'}</span></div>
      <p className="account-hint">{config?.loginMessage || '短信服务状态确认中，暂不发送验证码。'}</p>
      <form onSubmit={event=>{event.preventDefault();void login()}}>
        <label className="account-label" htmlFor="hos-phone">中国大陆手机号</label><div className="account-phone"><span>+86</span><input id="hos-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="请输入手机号" maxLength={11} value={phone} disabled={!config?.login || !!busy} onChange={e=>{setPhone(e.target.value.replace(/\D/g,''));setChallenge('');setCode('')}}/></div>
        <label className="account-label" htmlFor="hos-code">短信验证码</label><div className="account-code"><input id="hos-code" inputMode="numeric" autoComplete="one-time-code" placeholder="6 位验证码" maxLength={6} value={code} disabled={!config?.login || !!busy} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><button type="button" className="account-button" disabled={!config?.login || !!busy || cooldown>0 || !terms || !adult || !/^1[3-9]\d{9}$/.test(phone)} onClick={()=>void requestCode()}>{cooldown ? `${cooldown} 秒后重发` : '获取验证码'}</button></div>
        <label className="account-checkbox"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} disabled={!config?.login}/>我已阅读并同意本页的用户协议与隐私说明</label>
        <label className="account-checkbox"><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} disabled={!config?.login}/>我已年满 18 周岁</label>
        <button type="submit" className="account-button primary wide" disabled={!config?.login || !!busy || !terms || !adult || !challenge || code.length!==6}>{busy==='login' ? '正在验证…' : '验证并登录 / 注册'}<ArrowRight size={17}/></button>
      </form><Link className="account-text-link" to="/">无需登录，继续体验 <ArrowRight size={14}/></Link>
      {accountIdentity() && <button className="account-text-link" onClick={()=>{if(window.confirm('切回访客空间？原账号在本机的记录会保留。')) setAccountSession(null)}}>切回访客空间</button>}
    </section>}

    <section className="account-card"><div className="account-section-head"><Cloud size={22}/><div><h2>你的长期记忆</h2><p>记录归你所有，同步由你决定</p></div><span className="account-status">{config?.cloud ? '可选开启' : '仅本机可用'}</span></div>
      <p className="account-hint">日记、语音转写、练习与阅读进度可以组成个人档案。云端保存将单独征得同意；此版本不上传原始录音。访客记录不会自动归入任何账号。</p>
      <label className="account-label" htmlFor="hos-preferences">希望 HOS 记住什么？</label><div className="account-preferences"><textarea id="hos-preferences" placeholder="比如：我喜欢简短建议，想改善睡前状态，喜欢雨声。" maxLength={600} value={preferences} onChange={e=>setPreferences(e.target.value)}/><VoiceInputButton value={preferences} onChange={setPreferences} maxLength={600} label="说说你的偏好和目标"/></div>
      <button className="account-button" onClick={()=>{if(saveState('personalPreferences',preferences.trim())) setNotice('偏好已保存在当前本机空间，会用于下一次 AI 教练分析。');else setError('本机存储失败，请先导出备份。')}}><Check size={16}/>保存我的偏好</button>
      <div className="account-divider"/>
      <label className="account-checkbox"><input type="checkbox" checked={cloudConsent} disabled={!config?.cloud || !session || !!busy} onChange={e=>setCloudConsent(e.target.checked)}/>我单独同意将所选档案保存到云端，其中可能包含健康感受或宗教修习等敏感信息。数据部署地区：{config?.dataRegion || '尚未确认'}。</label>
      <div className="account-actions"><button className="account-button primary" disabled={!session || !config?.cloud || !cloudConsent || !!busy} onClick={()=>void run('cloud',async()=>{await accountAPI('/api/account/consent','POST',{enabled:true,policyVersion:config?.policyVersion});await enableCloud()})}><Cloud size={16}/>开启云端记忆</button><button className="account-button" disabled={!cloudEnabled() || !!busy} onClick={()=>void run('sync',syncCloud)}><RefreshCw size={16}/>立即同步</button></div>
      <p className="account-hint" role="status">{cloudEnabled() || sync.state==='conflict' ? sync.message : '尚未开启云端记忆；当前内容仅保存在本机。'}</p>
      {sync.state==='conflict' && <div className="account-conflict"><p>发现不同版本，不会自动覆盖。请先备份，再选择保留哪一份。</p><div className="account-actions"><button className="account-button" onClick={()=>void run('download',downloadCloudCopy)}>下载云端副本</button><button className="account-button" onClick={()=>{if(window.confirm('确认使用云端版本？会先下载本机备份。')) void run('resolve',()=>resolveCloud('cloud'))}}>恢复云端</button><button className="account-button" onClick={()=>{if(window.confirm('确认以本机版本更新云端？会先下载双方备份。')) void run('resolve',()=>resolveCloud('local'))}}>上传本机</button></div></div>}
      <div className="account-actions"><button className="account-text-link" onClick={()=>void run('export',async()=>downloadJSON({data:collectArchive(),exportedAt:Date.now()},'HOS-个人档案.json'))}><Download size={15}/>导出当前档案</button>{session && <button className="account-text-link" onClick={()=>void run('import',async()=>{importGuestArchive();setNotice('已导入本机访客记录；访客原件仍保留。')})}>导入访客记录</button>}{cloudEnabled() && <button className="account-text-link" onClick={()=>setCloudEnabled(false)}>暂停同步</button>}</div>
      {session && config?.cloud && <button className="account-danger" onClick={()=>{if(window.confirm('永久删除云端档案并撤回云端保存同意？本机记录不会删除。')) void run('delete',async()=>{await accountAPI('/api/account/archive','DELETE');setCloudEnabled(false);setCloudConsent(false);setNotice('云端档案已删除，本机记录保留。')})}}>删除云端档案并撤回同意</button>}
    </section>

    <section className="account-card"><div className="account-section-head"><Sparkles size={22}/><div><h2>更多陪伴，按需选择</h2><p>基础内容保留 · 不自动续费</p></div></div>
      {benefits && <div className="account-benefits"><div><strong>{benefits.member ? date(benefits.memberUntil) : '免费体验'}</strong><span>{benefits.member ? '会员到期日' : '当前权益'}</span></div><div><strong>{benefits.credits}</strong><span>剩余加量次数</span></div><div><strong>{benefits.dailyAllowance}</strong><span>每日 AI 上限</span></div></div>}
      <div className="account-plans">{config?.products.map(product=><article key={product.id}><span>{product.kind==='member_days' ? '持续陪伴' : '灵活加量'}</span><h3>{product.name}</h3><p>{product.detail}</p><strong>{product.amountFen===null ? '价格待公布' : money(product.amountFen)}</strong><button className="account-button" disabled={!product.purchasable || !session || !!busy} onClick={()=>void purchase(product)}>{product.purchasable ? session ? '确认购买' : '登录后购买' : '暂未开放购买'}</button></article>)}</div>
      {config?.payments && <label className="account-label">支付方式<select value={provider} onChange={e=>{setProvider(e.target.value);orderKey.current=null}}>{config.paymentChannels?.map(channel=><option key={channel} value={channel}>{channel==='wechat' ? '微信支付（外部浏览器）' : '支付宝'}</option>)}</select></label>}
      <p className="account-hint">{config?.paymentMessage || '价格和支付服务确认中。'} 服务包不是现金钱包，不支持转账或提现。真实支付开放前还需完成商户、退款与对账验收。</p>
    </section>
    <section className="account-card"><div className="account-section-head"><Heart size={22}/><div><h2>把好的改变，分享给朋友</h2><p>不分享，也能完整使用免费功能</p></div></div>
      <p className="account-hint">{config?.referrals && session ? `每位首次注册并完成一次真实 AI 使用的新朋友，可为你增加 3 天会员期，滚动 30 天最多奖励 30 天。已成功邀请 ${rewards} 人。仅一级奖励，不可兑现。` : '分享不包含你的日记、手机号或状态信息。邀请奖励尚未开放，分享本身不会增加额度。'}</p><button className="account-button" disabled={!!busy} onClick={()=>void share()}><Share2 size={16}/>分享 HOS</button>
    </section>
    {session && <section className="account-card"><div className="account-section-head"><div><h2>订单与服务记录</h2><p>仅以支付平台核验结果为准</p></div><button className="account-button" disabled={!!busy} onClick={()=>void run('refresh',refresh)}><RefreshCw size={15}/>刷新</button></div>{!orders.length ? <p className="account-hint">暂无订单。没有发起购买，就不会产生收费。</p> : orders.map(order=><article className="account-order" key={order.id}><div><strong>{config?.products.find(p=>p.id===order.product_id)?.name || 'HOS 服务'}</strong><span>{money(order.amount_fen)} · {orderState[order.status] || '处理中'}</span></div><small>{date(order.created_at)} · {order.id}</small>{order.status==='paid' && <button className="account-text-link" onClick={()=>{const reason=window.prompt('请填写退款原因（申请不等于已退款，运营客服会处理）：');if(reason) void run('refund',async()=>{await accountAPI('/api/commerce/refund-request','POST',{orderId:order.id,reason});await refresh();setNotice('退款申请已记录，请联系运营客服；尚未完成退款。')})}}>申请退款</button>}</article>)}</section>}
    <details className="account-card account-legal"><summary><ShieldCheck size={18}/>用户协议与隐私说明{config?.login ? '' : '（上线准备版）'}</summary><p>运营主体：{config?.operator || '待主体认证后公示'}。客服：{config?.supportEmail || '正式开放前公示'}。版本：{config?.policyVersion || '准备中'}。</p><p>手机号仅用于身份验证、安全及账户服务。验证码由短信服务商校验；HOS 不保存验证码明文。登录会话有效期 12 小时，关闭标签页后需要重新登录。</p><p>云端档案默认关闭、单独选择。开启后同步日记、语音文字、状态、练习、阅读进度、偏好及教练对话；不上传原始录音。传输使用 HTTPS，服务端加密存储，并非端到端加密。当前 GitHub 体验入口未启用大陆用户云档案，正式部署地区和服务商需先公示。</p><p>你可以导出档案、暂停同步、删除云档案并撤回同意。账号注销及依法需保留的订单处理，请联系正式开放后的运营客服。不要在共享设备保留私人记录。AI 请求会将当次表达与必要的状态、偏好摘要发送给 DeepSeek，用于生成回复，不代表专业医疗意见。</p><p>服务仅面向成年人。经典与练习不以购买为前提；AI 额度会受系统总容量和公平使用限制。正式收款前需公示确定价格、交付内容、退款规则及客服渠道。邀请活动须通过平台规则审查后单独开放，不强制分享。</p><a className="account-text-link" href={`${import.meta.env.BASE_URL}commercial-launch.html`} target="_blank" rel="noreferrer">查看正式上线准备清单 <ArrowRight size={14}/></a></details>
    {session && <button className="account-button wide" disabled={!!busy} onClick={()=>void run('logout',async()=>{if(cloudEnabled()) await syncCloud();await signOut()})}><LogOut size={16}/>退出登录</button>}
    <Link className="account-text-link account-back" to="/journal">回到我的日志 <ArrowRight size={15}/></Link>
  </main>
}
