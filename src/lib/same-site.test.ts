import { describe, it, expect } from 'vitest'
import { isCrossSiteWrite } from './same-site'

const URL_CONFIRM = new URL('https://www.scholarab.ca/api/confirm')
const URL_ALERT = new URL('https://www.scholarab.ca/api/alert')

// Built by hand rather than with `new Request`: undici drops Origin and the
// Sec-* headers as forbidden header names, which would silently empty out
// every case this file is here to test.
const req = (method: string, headers: Record<string, string> = {}) => ({
  method,
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
})

describe('isCrossSiteWrite', () => {
  it('lets every safe method through, headers or not', () => {
    for (const m of ['GET', 'HEAD', 'OPTIONS']) {
      expect(isCrossSiteWrite(req(m), URL_CONFIRM)).toBe(false)
      expect(isCrossSiteWrite(req(m, { 'sec-fetch-site': 'cross-site' }), URL_CONFIRM)).toBe(false)
    }
  })

  // The bug this file exists for. Firefox omits Origin on a same-origin form
  // POST when the page was served with Referrer-Policy: no-referrer, which
  // every SSR response here is. Sec-Fetch-Site is unaffected and says the
  // truth, so the submission must go through.
  it('accepts a same-origin POST that carries Sec-Fetch-Site but no Origin', () => {
    expect(isCrossSiteWrite(req('POST', { 'sec-fetch-site': 'same-origin' }), URL_CONFIRM)).toBe(false)
  })

  it('refuses a POST that Sec-Fetch-Site calls cross-site, even with a matching Origin', () => {
    const r = req('POST', { 'sec-fetch-site': 'cross-site', origin: 'https://www.scholarab.ca' })
    expect(isCrossSiteWrite(r, URL_CONFIRM)).toBe(true)
  })

  it('falls back to Origin when Sec-Fetch-Site is absent', () => {
    expect(isCrossSiteWrite(req('POST', { origin: 'https://www.scholarab.ca' }), URL_CONFIRM)).toBe(false)
    expect(isCrossSiteWrite(req('POST', { origin: 'https://evil.example' }), URL_CONFIRM)).toBe(true)
    // The www-less apex is a different origin and is redirected before it ever
    // reaches a Function, so treating it as cross-site is correct.
    expect(isCrossSiteWrite(req('POST', { origin: 'https://scholarab.ca' }), URL_CONFIRM)).toBe(true)
  })

  it('allows a headerless POST only on the token-only email routes', () => {
    expect(isCrossSiteWrite(req('POST'), URL_CONFIRM)).toBe(false)
    expect(isCrossSiteWrite(req('POST'), new URL('https://www.scholarab.ca/api/unsubscribe'))).toBe(false)
    expect(isCrossSiteWrite(req('POST'), URL_ALERT)).toBe(true)
    expect(isCrossSiteWrite(req('POST'), new URL('https://www.scholarab.ca/api/event'))).toBe(true)
  })

  it('covers the other writing methods, not just POST', () => {
    for (const m of ['PUT', 'PATCH', 'DELETE']) {
      expect(isCrossSiteWrite(req(m, { 'sec-fetch-site': 'cross-site' }), URL_ALERT)).toBe(true)
      expect(isCrossSiteWrite(req(m, { 'sec-fetch-site': 'same-origin' }), URL_ALERT)).toBe(false)
    }
  })
})
