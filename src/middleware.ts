import { defineMiddleware } from 'astro/middleware'
import { verifySessionCookie, getSessionToken } from './lib/adminAuth'
import { isCrossSiteWrite } from './lib/same-site'

/**
 * The security headers public/_headers sets, repeated here for the routes it
 * cannot reach.
 *
 * Cloudflare Pages applies _headers to static asset responses only; a response
 * produced by a Function is never seen by that file. Every SSR route in this
 * project is a Function: /api/confirm and /api/unsubscribe both render real
 * HTML with a submit button in it, and the whole admin panel lives there too.
 * All of it was shipping with no CSP, no framing rule and no HSTS while the
 * static half of the same site had all three.
 *
 * Kept deliberately in step with public/_headers. The CSP is that file's
 * string minus the Cloudflare Insights allowances, which only the public
 * pages need, plus form-action, which matters more here than there: these are
 * the only two routes on the site with a form on them.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; " +
    "object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
}

function harden(response: Response): Response {
  // Only ever adds. A route that has deliberately set one of these (none do
  // today) keeps its own value rather than being quietly overruled here.
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value)
  }
  return response
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname

  // Stands in for Astro's security.checkOrigin, which is off; see same-site.ts
  // for why. This has to run before anything else writes.
  if (isCrossSiteWrite(context.request, context.url)) {
    return harden(new Response('Cross-site form submissions are forbidden', { status: 403 }))
  }

  if (path !== '/admin' && !path.startsWith('/admin/')) return harden(await next())
  if (path === '/admin/login' || path === '/admin/api/login') return harden(await next())

  const token = getSessionToken(context.request)
  if (!(await verifySessionCookie(token))) {
    // API calls come from fetch(): a redirect would resolve to the login
    // page's HTML with a 200, which res.ok checks read as success.
    if (path.startsWith('/admin/api/')) {
      return harden(new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`)
  }

  context.locals.user = { id: 'admin', email: 'admin@scholarab.ca', name: 'Admin' }
  return harden(await next())
})
