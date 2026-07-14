export type ClassicCategory = '道家' | '禅修' | '儒家'

export type ClassicPassage = {
  id: string
  category: ClassicCategory
  work: string
  chapter: string
  title: string
  original: string
  reflection: string
  practice: string
  duration: number
}

export const CLASSIC_PASSAGES: ClassicPassage[] = [
  {
    id: 'dao-16-stillness', category: '道家', work: '《道德经》', chapter: '第十六章', title: '守静，才能看见变化',
    original: '致虚极，守静笃。万物并作，吾以观复。夫物芸芸，各复归其根。归根曰静，是谓复命。',
    reflection: '把心中的空间留出来，不急着追赶每一个念头。万事不断发生，也不断回到自己的根本。安静不是停止生活，而是重新看见生活的秩序。',
    practice: '安静坐三分钟。每次念头出现，只在心里说“我看见了”，然后把注意带回呼吸。', duration: 3,
  },
  {
    id: 'dao-8-water', category: '道家', work: '《道德经》', chapter: '第八章', title: '像水一样，不与自己对抗',
    original: '上善若水。水善利万物而不争，处众人之所恶，故几于道。',
    reflection: '水不依靠僵硬证明力量，却能滋养、适应并持续向前。真正的柔软不是退让，而是减少无谓对抗，把力量用在重要处。',
    practice: '想起今天一件正在对抗的事，问自己：如果像水一样处理，我可以绕开什么，又应滋养什么？', duration: 4,
  },
  {
    id: 'dao-33-self-knowledge', category: '道家', work: '《道德经》', chapter: '第三十三章', title: '把比较转回自知',
    original: '知人者智，自知者明。胜人者有力，自胜者强。知足者富，强行者有志。',
    reflection: '理解别人是一种聪明，理解自己才带来清明。成长不是不断胜过他人，而是一次次看见并调整自己的惯性。',
    practice: '写下一个你最近反复出现的模式，再写一句：下一次出现时，我愿意做出的不同选择是……', duration: 5,
  },
  {
    id: 'zhuang-empty-room', category: '道家', work: '《庄子·人间世》', chapter: '心斋', title: '虚室生白',
    original: '瞻彼阕者，虚室生白，吉祥止止。',
    reflection: '房间空下来，光才照得进来；心里不被判断和预设塞满，新的理解才有位置出现。',
    practice: '放下手机，清理眼前一小块空间。面对一个问题，只写事实，不写评价。', duration: 5,
  },
  {
    id: 'heart-sutra-observe', category: '禅修', work: '《般若波罗蜜多心经》', chapter: '观照', title: '照见，而不被困住',
    original: '照见五蕴皆空，度一切苦厄。',
    reflection: '身体感受、情绪、想法都在变化。看见它们是正在发生的经验，而不是永恒的“我”，就多了一点选择的空间。',
    practice: '依次觉察身体、感受和念头。每一项只描述：“此刻有……”，不解释、不评判。', duration: 5,
  },
  {
    id: 'diamond-non-attachment', category: '禅修', work: '《金刚般若波罗蜜经》', chapter: '庄严净土分', title: '无所住，而生其心',
    original: '应无所住而生其心。',
    reflection: '全心行动，但不把自己绑死在某个结果、评价或身份上。放下执着，不等于放弃责任，而是让心保持流动。',
    practice: '选择今天最重要的一件事，写下：“我会认真去做，同时允许结果不完全受我控制。”', duration: 4,
  },
  {
    id: 'anapanasati-breath', category: '禅修', work: '《安般守意经》', chapter: '数息', title: '用呼吸安住当下',
    original: '数息为遮意。',
    reflection: '数呼吸不是为了制造神秘体验，而是给散乱的注意力一个温和、稳定的归处。',
    practice: '自然呼吸，从一数到十。走神后不责备自己，从一重新开始，共做三轮。', duration: 5,
  },
  {
    id: 'great-learning-stop', category: '儒家', work: '《大学》', chapter: '经一章', title: '先知道停在哪里',
    original: '知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。',
    reflection: '明确什么最重要，注意力才有落点；有了落点，内心才能逐渐安定，并做出更周全的判断。',
    practice: '为今天写一个“止”：无论事情多少，今天最重要的完成标准只有什么？', duration: 4,
  },
  {
    id: 'analects-daily-review', category: '儒家', work: '《论语·学而》', chapter: '曾子三省', title: '每天一次诚实复盘',
    original: '吾日三省吾身。',
    reflection: '复盘不是自我苛责，而是把经历变成能力。真正有效的反省应当具体、可行动，也包含对自己的体谅。',
    practice: '回答三个问题：今天什么做得好？什么让我偏离？明天最小的改进是什么？', duration: 5,
  },
]
