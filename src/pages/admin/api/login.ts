import type { APIRoute } from 'astro'
import { checkAdminPassword, createSessionCookie, SESSION_COOKIE } from '../../../lib/adminAuth'
import { jsonError } from '../../../lib/api-response'

export const prerender = false

const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number; firstAt: number }>()

function getIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getIp(request)
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && now - entry.firstAt < WINDOW_MS) {
    if (entry.count >= LIMIT) return jsonError('Too many attempts — try again later', 429)
  } else if (!entry || now - entry.firstAt >= WINDOW_MS) {
    attempts.set(ip, { count: 0, firstAt: now })
  }

  try {
    const { password } = await request.json()
    if (!password || !(await checkAdminPassword(password))) {
      const e = attempts.get(ip)!
      e.count++
      return jsonError('Invalid credentials', 401)
    }
    attempts.delete(ip)
    const value = await createSessionCookie()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 8}`,
      },
    })
  } catch {
    return jsonError('Invalid request', 400)
  }
}
