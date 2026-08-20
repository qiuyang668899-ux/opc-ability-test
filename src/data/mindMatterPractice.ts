export type MindMatterPhase = {
  id: 1 | 2 | 3
  days: string
  title: string
  goal: string
  success: string
}

export type MindMatterStep = {
  id: 'still' | 'focus' | 'visualize' | 'bind' | 'test' | 'close'
  character: '静' | '定' | '观' | '合' | '发' | '收'
  title: string
  minutes: number
  objective: string
  instruction: string[]
  cue: string
  safety?: string
}

export const MIND_MATTER_PHASES: MindMatterPhase[] = [
  { id: 1, days: '1—30', title: '造意识信号', goal: '静得下来、定得住、观得清。', success: '不以目标物移动为进步指标，只看注意稳定与返回速度。' },
  { id: 2, days: '31—60', title: '建立状态按钮', goal: '把呼吸、白球、单音与手势绑定，再逐步撤去脚手架。', success: '从需要较长准备，逐渐练到约 30 秒内稳定进入聚合状态。' },
  { id: 3, days: '61—100', title: '专攻意—物实验', goal: '简化为“看 → 定 → 一念 → 发 → 松”。', success: '只承认可重复、方向预先设定且排除扰动的观察；零结果也如实保存。' },
]

export const MIND_MATTER_STEPS: MindMatterStep[] = [
  {
    id: 'still', character: '静', title: '安那般那', minutes: 10,
    objective: '降低意识背景噪声。',
    instruction: ['坐直但不僵硬，身体保持舒服。', '闭眼，把注意放在鼻端自然呼吸。', '吸——知道吸；呼——知道呼。', '念头出现不压制，发现后立即回到呼吸。', '前 30 天可数息 1 到 10，再回到 1；之后逐渐取消数字。'],
    cue: '息静，不求气感。',
  },
  {
    id: 'focus', character: '定', title: '一点凝神', minutes: 10,
    objective: '训练注意的“意识束宽”。',
    instruction: ['睁眼，观察约 1 米外、直径约 1 厘米的固定黑点。', '自然眨眼，不瞪视、不硬撑。', '不分析黑点，也不想“产生力量”。', '走神后只返回：看。'],
    cue: '世界仍在，注意只有一个中心。',
    safety: '若眼干、头痛或视觉不适，闭眼休息并结束本步。',
  },
  {
    id: 'visualize', character: '观', title: '单一观想', minutes: 10,
    objective: '训练对内部表象的精确控制。',
    instruction: ['闭眼，只观一个白色光球。', '100 天固定它的初始大小、位置、距离与亮度。', '表象稳定后再做单变量变化：大/小、近/远、左/右。', '一次只改变一个变量，散掉后回到初始白球。'],
    cue: '不追逐神秘体验，只校准表象。',
  },
  {
    id: 'bind', character: '合', title: '意息声形四合一', minutes: 10,
    objective: '把多个系统绑定到同一个意向。',
    instruction: ['双手自然置于腹前，固定同一个简单手势。', '吸气时观想白球，呼气时发固定单音（如 OM）。', '呼气、声音、手势和白球只表达同一个意向。', '熟练后依次撤去声音、动作，最终只留一念。'],
    cue: '一念 · 一息 · 一声 · 一形。',
    safety: '自然呼吸，不延长憋气；声音以喉咙舒适为准。',
  },
  {
    id: 'test', character: '发', title: '意—物观察实验', minutes: 15,
    objective: '检验结果表征，而不是证明信念。',
    instruction: ['固定同一个轻质悬挂目标，并使用透明罩隔绝气流；不用火焰。', '身体不动，进入“合”的状态后，只保留预先选定的方向符号“→”。', '保持 20—30 秒，然后完全放松 30 秒。', '循环“聚 → 发 → 松”；不要连续用心理力量顶住目标。', '定期插入同等时长的“无意向对照轮”，最好由他人随机安排，再比较两类记录。', '结束后记录真实观察，包括“没有移动”和任何气流、热、振动等干扰。'],
    cue: '只留结果，发出后即止。',
    safety: '“意识直接影响物质”尚无可靠科学证据。本步是注意训练与受控观察，不把偶然微动当作能力证明。',
  },
  {
    id: 'close', character: '收', title: '彻底退出', minutes: 5,
    objective: '练习需要时进入、不需要时退出。',
    instruction: ['停止观想、目标意向、声音与手势。', '恢复自然呼吸，依次感觉脚、腿、躯干和周围声音。', '睁眼，确认方向、时间与现实环境，然后结束。'],
    cue: '念至，即止；功毕，归常。',
  },
]

export const MIND_MATTER_MANTRA = ['身松', '息静', '心一', '意明', '念至', '即止']
