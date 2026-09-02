import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('astro/env/runtime', () => ({ getEnv: () => 'test-session-secret' }))

const { createSessionCookie, verifySessionCookie, SESSION_TTL_MS } =
  await import('../lib/adminAuth')

const NOW = Date.parse('2026-08-21T00:00:00Z')

/** Same construction adminAuth uses, so the fixtures below are really signed. */
async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('admin session cookies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts a cookie it just minted', async () => {
    expect(await verifySessionCookie(await createSessionCookie(NOW), NOW)).toBe(true)
  })

  it('rejects one past its expiry', async () => {
    const cookie = await createSessionCookie(NOW)
    expect(await verifySessionCookie(cookie, NOW + SESSION_TTL_MS - 1000)).toBe(true)
    // The whole point of the change: Max-Age is advice to the browser, this
    // is the part an attacker holding a copied cookie value cannot skip.
    expect(await verifySessionCookie(cookie, NOW + SESSION_TTL_MS + 1000)).toBe(false)
  })

  it('rejects a cookie whose expiry was edited', async () => {
    const cookie = await createSessionCookie(NOW)
    const [nonce, , sig] = cookie.split('.')
    const forged = `${nonce}.${NOW + SESSION_TTL_MS * 100}.${sig}`
    expect(await verifySessionCookie(forged, NOW)).toBe(false)
  })

  it('rejects the old two-field format even though its signature is valid', async () => {
    // `nonce.hmac(nonce)`; what every session issued before this change looks
    // like. Signed with the real secret, so the HMAC genuinely verifies and
    // only the shape check stands between it and an unbounded session.
    const nonce = 'a'.repeat(64)
    const legacy = `${nonce}.${await hmac('test-session-secret', nonce)}`

    // Guard the guard: if this ever stops being a valid signature the test
    // above passes for the wrong reason.
    const dot = legacy.lastIndexOf('.')
    expect(await hmac('test-session-secret', legacy.slice(0, dot))).toBe(legacy.slice(dot + 1))

    expect(await verifySessionCookie(legacy, NOW)).toBe(false)
  })

  it('rejects empty, unsigned and malformed input', async () => {
    for (const c of [null, '', 'nodot', 'a.b', 'a.b.c']) {
      expect(await verifySessionCookie(c, NOW)).toBe(false)
    }
  })
})
