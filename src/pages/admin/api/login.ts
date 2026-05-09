import type { APIRoute } from 'astro'
import { checkAdminPassword, createSessionCookie, SESSION_COOKIE } from '../../../lib/adminAuth'
import { jsonError } from '../../../lib/api-response'
import { getDb } from '../../../lib/db/client'
import { authRateLimit } from '../../../lib/db/schema'
import { and, gte, lt, eq, count } from 'drizzle-orm'

export const prerender = false

const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

function getIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getIp(request)
  const db = getDb()
  const windowStart = new Date(Date.now() - WINDOW_MS)

  let recentAttempts: number
  try {
    const [row] = await db
      .select({ value: count() })
      .from(authRateLimit)
      .where(and(eq(authRateLimit.ip, ip), gte(authRateLimit.createdAt, windowStart)))
    recentAttempts = row?.value ?? 0
  } catch {
    return jsonError('Service unavailable', 503)
  }

  if (recentAttempts >= LIMIT) return jsonError('Too many attempts — try again later', 429)

  try {
    const { password } = await request.json()
    if (!password || !(await checkAdminPassword(password))) {
      await db.insert(authRateLimit).values({ ip })
      // Opportunistic cleanup of attempts older than 24h
      db.delete(authRateLimit)
        .where(lt(authRateLimit.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
        .catch(() => {})
      return jsonError('Invalid credentials', 401)
    }
    await db.delete(authRateLimit).where(eq(authRateLimit.ip, ip))
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
