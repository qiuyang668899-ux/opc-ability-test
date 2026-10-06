import { useNavigate } from 'react-router-dom'
import { Heart, ArrowLeft } from 'lucide-react'

export default function ImmediateSupport() {
  const navigate = useNavigate()
  return <div className="hos-page immediate-support">
    <button onClick={() => navigate('/architect')}><ArrowLeft size={17} />返回教练</button>
    <Heart size={32} /><p>此刻，你的安全最重要</p>
    <h1>先让一个真实的人<br />陪在你身边。</h1>
    <p>如果你可能立即伤害自己或他人，或已经受伤，请马上联系当地急救或前往急诊。HOS 不能提供实时危机干预。</p>
    <ol><li>远离可能造成伤害的物品，去有人在的安全地方。</li><li>联系一个你信任的人，直接告诉对方：“我现在不太安全，需要你陪着我。”</li><li>如果存在即时危险，请联系你所在地的紧急服务，不要等待应用回复。</li></ol>
    <p>这不是需要独自完成的修行试炼，也不需要先完成任何呼吸、音频或打卡。</p>
    <button onClick={() => { void navigator.clipboard?.writeText('我现在不太安全，需要你陪着我。可以马上联系我或来陪我吗？').then(() => window.alert('求助文字已复制，可以发给你信任的人。')).catch(() => window.alert('请复制这句话：我现在不太安全，需要你陪着我。')) }}>复制一句求助的话</button>
  </div>
}
