import { pgTable, serial, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

// ── Better Auth tables ────────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, t => [index('session_userId_idx').on(t.userId)])

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, t => [index('account_userId_idx').on(t.userId)])

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, t => [index('verification_identifier_idx').on(t.identifier)])

export const scholarships = pgTable('scholarships', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  amount: text('amount').notNull(),
  deadline: text('deadline'),
  openDate: text('open_date'),
  audience: text('audience'),
  url: text('url').notNull(),
  category: text('category'),
  lastVerified: text('last_verified'),
  region: text('region'),
  notes: text('notes'),
  applyViaGuidance: boolean('apply_via_guidance').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const researchPrograms = pgTable('research_programs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji'),
  category: text('category'),
  provider: text('provider'),
  grades: text('grades'),
  duration: text('duration'),
  paid: boolean('paid').default(false),
  stipend: text('stipend'),
  location: text('location'),
  eligibility: text('eligibility'),
  deadline: text('deadline'),
  url: text('url').notNull(),
  description: text('description'),
  lastVerified: text('last_verified'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const deployLog = pgTable('deploy_log', {
  id: serial('id').primaryKey(),
  triggeredBy: text('triggered_by'),
  triggerReason: text('trigger_reason'),
  vercelResponse: jsonb('vercel_response'),
  createdAt: timestamp('created_at').defaultNow(),
})
