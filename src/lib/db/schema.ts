import { sql } from 'drizzle-orm'
import { pgTable, serial, integer, text, timestamp, jsonb, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

// The retired admin editor's tables (catalogue_entries, publication_requests,
// parse_log) and the legacy scholarships and research_programs tables still
// exist in the database but nothing reads or writes them since 2026-10-15.
// They stay until a migration drops them.

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  itemType: text('item_type').notNull().default('scholarship'),
  itemId: integer('item_id').notNull(),
  token: text('token').notNull(),
  // Comma-separated milestone days, optionally open or posted; see lib/alerts.ts.
  // Defaults to the full set so rows written before this column existed, and
  // any sign-up that does not pick, keep the original behaviour.
  cadence: text('cadence').notNull().default('30,14,3'),
  // Double opt-in; see drizzle/migrations/0010_subscriber_confirmation.sql.
  // Null means nobody has proved they own this address yet, and send-alerts.ts
  // will not mail a reminder to it.
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  confirmSentAt: timestamp('confirm_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('subscribers_email_item_unique').on(t.email, t.itemType, t.itemId),
  uniqueIndex('subscribers_token_unique').on(t.token),
  index('subscribers_item_idx').on(t.itemType, t.itemId),
  index('subscribers_unconfirmed_idx').on(t.confirmedAt).where(sql`${t.confirmedAt} is null`),
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

// Anonymous event counters; no IP, no user id, no session. See /api/event.
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  event: text('event').notNull(),
  itemType: text('item_type'),
  itemId: integer('item_id'),
  meta: text('meta'),
  /** phone, tablet or computer (src/lib/device-class.ts). Null before 2026-10-14. */
  device: text('device'),
}, t => [index('events_event_ts_idx').on(t.event, t.ts)])

export const confirmationRecipients = pgTable('confirmation_recipients', {
  key:text('key').primaryKey(), claimedAt:timestamp('claimed_at',{withTimezone:true}).notNull(),
  windowStart:timestamp('window_start',{withTimezone:true}).notNull(), attempts:integer('attempts').notNull(),
})
export const mailDeliveries = pgTable('mail_deliveries', {
  key:text('key').primaryKey(), state:text('state').notNull(), payload:jsonb('payload'),
  subscriptionId:integer('subscription_id').references(()=>subscribers.id,{onDelete:'cascade'}), kind:text('kind'),
  createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
}, t=>[index('mail_deliveries_updated_idx').on(t.updatedAt)])
export const schemaMigrations = pgTable('schema_migrations', {
  name:text('name').primaryKey(), checksum:text('checksum').notNull(),
  appliedAt:timestamp('applied_at',{withTimezone:true}).notNull().defaultNow(),
})
