import { accountSession, accountStorageKey } from './accountSession'
import { accountAPI, AccountError } from './accountService'
export const CLOUD_KEYS = ['user','journal','voiceJournal','voiceMemory','dailyCheckIn','practiceOutcomes','cultivationPracticeRecords','qimenRecords','mindMatterPracticeRecords','flowSessions','regulationJourneyHistory','classicPracticeNotes','classicFavorites','classicPracticeCompletions','classicReadingProgress','completeReadingProgress','cultivationReadingProgress','activation','coachFeedback','ritualRecords','ritualProfile','evolutionFeedback','evolutionProfile','evolutionProgress','chat','personalPreferences']
type Snapshot = { data: Record<string, unknown> | null; revision: number; updatedAt: number | null }
export type CloudStatus = { state: 'off' | 'syncing' | 'saved' | 'error' | 'conflict'; message: string }
let status: CloudStatus = { state: 'off', message: '当前记录保存在本机' }
let generation = 0
let archiveQueue = Promise.resolve()
function operation() {
  const session = accountSession()
  return session ? { token: session.token, userId: session.user.id, generation } : null
}
function isCurrent(start: ReturnType<typeof operation>) {
  const current = accountSession()
  return !!start && start.generation === generation && current?.token === start.token && current.user.id === start.userId
}
function queuedArchive(start: ReturnType<typeof operation>, work: () => Promise<void>) {
  // Keep reconciliation and its upload together so a GET cannot read behind an earlier PUT.
  const pending = archiveQueue.then(() => { if (isCurrent(start)) return work() })
  archiveQueue = pending.then(() => {}, () => {})
  return pending
}
export function cloudStatus() { return status }
export function resetCloudStatus() { generation++; update({state:'off',message:'当前记录保存在本机'}) }
function update(next: CloudStatus) { status = next; window.dispatchEvent(new CustomEvent('hos:cloud-status')) }
export function cloudEnabled() { return !!accountSession() && localStorage.getItem(accountStorageKey('cloudEnabled')) === 'yes' }
export function setCloudEnabled(enabled: boolean) {
  localStorage.setItem(accountStorageKey('cloudEnabled'), enabled ? 'yes' : 'no')
  if (!enabled) { generation++; update({ state: 'off', message: '自动同步已关闭，本机记录保留' }) }
}
export function collectArchive(guest = false) {
  const values: Record<string, unknown> = {}
  for (const key of CLOUD_KEYS) { const raw = localStorage.getItem(guest ? `hos_${key}` : accountStorageKey(key)); if (raw) values[key] = JSON.parse(raw) }
  return values
}
function applyArchive(data: Record<string, unknown>) {
  const previous = new Map<string, string | null>()
  try {
    for (const key of CLOUD_KEYS) {
      const storageKey = accountStorageKey(key); previous.set(storageKey, localStorage.getItem(storageKey))
      if (Object.hasOwn(data, key)) localStorage.setItem(storageKey, JSON.stringify(data[key]))
      else localStorage.removeItem(storageKey)
    }
  } catch (error) { for (const [key,value] of previous) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value) }; throw error }
  window.dispatchEvent(new CustomEvent('hos:data-updated'))
}
export async function enableCloud() {
  generation++
  const start = operation(); if (!start) return
  await queuedArchive(start, async () => {
    const remote = await accountAPI<Snapshot>('/api/account/archive')
    if (!isCurrent(start)) return
    const local = collectArchive()
    if (remote.data && Object.keys(local).length && JSON.stringify(remote.data) !== JSON.stringify(local)) {
      update({ state: 'conflict', message: '本机和云端都有记录。请先下载云端副本，再选择恢复云端或上传本机。两份记录不会被自动覆盖。' })
      return
    }
    if (remote.data) applyArchive(remote.data)
    localStorage.setItem(accountStorageKey('cloudRevision'), String(remote.revision))
    setCloudEnabled(true); await uploadArchive(start)
  })
}
async function uploadArchive(start: ReturnType<typeof operation>) {
  if (!isCurrent(start) || !cloudEnabled()) return
  update({ state: 'syncing', message: '正在加密同步档案…' })
  try {
    const revision = Number(localStorage.getItem(accountStorageKey('cloudRevision')) || 0)
    const remote = await accountAPI<Snapshot>('/api/account/archive', 'PUT', { revision, data: collectArchive() })
    if (!isCurrent(start) || !cloudEnabled()) return
    localStorage.setItem(accountStorageKey('cloudRevision'), String(remote.revision))
    update({ state: 'saved', message: `已同步 · ${new Date(remote.updatedAt || Date.now()).toLocaleTimeString('zh-CN')}` })
  } catch (error) { if (isCurrent(start) && cloudEnabled()) update({ state: error instanceof AccountError && error.status === 409 ? 'conflict' : 'error', message: error instanceof Error ? error.message : '暂未同步，本机记录仍保留' }) }
}
export async function syncCloud() {
  if (!cloudEnabled() || status.state === 'conflict') return
  const start = operation(); if (!start) return
  await queuedArchive(start, async () => {
    if (status.state !== 'conflict') await uploadArchive(start)
  })
}
export function downloadJSON(data: unknown, name: string) {
  const href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const link=document.createElement('a');link.href=href;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000)
}
export async function downloadCloudCopy() {
  const start = operation(); if (!start) return
  await queuedArchive(start, async () => {
    const snapshot = await accountAPI<Snapshot>('/api/account/archive')
    if (isCurrent(start)) downloadJSON(snapshot,'HOS-云端档案备份.json')
  })
}
export async function resolveCloud(direction: 'cloud' | 'local') {
  generation++
  const start = operation(); if (!start) return
  await queuedArchive(start, async () => {
    const remote=await accountAPI<Snapshot>('/api/account/archive')
    if (!isCurrent(start)) return
    downloadJSON({data:collectArchive(),exportedAt:Date.now()},'HOS-同步前本机备份.json')
    if(direction==='cloud') applyArchive(remote.data || {})
    else downloadJSON(remote,'HOS-同步前云端备份.json')
    localStorage.setItem(accountStorageKey('cloudRevision'),String(remote.revision));setCloudEnabled(true);await uploadArchive(start)
  })
}
export function importGuestArchive() {
  const incoming=collectArchive(true);const current=collectArchive()
  if (Object.keys(current).length) throw new Error('该账号已有记录。为避免覆盖，请先导出本机访客档案，暂不自动合并。')
  applyArchive(incoming);window.dispatchEvent(new CustomEvent('hos:state-saved'))
}
