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
  return auth.handler(ctx.request)
}

export const prerender = false
