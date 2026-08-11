export type CultivationTextSection = {
  id: string
  title: string
  text: string
}

export type CultivationTextVolume = {
  id: string
  title: string
  sourceFile?: string
  sections?: CultivationTextSection[]
}

export type CultivationTextSource = {
  kind: 'kanripo' | 'inline'
  edition: string
  sourceLabel: string
  sourceUrl: string
  catalogUrl?: string
  repo?: string
  branch?: string
  volumes: CultivationTextVolume[]
}

const volumes = (prefix: string, titles: string[]) => titles.map((title, index) => ({
  id: `${prefix}-${index + 1}`,
  title,
  sourceFile: `${prefix}_${String(index + 1).padStart(3, '0')}.txt`,
}))

export const CULTIVATION_TEXT_SOURCES: Record<string, CultivationTextSource> = {
  qingjing: {
    kind: 'kanripo',
    edition: '《正统道藏》公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5c0001/',
    catalogUrl: 'https://zh.wikisource.org/zh-hans/%E5%A4%AA%E4%B8%8A%E8%80%81%E5%90%9B%E6%B8%85%E9%9D%9C%E7%B6%93',
    repo: 'kanripo/KR5c0001',
    branch: 'master',
    volumes: [{ id: 'qingjing-full', title: '全经', sourceFile: 'KR5c0001_000.txt' }],
  },
  zuowanglun: {
    kind: 'kanripo',
    edition: '《正统道藏》太玄部一卷本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5d0059/',
    catalogUrl: 'https://zh.daoinfo.org/wiki/%E5%9D%90%E5%BF%98%E8%AB%96',
    repo: 'kanripo/KR5d0059',
    branch: 'master',
    volumes: [{ id: 'zuowanglun-full', title: '全卷 · 敬信至得道', sourceFile: 'KR5d0059_001.txt' }],
  },
  tianyizi: {
    kind: 'inline',
    edition: '《正统道藏》公版原典',
    sourceLabel: '维基文库公有领域原典',
    sourceUrl: 'https://zh.wikisource.org/zh/%E5%A4%A9%E9%9A%B1%E5%AD%90',
    volumes: [{
      id: 'tianyizi-full',
      title: '全本 · 八篇',
      sections: [
        { id: 'preface', title: '序', text: '神仙之道，以長生為本，長生之要，以養氣為先。夫氣受之於天地，和之於陰陽。陰陽神虛謂之心，心主晝夜寤寐，謂之魂魄。如此人之身，大率不遠乎神仙之道。天隱子吾不知其何許人，著書八篇，包括秘妙，殆非人間所能力學。觀夫修煉形氣，養和心虛，歸根契於伯陽，遺照齊於莊叟，長生久視，無出是書。承禎服習道風，惜乎世人夭促真壽，思欲傳之同志，使簡易而行。信哉！自伯陽而來，唯天隱子而已矣。' },
        { id: 'immortal', title: '神仙', text: '人生時稟得虛氣，精明通悟，學無滯塞，則謂之神。宅神於內，遺照於外，自然異於俗人，則謂之神仙。故神仙亦人也。在於修我虛氣，勿為世俗所論折，遂我自然，勿為邪見所凝滯，則成功矣。喜怒哀樂愛惡欲七者，情之邪也。風寒暑濕飢飽勞逸八者，氣之邪也。去此邪，成仙功也。' },
        { id: 'simple', title: '易簡', text: '易曰：天地之道易簡者，何也？天隱子曰：天地在我首之上，足之下，開目盡見，無假繁巧而言，故曰易簡。簡者，神仙之德也。經曰：至道不繁，至人無為。然則以何道求之？曰：無求不能知，無道不能成。凡學神仙，先知易簡。苟言涉奇詭，適足使人執迷，無所歸本，此非吾學也。世人學仙，及為仙所迷者有矣，學氣反為氣所病者有矣。' },
        { id: 'gradual', title: '漸門', text: '《易》有漸卦，老氏有漸門，人之修真達性，不能頓悟，必須漸而進之，安而行之，故設漸門。一曰齋戒，二曰安處，三曰存想，四曰坐忘，五曰神解。何謂齋戒？曰：澡身虛心。何謂安處？曰：深居靜室。何謂存想？曰：收心復性。何謂坐忘？曰：遺形忘我。何謂神解？曰：萬法通神。故習此五者，曰五漸之門。先了一，則漸次至二；了二，則漸次至三；了三，則漸次至四；了四，則漸次至五，神仙成矣。' },
        { id: 'fasting', title: '齋戒', text: '齋戒者，非蔬茹飲食而已；澡身者，非湯浴去垢而已。蓋其法在節食調中，磨擦暢外者也。夫人稟五行之氣，而食五行之物，而實自胞胎有形也。呼吸精血，豈可去食而求其長生！但世人不知休糧服氣，道家權宜，非永絕粒食之謂也。食之有齋戒者，齋乃潔淨之務，戒乃節身之稱。有飢即食，食勿令飽，此所謂調中也。百味未成熟勿食，五味太多勿食，腐敗閉氣之物勿食，此皆宜戒也。手常磨擦皮膚溫熱，去冷氣，此所謂暢外也。久坐、久立、久勞役，皆宜戒也。此是調理形骸之法，形堅則氣全，是以齋戒為漸門之首矣。' },
        { id: 'dwelling', title: '安處', text: '何謂安處？曰：非華堂邃宇、重裀廣榻之謂也。在乎南向而坐，東首而寢，陰陽適中，明暗相半。屋無高，高則陽盛而明多；屋無卑，卑則陰盛而暗多。故明多則傷魄，暗多則傷魂。人之魂陽而魄陰，傷於明暗，則病疾生焉。此所以居處之室，必使之能向天地之氣。若亢陽之攻肌，淫陰之侵體，豈不傷哉！修養之漸，倘不法此，非安處之道。故曰吾所居室，四邊皆窗戶，遇風即闔，風息即開；吾所居座，前簾後屏，太明則下簾以取其內映，太暗則捲簾以通其外曜。內以安其心，外以安其目，心目皆安，則身安矣。明暗尚然，況太多事慮，太多情欲，豈能安其內外哉！故學道以安處為次。' },
        { id: 'visualization', title: '存想', text: '存謂存我之神，想謂想我之身。閉目即見自己之目，收心即見自己之心。心與目皆不離成身，不傷我神，則存想之漸也。凡人目終日視他人，故心亦逐外走；心終日接他事，故目亦逐外視。營營浮光，未嘗復照，奈何不病且夭耶？是以歸根曰靜，靜曰復命，誠性存存，眾妙之門。此存想之漸，學道之功半矣。' },
        { id: 'forgetting', title: '坐忘', text: '坐忘者，因存想而忘也。行道而不見其行，非坐之義乎？有見而不行其見，非忘之義乎？何謂不行？曰：心不動故。何謂不見？曰：形都泯故。或問曰：何由得心不動？天隱子默而不答。又問：何由得形都泯？天隱子瞑而不視。或者悟道，乃退曰：道果在我矣！我果何人哉？天隱子果何人哉？於是彼我兩忘，了無所照。' },
        { id: 'liberation', title: '神解', text: '齋戒謂之信解，安處謂之閑解，存想謂之慧解，坐忘謂之定解，信、定、閑、慧四門通神，謂之神解。夫神之為義，不行而至，不疾而速，陰陽變通，天地長久，兼三才而言謂之易，齊萬物而言謂之道德，本一性而言謂之真如。入四真如，歸於無為。故天隱子生乎易中，死乎易中，動因萬物，靜因萬物，邪由一性，貞由一性，是以生死動靜邪貞，吾皆以神而解之。在人謂之人仙，在天曰天仙，在地曰地仙。故神仙之道，同歸一門。' },
      ],
    }],
  },
  huangting: {
    kind: 'kanripo',
    edition: '《正统道藏》洞玄部公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5i0011/',
    catalogUrl: 'https://zh.wikisource.org/zh-hans/%E9%BB%83%E5%BA%AD%E5%85%A7%E6%99%AF%E7%B6%93',
    repo: 'kanripo/KR5i0011',
    branch: 'master',
    volumes: [{ id: 'huangting-full', title: '全本 · 三十六章', sourceFile: 'KR5i0011_001.txt' }],
  },
  yangsheng: {
    kind: 'kanripo',
    edition: '《正统道藏》公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5c0235/',
    catalogUrl: 'https://zh.wikisource.org/wiki/%E9%A4%8A%E6%80%A7%E5%BB%B6%E5%91%BD%E9%8C%84',
    repo: 'kanripo/KR5c0235',
    branch: 'master',
    volumes: volumes('KR5c0235', ['卷上', '卷下']),
  },
  cantongqi: {
    kind: 'kanripo',
    edition: '《正统道藏》三卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5d0016/',
    catalogUrl: 'https://zh.wikisource.org/zh-hans/%E5%91%A8%E6%98%93%E5%8F%83%E5%90%8C%E5%A5%91/%E5%85%A8%E8%A6%BD',
    repo: 'kanripo/KR5d0016',
    branch: 'master',
    volumes: volumes('KR5d0016', ['卷上', '卷中', '卷下']),
  },
  zhonglu: {
    kind: 'kanripo',
    edition: '《修真十书》三卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5a0266/',
    catalogUrl: 'https://zh.wikisource.org/wiki/%E9%8D%BE%E5%91%82%E5%82%B3%E9%81%93%E9%9B%86',
    repo: 'kanripo/KR5a0266',
    branch: 'master',
    volumes: volumes('KR5a0266', ['卷一', '卷二', '卷三']),
  },
  wuzhen: {
    kind: 'kanripo',
    edition: '《修真十书》五卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5a0268/',
    catalogUrl: 'https://zh.wikisource.org/zh-hant/%E6%82%9F%E7%9C%9F%E7%AF%87',
    repo: 'kanripo/KR5a0268',
    branch: 'master',
    volumes: volumes('KR5a0268', ['卷一', '卷二', '卷三', '卷四', '卷五']),
  },
  xingming: {
    kind: 'kanripo',
    edition: '《性命圭旨》公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5i0012/',
    catalogUrl: 'https://zh.wikisource.org/wiki/%E6%80%A7%E5%91%BD%E5%9C%AD%E6%97%A8',
    repo: 'kanripo/KR5i0012',
    branch: 'master',
    volumes: [{ id: 'xingming-full', title: '全本 · 元亨利贞四集', sourceFile: 'KR5i0012_001.txt' }],
  },
  jingming: {
    kind: 'kanripo',
    edition: '《重刊道藏辑要》两卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5i0041/',
    catalogUrl: 'https://crta.info/wiki/%E5%A4%AA%E4%B8%8A%E9%9D%88%E5%AF%B6%E6%B7%A8%E6%98%8E%E5%AE%97%E6%95%99%E9%8C%84_-_A152',
    repo: 'kanripo/KR5i0041',
    branch: 'CK-KZ-jye',
    volumes: volumes('KR5i0041', ['卷一 · 净明法序与入道品', '卷二 · 经典集成']),
  },
  liexian: {
    kind: 'kanripo',
    edition: '《正统道藏》两卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5a0306/',
    catalogUrl: 'https://zh.wikisource.org/wiki/%E5%88%97%E4%BB%99%E5%82%B3',
    repo: 'kanripo/KR5a0306',
    branch: 'master',
    volumes: volumes('KR5a0306', ['卷上', '卷下']),
  },
  shenxian: {
    kind: 'kanripo',
    edition: '《四库全书》十卷公版数字底本',
    sourceLabel: 'Kanripo 汉籍开放数字底本',
    sourceUrl: 'https://www.kanripo.org/text/KR5c0317/',
    catalogUrl: 'https://zh.wikisource.org/zh-hans/%E7%A5%9E%E4%BB%99%E5%82%B3',
    repo: 'kanripo/KR5c0317',
    branch: 'master',
    volumes: volumes('KR5c0317', ['卷一', '卷二', '卷三', '卷四', '卷五', '卷六', '卷七', '卷八', '卷九', '卷十']),
  },
}
