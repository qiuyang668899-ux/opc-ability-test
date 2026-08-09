export type CultivationSafety = 'daily' | 'guided' | 'archive'
export type CultivationAxis = '肉身' | '元神' | '合修' | '德行' | '经学'

export type CultivationStep = {
  title: string
  instruction: string
  durationSec: number
  axis: CultivationAxis
}

export type CultivationRoutine = {
  id: string
  title: string
  subtitle: string
  description: string
  duration: number
  axes: CultivationAxis[]
  suitableFor: string[]
  steps: CultivationStep[]
}

export type CultivationMethod = {
  id: string
  axis: CultivationAxis
  title: string
  classicalName: string
  description: string
  todayPractice: string
  source: string
  safety: CultivationSafety
}

export type CultivationClassic = {
  id: string
  title: string
  era: string
  attribution: string
  focus: string
  axis: CultivationAxis
  safety: CultivationSafety
  description: string
  excerpt: string
  modernReading: string
  sourceLabel: string
  sourceUrl: string
  readerBook?: string
}

export type ImmortalStory = {
  id: string
  title: string
  figure: string
  era: string
  motif: '白日飞升' | '乘鹤' | '乘凤' | '水解' | '尸解' | '遇仙' | '炼丹' | '济世'
  source: string
  sourceUrl: string
  story: string
  insight: string
  historicalNote: string
}

export const CULTIVATION_ROUTINES: CultivationRoutine[] = [
  {
    id: 'body-spirit-12',
    title: '性命合修 · 十二分钟',
    subtitle: '肉身有根，元神有主',
    description: '从松身、自然呼吸、安静观照到一件善行，把身体与心神放回同一条路径。',
    duration: 12,
    axes: ['肉身', '元神', '德行'],
    suitableFor: ['日常筑基', '心神散乱', '久坐疲惫'],
    steps: [
      { title: '松形', instruction: '站稳或坐稳，缓慢活动肩、颈、腕、髋；只到舒适范围，不追求拉伸幅度。', durationSec: 180, axis: '肉身' },
      { title: '调息', instruction: '鼻吸口呼或自然鼻息，呼气略从容；不憋气、不数极限、不追逐特殊感觉。', durationSec: 180, axis: '肉身' },
      { title: '收心', instruction: '把注意放在身体接触地面的感觉。念头出现，只标记“想法”，再轻轻回来。', durationSec: 240, axis: '元神' },
      { title: '内观', instruction: '依次觉察额头、下颌、胸口、腹部。只看见，不解释，也不压制。', durationSec: 120, axis: '元神' },
      { title: '立愿', instruction: '为今天选一件清楚、善意、做得到的小事，并决定何时开始。', durationSec: 60, axis: '德行' },
    ],
  },
  {
    id: 'morning-foundation-8',
    title: '晨修筑基 · 八分钟',
    subtitle: '先醒身，再定意',
    description: '适合起床后或工作前，用轻柔活动和单一意图完成一天的“开炉”。',
    duration: 8,
    axes: ['肉身', '元神'],
    suitableFor: ['晨起', '低能量', '准备专注'],
    steps: [
      { title: '见光', instruction: '走到自然光附近，远望片刻；不直视太阳。', durationSec: 60, axis: '肉身' },
      { title: '舒展', instruction: '缓慢伸展躯干与四肢，配合自然呼吸；疼痛处不强行突破。', durationSec: 180, axis: '肉身' },
      { title: '守一', instruction: '安坐，选鼻端、手掌或脚底一个触点，走神后温和返回。', durationSec: 180, axis: '元神' },
      { title: '定向', instruction: '说出今天唯一最重要的结果，以及第一步。', durationSec: 60, axis: '元神' },
    ],
  },
  {
    id: 'night-return-10',
    title: '夜修归神 · 十分钟',
    subtitle: '收摄一天，安顿身心',
    description: '不追求入定或神秘体验，只帮助身体降速、把未完之事放回明天。',
    duration: 10,
    axes: ['元神', '肉身', '德行'],
    suitableFor: ['睡前过载', '反复思考', '结束一天'],
    steps: [
      { title: '熄屏', instruction: '把屏幕亮度降下，放远手机，整理出一个安静位置。', durationSec: 60, axis: '肉身' },
      { title: '放松', instruction: '从脚到头扫描身体，发现紧张就允许它软一点，不必强迫放松。', durationSec: 180, axis: '肉身' },
      { title: '坐忘', instruction: '让声音、感受和念头来去，不追、不赶，只保持清醒的看见。', durationSec: 240, axis: '元神' },
      { title: '日省', instruction: '记录一件做得好的事、一件愿意修正的事，然后停止复盘。', durationSec: 120, axis: '德行' },
    ],
  },
]

export const CULTIVATION_METHODS: CultivationMethod[] = [
  { id: 'daoyin', axis: '肉身', title: '导引养形', classicalName: '导引 · 行步 · 舒展', description: '把“命功”落到睡眠、步行、关节活动和身体边界，不以苦行为进阶。', todayPractice: '起身慢走 5 分钟，留意足底与呼吸。', source: '《养性延命录》及导引传统', safety: 'daily' },
  { id: 'breath', axis: '肉身', title: '自然调息', classicalName: '吐纳的安全日用层', description: '使用舒适、不断气的自然呼吸，培养节律感；强闭气、胎息追求与极限呼吸不在日用范围。', todayPractice: '舒适呼吸 3 分钟，呼气略慢，不用力。', source: '古代吐纳传统 · 现代安全改写', safety: 'daily' },
  { id: 'zuowang', axis: '元神', title: '坐忘澄神', classicalName: '收心 · 简事 · 真观', description: '练习看见念头而不被立即带走，重点是清醒、松开和返回，不追求幻象。', todayPractice: '安坐 5 分钟，每次走神都只做一次温和返回。', source: '司马承祯《坐忘论》', safety: 'daily' },
  { id: 'inner-view', axis: '元神', title: '内观守一', classicalName: '观身 · 守一 · 存思', description: '把象征语言转成身体觉察与注意训练；传统神真图像用于文化理解，不作为生理事实。', todayPractice: '依次感受额头、胸口、腹部与脚底。', source: '《黄庭内景经》与上清传统', safety: 'daily' },
  { id: 'virtue', axis: '德行', title: '积功累德', classicalName: '日录所为 · 孝悌忠信', description: '仙道经典反复把修行放回诚实、节制、济物和自省。可验证的改变，先发生在行为里。', todayPractice: '做一件不求回报、能真正减轻他人负担的小事。', source: '《净明宗教录》及仙传伦理', safety: 'daily' },
  { id: 'study', axis: '经学', title: '读经明理', classicalName: '闻 · 思 · 修 · 记', description: '先辨年代、文体与象征，再读原文和注疏；不把隐喻直接当成身体操作指令。', todayPractice: '读一小段原典，写下“它提醒我如何生活”。', source: '道藏与历代注疏传统', safety: 'daily' },
  { id: 'neidan', axis: '合修', title: '内丹次第', classicalName: '炼己 · 筑基 · 性命双修', description: '作为思想史与修炼谱系学习。火候、周天、龙虎、铅汞等术语流派差异很大，不提供脱离师承的技术处方。', todayPractice: '只练基础：规律作息、温和活动、清醒观照、诚实日省。', source: '《钟吕传道集》《悟真篇》《性命圭旨》', safety: 'guided' },
  { id: 'danger-archive', axis: '经学', title: '危险古法档案', classicalName: '外丹 · 服食 · 极端辟谷 · 强闭气', description: '保留文献价值，但不转化为练习。矿物炼丹、来历不明的服食、长期断食、窒息式闭气都可能造成严重伤害。', todayPractice: '仅阅读历史背景，不试做、不服用、不替代医疗。', source: '《抱朴子内篇》等历史材料', safety: 'archive' },
]

export const CULTIVATION_CLASSICS: CultivationClassic[] = [
  { id: 'dao-de-jing', title: '《道德经》', era: '先秦', attribution: '老子', focus: '自然、无为、守柔', axis: '经学', safety: 'daily', description: '修仙思想的哲学底座之一。先学少私寡欲、知止守柔，再谈任何“术”。', excerpt: '致虚极，守静笃。万物并作，吾以观复。', modernReading: '把心腾出一点空间，稳定观察事物如何发生、变化与回归。', sourceLabel: 'HOS 经典馆 · 开放文白语料', sourceUrl: 'https://ctext.org/dao-de-jing/zh', readerBook: '老子' },
  { id: 'zhuangzi', title: '《庄子》', era: '先秦至秦汉', attribution: '庄周及后学', focus: '坐忘、心斋、逍遥', axis: '元神', safety: 'daily', description: '“坐忘”与“心斋”为后世修心传统提供了重要语言，也提醒人放松对固定自我的执著。', excerpt: '堕肢体，黜聪明，离形去知，同于大通，此谓坐忘。', modernReading: '暂时放下身份与成见，让注意不再只围绕“我应该怎样”。', sourceLabel: 'HOS 经典馆 · 开放文白语料', sourceUrl: 'https://ctext.org/zhuangzi/zh', readerBook: '庄子' },
  { id: 'qingjing', title: '《太上老君说常清静经》', era: '唐末以前成书', attribution: '题太上老君说', focus: '清静、观心、遣欲', axis: '元神', safety: 'daily', description: '篇幅短而影响深远，以动静、清浊和观心阐释“常清静”的修持方向。', excerpt: '人能常清静，天地悉皆归。', modernReading: '清静不是没有现实任务，而是不让欲望与杂念持续劫持注意。', sourceLabel: '维基文库 · 公有领域原典', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E5%A4%AA%E4%B8%8A%E8%80%81%E5%90%9B%E6%B8%85%E9%9D%9C%E7%B6%93' },
  { id: 'zuowanglun', title: '《坐忘论》', era: '唐', attribution: '司马承祯', focus: '七阶修心、形神合一', axis: '元神', safety: 'daily', description: '以敬信、断缘、收心、简事、真观、泰定、得道七层组织修心次第。', excerpt: '收心简事，日损有为；体静心闲，方可观妙。', modernReading: '减少无关事务与反复刺激，为稳定注意创造条件。', sourceLabel: '道教文化中心资料库', sourceUrl: 'https://zh.daoinfo.org/wiki/%E5%9D%90%E5%BF%98%E8%AB%96' },
  { id: 'tianyizi', title: '《天隐子》', era: '唐', attribution: '题司马承祯传', focus: '易简、渐门、安处', axis: '合修', safety: 'daily', description: '以斋戒、安处、存想、坐忘、神解构成简要修习阶梯，强调易简而非繁巧。', excerpt: '简者，神仙之德也。', modernReading: '先把生活与练习做简单，避免被复杂术语带离真实改变。', sourceLabel: '维基文库 · 公有领域原典', sourceUrl: 'https://zh.wikisource.org/zh/%E5%A4%A9%E9%9A%B1%E5%AD%90' },
  { id: 'huangting', title: '《黄庭内景经》', era: '魏晋', attribution: '上清经系', focus: '身神、存思、形神相守', axis: '合修', safety: 'guided', description: '用诗性身体宇宙描绘脏腑与身神，是上清存思传统的重要经典。', excerpt: '上有魂灵下关元，左为少阳右太阴。', modernReading: '可把身神图景作为专注与身体觉察的文化地图，不把它当作现代解剖事实。', sourceLabel: '维基文库 · 《正统道藏》底本', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E9%BB%83%E5%BA%AD%E5%85%A7%E6%99%AF%E7%B6%93' },
  { id: 'yangsheng', title: '《养性延命录》', era: '梁', attribution: '陶弘景撰集', focus: '养性、起居、导引', axis: '肉身', safety: 'guided', description: '汇集教诫、饮食、起居、服气、导引按摩等古代养生材料，内容需按现代安全知识筛选。', excerpt: '我命在我，不在于天。', modernReading: '把健康主动权放回作息、活动、饮食与求助，但不夸大个人控制。', sourceLabel: '道教文化中心资料库', sourceUrl: 'https://zh.daoinfo.org/wiki/%E9%A4%8A%E6%80%A7%E5%BB%B6%E5%91%BD%E9%8C%84' },
  { id: 'cantongqi', title: '《周易参同契》', era: '东汉以来传承', attribution: '传统题魏伯阳', focus: '炉火、阴阳、丹法象征', axis: '合修', safety: 'guided', description: '以《周易》象数、黄老与炼丹语言组织丹道，被后世内外丹传统共同尊崇。', excerpt: '乾坤者，易之门户，众卦之父母。', modernReading: '先理解它的象征系统与历史层次，不直接把丹法语汇变成身体操作。', sourceLabel: '维基文库 · 公有领域原典', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E5%91%A8%E6%98%93%E5%8F%83%E5%90%8C%E5%A5%91/%E5%85%A8%E8%A6%BD' },
  { id: 'zhonglu', title: '《钟吕传道集》', era: '唐末五代至宋初', attribution: '题钟离权述、吕岩集', focus: '内丹问答、炼形炼神', axis: '合修', safety: 'guided', description: '系统呈现钟吕内丹谱系，以问答解释真仙、大道、炼形、朝元、内观等层次。', excerpt: '人之生也，形与神为表里。', modernReading: '把“形神”先理解为身体生活与心智生活彼此影响，再研究传统术语。', sourceLabel: '道教文化中心资料库', sourceUrl: 'https://zh.daoinfo.org/wiki/%E9%8D%BE%E5%91%82%E5%82%B3%E9%81%93%E9%9B%86' },
  { id: 'wuzhen', title: '《悟真篇》', era: '北宋', attribution: '张伯端', focus: '性功、命功、内丹诗诀', axis: '合修', safety: 'guided', description: '正编多论命功，附录多论性功，是南宗内丹传统的关键文献。', excerpt: '不识真铅正祖宗，万般作用枉施功。', modernReading: '先辨术语的比喻与流派背景，警惕望文生义和无师自练。', sourceLabel: '道教文化中心资料库', sourceUrl: 'https://zh.daoinfo.org/index.php?title=%E6%82%9F%E7%9C%9F%E7%AF%87&variant=zh-hans' },
  { id: 'xingming', title: '《性命圭旨》', era: '明', attribution: '撰人不详', focus: '图解性命双修', axis: '合修', safety: 'guided', description: '以图文说明性与命、形与神的修炼次第，汇合多种内丹思想。', excerpt: '性命双修，方为大道。', modernReading: '“双修”可先落实为身心都照顾：不以伤身求神秘，也不以健身代替自省。', sourceLabel: '维基文库 · 公有领域原典', sourceUrl: 'https://zh.wikisource.org/wiki/%E6%80%A7%E5%91%BD%E5%9C%AD%E6%97%A8' },
  { id: 'baopuzi', title: '《抱朴子内篇》', era: '东晋', attribution: '葛洪', focus: '神仙论、方术与炼丹史', axis: '经学', safety: 'archive', description: '集魏晋神仙道教与方术材料之大成，具有重要思想史与科技史价值；服食炼丹不可仿做。', excerpt: '我命在我不在天，还丹成金亿万年。', modernReading: '读它要同时保留历史同情与现代风险意识，尤其警惕矿物丹药。', sourceLabel: '中国哲学书电子化计划', sourceUrl: 'https://ctext.org/baopuzi/nei-pian/zh', readerBook: '抱朴子' },
  { id: 'jingming', title: '《太上灵宝净明宗教录》', era: '元代结集', attribution: '净明道经典集', focus: '忠孝、自省、济物', axis: '德行', safety: 'daily', description: '把修道与孝悌、正直、济困、每日记过紧密相连，是“以行为验修行”的重要文献。', excerpt: '置一小册，日录所为。', modernReading: '每天忠实记下一件行为，不粉饰动机，第二天修正一个具体选择。', sourceLabel: 'HOS 经典馆 · Kanripo 两卷原典', sourceUrl: 'https://www.kanripo.org/text/KR5i0041/', readerBook: '净明宗教录' },
  { id: 'liexian', title: '《列仙传》', era: '东汉至魏晋间成书', attribution: '旧题刘向', focus: '早期仙传、升仙母题', axis: '经学', safety: 'archive', description: '现存最早的神仙人物传记之一，保存王子乔、萧史、琴高等升仙叙事。', excerpt: '王子乔者，周灵王太子晋也，好吹笙，作凤凰鸣。', modernReading: '把仙传作为信仰史与文学象征阅读，并与可考历史分层。', sourceLabel: '中国哲学书电子化计划 · 原典', sourceUrl: 'https://ctext.org/lie-xian-zhuan/zh' },
  { id: 'shenxian', title: '《神仙传》', era: '东晋传统', attribution: '葛洪撰系', focus: '仙人谱系、修道叙事', axis: '经学', safety: 'archive', description: '汇集广成子、魏伯阳、壶公、左慈等故事；传世本复杂，适合结合版本研究阅读。', excerpt: '抄集古之仙者，见于仙经、服食方及百家之书。', modernReading: '它保存的是宗教记忆与叙事传统，不等同于现代意义的历史实录。', sourceLabel: '维基文库 · 公有领域原典', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E7%A5%9E%E4%BB%99%E5%82%B3' },
]

export const IMMORTAL_STORIES: ImmortalStory[] = [
  { id: 'wangziqiao', title: '缑山乘鹤', figure: '王子乔', era: '周代人物的后世仙传', motif: '乘鹤', source: '《列仙传》', sourceUrl: 'https://zh.wikisource.org/wiki/%E5%88%97%E4%BB%99%E5%82%B3', story: '传说太子晋善吹笙，声如凤鸣，后随浮丘公入嵩山。约三十年后，他在缑氏山巅乘白鹤与故人遥别，成为“王子登仙”的经典图景。', insight: '真正留下来的不是逃离世界，而是音乐、约定与告别所象征的精神超越。', historicalNote: '仙传文学；人物与传说需分层阅读。' },
  { id: 'xiaoshi', title: '吹箫引凤', figure: '萧史与弄玉', era: '秦穆公时代传说', motif: '乘凤', source: '《列仙传》', sourceUrl: 'https://zh.wikisource.org/wiki/%E5%88%97%E4%BB%99%E5%82%B3', story: '萧史善箫，教弄玉作凤鸣。传说二人长期居凤台修习，最终随凤凰飞去。故事把艺术、伴侣共修与超越想象合在一起。', insight: '修行并非只能独行；共同练习、相互成就也是中国仙传的重要母题。', historicalNote: '神话叙事，非可验证历史事件。' },
  { id: 'qinga', title: '乘赤鲤来', figure: '琴高', era: '战国至秦汉传说', motif: '水解', source: '《列仙传》', sourceUrl: 'https://zh.wikisource.org/wiki/%E5%88%97%E4%BB%99%E5%82%B3', story: '琴高以鼓琴闻名。传说他入水取龙子，并与弟子约期，届时乘赤鲤出水相见，月余后又归于水中。', insight: '“水解”表现人与自然边界的流动，也提醒现代读者欣赏象征而不执为事实。', historicalNote: '早期仙传母题。' },
  { id: 'weiboyang', title: '试丹与择道', figure: '魏伯阳', era: '东汉人物的后世仙传', motif: '炼丹', source: '《神仙传》卷二', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E7%A5%9E%E4%BB%99%E5%82%B3/%E5%8D%B7%E4%BA%8C', story: '仙传写魏伯阳与弟子入山炼丹，以“服丹暂死复生”考验信念。它塑造了丹道师徒与考验叙事，也暴露古代服丹想象的危险性。', insight: '今天应读其“选择与信念”的文学结构，绝不能模仿服丹试药。', historicalNote: '宗教叙事；任何矿物丹药都不安全。' },
  { id: 'hugu', title: '壶中天地', figure: '壶公与费长房', era: '东汉方术传说', motif: '遇仙', source: '《神仙传》卷九', sourceUrl: 'https://zh.wikisource.org/zh/%E7%A5%9E%E4%BB%99%E5%82%B3/%E5%8D%B7%E4%B9%9D', story: '费长房见卖药老人日暮跃入壶中，长期默默侍奉后获准随入，发现壶内别有楼观天地。', insight: '壶中世界像一则注意力寓言：日常表象之下，可能藏着更广阔的认知空间。', historicalNote: '方术与洞天想象。' },
  { id: 'huangchuping', title: '叱石成羊', figure: '黄初平', era: '晋代仙传', motif: '遇仙', source: '《神仙传》传统、《太平广记》卷七', sourceUrl: 'https://zh.wikisource.org/zh-hant/%E5%A4%AA%E5%B9%B3%E5%BB%A3%E8%A8%98', story: '黄初平牧羊时遇道士入山，兄长多年后寻见，只见白石。传说初平一声叱喝，白石尽化为羊，后来号“赤松子”。', insight: '故事以“石羊互化”表达视角改变与潜能显现，适合作为文学象征阅读。', historicalNote: '仙传文学，非现实能力承诺。' },
  { id: 'liuan', title: '一人得道，鸡犬升天', figure: '淮南王刘安', era: '西汉人物的后世传说', motif: '白日飞升', source: '《神仙传》及后世类书', sourceUrl: 'https://zh.daoinfo.org/index.php?title=%E7%A5%9E%E4%BB%99%E5%82%B3&variant=zh-hans', story: '后世仙传把刘安塑造成集宾客炼丹、举家升天的人物，连鸡犬因食余药也随之升腾，遂成著名成语。', insight: '它展示“白日飞升”如何进入大众语言，也应与《汉书》中的历史刘安明确区分。', historicalNote: '历史人物与宗教传说叠合。' },
  { id: 'xuxun', title: '拔宅飞升', figure: '许逊', era: '晋代人物的净明道传说', motif: '白日飞升', source: '《十二真君传》、净明道传统', sourceUrl: 'https://zh.daoinfo.org/index.php?title=%E6%8B%94%E5%AE%85%E9%A3%9B%E6%98%87&variant=zh-hant', story: '传说许逊任旌阳县令时周穷救急、治水斩蛟，以孝与济世为道法之本，最终举家四十余人“拔宅飞升”。', insight: '故事把成仙资格落在孝、廉、济世与共同成就上，而不只在个人秘术。', historicalNote: '道教掌故；“拔宅”是证道象征。' },
  { id: 'ludongbin', title: '黄粱梦觉', figure: '吕洞宾', era: '唐宋以来传说', motif: '遇仙', source: '《纯阳帝君神化妙通纪》传统', sourceUrl: 'https://zh.daoinfo.org/index.php?title=%E9%BB%83%E7%B2%B1%E5%A4%A2%E8%A6%BA&variant=zh-hant', story: '吕岩在黄粱未熟的一梦中经历功名、富贵、获罪与失去，醒后看见人生得失的迅速流转，遂随钟离权学道。', insight: '先看穿目标投射，再决定如何生活；这比追求神异更接近日常修心。', historicalNote: '度化故事，版本流变复杂。' },
  { id: 'zuoci', title: '一杯两分', figure: '左慈', era: '汉末人物的方术传说', motif: '尸解', source: '《神仙传》卷八', sourceUrl: 'https://zh.wikisource.org/zh-hans/%E7%A5%9E%E4%BB%99%E5%82%B3/%E5%8D%B7%E5%85%AB', story: '仙传中的左慈以幻化、分杯、隐形等方术周旋于权力人物之间，最后遁入山中。', insight: '故事常以“不可控制的方士”反衬权力边界；修行不应成为操纵他人的技术。', historicalNote: '与史传方士形象相互影响。' },
  { id: 'chenhuang', title: '高卧华山', figure: '陈抟', era: '五代宋初人物与传说', motif: '济世', source: '宋代史传与道教传记', sourceUrl: 'https://zh.daoinfo.org/index.php?title=%E9%99%B3%E6%91%B6&variant=zh-hans', story: '陈抟以华山隐修、高卧和易学象数闻名。后世把他塑造成洞察时局又不逐功名的仙者。', insight: '“高卧”不等于逃避；更可理解为主动守护节律、减少无效卷入。', historicalNote: '有可考人物基础，神异部分属后世传说。' },
]

export const CULTIVATION_SOURCES = [
  { title: '道教文化中心资料库', detail: '典籍目录、道教史与术语释义', url: 'https://zh.daoinfo.org/' },
  { title: '中国哲学书电子化计划', detail: '先秦至魏晋原典与版本资源', url: 'https://ctext.org/zh' },
  { title: '维基文库·道经', detail: '公有领域原典与可核对版本', url: 'https://zh.wikisource.org/zh/Portal:%E9%81%93%E7%B6%93' },
  { title: 'HOS 文明经典馆', detail: '应用内原文、今译与阅读笔记', url: './#/classics' },
]
