import type { CultivationTextSection, CultivationTextSource, CultivationTextVolume } from '../data/cultivationReader'

export type LoadedCultivationVolume = {
  sections: CultivationTextSection[]
  fullText: string
  cached: boolean
}

const CACHE_VERSION = 'v1'

function paragraphize(value: string) {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return ''
  const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized]
  const paragraphs: string[] = []
  let buffer = ''
  sentences.forEach((sentence) => {
    buffer += sentence
    if (buffer.length >= 110 || /[！？!?]$/.test(sentence)) {
      paragraphs.push(buffer)
      buffer = ''
    }
  })
  if (buffer) paragraphs.push(buffer)
  if (paragraphs.length === 1 && paragraphs[0].length > 360) {
    return paragraphs[0].match(/.{1,180}/g)?.join('\n\n') ?? paragraphs[0]
  }
  return paragraphs.join('\n\n')
}

function isLikelyHeading(rawLine: string, text: string) {
  if (!text || text.length > 32) return false
  if (/^(欽定|重刋|重刊|正統道藏|四庫全書)/.test(text)) return false
  if (/(撰|著|述|集|註|注|序曰|題詞)$/.test(text) && text.length > 6) return false
  const indented = /^[\t 　]{2,}/.test(rawLine)
  const numbered = /(?:第[一二三四五六七八九十百〇零]+|[一二三四五六七八九十]+[篇章卷]?)$/.test(text)
  return indented || numbered
}

export function parseKanripoText(value: string, volume: CultivationTextVolume) {
  const lines = value
    .replace(/<(?:pb|md):[^>]+>/g, '')
    .replace(/<[^>]+>/g, '')
    .split(/\r?\n/)
    .filter((line) => !/^#/.test(line.trim()))

  const sections: CultivationTextSection[] = []
  let title = volume.title
  let body = ''
  const usedTitles = new Set<string>()

  const flush = () => {
    const text = paragraphize(body)
    if (!text) return
    const baseId = `${volume.id}-${sections.length + 1}`
    sections.push({ id: baseId, title, text })
    body = ''
  }

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/¶/g, '').replace(/\u3000/g, ' ').trim()
    if (!line) return
    if (isLikelyHeading(rawLine, line) && !usedTitles.has(line)) {
      usedTitles.add(line)
      if (body.length > 80) {
        flush()
        title = line
      } else {
        body += line
      }
      return
    }
    body += line
  })
  flush()

  if (!sections.length) {
    const text = paragraphize(lines.join(''))
    if (text) sections.push({ id: `${volume.id}-1`, title: volume.title, text })
  }
  return sections
}

function cacheKey(bookId: string, volumeId: string) {
  return `hos_cultivation_text_${CACHE_VERSION}_${bookId}_${volumeId}`
}

function readCache(bookId: string, volumeId: string) {
  try {
    const cached = localStorage.getItem(cacheKey(bookId, volumeId))
    if (!cached) return null
    const sections = JSON.parse(cached) as CultivationTextSection[]
    if (!Array.isArray(sections) || !sections.length) return null
    return sections
  } catch {
    return null
  }
}

function saveCache(bookId: string, volumeId: string, sections: CultivationTextSection[]) {
  try { localStorage.setItem(cacheKey(bookId, volumeId), JSON.stringify(sections)) } catch { /* Online reading remains available. */ }
}

export async function fetchCultivationVolume(bookId: string, source: CultivationTextSource, volume: CultivationTextVolume, signal?: AbortSignal): Promise<LoadedCultivationVolume> {
  if (volume.sections?.length) {
    return { sections: volume.sections, fullText: volume.sections.map((section) => `${section.title}。${section.text}`).join('\n'), cached: true }
  }

  const cachedSections = readCache(bookId, volume.id)
  if (cachedSections) {
    return { sections: cachedSections, fullText: cachedSections.map((section) => `${section.title}。${section.text}`).join('\n'), cached: true }
  }

  if (source.kind !== 'kanripo' || !source.repo || !volume.sourceFile) throw new Error('这部原典的数字底本配置尚未完成')
  const branch = source.branch ?? 'master'
  const rawUrl = `https://raw.githubusercontent.com/${source.repo}/${branch}/${volume.sourceFile}`
  const urls = [
    `https://cdn.jsdelivr.net/gh/${source.repo}@${branch}/${volume.sourceFile}`,
    `https://fastly.jsdelivr.net/gh/${source.repo}@${branch}/${volume.sourceFile}`,
    rawUrl,
  ]
  let failure = ''
  for (const url of urls) {
    const controller = new AbortController()
    let parentAborted = false
    const abortFromParent = () => { parentAborted = true; controller.abort() }
    if (signal?.aborted) throw new DOMException('读取已取消', 'AbortError')
    signal?.addEventListener('abort', abortFromParent, { once: true })
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(url, { signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' })
      if (!response.ok) {
        failure = `线路返回 ${response.status}`
        continue
      }
      const sections = parseKanripoText(await response.text(), volume)
      const fullText = sections.map((section) => `${section.title}。${section.text}`).join('\n')
      if (fullText.length < 120) throw new Error('返回内容过短，已阻止把不完整文本当作全本显示')
      saveCache(bookId, volume.id, sections)
      return { sections, fullText, cached: false }
    } catch (reason) {
      if (parentAborted) throw new DOMException('读取已取消', 'AbortError')
      failure = reason instanceof Error ? reason.message : '线路未响应'
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abortFromParent)
    }
  }
  throw new Error(`原典全文暂时未读取${failure ? `（${failure}）` : ''}`)
}
