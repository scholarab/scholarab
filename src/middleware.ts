import { defineMiddleware } from 'astro/middleware'
import { auth } from './lib/auth'

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname

  // Only protect /admin/* routes
  if (!path.startsWith('/admin')) return next()

  // Allow login page through
  if (path === '/admin/login') return next()

  // Allow better-auth API routes through
  if (path.startsWith('/api/auth')) return next()

  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    })

    if (!session) {
      const next_url = encodeURIComponent(path)
      return context.redirect(`/admin/login?next=${next_url}`)
    }

    context.locals.user = session.user
    context.locals.session = session.session
  } catch (e) {
    console.error('[auth] session check failed:', e)
    return context.redirect('/admin/login')
  }

  return next()
})
