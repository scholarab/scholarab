import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { checkSignInRateLimit } from '../../../lib/authSignInRateLimit'

export const ALL: APIRoute = async (ctx) => {
  if (ctx.url.pathname === '/api/auth/sign-in/email' && ctx.request.method === 'POST') {
    const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? ctx.request.headers.get('x-real-ip')
      ?? 'unknown'
    if (!(await checkSignInRateLimit(ip).catch(() => true))) {
      return new Response(JSON.stringify({ error: 'Too many sign-in attempts. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  try {
    return await auth.handler(ctx.request)
  } catch (e) {
    console.error('[auth] handler threw unexpectedly:', e)
    const message = e instanceof Error ? e.message : 'Auth service error'
    return new Response(JSON.stringify({ message, code: 'INTERNAL_SERVER_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const prerender = false
