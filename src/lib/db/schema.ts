import { pgTable, serial, integer, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

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
  eligibility: jsonb('eligibility'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, t => [
  uniqueIndex('scholarships_title_unique').on(t.title),
  index('scholarships_active_idx').on(t.active),
  index('scholarships_region_idx').on(t.region),
  index('scholarships_category_idx').on(t.category),
])

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
}, t => [
  index('research_programs_active_idx').on(t.active),
  index('research_programs_category_idx').on(t.category),
])

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  itemType: text('item_type').notNull().default('scholarship'),
  itemId: integer('item_id').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  uniqueIndex('subscribers_email_item_unique').on(t.email, t.itemType, t.itemId),
  uniqueIndex('subscribers_token_unique').on(t.token),
])

export const rateLimit = pgTable('rate_limit', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('rate_limit_key_idx').on(t.key)])

export const authRateLimit = pgTable('auth_rate_limit', {
  id: serial('id').primaryKey(),
  ip: text('ip').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('auth_rate_limit_ip_idx').on(t.ip)])

export const parseLog = pgTable('parse_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('parse_log_userId_idx').on(t.userId)])


// Anonymous event counters — no IP, no user id, no session. See /api/event.
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  event: text('event').notNull(),
  itemType: text('item_type'),
  itemId: integer('item_id'),
  meta: text('meta'),
}, t => [index('events_event_ts_idx').on(t.event, t.ts)])
