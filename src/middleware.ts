import { defineMiddleware } from 'astro/middleware'
import { auth, setRuntimeAuthConfig } from './lib/auth'
import { setRuntimeDatabaseUrl } from './lib/db/client'

export const onRequest = defineMiddleware(async (context, next) => {
  // Inject CF Pages runtime env vars into module-level singletons.
  // Must run before any return next() so auth/DB routes get the values too.
  const env = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env
  if (env?.DATABASE_URL) setRuntimeDatabaseUrl(env.DATABASE_URL)
  if (env?.BETTER_AUTH_SECRET) setRuntimeAuthConfig(env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL ?? '')

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
