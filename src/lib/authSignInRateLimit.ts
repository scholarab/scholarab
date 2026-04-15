// DB-persisted rate limit for sign-in attempts per IP.
// Cross-instance safe (works correctly across Cloudflare Workers instances).
// 10 attempts per 15-minute window per IP.

import { db } from './db/client'
import { authRateLimit } from './db/schema'
import { eq, gte, and, sql } from 'drizzle-orm'
import { SIGN_IN_ATTEMPT_LIMIT, SIGN_IN_WINDOW_MS } from './constants'

const MAX_ATTEMPTS = SIGN_IN_ATTEMPT_LIMIT
const WINDOW_MS = SIGN_IN_WINDOW_MS

export async function checkSignInRateLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS)
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authRateLimit)
    .where(and(eq(authRateLimit.ip, ip), gte(authRateLimit.createdAt, windowStart)))
  const count = rows[0]?.count ?? 0
  if (count >= MAX_ATTEMPTS) return false
  await db.insert(authRateLimit).values({ ip })
  return true
}
