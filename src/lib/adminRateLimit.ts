// DB-persisted rate limit for admin mutation routes (POST/PUT/DELETE).
// Cross-instance safe (works correctly across Cloudflare Workers instances).
// 100 mutations per 5-minute window per user.

import { db } from './db/client'
import { mutationLog } from './db/schema'
import { eq, gte, and, sql } from 'drizzle-orm'
import { ADMIN_MUTATION_LIMIT, ADMIN_MUTATION_WINDOW_MS } from './constants'

const MAX_MUTATIONS = ADMIN_MUTATION_LIMIT
const WINDOW_MS = ADMIN_MUTATION_WINDOW_MS

export async function checkMutationRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS)
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mutationLog)
    .where(and(eq(mutationLog.userId, userId), gte(mutationLog.createdAt, windowStart)))
  const count = rows[0]?.count ?? 0
  if (count >= MAX_MUTATIONS) return false
  await db.insert(mutationLog).values({ userId })
  return true
}
