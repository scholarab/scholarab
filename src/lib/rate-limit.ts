import { getDb } from './db/client'
import { rateLimit } from './db/schema'
import { and, gte, lt, eq, count } from 'drizzle-orm'

export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = getDb()
  const windowStart = new Date(Date.now() - windowMs)
  const [row] = await db
    .select({ value: count() })
    .from(rateLimit)
    .where(and(eq(rateLimit.key, key), gte(rateLimit.createdAt, windowStart)))
  return (row?.value ?? 0) >= limit
}

export async function recordHit(key: string): Promise<void> {
  const db = getDb()
  await db.insert(rateLimit).values({ key })
  db.delete(rateLimit)
    .where(lt(rateLimit.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
    .catch(() => {})
}
