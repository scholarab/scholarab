import type { APIRoute } from 'astro'
import { checkAdminPassword, createSessionCookie, SESSION_COOKIE, SESSION_TTL_MS } from '../../../lib/adminAuth'
import { jsonError } from '../../../lib/api-response'
import { getDb } from '../../../lib/db/client'
import { rateLimitCounter } from '../../../lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { getClientIp, hitRateLimit, hashKeyIdentifier } from '../../../lib/rate-limit'

export const prerender = false

const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

/**
 * A second cap, across every IP at once.
 *
 * The per-IP limit above stops one attacker on one connection and nothing
 * else: a botnet or a rotating-proxy service gets its own fresh 5 guesses per
 * address, so the only real bound on a distributed guess against
 * ADMIN_PASSWORD was how many IPs the attacker could rent. This caps the
 * whole endpoint instead; roughly 5,700 guesses a day, which a long random
 * password outlives by an absurd margin.
 *
 * Deliberately generous, because this cap is shared with the real admin: a
 * distributed attacker who saturates it locks Ilia out too, for the rest of
 * the window. 60 is far above any honest day's logins (a handful) and far
 * below what makes guessing worthwhile, and a lockout lapses on its own in
 * 15 minutes. A correct password clears both counters, so the admin is never
 * held out by their own earlier typos.
 */
const GLOBAL_LIMIT = 60
const GLOBAL_KEY = 'login:global'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  const db = getDb()
  const key = `login:${ip}`

  // Counting the attempt and testing the cap are one statement now. As two,
  // they were a TOCTOU race: fifty simultaneous POSTs each ran the count
  // before any sibling's insert landed, so all fifty read a number under five
  // and all fifty got a guess; making the only brute-force control in front
  // of ADMIN_PASSWORD bounded by the attacker's concurrency instead of by 5.
  //
  // Still a hard 503 rather than failing open: this guards the credential
  // that unlocks the whole admin panel, so a limiter that cannot run is a
  // reason to refuse logins, not to wave them through. The public endpoints
  // make the opposite call for the opposite reason.
  //
  // Every attempt is counted, not just the failures the old code recorded. A
  // correct password clears the counter below, so the only thing this changes
  // is that a burst of guesses cannot be padded with valid-looking traffic.
  try {
    if (await hitRateLimit(key, LIMIT, WINDOW_MS))
      return jsonError('Too many attempts. Try again later', 429)
    // Counted after the per-IP check, so one hammering IP that is already
    // being turned away does not also spend the budget everyone shares.
    if (await hitRateLimit(GLOBAL_KEY, GLOBAL_LIMIT, WINDOW_MS))
      return jsonError('Too many attempts. Try again later', 429)
  } catch {
    return jsonError('Service unavailable', 503)
  }

  try {
    const { password } = await request.json()
    if (!password || !(await checkAdminPassword(password))) {
      // The attempt is already counted; hitRateLimit did it above, before the
      // password was ever checked, which is the point.
      return jsonError('Invalid credentials', 401)
    }
    // A correct password clears the window, so a student on a shared school IP
    // who fat-fingers it four times is not locked out by their own success.
    // Both counters, so a distributed attempt that has run the shared budget
    // down cannot keep the real admin out once they have proved who they are.
    // Scoped to this window's rows; the sweep in hitRateLimit takes the rest.
    const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS)
    // The stored keys are salted digests, never the raw `login:<ip>`; see
    // hashKeyIdentifier. Clearing has to hash the same way or it matches no row
    // and a successful login silently stops resetting the counter.
    const storedKeys = await Promise.all([key, GLOBAL_KEY].map(hashKeyIdentifier))
    await db.delete(rateLimitCounter)
      .where(and(
        inArray(rateLimitCounter.key, storedKeys),
        eq(rateLimitCounter.windowStart, windowStart),
      ))
      .catch(() => {})
    const value = await createSessionCookie()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Derived from the TTL baked into the cookie rather than written out
        // again, so the browser's idea of when this lapses cannot drift from
        // the server's.
        'Set-Cookie': `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`,
      },
    })
  } catch {
    return jsonError('Invalid request', 400)
  }
}
