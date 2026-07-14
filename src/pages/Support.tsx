import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Medal,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  WalletCards,
} from 'lucide-react'
import { CONFIRMED_SUPPORTERS } from '../data/supporters'
import { loadState, saveState } from '../stores/useStore'

interface PendingSupport {
  id: string
  nickname: string
  amount: number
  message: string
  createdAt: number
  status: 'pending'
}

const amountOptions = [
  { amount: 7, label: '一束微光', detail: '表达一份认可' },
  { amount: 36, label: '一段训练', detail: '支持内容打磨' },
  { amount: 99, label: '一轮迭代', detail: '支持功能维护' },
  { amount: 365, label: '年度共建', detail: '陪伴长期生长' },
]

export default function Support() {
  const [selectedAmount, setSelectedAmount] = useState(36)
  const [customAmount, setCustomAmount] = useState('')
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'leaderboard' | 'mine'>('leaderboard')
  const [saved, setSaved] = useState(false)
  const [pendingRecords, setPendingRecords] = useState<PendingSupport[]>(() => loadState('pendingSupport', []))

  const finalAmount = customAmount ? Math.max(1, Number(customAmount) || 1) : selectedAmount
  const ranking = useMemo(() => {
    const totals = new Map<string, { nickname: string; total: number; count: number; latest: string; message?: string }>()
    CONFIRMED_SUPPORTERS.forEach((record) => {
      const current = totals.get(record.nickname)
      totals.set(record.nickname, {
        nickname: record.nickname,
        total: (current?.total ?? 0) + record.amount,
        count: (current?.count ?? 0) + 1,
        latest: current && current.latest > record.confirmedAt ? current.latest : record.confirmedAt,
        message: record.message || current?.message,
      })
    })
    return Array.from(totals.values()).sort((a, b) => b.total - a.total)
  }, [])

  const saveSupportIntent = () => {
    const safeName = nickname.trim() || '匿名共建者'
    const record: PendingSupport = {
      id: `support-${Date.now()}`,
      nickname: safeName,
      amount: finalAmount,
      message: message.trim().slice(0, 120),
      createdAt: Date.now(),
      status: 'pending',
    }
    const next = [record, ...pendingRecords]
    setPendingRecords(next)
    saveState('pendingSupport', next)
    setSaved(true)
    setTab('mine')
    setNickname('')
    setMessage('')
  }

  const removeRecord = (id: string) => {
    const next = pendingRecords.filter((record) => record.id !== id)
    setPendingRecords(next)
    saveState('pendingSupport', next)
  }

  return (
    <div className="hos-page animate-float-up">
      <header className="support-hero">
        <div className="flex items-center gap-2 text-rose-300">
          <HeartHandshake size={19} />
          <span className="section-kicker !text-rose-300">BUILD HOS TOGETHER</span>
        </div>
        <h1>让人的成长工具，<br />持续开放生长。</h1>
        <p>每一份支持都用于内容研究、音频制作、产品维护与体验迭代。核心训练会继续保持可访问。</p>
      </header>

      <section className="section-block">
        <div className="hos-section-title">
          <div><p className="section-kicker">CHOOSE SUPPORT</p><h2>选择赞赏心意</h2></div>
          <strong className="text-[22px] text-hos-text">¥{finalAmount}</strong>
        </div>
        <div className="amount-grid">
          {amountOptions.map((option) => (
            <button
              key={option.amount}
              onClick={() => { setSelectedAmount(option.amount); setCustomAmount(''); setSaved(false) }}
              className={selectedAmount === option.amount && !customAmount ? 'active' : ''}
            >
              <strong>¥{option.amount}</strong>
              <span>{option.label}</span>
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="mb-2 block text-[12px] text-hos-text-dim">自定义金额</span>
          <div className="amount-input"><span>¥</span><input inputMode="numeric" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value.replace(/\D/g, '').slice(0, 6)); setSaved(false) }} placeholder="输入其他金额" /></div>
        </label>
      </section>

      <section className="payment-status">
        <WalletCards size={25} className="text-hos-gold" />
        <div>
          <p className="section-kicker">PAYMENT STATUS</p>
          <h2>微信赞赏通道待绑定</h2>
          <p>当前页面不会扣款，也没有展示任何第三方收款码。请勿向非本页后续公布的官方账户付款。</p>
        </div>
        <span>安全准备中</span>
      </section>

      <section className="section-block">
        <div className="hos-section-title"><div><p className="section-kicker">SUPPORT INTENT</p><h2>登记共建意向</h2></div></div>
        <div className="space-y-3">
          <input className="hos-input" value={nickname} onChange={(event) => { setNickname(event.target.value.slice(0, 20)); setSaved(false) }} placeholder="昵称（不填则匿名）" />
          <textarea className="hos-input min-h-24 resize-none" value={message} onChange={(event) => { setMessage(event.target.value.slice(0, 120)); setSaved(false) }} placeholder="留下一句话（可选）" />
          <p className="text-[11px] leading-relaxed text-hos-text-muted">登记只保存在当前设备，不代表已经付款。支付完成并经项目方确认后，记录才会进入公开共建榜。</p>
          <button onClick={saveSupportIntent} className="primary-action w-full">
            {saved ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
            登记 ¥{finalAmount} 共建意向
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="leader-tabs" role="tablist" aria-label="赞赏记录">
          <button role="tab" aria-selected={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} className={tab === 'leaderboard' ? 'active' : ''}><Trophy size={15} />共建榜</button>
          <button role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')} className={tab === 'mine' ? 'active' : ''}><Clock3 size={15} />我的记录 {pendingRecords.length > 0 && <span>{pendingRecords.length}</span>}</button>
        </div>

        {tab === 'leaderboard' && (
          <div className="leader-list">
            {ranking.length === 0 ? (
              <div className="empty-state">
                <Medal size={30} />
                <h3>等待首位已确认共建者</h3>
                <p>排行榜只展示真实核验后的赞赏，不使用演示数据。</p>
              </div>
            ) : ranking.map((supporter, index) => (
              <article key={supporter.nickname} className="leader-row">
                <span className="rank-number">{index + 1}</span>
                <div><strong>{supporter.nickname}</strong><small>{supporter.count} 次支持 · 最近 {supporter.latest}</small>{supporter.message && <p>{supporter.message}</p>}</div>
                <b>¥{supporter.total}</b>
              </article>
            ))}
          </div>
        )}

        {tab === 'mine' && (
          <div className="leader-list">
            {pendingRecords.length === 0 ? (
              <div className="empty-state"><Clock3 size={30} /><h3>本机暂无待确认记录</h3><p>选择金额并登记后，会在这里保留。</p></div>
            ) : pendingRecords.map((record) => (
              <article key={record.id} className="pending-row">
                <div className="min-w-0 flex-1">
                  <span><Clock3 size={12} /> 待支付 / 待确认</span>
                  <strong>{record.nickname} · ¥{record.amount}</strong>
                  <small>{new Date(record.createdAt).toLocaleString('zh-CN')}</small>
                  {record.message && <p>{record.message}</p>}
                </div>
                <button onClick={() => removeRecord(record.id)} className="icon-action" aria-label="删除本机记录" title="删除本机记录"><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="trust-note">
        <ShieldCheck size={18} />
        <p><strong>公开记录原则</strong>：金额可由支持者选择是否公开；昵称可匿名；未经核验的记录不会进入排行榜。</p>
      </section>
    </div>
  )
}
