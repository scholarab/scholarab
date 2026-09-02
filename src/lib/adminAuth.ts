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

/** How long a signed-in admin session stays good for. Matches the cookie's
 *  Max-Age, but this is the half that is actually enforced. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

/**
 * `<random>.<expiryMs>.<hmac(random.expiryMs)>`.
 *
 * The expiry is inside the signed payload on purpose. The previous version
 * signed the random token alone, which proved the server minted the cookie
 * and nothing else: `Max-Age` on the Set-Cookie is a client-side courtesy,
 * so a copied cookie value stayed valid forever and the only way to revoke
 * one was rotating SESSION_SECRET, which signs the real admin out too.
 * There is still no server-side session table, so this cannot revoke a
 * specific session before it lapses; it bounds the damage instead.
 */
export async function createSessionCookie(now = Date.now()): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const payload = `${nonce}.${now + SESSION_TTL_MS}`
  return `${payload}.${await hmac(getSecret(), payload)}`
}

export async function verifySessionCookie(cookie: string | null, now = Date.now()): Promise<boolean> {
  if (!cookie) return false
  const dot = cookie.lastIndexOf('.')
  if (dot < 0) return false
  const payload = cookie.slice(0, dot)
  const sig = cookie.slice(dot + 1)

  // Signature first, always, and in constant time; an expiry check that ran
  // before it would answer "is this well-formed" for unsigned input.
  const expected = await hmac(getSecret(), payload)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return false

  // Cookies minted before the expiry existed are one field short. They carry a
  // valid signature, so they cannot be told apart from a forged one by the
  // HMAC; they are rejected on shape instead, which signs out any session
  // open across this deploy. That is the point of the change.
  const cut = payload.lastIndexOf('.')
  if (cut < 0) return false
  const expiry = Number(payload.slice(cut + 1))
  return Number.isFinite(expiry) && expiry > now
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith(SESSION_COOKIE + '='))
  return match ? match.slice(SESSION_COOKIE.length + 1) : null
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  return verifySessionCookie(getSessionToken(request))
}
