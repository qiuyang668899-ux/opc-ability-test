import fs from 'node:fs'
import path from 'node:path'

const [inputPath = '/tmp/niu-github-tree.json', outputPath = 'src/data/openCorpusManifest.generated.ts'] = process.argv.slice(2)
const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const tree = Array.isArray(payload.tree) ? payload.tree : []
const allPaths = new Set(tree.map((item) => item.path))
const books = {}

for (const item of tree) {
  if (item.type !== 'blob' || !item.path.startsWith('双语数据/') || !item.path.endsWith('/source.txt')) continue
  const targetPath = item.path.replace(/source\.txt$/, 'target.txt')
  if (!allPaths.has(targetPath)) continue
  const [, book, ...relativeParts] = item.path.split('/')
  if (!book || !relativeParts.length) continue
  books[book] ??= []
  books[book].push(relativeParts.join('/'))
}

const ordered = Object.fromEntries(
  Object.entries(books)
    .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
    .map(([book, chapters]) => [book, chapters.sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))]),
)
const source = `// Generated from NiuTrans/Classical-Modern. Do not hand-edit.\nexport const OPEN_CORPUS_SOURCE_PATHS: Record<string, string[]> = ${JSON.stringify(ordered, null, 2)}\n`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, source)
console.log(`Generated ${Object.keys(ordered).length} books at ${outputPath}`)
