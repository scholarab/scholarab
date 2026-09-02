import { isLocalPreview } from './events'

/**
 * The canonical origin, for links that go into email.
 *
 * `new URL(path, request.url)` reflects whatever host the request arrived on,
 * which is fine for a redirect and wrong for anything mailed: the confirm link
 * carries the subscriber's opt-in token, and the message ships from the real
 * `alerts@` address with valid SPF/DKIM. A non-canonical hostname that reaches
 * the deployment; the project's own `*.pages.dev` alias does, with no header
 * spoofing at all; would produce a genuine, correctly-signed ScholarAB email
 * whose only call-to-action points somewhere else.
 *
 * So the origin comes from configuration, exactly as scripts/send-alerts.ts
 * already does with its BASE_URL. Kept in step with `site` in astro.config.mjs.
 */
export const CANONICAL_ORIGIN = 'https://www.scholarab.ca'

/**
 * Build an absolute URL for `path` on the canonical origin.
 *
 * `request` is consulted for one reason only: a link mailed from `astro dev`
 * or `wrangler pages dev` has to point back at that local server, or testing
 * the confirm flow means hand-editing every URL. A local host can only be
 * reached from the machine running it, so it is not a host an attacker can
 * present. Every other host, including any unrecognised one; gets the
 * canonical origin.
 */
export function canonicalUrl(path: string, request?: Request): string {
  if (request) {
    try {
      const origin = new URL(request.url)
      if (isLocalPreview(origin.hostname)) return new URL(path, origin).toString()
    } catch { /* unparseable request URL; fall through to the canonical one */ }
  }
  return new URL(path, CANONICAL_ORIGIN).toString()
}
