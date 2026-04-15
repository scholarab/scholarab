import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getEnv } from 'astro/env/runtime'
import { getDb } from './db/client'
import * as schema from './db/schema'

function createAuth() {
  const secret =
    getEnv('BETTER_AUTH_SECRET') ??
    import.meta.env.BETTER_AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET is not set. Add it as a runtime secret in the Cloudflare Pages dashboard (Settings → Environment Variables).'
    )
  }

  const baseURL =
    getEnv('BETTER_AUTH_URL') ??
    import.meta.env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    'https://scholarab.ca'

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieName: 'admin_session',
      expiresIn: 60 * 60 * 8, // 8 hours
    },
    trustedOrigins: [
      'http://localhost:4321',
      'https://www.scholarab.ca',
      'https://scholarab.ca',
    ],
    secret,
    baseURL,
  })
}

let _auth: ReturnType<typeof createAuth> | null = null

export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get(_, prop) {
    if (!_auth) _auth = createAuth()
    const val = (_auth as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).bind(_auth)
    return val
  },
})

export type Session = ReturnType<typeof createAuth>['$Infer']['Session']
