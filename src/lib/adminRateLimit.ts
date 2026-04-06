// Per-user in-memory rate limit for admin mutation routes (POST/PUT/DELETE).
// Limits burst abuse from a compromised or runaway session.
// 100 mutations per 5-minute window per user.

const mutationLimit = new Map<string, { count: number; reset: number }>()

const MAX_MUTATIONS = 100
const WINDOW_MS = 5 * 60_000

export function checkMutationRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = mutationLimit.get(userId)
  if (!entry || now > entry.reset) {
    mutationLimit.set(userId, { count: 1, reset: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_MUTATIONS) return false
  entry.count++
  return true
}
