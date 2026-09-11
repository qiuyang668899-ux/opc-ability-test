import { ArrowRight, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { practiceLearning } from '../engines/practiceOutcomeEngine'

export default function PracticeLearningCard() {
  const navigate = useNavigate()
  const { records, rated, best, minutes } = practiceLearning()
  return <section className="practice-learning-card">
    <header><Sprout size={20} /><span>找到适合你的节奏</span><small>来自你的真实反馈</small></header>
    <h2>{best ? `「${best.title}」值得再试一次` : records.length ? '你做过的练习，正在变成经验' : '不追求打卡，留意真实的改变'}</h2>
    <p>{best ? `在 ${best.count} 次前后自评中，舒适度平均上升 ${(best.delta / best.count).toFixed(1)} 分。只是你的个人观察，不代表因果或疗效。` : '练习前后各点一下感受，记录够了，再看哪些方式更适合你。没变好也值得被记住。'}</p>
    <div className="practice-learning-stats"><span><strong>{records.length}</strong> 次练习</span><span><strong>{minutes}</strong> 分钟</span><span><strong>{rated.length}</strong> 次前后对比</span></div>
    <button onClick={() => navigate(best?.route ?? '/cultivation')}>{best ? '再练一次' : '从一次温和日课开始'}<ArrowRight size={16} /></button>
  </section>
}
