import { getDb } from './db/client'
import { rateLimitCounter } from './db/schema'
import { lt, sql } from 'drizzle-orm'

/**
 * The client's IP, for use as a limiter key and nothing else.
 *
 * Never store the return value. It is personal information under PIPEDA, and
 * the privacy policy promises no IP address is retained; hitRateLimit hashes
 * whatever it is handed before it touches the database. See hashKeyIdentifier.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

/**
 * Salt for the limiter's key hash.
 *
 * Unsalted SHA-256 of an IP address is not a one-way function in any useful
 * sense: IPv4 is 2^32 values, so the whole space rainbow-tables in minutes on
 * a laptop. The salt is what makes a leaked `rate_limit_counter` dump actually
 * opaque rather than merely encoded; without it the hashing is encoding, not
 * protection.
 *
 * It has to be *stable*, not just secret. A per-process random would give
 * every Worker isolate its own keyspace and quietly turn the limiter off,
 * which is worse than the problem it solves.
 *
 * Three sources, in order:
 *
 *   1. RATE_LIMIT_SALT, if someone ever binds one.
 *   2. SESSION_SECRET, which is already bound in production; admin auth
 *      throws without it, so this path needs no new configuration and is the
 *      one that actually runs. Reusing a key for a second purpose is only safe
 *      with domain separation, hence the DERIVE_LABEL prefix: what gets hashed
 *      here can never collide with what adminAuth signs cookies with, and a
 *      digest from this table tells an attacker nothing about the secret. It
 *      is never sent anywhere or stored; only its digest is.
 *   3. A constant, so local dev and any misconfigured deploy still keep
 *      plaintext IPs out of the table. That is the promise the privacy policy
 *      makes; secrecy against someone holding both the dump and this source is
 *      what the first two sources add.
 */
const FALLBACK_SALT = 'scholarab-rate-limit-v1'
const DERIVE_LABEL = 'scholarab/rate-limit/v1'
let warnedAboutSalt = false

async function env(name: string): Promise<string | undefined> {
  let fromAstro: string | undefined
  try {
    const { getEnv } = await import('astro/env/runtime')
    fromAstro = getEnv(name) as string | undefined
  } catch { /* not running inside the Worker */ }
  return fromAstro || process.env?.[name]
}

async function rateLimitSalt(): Promise<string> {
  const explicit = await env('RATE_LIMIT_SALT')
  if (explicit) return explicit

  const derived = await env('SESSION_SECRET')
  if (derived) return `${DERIVE_LABEL}\u0000${derived}`

  if (!warnedAboutSalt) {
    warnedAboutSalt = true
    console.warn('[rate-limit] no RATE_LIMIT_SALT or SESSION_SECRET, hashing keys with the built-in constant')
  }
  return FALLBACK_SALT
}

/**
 * Replace the identifying half of a limiter key with a salted digest.
 *
 * The prefix before the first colon is the endpoint name; `alert`, `event`,
 * `admin-login`, which identifies nobody and is worth keeping legible so a
 * dump of this table can still be reasoned about. Everything after it is the
 * IP, and only the hash of it is ever written.
 *
 * 128 bits of the digest is far past any collision that matters here: a
 * collision costs one attacker a shared quota with one other attacker.
 */
export async function hashKeyIdentifier(key: string): Promise<string> {
  const sep = key.indexOf(':')
  const prefix = sep === -1 ? '' : key.slice(0, sep + 1)
  const identifier = sep === -1 ? key : key.slice(sep + 1)
  const bytes = new TextEncoder().encode(`${await rateLimitSalt()}\u0000${identifier}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest).slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix + hex
}

/**
 * Count this request against `key` and say whether it is over the limit.
 *
 * One statement, not two. The old pair; `isRateLimited` counting committed
 * rows, then a separate `recordHit` insert; was a check-then-act with nothing
 * serialising the halves, so a hundred simultaneous requests all read the same
 * pre-insert count and all passed. On /api/alert the gap was at its widest,
 * because the hit was deferred behind the response and the outbound email.
 *
 * `ON CONFLICT DO UPDATE` takes a row lock on the conflicting row, so
 * concurrent callers for the same key queue behind each other and each sees
 * its own increment in `RETURNING`. That is the whole fix, and it fits in one
 * statement, which it has to, since the Neon HTTP driver has no transactions.
 *
 * The window is a fixed bucket rather than the sliding window the old count
 * used: a sliding window needs the per-hit rows this table no longer keeps.
 * The trade is that a caller can spend one window's budget at the end of a
 * bucket and the next at the start of the following one, so a burst of up to
 * 2x the limit can straddle the boundary. Bounded at twice the cap beats
 * unbounded by concurrency, which is what the sliding version actually gave.
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = getDb()
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  // Hashed here rather than at each call site so no caller can forget, and so
  // a raw IP has no path into the table at all.
  const storedKey = await hashKeyIdentifier(key)

  const [row] = await db.insert(rateLimitCounter)
    .values({ key: storedKey, windowStart, hits: 1 })
    .onConflictDoUpdate({
      target: [rateLimitCounter.key, rateLimitCounter.windowStart],
      set: { hits: sql`${rateLimitCounter.hits} + 1` },
    })
    .returning({ hits: rateLimitCounter.hits })

  // Sampled at ~5% so a busy endpoint isn't paying for a DELETE on every hit.
  // Awaited, not fire-and-forget: on Workers the un-awaited version was
  // cancelled with the request and never swept anything.
  if (Math.random() < 0.05) {
    await db.delete(rateLimitCounter)
      .where(lt(rateLimitCounter.windowStart, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .catch(() => {})
  }

  // `>` not `>=`: `hits` already counts this request, so a limit of 20 allows
  // twenty through and turns away the twenty-first; the same budget the old
  // `count >= limit` check gave when it read the twenty already recorded.
  return (row?.hits ?? 1) > limit
}
