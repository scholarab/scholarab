// DB-persisted rate limit for admin mutation routes (POST/PUT/DELETE).
// Cross-instance safe (works correctly across Vercel serverless instances).
// 100 mutations per 5-minute window per user.

import { db } from './db/client'
import { mutationLog } from './db/schema'
import { eq, gte, and, sql } from 'drizzle-orm'

const MAX_MUTATIONS = 100
const WINDOW_MS = 5 * 60_000

export async function checkMutationRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mutationLog)
    .where(and(eq(mutationLog.userId, userId), gte(mutationLog.createdAt, windowStart)))
  if (Number(count) >= MAX_MUTATIONS) return false
  await db.insert(mutationLog).values({ userId })
  return true
}
