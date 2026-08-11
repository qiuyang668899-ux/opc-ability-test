export type CultivationTranslationSection = {
  id: string
  title: string
  modern: string
}

export type CultivationTranslationVolume = {
  bookId: string
  volumeId: string
  bookTitle: string
  volumeTitle: string
  kind: 'HOS 现代学习译文'
  model: string
  sections: CultivationTranslationSection[]
  cached: boolean
}

const CACHE_VERSION = 'v1'

function cacheKey(bookId: string, volumeId: string) {
  return `hos_cultivation_translation_${CACHE_VERSION}_${bookId}_${volumeId}`
}

function isTranslation(value: unknown, bookId: string, volumeId: string) {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CultivationTranslationVolume>
  return item.bookId === bookId
    && item.volumeId === volumeId
    && Array.isArray(item.sections)
    && item.sections.length > 0
    && item.sections.every((section) => typeof section.id === 'string' && typeof section.modern === 'string' && section.modern.trim().length > 0)
}

export async function fetchCultivationTranslation(bookId: string, volumeId: string, signal?: AbortSignal): Promise<CultivationTranslationVolume> {
  const key = cacheKey(bookId, volumeId)
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const parsed: unknown = JSON.parse(cached)
      if (isTranslation(parsed, bookId, volumeId)) return { ...(parsed as CultivationTranslationVolume), cached: true }
    }
  } catch {
    // Continue with the bundled translation when storage is unavailable.
  }

  const base = import.meta.env.BASE_URL || './'
  const url = `${base}data/cultivation-translations/${encodeURIComponent(bookId)}/${encodeURIComponent(volumeId)}.json`
  const controller = new AbortController()
  let parentAborted = false
  const abortFromParent = () => { parentAborted = true; controller.abort() }
  if (signal?.aborted) throw new DOMException('读取已取消', 'AbortError')
  signal?.addEventListener('abort', abortFromParent, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'force-cache' })
    if (!response.ok) throw new Error(`译文文件未读取（${response.status}）`)
    const parsed: unknown = await response.json()
    if (!isTranslation(parsed, bookId, volumeId)) throw new Error('译文与本卷原文未能一一对应')
    const result = { ...(parsed as CultivationTranslationVolume), cached: false }
    try { localStorage.setItem(key, JSON.stringify(result)) } catch { /* Browser cache still keeps the bundled file available. */ }
    return result
  } catch (reason) {
    if (parentAborted) throw new DOMException('读取已取消', 'AbortError')
    if (reason instanceof DOMException && reason.name === 'AbortError') throw new Error('译文读取超时，请重试')
    throw reason
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromParent)
  }
}
