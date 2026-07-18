import type { OpenClassicCatalogItem } from '../data/openClassicsCatalog'
import { OPEN_CORPUS_SOURCE_PATHS } from '../data/openCorpusManifest.generated'

export type OpenCorpusChapter = {
  id: string
  title: string
  sourcePath: string
  targetPath: string
}

export type OpenCorpusManifest = {
  book: OpenClassicCatalogItem
  chapters: OpenCorpusChapter[]
  fetchedAt: number
}

export type OpenCorpusChapterContent = {
  original: string[]
  modern: string[]
  fetchedAt: number
}

const REPO = 'NiuTrans/Classical-Modern'
const BRANCH = 'main'
const CACHE_VERSION = 'v4'

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Large books remain available online if local storage is full.
  }
}

function chapterTitle(path: string) {
  const parts = path.split('/')
  parts.pop()
  return parts.join(' · ').replace(/^\s+|\s+$/g, '') || '全文'
}

function chineseNumber(value: string) {
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 }
  let section = 0
  let total = 0
  let number = 0
  for (const char of value) {
    if (char in digits) {
      number = digits[char]
      continue
    }
    const unit = units[char]
    if (!unit) continue
    if (unit === 10000) {
      total += (section + number) * unit
      section = 0
      number = 0
    } else {
      section += (number || 1) * unit
      number = 0
    }
  }
  return total + section + number
}

function chapterOrder(title: string) {
  const match = title.match(/第([零〇一二两三四五六七八九十百千万]+)[章节回卷篇]/)
  if (match) return chineseNumber(match[1])
  const volume = title.match(/卷([零〇一二两三四五六七八九十百千万]+)/)
  return volume ? chineseNumber(volume[1]) : null
}

export async function fetchOpenCorpusManifest(book: OpenClassicCatalogItem, signal?: AbortSignal) {
  const cacheKey = `hos_open_corpus_manifest_${CACHE_VERSION}_${book.name}`
  const cached = safeGet<OpenCorpusManifest>(cacheKey)
  if (cached?.chapters.length) return { ...cached, cached: true }

  if (signal?.aborted) throw new DOMException('读取已取消', 'AbortError')
  const sourcePaths = OPEN_CORPUS_SOURCE_PATHS[book.name] ?? []
  const collator = new Intl.Collator('zh-CN', { numeric: true })
  const chapters = sourcePaths
    .map((relativeSourcePath) => {
      const sourcePath = `双语数据/${book.name}/${relativeSourcePath}`
      const targetPath = sourcePath.replace(/source\.txt$/, 'target.txt')
      const folder = relativeSourcePath.replace(/\/?source\.txt$/, '')
      return {
        id: encodeURIComponent(folder || '全文'),
        title: chapterTitle(relativeSourcePath),
        sourcePath,
        targetPath,
      }
    })
    .sort((left, right) => {
      const leftParent = left.title.split(' · ').slice(0, -1).join(' · ')
      const rightParent = right.title.split(' · ').slice(0, -1).join(' · ')
      const parentOrder = collator.compare(leftParent, rightParent)
      if (parentOrder !== 0) return parentOrder
      const leftOrder = chapterOrder(left.title)
      const rightOrder = chapterOrder(right.title)
      if (leftOrder !== null && rightOrder !== null) return leftOrder - rightOrder
      return collator.compare(left.title, right.title)
    })

  if (!chapters.length) throw new Error('这部经典暂未找到可逐句对照的章节')
  const manifest = { book, chapters, fetchedAt: Date.now() }
  safeSet(cacheKey, manifest)
  return { ...manifest, cached: false }
}

async function fetchRaw(path: string, signal?: AbortSignal) {
  const encodedPath = encodePath(path)
  const urls = [
    `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${encodedPath}`,
    `https://fastly.jsdelivr.net/gh/${REPO}@${BRANCH}/${encodedPath}`,
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${encodedPath}`,
  ]
  let lastStatus = ''

  for (const url of urls) {
    const controller = new AbortController()
    let parentAborted = false
    const abortFromParent = () => {
      parentAborted = true
      controller.abort()
    }
    if (signal?.aborted) throw new DOMException('读取已取消', 'AbortError')
    signal?.addEventListener('abort', abortFromParent, { once: true })
    const timeout = window.setTimeout(() => controller.abort(), 7000)
    try {
      const response = await fetch(url, { signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' })
      if (response.ok) return response.text()
      lastStatus = `${response.status}`
    } catch (reason) {
      if (parentAborted) throw new DOMException('读取已取消', 'AbortError')
      if (reason instanceof Error) lastStatus = reason.message
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abortFromParent)
    }
  }

  throw new Error(`章节线路暂时拥堵${lastStatus ? `（${lastStatus}）` : ''}，请稍后重试`)
}

function cleanLines(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function fetchOpenCorpusChapter(chapter: OpenCorpusChapter, signal?: AbortSignal) {
  const cacheKey = `hos_open_corpus_chapter_${CACHE_VERSION}_${encodeURIComponent(chapter.sourcePath)}`
  const cached = safeGet<OpenCorpusChapterContent>(cacheKey)
  if (cached?.original.length && cached?.modern.length) return { ...cached, cached: true }
  const [source, target] = await Promise.all([
    fetchRaw(chapter.sourcePath, signal),
    fetchRaw(chapter.targetPath, signal),
  ])
  const original = cleanLines(source)
  const modern = cleanLines(target)
  const content = { original, modern, fetchedAt: Date.now() }
  safeSet(cacheKey, content)
  return { ...content, cached: false }
}
