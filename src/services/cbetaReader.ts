import type { CompleteClassicBook } from '../data/completeClassics'

export type CbetaBookContent = {
  original: string
  fetchedAt: number
}

const CACHE_VERSION = '2026R1'

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
}

function htmlToReadableText(html: string) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  documentNode.querySelectorAll('.lb, .noteAnchor, .gaijiInfo, .facsimile, #back, #cbeta-copyright, script, style').forEach((node) => node.remove())
  documentNode.querySelectorAll('p, .head, .juan, .byline, .lg-row, br').forEach((node) => {
    node.append(documentNode.createTextNode('\n'))
  })
  return normalizeText(documentNode.body.textContent ?? '')
}

function extractCanonicalBody(text: string, book: CompleteClassicBook) {
  const start = text.indexOf(book.sourceStart)
  if (start < 0) throw new Error('未在权威数据中找到正文起点')
  const endStart = text.indexOf(book.sourceEnd, start)
  if (endStart < 0) throw new Error('未在权威数据中找到正文终点')
  return text.slice(start, endStart + book.sourceEnd.length)
}

function loadCached(book: CompleteClassicBook): CbetaBookContent | null {
  try {
    const raw = localStorage.getItem(`hos_cbeta_${CACHE_VERSION}_${book.sourceWork}`)
    if (!raw) return null
    const cached = JSON.parse(raw) as CbetaBookContent
    return cached.original ? cached : null
  } catch {
    return null
  }
}

function cacheContent(book: CompleteClassicBook, content: CbetaBookContent) {
  try {
    localStorage.setItem(`hos_cbeta_${CACHE_VERSION}_${book.sourceWork}`, JSON.stringify(content))
  } catch {
    // Reading remains available online even if private mode blocks local storage.
  }
}

export async function fetchCompleteCbetaBook(book: CompleteClassicBook, signal?: AbortSignal) {
  const cached = loadCached(book)
  if (cached) return { ...cached, cached: true }

  const parts = await Promise.all(book.juans.map(async (juan) => {
    const response = await fetch(`https://api.cbetaonline.cn/juans?work=${book.sourceWork}&juan=${juan}`, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal,
    })
    if (!response.ok) throw new Error(`CBETA 读取失败（${response.status}）`)
    const payload = await response.json() as { results?: string[] }
    if (!payload.results?.length) throw new Error('CBETA 暂未返回经文')
    return payload.results.map(htmlToReadableText).join('\n\n')
  }))

  const content = {
    original: extractCanonicalBody(parts.join('\n\n'), book),
    fetchedAt: Date.now(),
  }
  cacheContent(book, content)
  return { ...content, cached: false }
}
