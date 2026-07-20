import { defineMiddleware } from 'astro/middleware'
import { verifySessionCookie, getSessionToken } from './lib/adminAuth'

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  if (path !== '/admin' && !path.startsWith('/admin/')) return next()
  if (path === '/admin/login' || path === '/admin/api/login') return next()

  const token = getSessionToken(context.request)
  if (!(await verifySessionCookie(token))) {
    // API calls come from fetch(): a redirect would resolve to the login
    // page's HTML with a 200, which res.ok checks read as success.
    if (path.startsWith('/admin/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`)
  }

  context.locals.user = { id: 'admin', email: 'admin@scholarab.ca', name: 'Admin' }
  return next()
})
