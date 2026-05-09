import { getEnv } from 'astro/env/runtime'

export const SESSION_COOKIE = 'admin_session'

function getSecret(): string {
  const s = getEnv('SESSION_SECRET') ?? import.meta.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? ''
  if (!s) throw new Error('SESSION_SECRET is not configured')
  return s
}

function getPassword(): string {
  return getEnv('ADMIN_PASSWORD') ?? import.meta.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? ''
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function checkAdminPassword(password: string): Promise<boolean> {
  const stored = getPassword()
  if (!stored) return false
  const enc = new TextEncoder()
  const a = enc.encode(password.normalize('NFKC'))
  const b = enc.encode(stored.normalize('NFKC'))
  // Constant-time compare (always same length check path)
  let diff = a.length ^ b.length
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

export async function createSessionCookie(): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const sig = await hmac(getSecret(), token)
  return `${token}.${sig}`
}

export async function verifySessionCookie(cookie: string | null): Promise<boolean> {
  if (!cookie) return false
  const dot = cookie.lastIndexOf('.')
  if (dot < 0) return false
  const token = cookie.slice(0, dot)
  const sig = cookie.slice(dot + 1)
  const expected = await hmac(getSecret(), token)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith(SESSION_COOKIE + '='))
  return match ? match.slice(SESSION_COOKIE.length + 1) : null
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  return verifySessionCookie(getSessionToken(request))
}
