export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export type ApiUser = {
  id: string
  username: string
  email: string
  full_name: string
  role: 'admin' | 'officer' | 'lawyer'
  is_active?: boolean
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('legalLockToken')
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('legalLockUser')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setSession(token: string, user: ApiUser) {
  localStorage.setItem('legalLockToken', token)
  localStorage.setItem('legalLockUser', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('legalLockToken')
  localStorage.removeItem('legalLockUser')
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const text = await response.text()
  let data: any = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') clearSession()
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}
