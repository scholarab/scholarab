import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readConsent, setConsent, clearConsent, analyticsAllowedHere, syncConsentReset } from '../lib/consent'

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks() })

describe('readConsent', () => {
  it('is null before anyone answers, so the banner asks', () => {
    expect(readConsent()).toBeNull()
  })

  it('reads back what was stored', () => {
    setConsent('granted')
    expect(readConsent()).toBe('granted')
    setConsent('denied')
    expect(readConsent()).toBe('denied')
  })

  it('treats a junk value as unanswered rather than as consent', () => {
    localStorage.setItem('sa_consent', 'yes-please')
    expect(readConsent()).toBeNull()
  })

  // The whole point of the gate: one off switch, not two that disagree.
  it('lets sa_no_track override a stored grant', () => {
    setConsent('granted')
    localStorage.setItem('sa_no_track', '1')
    expect(readConsent()).toBe('denied')
  })

  it('reports unanswered when storage throws, never granted', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(readConsent()).toBeNull()
  })
})

describe('clearConsent', () => {
  it('puts the question back', () => {
    setConsent('denied')
    clearConsent()
    expect(readConsent()).toBeNull()
  })
})

describe('analyticsAllowedHere', () => {
  it.each(['www.scholarab.ca', 'scholarab.ca'])('allows the real site at %s', host => {
    expect(analyticsAllowedHere(host, false, 'production')).toBe(true)
  })

  // The measurement ID is committed, so the host allowlist is the only thing
  // keeping preview deployments and forks out of the property.
  it.each(['scholarab.pages.dev', 'abc123.scholarab.pages.dev', 'scholarab.ca.evil.com', 'someonesfork.dev'])(
    'blocks %s, which would otherwise report into our property', host => {
      expect(analyticsAllowedHere(host, false, 'production')).toBe(false)
    })

  // Each of these mirrors a guard in events.ts that exists because the
  // 2026-08-08 audit found our own testing dominating the events table.
  it('blocks the dev server', () => {
    expect(analyticsAllowedHere('www.scholarab.ca', false, 'development')).toBe(false)
  })

  it('blocks automated browsers', () => {
    expect(analyticsAllowedHere('www.scholarab.ca', true, 'production')).toBe(false)
  })

  it.each(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', 'mac.local'])(
    'blocks a built bundle served from %s', host => {
      expect(analyticsAllowedHere(host, false, 'production')).toBe(false)
    })
})

describe('syncConsentReset', () => {
  it('clears the stored answer on ?ga=ask', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setConsent('denied')
    expect(syncConsentReset('?ga=ask')).toBe(true)
    expect(readConsent()).toBeNull()
  })

  it('leaves the answer alone otherwise', () => {
    setConsent('granted')
    expect(syncConsentReset('?s=ig')).toBe(false)
    expect(syncConsentReset('')).toBe(false)
    expect(readConsent()).toBe('granted')
  })
})

/**
 * The privacy claim about GA lives in five files. It was wrong in two of them
 * before this change, and a claim that is only true in some of the places it
 * appears is the failure mode docs/compliance.md calls out by name.
 */
describe('the GA disclosure stays consistent across the pages that make it', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8')

  it('privacy.astro names Google Analytics as a processor', () => {
    expect(read('src/pages/privacy.astro')).toMatch(/Google Analytics/)
  })

  it('privacy.astro documents the ?ga=ask escape hatch', () => {
    expect(read('src/pages/privacy.astro')).toMatch(/\?ga=ask/)
  })

  it('no page still claims the site sets no cookies', () => {
    // GA sets `_ga` for anyone who accepts, so this sentence became false the
    // moment the banner shipped. It was on the About page.
    for (const p of ['src/pages/about.astro', 'src/pages/privacy.astro']) {
      expect(read(p)).not.toMatch(/No cookies,/)
    }
  })

  it('no page still claims Cloudflare is the only analytics script', () => {
    expect(read('src/pages/privacy.astro')).not.toMatch(/The one analytics script on the site/)
  })

  it('the banner is gated on a grant, not merely configured to behave', () => {
    const c = read('src/components/sab/Analytics.astro')
    // gtag.js must be injected inside loadGa, which only a grant reaches.
    expect(c).toMatch(/googletagmanager\.com\/gtag\/js/)
    expect(c).toMatch(/consent', 'default'[\s\S]*analytics_storage: 'denied'/)
  })

  it('the CSP allows exactly the hosts the tag needs', () => {
    const h = read('public/_headers')
    expect(h).toMatch(/script-src[^;]*https:\/\/www\.googletagmanager\.com/)
    expect(h).toMatch(/connect-src[^;]*https:\/\/www\.google-analytics\.com/)
  })
})
