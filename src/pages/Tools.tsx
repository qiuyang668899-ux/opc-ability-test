import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  BookOpenText,
  BrainCircuit,
  CalendarCheck,
  Camera,
  Focus,
  Sparkles,
  HeartHandshake,
  Info,
  Music2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

type ToolItem = {
  title: string
  desc: string
  path: string
  icon: LucideIcon
  tone: 'sage' | 'peach' | 'lavender' | 'sand'
}

const groups: { title: string; desc: string; items: ToolItem[] }[] = [
  {
    title: '看见当下',
    desc: '从身体、表情和内在感受开始觉察',
    items: [
      { title: '视觉状态诊断', desc: '摄像头预览、状态觉察与对应练习建议', path: '/visual', icon: Camera, tone: 'peach' },
      { title: '生物节律', desc: '结合时间与能量安排工作、恢复和睡眠', path: '/biosync', icon: Activity, tone: 'sage' },
      { title: 'AI 成长教练', desc: '把模糊感受整理成清晰的下一步', path: '/architect', icon: BrainCircuit, tone: 'lavender' },
    ],
  },
  {
    title: '调节状态',
    desc: '压力高、能量低或睡不着时快速调用',
    items: [
      { title: '系统重置', desc: '呼吸、着陆与即时稳态练习', path: '/reset', icon: RotateCcw, tone: 'sage' },
      { title: '协议库', desc: '覆盖压力、冲突、过载、失眠等场景', path: '/protocols', icon: ShieldCheck, tone: 'sand' },
      { title: '心境音乐', desc: '真实场景音、冥想纯音乐与频率合集', path: '/music', icon: Music2, tone: 'peach' },
    ],
  },
  {
    title: '训练成长',
    desc: '把变化做成可以持续的小闭环',
    items: [
      { title: '个人进化中枢', desc: '五维状态、今日路径与 21 天成长闭环', path: '/evolution', icon: Sparkles, tone: 'peach' },
      { title: '7 日启动', desc: '循序建立第一套个人操作系统', path: '/activation', icon: CalendarCheck, tone: 'sage' },
      { title: '心流学习舱', desc: '技能拆解、预演、练习与即时反馈', path: '/flow', icon: Focus, tone: 'lavender' },
      { title: '模式日志', desc: '记录触发、反应和新的选择', path: '/journal', icon: BookOpen, tone: 'sand' },
      { title: '经典修习', desc: '道家、禅修与儒家经典的闻思修记', path: '/classics', icon: BookOpenText, tone: 'peach' },
    ],
  },
]

export default function Tools() {
  const navigate = useNavigate()

  return (
    <div className="hos-page animate-float-up">
      <header className="tools-header">
        <p className="section-kicker">完整功能地图</p>
        <h1>所有能力都在这里</h1>
        <p>功能只增不减。你可以按“看见—调节—训练”的顺序使用，也可以直接进入此刻最需要的模块。</p>
      </header>

      {groups.map((group) => (
        <section key={group.title} className="tool-group">
          <div className="hos-section-title"><div><h2>{group.title}</h2><p>{group.desc}</p></div></div>
          <div className="tool-list">
            {group.items.map((item) => (
              <button key={item.path} onClick={() => navigate(item.path)} className="tool-row">
                <span className={`shortcut-icon ${item.tone}`}><item.icon size={20} /></span>
                <span><strong>{item.title}</strong><small>{item.desc}</small></span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="quiet-links">
        <button onClick={() => navigate('/about')}><Info size={17} />关于 HOS</button>
        <button onClick={() => navigate('/support')}><HeartHandshake size={17} />共建支持</button>
      </section>
    </div>
  )
}
