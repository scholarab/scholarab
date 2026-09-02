/**
 * Analytics consent, for Google Analytics only.
 *
 * Nothing else on the site needs this. Cloudflare Web Analytics is cookieless
 * and identifier-free, and the first-party `events` table carries no IP, no
 * cookie and no session, so both were always defensible without asking. GA4 is
 * a different thing: it writes a `_ga` cookie, mints a client id that persists
 * across visits, and sends the request IP to Google. That is a pseudonymous
 * identifier, the privacy page has to say so, and the person it identifies has
 * to be able to say no first.
 *
 * Hence: GA loads only after an explicit grant. Consent Mode's `denied`
 * default is set before the tag runs, so the pre-decision state is not "GA is
 * running unconsented and promises to behave" but "GA is not on the page".
 */

/** localStorage, not a cookie. A consent record that is itself a cookie would
 *  be the only cookie on the site for a visitor who just declined cookies. */
const CONSENT_KEY = 'sa_consent'
/** Shared with events.ts; `?nt=1` already means "do not count this browser",
 *  and it would be incoherent for that to leave GA running. */
const OPT_OUT_KEY = 'sa_no_track'

export type Consent = 'granted' | 'denied'

/**
 * The stored choice, or null if this visitor has not made one.
 *
 * `sa_no_track` outranks a stored grant rather than merely filling in for a
 * missing one: a device flagged with `?nt=1` is one we have promised not to
 * count, and a grant clicked before that flag existed should not survive it.
 */
export function readConsent(): Consent | null {
  try {
    if (localStorage.getItem(OPT_OUT_KEY)) return 'denied'
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    // No storage means no way to remember a grant, and an un-rememberable
    // grant would re-ask on every page. Treat it as an unanswered decline.
    return null
  }
}

/** Record a choice. Returns what was stored so callers need not re-read. */
export function setConsent(value: Consent): Consent {
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* nothing to do */ }
  return value
}

/** Undo a choice, so the banner asks again. Used by `?ga=ask`. */
export function clearConsent(): void {
  try { localStorage.removeItem(CONSENT_KEY) } catch { /* nothing to do */ }
}

/**
 * Should GA be loaded at all on this page, before consent is even considered?
 *
 * Mirrors the guards in events.ts. Without them the dev server, `wrangler
 * pages dev dist` and every Playwright run would land in the property as real
 * sessions, which is the same contamination the 2026-08-08 audit found in the
 * events table.
 */
export function analyticsAllowedHere(hostname: string, webdriver: boolean, mode: string): boolean {
  if (mode === 'development') return false
  if (webdriver) return false
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
    hostname === '[::1]' || hostname === '::1' || hostname.endsWith('.local')
  return !local
}

/**
 * Honour `?ga=ask`, which clears the stored choice and re-shows the banner.
 *
 * The banner is shown once and then never again, which leaves someone who
 * clicked the wrong button with no way back. `?nt=1` had the same gap and got
 * `?nt=0`; this is that lesson applied before it costs anything. Documented on
 * the privacy page, so it is a public promise rather than an internal flag.
 */
export function syncConsentReset(search: string): boolean {
  try {
    if (new URLSearchParams(search).get('ga') !== 'ask') return false
    clearConsent()
    console.warn('[scholarab] analytics choice cleared; the banner will ask again')
    return true
  } catch { return false }
}
