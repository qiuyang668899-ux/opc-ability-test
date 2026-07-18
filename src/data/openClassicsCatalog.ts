export type OpenClassicCategory = '儒' | '释' | '道' | '史' | '文' | '科' | '术'

export type OpenClassicCatalogItem = {
  id: string
  name: string
  category: OpenClassicCategory
  description: string
}

const names = [
  '三十六计', '三国志', '三字经', '三略', '世说新语', '中庸', '仪礼', '伤寒论', '元史', '公孙龙子',
  '六韬', '农桑辑要', '冰鉴', '列子', '北史', '北齐书', '千字文', '南史', '南齐书', '史记',
  '司马法', '后汉书', '吕氏春秋', '吴子', '周书', '周礼', '商君书', '围炉夜话', '国语', '增广贤文',
  '墨子', '大学章句集注', '天工开物', '太平广记', '孔子家语', '孙子兵法', '孙膑兵法', '孝经', '孟子', '宋书',
  '宋史', '容斋随笔', '将苑', '尉缭子', '尚书', '山海经', '左传', '幼学琼林', '庄子', '弟子规',
  '徐霞客游记', '心经', '战国策', '抱朴子', '搜神后记', '搜神记', '文心雕龙', '文昌孝经', '新五代史', '新唐书',
  '旧五代史', '旧唐书', '明史', '易传', '晋书', '智囊(选录)', '朱子家训', '梁书', '梦溪笔谈', '棋经十三篇',
  '水经注', '汉书', '淮南子', '百战奇略', '睡虎地秦墓竹简', '礼记', '笑林广记', '管子', '素书', '老子',
  '荀子', '菜根谭', '论衡', '论语', '贞观政要', '资治通鉴', '辽史', '逸周书', '金史', '陈书',
  '隋书', '韩非子', '颜氏家训', '鬼谷子', '魏书', '黄帝内经', '黄帝四经',
] as const

const dao = new Set(['列子', '庄子', '抱朴子', '淮南子', '老子', '黄帝四经', '素书', '鬼谷子'])
const buddhist = new Set(['心经'])
const confucian = new Set([
  '三字经', '中庸', '仪礼', '千字文', '周礼', '国语', '大学章句集注', '孔子家语', '孝经', '孟子',
  '尚书', '左传', '弟子规', '文昌孝经', '易传', '朱子家训', '礼记', '荀子', '论语', '颜氏家训',
])
const science = new Set(['伤寒论', '农桑辑要', '天工开物', '梦溪笔谈', '水经注', '黄帝内经'])
const practice = new Set([
  '三十六计', '三略', '六韬', '司马法', '吴子', '商君书', '孙子兵法', '孙膑兵法', '将苑',
  '尉缭子', '棋经十三篇', '百战奇略', '管子', '韩非子',
])
const literature = new Set([
  '世说新语', '公孙龙子', '围炉夜话', '增广贤文', '墨子', '太平广记', '容斋随笔', '山海经',
  '幼学琼林', '徐霞客游记', '搜神后记', '搜神记', '文心雕龙', '智囊(选录)', '笑林广记',
  '菜根谭', '论衡', '吕氏春秋',
])

function categoryOf(name: string): OpenClassicCategory {
  if (dao.has(name)) return '道'
  if (buddhist.has(name)) return '释'
  if (confucian.has(name)) return '儒'
  if (science.has(name)) return '科'
  if (practice.has(name)) return '术'
  if (literature.has(name)) return '文'
  return '史'
}

const descriptions: Partial<Record<(typeof names)[number], string>> = {
  老子: '八十一章道家根本经典，完整原文与逐句现代译文。',
  庄子: '内篇、外篇、杂篇完整展开，保留篇章层级与文白对照。',
  论语: '二十篇完整阅读，从原句进入现代语义与日常实践。',
  孟子: '七篇十四卷完整文白对照，理解心性、仁政与担当。',
  中庸: '三十三章完整对照，沿着诚、性与中和展开修习。',
  大学章句集注: '十一章完整文白对照，从明明德到修齐治平。',
  心经: '般若经典全文与现代译文；HOS 另提供 CBETA 校勘阅读版。',
  黄帝内经: '传统医学经典的篇章原文与现代释读，仅作文化学习。',
}

export const OPEN_CLASSICS_CATALOG: OpenClassicCatalogItem[] = names.map((name) => ({
  id: `open-${encodeURIComponent(name)}`,
  name,
  category: categoryOf(name),
  description: descriptions[name] ?? `${categoryOf(name)}类经典，按原书篇章提供原文与现代译文对照。`,
}))

export const OPEN_CLASSIC_CATEGORIES: Array<'全部' | OpenClassicCategory> = ['全部', '儒', '释', '道', '史', '文', '科', '术']

export function findOpenClassic(name: string | null) {
  return OPEN_CLASSICS_CATALOG.find((book) => book.name === name) ?? null
}
