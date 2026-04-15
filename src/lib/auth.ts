import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from './db/client'
import * as schema from './db/schema'

let _runtimeSecret: string | undefined
let _runtimeBaseURL: string | undefined

// Called by middleware to inject CF Pages runtime env vars
export function setRuntimeAuthConfig(secret: string, baseURL: string) {
  if (_runtimeSecret === secret && _runtimeBaseURL === baseURL) return
  _runtimeSecret = secret
  _runtimeBaseURL = baseURL
  _auth = null // reset so next access reinitializes with new values
}

function createAuth() {
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
    secret: _runtimeSecret ?? import.meta.env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET!,
    baseURL: _runtimeBaseURL ?? import.meta.env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL!,
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
