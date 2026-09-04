/**
 * Our own replacement for Astro's `security.checkOrigin`, which is switched
 * off in astro.config.mjs because it broke the one flow it was guarding.
 *
 * WHY ASTRO'S VERSION COULD NOT WORK HERE
 * Astro's check is `request.headers.get('origin') === url.origin`, and it
 * refuses the request outright when the header is absent. Every SSR response
 * on this site carries `Referrer-Policy: no-referrer` from the middleware's
 * security headers, and Firefox derives the Origin header on a form POST from
 * the referrer policy: under no-referrer it sends no Origin at all. So a
 * Firefox user clicking "Yes, remind me" on /api/confirm, a same-origin form
 * posting to the page it was served from, got "Cross-site POST form
 * submissions are forbidden" and could never confirm a reminder. Chromium
 * keeps the header, which is why local testing never saw it. Found in
 * production on 2026-09-04.
 *
 * WHAT THIS DOES INSTEAD
 * It leads with Sec-Fetch-Site, which is what that header exists for and
 * which no referrer policy suppresses, and falls back to Origin for anything
 * that does not send it. The result is strictly more permissive than Astro's
 * check in exactly one case, a request carrying neither header, and stricter
 * in none.
 */

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * The part of Request this needs. Structurally a Request satisfies it, so the
 * middleware passes one straight in. It is spelled out because Origin and the
 * Sec-* headers are forbidden header names: undici drops them when a Request
 * is constructed in Node, so a test could not build the very cases that
 * matter here if the parameter were a real Request.
 */
export interface OriginProbe {
  method: string
  headers: { get(name: string): string | null }
}

/**
 * Routes whose only credential is a 64-character token mailed to one address.
 *
 * A cross-site request cannot forge one of these without already knowing the
 * token, and an attacker who knows it gains nothing by using it: the two
 * actions are confirming and cancelling the recipient's own reminder. So when
 * a request arrives with neither header, which is a plain HTTP client rather
 * than a browser, these are allowed through on the token alone. The sign-up
 * and analytics endpoints are not, since those write on unauthenticated input.
 */
const TOKEN_ONLY_ROUTES = new Set(['/api/confirm', '/api/unsubscribe'])

export function isCrossSiteWrite(request: OriginProbe, url: URL): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false

  // Sec-Fetch-Site is set by the browser and cannot be set by page script.
  // "none" is a user-initiated navigation, which a form POST is not, but it
  // is not cross-site either, so it passes.
  const site = request.headers.get('sec-fetch-site')
  if (site) return site !== 'same-origin' && site !== 'none'

  const origin = request.headers.get('origin')
  if (origin) return origin !== url.origin

  return !TOKEN_ONLY_ROUTES.has(url.pathname)
}
