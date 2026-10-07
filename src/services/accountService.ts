import { accountHeaders, expireAccountSession, setAccountSession, type HOSAccountSession } from './accountSession'

export type Product = { id: string; name: string; kind: string; units: number; detail: string; amountFen: number | null; purchasable: boolean }
export type AccountConfig = { login: boolean; cloud: boolean; payments: boolean; referrals: boolean; policyVersion: string; operator: string; supportEmail: string; dataRegion: string; loginMessage: string; paymentMessage: string; products: Product[]; paymentChannels?: string[] }
export type Benefits = { credits: number; memberUntil: number; member: boolean; dailyAllowance: number }
export type Order = { id: string; product_id: string; amount_fen: number; status: string; created_at: number; paid_at?: number; refund_reason?: string }
export class AccountError extends Error { status: number; code: string; constructor(message: string, status: number, code: string) { super(message); this.status = status; this.code = code } }
function baseURL() {
  const endpoint = String(import.meta.env.VITE_HOS_AI_ENDPOINT || '').trim()
  if (!endpoint) throw new AccountError('账户服务暂时无法连接，请稍后再试。', 503, 'endpoint')
  return new URL(endpoint).origin
}
export async function accountAPI<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 18000)
  try {
    const response = await fetch(`${baseURL()}${path}`, { method, headers: { ...accountHeaders(), ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal, cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401) expireAccountSession()
      throw new AccountError(result.message || '暂时未能完成，请稍后重试。', response.status, result.code || 'unavailable')
    }
    return result as T
  } catch (error) {
    if (error instanceof AccountError) throw error
    throw new AccountError('网络暂时不可用，记录仍保存在本机。请稍后重试。', 0, 'network')
  } finally { window.clearTimeout(timer) }
}
export const getAccountConfig = () => accountAPI<AccountConfig>('/api/account/config')
export async function signIn(data: unknown) {
  const result = await accountAPI<HOSAccountSession & { entitlements: Benefits }>('/api/account/login', 'POST', data)
  setAccountSession({ token: result.token, expiresAt: result.expiresAt, user: result.user })
  return result
}
export async function signOut() {
  await accountAPI('/api/account/logout', 'POST')
  setAccountSession(null)
}
