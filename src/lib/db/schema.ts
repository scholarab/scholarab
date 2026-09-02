import { pgTable, serial, integer, text, boolean, timestamp, jsonb, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

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
  // Comma-separated days before the deadline to mail on; see lib/alerts.ts.
  // Defaults to the full set so rows written before this column existed, and
  // any sign-up that does not pick, keep the original behaviour.
  cadence: text('cadence').notNull().default('30,14,3'),
  // Double opt-in; see drizzle/migrations/0010_subscriber_confirmation.sql.
  // Null means nobody has proved they own this address yet, and send-alerts.ts
  // will not mail a reminder to it.
  confirmedAt: timestamp('confirmed_at'),
  confirmSentAt: timestamp('confirm_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  uniqueIndex('subscribers_email_item_unique').on(t.email, t.itemType, t.itemId),
  uniqueIndex('subscribers_token_unique').on(t.token),
])

// One row per (key, window) rather than one per hit, so the limiter's check
// and increment are a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING.
// The primary key is what gives that upsert something to conflict on, and
// what makes concurrent requests for the same key serialise on a row lock
// instead of all reading the same stale count. See 0011_rate_limit_counter.sql.
export const rateLimitCounter = pgTable('rate_limit_counter', {
  key: text('key').notNull(),
  windowStart: timestamp('window_start').notNull(),
  hits: integer('hits').default(0).notNull(),
}, t => [primaryKey({ columns: [t.key, t.windowStart] }), index('rate_limit_counter_window_idx').on(t.windowStart)])

export const parseLog = pgTable('parse_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('parse_log_userId_idx').on(t.userId)])


// Anonymous event counters; no IP, no user id, no session. See /api/event.
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  event: text('event').notNull(),
  itemType: text('item_type'),
  itemId: integer('item_id'),
  meta: text('meta'),
}, t => [index('events_event_ts_idx').on(t.event, t.ts)])
