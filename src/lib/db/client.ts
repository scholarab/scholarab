import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { getEnv } from 'astro/env/runtime'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_db) return _db
  // getEnv is wired to CF Pages runtime env by @astrojs/cloudflare adapter (via setGetEnv).
  // Falls back to process.env in local dev and tests.
  const url = getEnv('DATABASE_URL') ?? import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — check .env.local')
  _db = drizzle(neon(url), { schema })
  return _db
}

// Proxy so existing `db.select()` etc. calls still work
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
