import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, BrainCircuit, FlaskConical, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'

const methodSteps = [
  { index: '01', title: '觉察', desc: '先描述能量、压力、情绪和注意力，不急着评价自己。' },
  { index: '02', title: '调节', desc: '用呼吸、环境、声音和身体动作回到可调度区。' },
  { index: '03', title: '训练', desc: '把目标压缩成可执行的最小动作，获得即时反馈。' },
  { index: '04', title: '复盘', desc: '记录触发、反应与结果，让有效做法可以复用。' },
]

export default function About() {
  const navigate = useNavigate()
  return (
    <div className="hos-page animate-float-up">
      <header className="about-hero">
        <img src={`${import.meta.env.BASE_URL}hos-icon-192-v2.png`} alt="HOS 标志" />
        <p className="brand-kicker">HOS · HUMAN OPERATING SYSTEM</p>
        <h1>让普通人拥有一套<br />可学习的自我管理系统</h1>
        <p>HOS 不是把人变成机器，而是帮助人更清楚地理解自己的身体、情绪、注意力、行动与意义。</p>
      </header>

      <section className="origin-band">
        <Sparkles size={20} className="text-hos-cyan" />
        <div><p className="section-kicker">WHY HOS</p><h2>项目缘起</h2><p>AI 的能力正在快速增长，人的升级不该只靠意志硬撑。我们希望把科学训练、古老修习、现代教练技术和数字工具整理成一条人人能执行、能记录、能迭代的成长路径。</p></div>
      </section>

      <section className="section-block">
        <div className="hos-section-title"><div><p className="section-kicker">THE LOOP</p><h2>一套完整训练闭环</h2></div></div>
        <div className="method-list">
          {methodSteps.map((step) => <article key={step.index}><span>{step.index}</span><div><h3>{step.title}</h3><p>{step.desc}</p></div></article>)}
        </div>
      </section>

      <section className="section-block">
        <div className="hos-section-title"><div><p className="section-kicker">EVIDENCE BOUNDARY</p><h2>我们如何对待“科学”</h2></div></div>
        <div className="evidence-list">
          <article><BookOpenCheck size={20} className="text-emerald-300" /><div><strong>A · 有较充分依据</strong><p>睡眠卫生、规律运动、慢呼吸、认知重评、刻意练习、环境减负。</p></div></article>
          <article><BrainCircuit size={20} className="text-sky-300" /><div><strong>B · 有机制与初步证据</strong><p>心象预演、HRV 呼吸训练、声音环境对注意与情绪的辅助作用。</p></div></article>
          <article><FlaskConical size={20} className="text-amber-300" /><div><strong>C · 探索性体验</strong><p>特定频率、象征图像与部分传统修习，作为体验工具，不宣称确定疗效。</p></div></article>
        </div>
      </section>

      <section className="boundary-note">
        <ShieldCheck size={20} />
        <div><strong>重要边界</strong><p>HOS 提供的是自我觉察与训练辅助，不替代医疗诊断、心理治疗或紧急援助。音频用于营造环境和节律提示，不应被理解为疾病治疗。</p></div>
      </section>

      <section className="section-block">
        <div className="hos-section-title"><div><p className="section-kicker">CURRENT VERSION</p><h2>当前已开放</h2></div></div>
        <div className="release-grid">
          <span>7 日启动序列</span><span>状态感知 AI 教练</span><span>压力与睡眠协议</span><span>心流学习训练</span><span>模式重写日志</span><span>AI 心境音频库</span><span>视觉状态诊断</span><span>经典阅读修习</span><span>生物节律建议</span><span>本机成长记录</span>
        </div>
      </section>

      <button onClick={() => navigate('/support')} className="support-entry">
        <HeartHandshake size={22} className="text-rose-300" />
        <span className="min-w-0 flex-1 text-left"><strong>支持 HOS 持续迭代</strong><small>查看共建方式与公开记录原则</small></span>
        <ArrowRight size={17} />
      </button>
    </div>
  )
}
