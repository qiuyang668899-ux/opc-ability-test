import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const hostingSource = path.join(root, '.openai', 'hosting.json')
const hostingTarget = path.join(root, 'dist', '.openai', 'hosting.json')
const workerSource = path.join(root, 'worker', 'hos-worker.js')
const workerTarget = path.join(root, 'dist', 'server', 'index.js')

fs.mkdirSync(path.dirname(workerTarget), { recursive: true })
fs.copyFileSync(workerSource, workerTarget)

if (fs.existsSync(hostingSource)) {
  fs.mkdirSync(path.dirname(hostingTarget), { recursive: true })
  fs.copyFileSync(hostingSource, hostingTarget)
}

