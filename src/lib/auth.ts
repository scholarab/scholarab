import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from './db/client'
import * as schema from './db/schema'

export const auth = betterAuth({
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

export type Session = typeof auth.$Infer.Session
