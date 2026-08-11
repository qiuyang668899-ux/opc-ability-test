import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT_ROOT = path.join(ROOT, 'public', 'data', 'cultivation-translations')
const API_KEY = process.env.DEEPSEEK_API_KEY
const MODEL = process.env.DEEPSEEK_TRANSLATION_MODEL || 'deepseek-v4-pro'
const FORCE = process.argv.includes('--force')

if (!API_KEY) throw new Error('DEEPSEEK_API_KEY is required')

const numberedVolumes = (repo, branch, count, titles) => Array.from({ length: count }, (_, index) => ({
  id: `${repo}-${index + 1}`,
  title: titles[index],
  sourceFile: `${repo}_${String(index + 1).padStart(3, '0')}.txt`,
  repo: `kanripo/${repo}`,
  branch,
}))

const books = [
  { id: 'qingjing', title: '《太上老君说常清静经》', volumes: [{ id: 'qingjing-full', title: '全经', sourceFile: 'KR5c0001_000.txt', repo: 'kanripo/KR5c0001', branch: 'master' }] },
  { id: 'zuowanglun', title: '《坐忘论》', volumes: [{ id: 'zuowanglun-full', title: '全卷 · 敬信至得道', sourceFile: 'KR5d0059_001.txt', repo: 'kanripo/KR5d0059', branch: 'master' }] },
  { id: 'tianyizi', title: '《天隐子》', inline: true, volumes: [{ id: 'tianyizi-full', title: '全本 · 八篇' }] },
  { id: 'huangting', title: '《黄庭内景经》', volumes: [{ id: 'huangting-full', title: '全本 · 三十六章', sourceFile: 'KR5i0011_001.txt', repo: 'kanripo/KR5i0011', branch: 'master' }] },
  { id: 'yangsheng', title: '《养性延命录》', volumes: numberedVolumes('KR5c0235', 'master', 2, ['卷上', '卷下']) },
  { id: 'cantongqi', title: '《周易参同契》', volumes: numberedVolumes('KR5d0016', 'master', 3, ['卷上', '卷中', '卷下']) },
  { id: 'zhonglu', title: '《钟吕传道集》', volumes: numberedVolumes('KR5a0266', 'master', 3, ['卷一', '卷二', '卷三']) },
  { id: 'wuzhen', title: '《悟真篇》', volumes: numberedVolumes('KR5a0268', 'master', 5, ['卷一', '卷二', '卷三', '卷四', '卷五']) },
  { id: 'xingming', title: '《性命圭旨》', volumes: [{ id: 'xingming-full', title: '全本 · 元亨利贞四集', sourceFile: 'KR5i0012_001.txt', repo: 'kanripo/KR5i0012', branch: 'master' }] },
  { id: 'jingming', title: '《太上灵宝净明宗教录》', volumes: numberedVolumes('KR5i0041', 'CK-KZ-jye', 2, ['卷一 · 净明法序与入道品', '卷二 · 经典集成']) },
  { id: 'liexian', title: '《列仙传》', volumes: numberedVolumes('KR5a0306', 'master', 2, ['卷上', '卷下']) },
  { id: 'shenxian', title: '《神仙传》', volumes: numberedVolumes('KR5c0317', 'master', 10, ['卷一', '卷二', '卷三', '卷四', '卷五', '卷六', '卷七', '卷八', '卷九', '卷十']) },
]

function paragraphize(value) {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return ''
  const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized]
  const paragraphs = []
  let buffer = ''
  sentences.forEach((sentence) => {
    buffer += sentence
    if (buffer.length >= 110 || /[！？!?]$/.test(sentence)) {
      paragraphs.push(buffer)
      buffer = ''
    }
  })
  if (buffer) paragraphs.push(buffer)
  if (paragraphs.length === 1 && paragraphs[0].length > 360) return paragraphs[0].match(/.{1,180}/g)?.join('\n\n') ?? paragraphs[0]
  return paragraphs.join('\n\n')
}

function isLikelyHeading(rawLine, text) {
  if (!text || text.length > 32) return false
  if (/^(欽定|重刋|重刊|正統道藏|四庫全書)/.test(text)) return false
  if (/(撰|著|述|集|註|注|序曰|題詞)$/.test(text) && text.length > 6) return false
  const indented = /^[\t 　]{2,}/.test(rawLine)
  const numbered = /(?:第[一二三四五六七八九十百〇零]+|[一二三四五六七八九十]+[篇章卷]?)$/.test(text)
  return indented || numbered
}

function parseKanripoText(value, volume) {
  const lines = value.replace(/<(?:pb|md):[^>]+>/g, '').replace(/<[^>]+>/g, '').split(/\r?\n/).filter((line) => !/^#/.test(line.trim()))
  const sections = []
  let title = volume.title
  let body = ''
  const usedTitles = new Set()
  const flush = () => {
    const text = paragraphize(body)
    if (!text) return
    sections.push({ id: `${volume.id}-${sections.length + 1}`, title, text })
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
      } else body += line
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

function readTianyiziSections() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'data', 'cultivationReader.ts'), 'utf8')
  const block = source.match(/id: 'tianyizi-full',[\s\S]*?sections: \[([\s\S]*?)\n      \],/)?.[1] ?? ''
  const matches = [...block.matchAll(/\{ id: '([^']+)', title: '([^']+)', text: '((?:\\'|[^'])*)' \}/g)]
  if (!matches.length) throw new Error('Unable to read inline Tianyizi sections')
  return matches.map((match) => ({ id: match[1], title: match[2], text: match[3].replace(/\\'/g, "'") }))
}

async function fetchText(volume) {
  const urls = [
    `https://cdn.jsdelivr.net/gh/${volume.repo}@${volume.branch}/${volume.sourceFile}`,
    `https://fastly.jsdelivr.net/gh/${volume.repo}@${volume.branch}/${volume.sourceFile}`,
    `https://raw.githubusercontent.com/${volume.repo}/${volume.branch}/${volume.sourceFile}`,
  ]
  let failure = ''
  for (const url of urls) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        failure = `${response.status}`
        continue
      }
      return response.text()
    } catch (error) {
      failure = error instanceof Error ? error.message : 'network failure'
    } finally {
      clearTimeout(timeout)
    }
  }
  throw new Error(`Unable to fetch ${volume.sourceFile}: ${failure}`)
}

function outputPath(bookId, volumeId) {
  return path.join(OUTPUT_ROOT, bookId, `${volumeId}.json`)
}

function validExisting(file, sections) {
  if (FORCE || !fs.existsSync(file)) return false
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(value.sections)
      && value.sections.length === sections.length
      && value.sections.every((item, index) => item.id === sections[index].id && typeof item.modern === 'string' && item.modern.length > 10)
  } catch {
    return false
  }
}

async function translateChunk(book, volume, sections, attempt = 1) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      temperature: 0.15,
      max_tokens: 120000,
      messages: [
        {
          role: 'system',
          content: '你是一位严谨的中国古典文献白话翻译者，熟悉道教史、古代思想、传记与丹道术语。任务是把输入的古汉语完整翻译成清楚、自然、克制的现代简体中文。不得删节、概括、续写、宣传神异功效或添加修炼处方；人名、书名和关键术语应保留，必要时在译文中用极短括注说明。原文若存在版本讹字或断句疑点，按上下文谨慎直译，不擅自补造成事实。只输出合法 JSON。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: '逐节完整翻译。必须保留每个 id，sections 数量、顺序和 id 与输入完全一致。title 原样返回；modern 填对应的完整现代简体中文译文，保留自然分段。输出格式为 {"sections":[{"id":"...","title":"...","modern":"..."}]}。',
            book: book.title,
            volume: volume.title,
            sections,
          }),
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${(await response.text()).slice(0, 300)}`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('DeepSeek returned no content')
  let parsed
  try { parsed = JSON.parse(content) } catch { throw new Error('DeepSeek returned invalid JSON') }
  const translated = parsed?.sections
  const complete = Array.isArray(translated)
    && translated.length === sections.length
    && translated.every((item, index) => item.id === sections[index].id && typeof item.modern === 'string' && item.modern.trim().length >= Math.min(24, Math.max(8, Math.floor(sections[index].text.length * 0.35))))
  if (!complete) {
    if (attempt < 3) return translateChunk(book, volume, sections, attempt + 1)
    throw new Error('Translation coverage validation failed')
  }
  return translated.map((item, index) => ({ id: sections[index].id, title: sections[index].title, modern: item.modern.trim() }))
}

async function translate(book, volume, sections) {
  const chunks = []
  let chunk = []
  let length = 0
  sections.forEach((section) => {
    if (chunk.length && (chunk.length >= 12 || length + section.text.length > 9000)) {
      chunks.push(chunk)
      chunk = []
      length = 0
    }
    chunk.push(section)
    length += section.text.length
  })
  if (chunk.length) chunks.push(chunk)

  const translated = []
  for (const group of chunks) translated.push(...await translateChunk(book, volume, group))
  return translated
}

async function processVolume(book, volume) {
  const sections = book.inline ? readTianyiziSections() : parseKanripoText(await fetchText(volume), volume)
  const file = outputPath(book.id, volume.id)
  if (validExisting(file, sections)) return { status: 'cached', book: book.title, volume: volume.title, sections: sections.length }
  const translated = await translate(book, volume, sections)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify({
    bookId: book.id,
    volumeId: volume.id,
    bookTitle: book.title,
    volumeTitle: volume.title,
    kind: 'HOS 现代学习译文',
    model: MODEL,
    generatedAt: new Date().toISOString(),
    sections: translated,
  }, null, 2)}\n`)
  return { status: 'generated', book: book.title, volume: volume.title, sections: sections.length }
}

const jobs = books.flatMap((book) => book.volumes.map((volume) => ({ book, volume })))
let cursor = 0
let failed = false
const workers = Array.from({ length: Number(process.env.TRANSLATION_CONCURRENCY || 3) }, async () => {
  while (cursor < jobs.length) {
    const index = cursor++
    const { book, volume } = jobs[index]
    try {
      const result = await processVolume(book, volume)
      console.log(`[${index + 1}/${jobs.length}] ${result.status} ${result.book} ${result.volume} · ${result.sections} 节`)
    } catch (error) {
      failed = true
      console.error(`[${index + 1}/${jobs.length}] FAILED ${book.title} ${volume.title}:`, error instanceof Error ? error.message : error)
    }
  }
})

await Promise.all(workers)
if (failed) process.exitCode = 1
