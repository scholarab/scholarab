import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_db) return _db
  // Vite/Astro exposes .env.local via import.meta.env; Node.js scripts use process.env
  const url = (import.meta as Record<string, Record<string, string>>).env?.DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — check .env.local')
  _db = drizzle(neon(url), { schema })
  return _db
}

// Proxy so existing `db.select()` etc. calls still work
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as Record<string | symbol, unknown>)[prop]
  },
})
