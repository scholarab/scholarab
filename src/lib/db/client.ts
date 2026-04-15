import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _runtimeUrl: string | undefined

// Called by middleware to inject CF Pages runtime env vars
export function setRuntimeDatabaseUrl(url: string) {
  if (_runtimeUrl === url) return
  _runtimeUrl = url
  _db = null // reset so next getDb() uses the new URL
}

export function getDb() {
  if (_db) return _db
  // Priority: CF runtime (set by middleware) → build-time baked → local Node.js
  const url = _runtimeUrl ?? import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL
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
