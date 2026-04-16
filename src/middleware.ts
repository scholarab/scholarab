import { defineMiddleware } from 'astro/middleware'
import { verifySessionCookie, getSessionToken } from './lib/adminAuth'

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  if (!path.startsWith('/admin')) return next()
  if (path === '/admin/login' || path === '/admin/api/login') return next()

  const token = getSessionToken(context.request)
  if (!(await verifySessionCookie(token))) {
    return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`)
  }

  context.locals.user = { id: 'admin', email: 'admin@scholarab.ca', name: 'Admin' }
  return next()
})
