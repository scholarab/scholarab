import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from './db/client'
import * as schema from './db/schema'

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
    secret: (import.meta as unknown as Record<string, Record<string, string>>).env?.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET!,
    baseURL: (import.meta as unknown as Record<string, Record<string, string>>).env?.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL!,
  })
}

let _auth: ReturnType<typeof createAuth> | null = null

export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get(_, prop) {
    if (!_auth) _auth = createAuth()
    return (_auth as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export type Session = ReturnType<typeof createAuth>['$Infer']['Session']
