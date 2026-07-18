import type { CuratedDaoistVolume } from '../data/curatedDaoist'

const REPO = 'kanripo/KR5i0041'
const BRANCH = 'CK-KZ-jye'
const CACHE_VERSION = 'v1'

function cleanKanripoText(value: string) {
  return value
    .replace(/^#.*$/gm, '')
    .replace(/<pb:[^>]+>/g, '')
    .replace(/¶/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function fetchCuratedDaoistVolume(volume: CuratedDaoistVolume, signal?: AbortSignal) {
  const key = `hos_jingming_${CACHE_VERSION}_${volume.id}`
  try {
    const cached = localStorage.getItem(key)
    if (cached) return { original: cached, cached: true }
  } catch {
    // Continue online when private browsing blocks storage.
  }

  const urls = [
    `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${volume.sourceFile}`,
    `https://fastly.jsdelivr.net/gh/${REPO}@${BRANCH}/${volume.sourceFile}`,
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${volume.sourceFile}`,
  ]
  let failure = ''
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal, referrerPolicy: 'strict-origin-when-cross-origin' })
      if (!response.ok) {
        failure = `${response.status}`
        continue
      }
      const original = cleanKanripoText(await response.text())
      if (original.length < 500) throw new Error('返回的原典内容不完整')
      try { localStorage.setItem(key, original) } catch { /* Reading remains available online. */ }
      return { original, cached: false }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
      failure = reason instanceof Error ? reason.message : '线路未响应'
    }
  }
  throw new Error(`开放原典暂时未读取${failure ? `（${failure}）` : ''}`)
}

