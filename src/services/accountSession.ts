export type HOSAccountSession = { token: string; expiresAt: number; user: { id: string; phoneMasked: string; inviteCode: string; cloudConsent: boolean; createdAt: number } }
const SESSION_KEY = 'hos_account_session_v1'
export function accountIdentity(): HOSAccountSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as HOSAccountSession | null
    return value && /^[a-f0-9]{64}$/.test(value.token) && /^[a-f0-9-]{36}$/.test(value.user?.id) ? value : null
  } catch { return null }
}
export function accountSession(): HOSAccountSession | null {
  const value = accountIdentity()
  return value && value.expiresAt > Date.now() ? value : null
}
export function expireAccountSession() {
  const value = accountIdentity()
  if (value) setAccountSession({ ...value, expiresAt: 0 })
}
export function setAccountSession(value: HOSAccountSession | null) {
  if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value))
  else sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new CustomEvent('hos:account-changed'))
}
export function accountStorageKey(key: string) {
  // Keep the account namespace on expiry; never spill a user's draft into guest data.
  const session = accountIdentity()
  return session ? `hos_account_${session.user.id}_${key}` : `hos_${key}`
}
export function accountHeaders(): Record<string, string> {
  const session = accountSession()
  return session ? { 'X-HOS-Session': session.token } : {}
}
