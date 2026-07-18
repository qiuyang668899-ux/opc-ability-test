export type ClassicCategory = '儒家' | '佛学' | '道家' | '科学' | '世界宗教'

export type ClassicNeed = '安定身心' | '专注行动' | '关系慈悲' | '认知清明' | '意义韧性'

export type ClassicSourceKind = '原典选段' | '义旨转述' | '科学模型'

export type ClassicPassage = {
  id: string
  category: ClassicCategory
  tradition: string
  work: string
  chapter: string
  title: string
  original: string
  reflection: string
  method: string
  practice: string
  duration: number
  needs: ClassicNeed[]
  tags: string[]
  sourceKind: ClassicSourceKind
  religionGroup?: '基督教' | '伊斯兰教' | '犹太教' | '印度教' | '印度教·瑜伽' | '锡克教'
  originalLanguage?: string
  originalLabel?: string
  modernTranslation?: string
  sourceUrl?: string
  sourceNote?: string
}

const cbeta = 'https://cbetaonline.cn/'

export const CLASSIC_PASSAGES: ClassicPassage[] = [
  {
    id: 'dao-16-stillness', category: '道家', tradition: '老子', work: '《道德经》', chapter: '第十六章', title: '守静，才能看见变化',
    original: '致虚极，守静笃。万物并作，吾以观复。夫物芸芸，各复归其根。归根曰静，是谓复命。',
    reflection: '把心中的空间留出来，不急着追赶每一个念头。安静不是停止生活，而是重新看见变化背后的秩序。',
    method: '先减输入，再观察身体、念头与环境怎样起落，不急着解释。',
    practice: '安静坐三分钟。每次念头出现，只在心里说“我看见了”，然后把注意带回呼吸。', duration: 3,
    needs: ['安定身心', '认知清明'], tags: ['守静', '复命', '观察'], sourceKind: '原典选段',
  },
  {
    id: 'dao-8-water', category: '道家', tradition: '老子', work: '《道德经》', chapter: '第八章', title: '像水一样，不与自己对抗',
    original: '上善若水。水善利万物而不争，处众人之所恶，故几于道。',
    reflection: '水不依靠僵硬证明力量，却能滋养、适应并持续向前。柔软不是退让，而是把力量用在重要处。',
    method: '区分真正的边界与无谓的对抗，寻找阻力更小、仍然有益的路径。',
    practice: '想起今天一件正在对抗的事：如果像水一样处理，我可以绕开什么，又应滋养什么？', duration: 4,
    needs: ['安定身心', '关系慈悲'], tags: ['若水', '不争', '柔韧'], sourceKind: '原典选段',
  },
  {
    id: 'dao-33-self-knowledge', category: '道家', tradition: '老子', work: '《道德经》', chapter: '第三十三章', title: '把比较转回自知',
    original: '知人者智，自知者明。胜人者有力，自胜者强。知足者富，强行者有志。',
    reflection: '理解别人是一种聪明，理解自己才带来清明。成长不是不断胜过他人，而是一次次看见并调整自己的惯性。',
    method: '把外部比较改写为自我观察：触发是什么、旧反应是什么、下一次怎样不同。',
    practice: '写下一个最近反复出现的模式，再补一句：下一次出现时，我愿意做出的不同选择是……', duration: 5,
    needs: ['认知清明', '意义韧性'], tags: ['自知', '自胜', '模式'], sourceKind: '原典选段',
  },
  {
    id: 'zhuang-empty-room', category: '道家', tradition: '庄子', work: '《庄子·人间世》', chapter: '心斋', title: '虚室生白，让答案有地方出现',
    original: '瞻彼阕者，虚室生白，吉祥止止。',
    reflection: '房间空下来，光才照得进来；心里不被判断和预设塞满，新的理解才有位置出现。',
    method: '暂时悬置结论，只记录事实、感受与未知，让问题重新显形。',
    practice: '放下手机，清理眼前一小块空间。面对一个问题，只写事实，不写评价。', duration: 5,
    needs: ['安定身心', '认知清明'], tags: ['心斋', '留白', '觉察'], sourceKind: '原典选段',
  },
  {
    id: 'dao-64-small-step', category: '道家', tradition: '老子', work: '《道德经》', chapter: '第六十四章', title: '在困难形成以前，先迈一小步',
    original: '为之于未有，治之于未乱。合抱之木，生于毫末；九层之台，起于累土；千里之行，始于足下。',
    reflection: '大问题通常不是突然出现，大成果也不是突然完成。真正有效的改变发生在尚且微小、容易行动的时刻。',
    method: '把目标缩小到无需意志力就能开始的第一步，并为它安排明确触发点。',
    practice: '选一件拖延的事，只做两分钟版本：打开文件、写下标题，或整理第一项材料。', duration: 3,
    needs: ['专注行动', '意义韧性'], tags: ['微行动', '开始', '积累'], sourceKind: '原典选段',
  },

  {
    id: 'heart-sutra-observe', category: '佛学', tradition: '般若', work: '《般若波罗蜜多心经》', chapter: '观照', title: '照见，而不被困住',
    original: '照见五蕴皆空，度一切苦厄。',
    reflection: '身体感受、情绪、想法都在变化。看见它们是正在发生的经验，而不是永恒的“我”，就多了一点选择。',
    method: '把“我就是这样”改为“我正在经历这样的感受或念头”。',
    practice: '依次觉察身体、感受和念头。每一项只描述“此刻有……”，不解释、不评判。', duration: 5,
    needs: ['安定身心', '认知清明'], tags: ['五蕴', '观照', '般若'], sourceKind: '原典选段', sourceUrl: cbeta, sourceNote: '可前往 CBETA Online 核对经文、版本与校勘。',
  },
  {
    id: 'diamond-non-attachment', category: '佛学', tradition: '般若', work: '《金刚般若波罗蜜经》', chapter: '庄严净土分', title: '无所住，而生其心',
    original: '应无所住而生其心。',
    reflection: '全心行动，但不把自己绑死在某个结果、评价或身份上。放下执着不是放弃责任，而是让心保持流动。',
    method: '区分“我能投入的行动”和“我无法完全控制的结果”。',
    practice: '写下今天最重要的一件事：“我会认真去做，同时允许结果不完全受我控制。”', duration: 4,
    needs: ['专注行动', '安定身心'], tags: ['无住', '行动', '放下'], sourceKind: '原典选段', sourceUrl: cbeta, sourceNote: '可前往 CBETA Online 核对经文、版本与校勘。',
  },
  {
    id: 'anapanasati-breath', category: '佛学', tradition: '禅观', work: '《安般守意经》', chapter: '数息', title: '用呼吸安住当下',
    original: '数息为遮意。',
    reflection: '数呼吸不是为了制造神秘体验，而是给散乱的注意力一个温和、稳定的归处。',
    method: '用简单、可重复的注意对象，训练走神后温和返回。',
    practice: '自然呼吸，从一数到十。走神后不责备自己，从一重新开始，共做三轮。', duration: 5,
    needs: ['安定身心', '专注行动'], tags: ['数息', '专注', '呼吸'], sourceKind: '原典选段', sourceUrl: cbeta, sourceNote: '可前往 CBETA Online 核对经文、版本与校勘。',
  },
  {
    id: 'dhammapada-purify', category: '佛学', tradition: '早期佛教', work: '《法句经》', chapter: '述佛品', title: '把修行落在每一次选择',
    original: '诸恶莫作，诸善奉行，自净其意，是诸佛教。',
    reflection: '修习不只发生在安静时刻，也发生在每个选择里：少做伤害，多做有益，并持续看清自己的起心动念。',
    method: '在行动前加入一个短暂停顿：这会增加伤害，还是增加清明与善意？',
    practice: '今天选择一件“少一点伤害、多一点善意”的小事，完成后记录身体和心的变化。', duration: 4,
    needs: ['关系慈悲', '意义韧性'], tags: ['自净其意', '善行', '选择'], sourceKind: '原典选段', sourceUrl: cbeta, sourceNote: 'CBETA《法句经》T04, no. 210；不同传本用字可能略有差异。',
  },
  {
    id: 'platform-no-thought', category: '佛学', tradition: '禅宗', work: '《六祖大师法宝坛经》', chapter: '定慧品', title: '不是没有念头，而是不被念头牵走',
    original: '于诸境上心不染，曰无念。',
    reflection: '所谓无念，并非强迫头脑空白，而是在念头与境遇出现时，不立刻被它染着和带走。',
    method: '念头出现时先命名，再决定要不要跟随，而不是把第一个念头当命令。',
    practice: '下一次焦虑念头出现时，说“这是一个担忧的念头”，呼气三次后再行动。', duration: 4,
    needs: ['安定身心', '认知清明'], tags: ['无念', '禅宗', '解离'], sourceKind: '原典选段', sourceUrl: cbeta, sourceNote: '可前往 CBETA Online 核对经文、版本与校勘。',
  },

  {
    id: 'great-learning-stop', category: '儒家', tradition: '四书', work: '《大学》', chapter: '经一章', title: '先知道停在哪里',
    original: '知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。',
    reflection: '明确什么最重要，注意力才有落点；有了落点，内心才能逐渐安定，并做出更周全的判断。',
    method: '先确定今天唯一的完成标准，再安排时间和取舍。',
    practice: '为今天写一个“止”：无论事情多少，今天最重要的完成标准只有什么？', duration: 4,
    needs: ['专注行动', '认知清明'], tags: ['知止', '定静安虑', '优先级'], sourceKind: '原典选段',
  },
  {
    id: 'analects-daily-review', category: '儒家', tradition: '孔门', work: '《论语·学而》', chapter: '曾子三省', title: '每天一次诚实复盘',
    original: '吾日三省吾身。',
    reflection: '复盘不是自我苛责，而是把经历变成能力。有效的反省应具体、可行动，也包含对自己的体谅。',
    method: '保留有效行为，识别偏离触发点，只调整一个最小动作。',
    practice: '回答三个问题：今天什么做得好？什么让我偏离？明天最小的改进是什么？', duration: 5,
    needs: ['认知清明', '专注行动'], tags: ['反省', '复盘', '成长'], sourceKind: '原典选段',
  },
  {
    id: 'doctrine-sincerity', category: '儒家', tradition: '四书', work: '《中庸》', chapter: '第二十章', title: '把学习变成一次次笃行',
    original: '博学之，审问之，慎思之，明辨之，笃行之。',
    reflection: '信息不是知识，知道也不是做到。学习要经过提问、思考、辨别，最后在行动与反馈中完成。',
    method: '每学到一个概念，都把它转成一个可观察、可反馈的行为。',
    practice: '从今天学到的内容里选一点，设计一个十分钟内可完成的验证动作。', duration: 5,
    needs: ['专注行动', '认知清明'], tags: ['学习', '笃行', '反馈'], sourceKind: '原典选段',
  },
  {
    id: 'mencius-reflect', category: '儒家', tradition: '孟子', work: '《孟子·离娄上》', chapter: '反求诸己', title: '把可改变的部分找回来',
    original: '行有不得者，皆反求诸己，其身正而天下归之。',
    reflection: '反求诸己不是把所有过错揽到自己身上，而是在复杂处境中，重新找到自己能够负责和改变的部分。',
    method: '把问题分成“我能影响”“需要协商”“无法控制”三栏。',
    practice: '面对一个卡点，只写下一件你能在今天主动改变的事，并在十分钟内开始。', duration: 4,
    needs: ['意义韧性', '专注行动'], tags: ['责任', '自省', '影响圈'], sourceKind: '原典选段',
  },
  {
    id: 'analects-harmony', category: '儒家', tradition: '孔门', work: '《论语·子路》', chapter: '和而不同', title: '亲近彼此，也容得下不同',
    original: '君子和而不同，小人同而不和。',
    reflection: '真正的和谐不是所有人说一样的话，而是在差异中保持尊重、边界和共同目标。',
    method: '先复述对方真正关心的需要，再表达自己的不同与底线。',
    practice: '选一次分歧，用“我理解你在意……；我的看法是……；我们共同希望……”重新表达。', duration: 5,
    needs: ['关系慈悲', '认知清明'], tags: ['关系', '分歧', '沟通'], sourceKind: '原典选段',
  },

  {
    id: 'science-implementation-intention', category: '科学', tradition: '行为科学', work: '实施意图', chapter: 'If–Then 计划', title: '把“想做”变成可触发的动作',
    original: '模型：当情境 X 出现时，我就执行行为 Y。',
    reflection: '模糊愿望需要不断临时决策；明确的情境—行为连接，会让开始变得更自动、更省力。',
    method: '为一个目标指定可识别的时间、地点或前序动作，并连接一个足够小的行为。',
    practice: '补全一句：“当我____之后，我立刻____两分钟。”把它放到今天真实会发生的场景里。', duration: 4,
    needs: ['专注行动'], tags: ['福格模型', '触发', '习惯'], sourceKind: '科学模型', sourceNote: '基于行为科学中的实施意图研究，由 HOS 转写为练习语言。',
  },
  {
    id: 'science-reappraisal', category: '科学', tradition: '情绪科学', work: '认知重评', chapter: '改变解释', title: '事实不变时，仍可以更新解释',
    original: '模型：事件影响感受，也经由我们对事件的解释产生持续作用。',
    reflection: '重评不是强行积极，而是检查第一种解释是否完整，并寻找更准确、更有行动空间的理解。',
    method: '分开事实与解释，再提出至少两个同样符合事实的替代解释。',
    practice: '写下困扰你的事实；圈出其中的判断；再写一个更完整但不粉饰的解释。', duration: 6,
    needs: ['认知清明', '意义韧性'], tags: ['情绪调节', '重评', '事实'], sourceKind: '科学模型', sourceNote: '基于认知重评研究与认知行为方法，由 HOS 进行非医疗化转写。',
  },
  {
    id: 'science-deliberate-practice', category: '科学', tradition: '学习科学', work: '刻意练习', chapter: '反馈回路', title: '能力来自刚刚好的难度与及时反馈',
    original: '模型：清晰子技能 × 适度挑战 × 即时反馈 × 重复修正。',
    reflection: '重复做熟悉的事不一定带来成长。有效练习需要明确练什么、哪里没做好，并迅速调整下一轮。',
    method: '把大能力拆成一个子技能，用短回合练习，并为每轮只设一个反馈点。',
    practice: '选一个想提升的能力，写下今天可练的最小子技能和一个可观察的成功标准。', duration: 6,
    needs: ['专注行动', '认知清明'], tags: ['学习', '反馈', '技能'], sourceKind: '科学模型', sourceNote: '基于专业技能与学习科学研究，由 HOS 汇总为行动模型。',
  },
  {
    id: 'science-nervous-system', category: '科学', tradition: '身心科学', work: '生理调节', chapter: '延长呼气', title: '先让身体收到“可以慢一点”的信号',
    original: '模型：节律平稳、略长于吸气的呼气，可作为降低即时唤醒水平的温和练习。',
    reflection: '高压力时只靠说服自己往往很难。先调整呼吸、姿势与环境，认知系统才更容易恢复选择能力。',
    method: '保持自然、不憋气，让呼气比吸气稍长；不追求越慢越好。',
    practice: '吸气四拍、呼气六拍，做六轮。如有头晕或不适，立即恢复自然呼吸。', duration: 3,
    needs: ['安定身心'], tags: ['呼吸', '压力', '身体'], sourceKind: '科学模型', sourceNote: '日常放松练习，不替代医疗诊断或治疗；不适时停止。',
  },
  {
    id: 'science-self-compassion', category: '科学', tradition: '心理科学', work: '自我关怀', chapter: '支持性内语', title: '温和不是放纵，而是更可持续的修正',
    original: '模型：看见痛苦、承认共同人性，并用支持行动代替羞辱。',
    reflection: '苛责可能短暂推动人，却常让大脑更想逃避。支持性的内在语言能让我们更诚实地看见错误并继续行动。',
    method: '像对待一位认真但受挫的朋友那样，描述事实、表达理解、提出下一步。',
    practice: '把一句自责改写为：“这确实不容易；我正在学习；现在能做的最小修正是……”', duration: 4,
    needs: ['关系慈悲', '意义韧性'], tags: ['自我关怀', '复原', '内语'], sourceKind: '科学模型', sourceNote: '基于自我关怀与心理韧性研究，由 HOS 转写为日常练习。',
  },

  {
    id: 'christian-daily-trouble', category: '世界宗教', religionGroup: '基督教', tradition: '基督教', work: '《马太福音》', chapter: '6:34', title: '只承担今天真正需要承担的',
    original: 'Μὴ οὖν μεριμνήσητε εἰς τὴν αὔριον· ἡ γὰρ αὔριον μεριμνήσει τὰ ἑαυτῆς. ἀρκετὸν τῇ ἡμέρᾳ ἡ κακία αὐτῆς.',
    originalLanguage: '古希腊语', originalLabel: '希腊文原典', modernTranslation: '所以，不要为明天忧虑；明天自有明天的忧虑。一天的难处，一天承担已经足够。',
    reflection: '人会用今天的精力反复预支未来的困难。回到此刻，并不否认明天，而是不让想象先耗尽今天。',
    method: '把担忧分成今天能行动的部分与需要留给明天的信息。',
    practice: '写下最担心的一件事，再写：今天我真正需要做的一步是什么？其余暂放到明天。', duration: 4,
    needs: ['安定身心', '意义韧性'], tags: ['当下', '忧虑', '信靠'], sourceKind: '原典选段', sourceUrl: 'https://greeknewtestament.net/mt6-34', sourceNote: '原文为《马太福音》6:34 希腊文；中文为 HOS 学习译文，可从来源页核对异文。',
  },
  {
    id: 'jewish-now', category: '世界宗教', religionGroup: '犹太教', tradition: '犹太教', work: '《先贤训诫》', chapter: '1:14', title: '为自己负责，也不只为自己',
    original: 'הוּא הָיָה אוֹמֵר, אִם אֵין אֲנִי לִי, מִי לִי. וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי. וְאִם לֹא עַכְשָׁיו, אֵימָתָי:',
    originalLanguage: '希伯来语', originalLabel: '希伯来文原典', modernTranslation: '他说：如果我不为自己负责，谁会为我？如果我只为自己，我又成了什么？如果不是现在，又要等到何时？',
    reflection: '成熟同时包含三件事：为自己负责、超越只顾自己，并把价值放进当下行动。',
    method: '让一个决定同时经过自我责任、他人影响与行动时机三重检查。',
    practice: '面对一个选择，分别回答：我需要什么？他人会受何影响？今天可以做什么？', duration: 5,
    needs: ['关系慈悲', '专注行动', '意义韧性'], tags: ['责任', '共同体', '当下'], sourceKind: '原典选段', sourceUrl: 'https://www.sefaria.org/Pirkei_Avot.1.14', sourceNote: '原文为《Pirkei Avot》1:14；中文为 HOS 学习译文。',
  },
  {
    id: 'jewish-whole-heart', category: '世界宗教', religionGroup: '犹太教', tradition: '犹太教', work: '《申命记》', chapter: '6:5', title: '让爱成为全心的方向',
    original: 'ואהבת את יהוה אלהיך בכל לבבך ובכל נפשך ובכל מאדך',
    originalLanguage: '希伯来语', originalLabel: '希伯来文原典', modernTranslation: '你要尽心、尽性、尽力，爱上主——你的神。',
    reflection: '当价值只停留在口头，生活会被无数小冲动拆散。“全心”是让思想、情感与行动朝同一方向靠拢。',
    method: '把今天最重要的价值，翻译成一个看得见的行为。',
    practice: '写下你最想忠于的一个价值，然后补完：今天我会用“____”来证明它。', duration: 4,
    needs: ['意义韧性', '专注行动'], tags: ['全心', '爱', '价值'], sourceKind: '原典选段', sourceUrl: 'https://www.sefaria.org/Deuteronomy.6.5', sourceNote: '原文为《Deuteronomy》6:5 希伯来文；中文为 HOS 学习译文。',
  },
  {
    id: 'islam-remembrance', category: '世界宗教', religionGroup: '伊斯兰教', tradition: '伊斯兰教', work: '《古兰经》', chapter: '13:28', title: '让心回到所敬畏与信赖的中心',
    original: 'ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ ۗ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ',
    originalLanguage: '阿拉伯语', originalLabel: '阿拉伯文原典', modernTranslation: '那些信仰的人，他们的心因记念真主而安定。须知，心在记念真主中获得安定。',
    reflection: '当注意力被无数小事撕散，人需要回到一个更高、更稳定的价值中心，重新排列轻重。',
    method: '用安静的记念、祈祷或价值回顾，把心从纷乱带回所信赖的方向。',
    practice: '安静一分钟，重复一个与你信念相符的核心词，并问：此刻最合乎它的行动是什么？', duration: 4,
    needs: ['安定身心', '意义韧性'], tags: ['记念', '安宁', '信念'], sourceKind: '原典选段', sourceUrl: 'https://quran.com/13/28', sourceNote: '原文为《古兰经》13:28 阿拉伯文；中文为 HOS 学习译文，信仰实践请以正规阿文与权威译注为准。',
  },
  {
    id: 'gita-action', category: '世界宗教', religionGroup: '印度教', tradition: '印度教', work: '《薄伽梵歌》', chapter: '2:47', title: '专注行动，不把心系死在结果',
    original: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥२।४७॥',
    originalLanguage: '梵语', originalLabel: '天城体梵文原典', modernTranslation: '你的权责在于行动本身，不在于占有行动的结果。不要把结果当作行动的唯一动机，也不要因此执著于不行动。',
    reflection: '结果受多重条件影响。把注意放回可投入的行动，既能减少焦虑，也能提升当下工作的质量。',
    method: '用过程指标替代单一结果指标：今天投入多久、完成几轮、获得什么反馈。',
    practice: '为一件重要的事设一个只与行动有关的完成标准，并专注完成这一轮。', duration: 5,
    needs: ['专注行动', '意义韧性'], tags: ['行动', '结果', '瑜伽'], sourceKind: '原典选段', sourceUrl: 'https://www.gitasupersite.iitk.ac.in/srimad?field_chapter_value=2&field_nsutra_value=47&language=dv', sourceNote: '原文为《薄伽梵歌》2:47 梵文；中文为 HOS 学习译文。',
  },
  {
    id: 'isha-stewardship', category: '世界宗教', religionGroup: '印度教', tradition: '印度教', work: '《伊沙奥义书》', chapter: '第一颂', title: '享用世界，但不把世界占为己有',
    original: 'ईशावास्यमिदं सर्वं यत्किञ्च जगत्यां जगत् ।\nतेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम् ॥१॥',
    originalLanguage: '梵语', originalLabel: '天城体梵文原典', modernTranslation: '这个流动世界中的一切，都被神圣的存在所覆护。以放下占有的心来受用它；不要贪求属于任何人的财物。',
    reflection: '当人不再把一切当作必须占有的东西，反而更能珍惜、使用与照管它们。',
    method: '把“拥有”的语言改成“受托照管”，重新检查使用方式。',
    practice: '选一件你很在意的东西，问：如果我是它的照管者，今天会怎样对待它？', duration: 5,
    needs: ['关系慈悲', '意义韧性'], tags: ['放下占有', '照管', '节制'], sourceKind: '原典选段', sourceUrl: 'https://upanishads.org.in/upanishads/1/1', sourceNote: '原文为《伊沙奥义书》第一颂梵文；中文为 HOS 学习译文。',
  },
  {
    id: 'yoga-still-mind', category: '世界宗教', religionGroup: '印度教·瑜伽', tradition: '印度教·瑜伽', work: '《瑜伽经》', chapter: '1:2', title: '让心的波动安静下来',
    original: 'योगश्चित्तवृत्तिनिरोधः॥१।२॥',
    originalLanguage: '梵语', originalLabel: '天城体梵文原典', modernTranslation: '瑜伽，是心识活动与波动的安止。',
    reflection: '安止不是粗暴消灭念头，而是不再被每一个波动立即带走。',
    method: '用稳定的呼吸或身体感受作为锚点，波动出现时只观察并返回。',
    practice: '自然呼吸两分钟。每次念头带走注意时，轻声标记“想法”，再回到呼吸。', duration: 3,
    needs: ['安定身心', '认知清明'], tags: ['瑜伽', '安止', '心识'], sourceKind: '原典选段', sourceUrl: 'https://www.gitasupersite.iitk.ac.in/yogasutra_content?field_chapter_value=1&field_nsutra_value=2&language=dv', sourceNote: '原文为帕坦伽利《瑜伽经》1:2 梵文；中文为 HOS 学习译文。',
  },
  {
    id: 'sikh-honest-work', category: '世界宗教', religionGroup: '锡克教', tradition: '锡克教', work: '《古鲁·格兰特·萨希卜》', chapter: 'Ang 1245', title: '让诚实劳动成为修行的一部分',
    original: 'ਘਾਲਿ ਖਾਇ ਕਿਛੁ ਹਥਹੁ ਦੇਇ ॥\nਨਾਨਕ ਰਾਹੁ ਪਛਾਣਹਿ ਸੇਇ ॥੧॥',
    originalLanguage: '古鲁木奇文', originalLabel: '古鲁木奇文原典', modernTranslation: '辛勤工作以谋生，并从自己手中分享一部分给他人；纳纳克说，这样的人认出了正路。',
    reflection: '精神成长不只在抽离日常时发生，也在认真工作、公平取得、愿意分享的生活方式里发生。',
    method: '把工作看成价值实践：诚实、专注、服务与分享分别如何落在今天？',
    practice: '选择一项普通工作，用完整注意做十分钟，并明确它最终在服务谁。', duration: 5,
    needs: ['专注行动', '关系慈悲', '意义韧性'], tags: ['劳动', '服务', '分享'], sourceKind: '原典选段', sourceUrl: 'https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1245&english=t', sourceNote: '原文为《古鲁·格兰特·萨希卜》第 1245 页古鲁木奇文；中文为 HOS 学习译文。',
  },
]

export const CLASSIC_CATEGORIES: Array<'全部' | ClassicCategory> = ['全部', '儒家', '佛学', '道家', '科学', '世界宗教']

export const CLASSIC_NEEDS: Array<'全部需要' | ClassicNeed> = ['全部需要', '安定身心', '专注行动', '关系慈悲', '认知清明', '意义韧性']
