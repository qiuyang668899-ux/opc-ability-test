export type CuratedDaoistVolume = {
  id: string
  title: string
  sourceFile: string
  guide: string
}

export type CuratedDaoistBook = {
  id: string
  title: string
  tradition: string
  edition: string
  description: string
  sourceLabel: string
  sourceUrl: string
  catalogUrl: string
  volumes: CuratedDaoistVolume[]
}

export const JINGMING_ZONGJIAO_LU: CuratedDaoistBook = {
  id: 'jingming-zongjiao-lu',
  title: '《太上靈寶淨明宗教錄》',
  tradition: '淨明道',
  edition: '《重刊道藏辑要》胡之玫等编校本',
  description: '淨明道经典集，以孝悌、正直、自省、清静与济物为重要线索。馆内提供两卷开放原典直读，并用分卷现代导读帮助建立结构；导读不冒充逐句全译。',
  sourceLabel: 'Kanripo · KR5i0041 · CK-KZ-jye',
  sourceUrl: 'https://www.kanripo.org/text/KR5i0041/',
  catalogUrl: 'https://crta.info/wiki/%E5%A4%AA%E4%B8%8A%E9%9D%88%E5%AF%B6%E6%B7%A8%E6%98%8E%E5%AE%97%E6%95%99%E9%8C%84_-_A152',
  volumes: [
    {
      id: '001',
      title: '卷一·淨明法序与入道品',
      sourceFile: 'KR5i0041_001.txt',
      guide: '本卷以《太上靈寶淨明法序》开篇，把“淨明”说成没有幽暗不能照见、不被细尘染污的明澈状态，并以孝悌为准则、修炼为方法、长期积累为路径。\n\n《入道品》把原则落到日常：孝敬亲长、对人正直、帮助孤老贫病、不借术法满足私愤。其中“置一小册，日录所为”尤具当代启发：每日忠实记录行为，看见那些自己都不愿写下的动机，再及时修正。\n\n阅读时可把神异性描述放回其宗教文化语境，不作医疗、科学或现实功效承诺。HOS 建议先练习它明确可验证的部分：诚实记录、修正一个行为、对一个人增加善意。',
    },
    {
      id: '002',
      title: '卷二·经典集成',
      sourceFile: 'KR5i0041_002.txt',
      guide: '本卷集中收录《道元正印经》《四规明鉴经》《中黃八柱经》《洞神上品经》《眞詮》以及坛记、道诫、法说、诗记等多类文本。\n\n《道元正印经》从“道本无物，惟集于虚”起笔，强调不执、不僻、不急与恬淡虚定。《四规明鉴经》以立本、修身、建功、成终建立道德与行动次第。《中黃八柱经》与《洞神上品经》包含传统身心修炼、宇宙论与宗教仪式语言。《眞詮》则更密集地谈存心养性、明善诚身、惩忿窒欲等课题。\n\n这一卷不宜被压缩成单一“功效”。更合适的读法是：先辨别文体与语境，再分开伦理实践、身心训练、仪式信仰与历史文献四个层次。可验证的日常入口，仍是清醒、克制、自省、廉平与济物。',
    },
  ],
}

