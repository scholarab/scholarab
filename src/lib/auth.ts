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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: [
    'http://localhost:4321',
    'https://www.scholarab.ca',
    'https://scholarab.ca',
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
})

export type Session = typeof auth.$Infer.Session
