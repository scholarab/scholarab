import { sql } from 'drizzle-orm'
import type { Document, PublicationChange } from '../catalogue'
import { pgTable, serial, integer, text, boolean, timestamp, jsonb, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

export const scholarships = pgTable('scholarships', {
  id: serial('id').primaryKey(),
  publicId: integer('public_id'),
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
  uniqueIndex('scholarships_public_id_unique').on(t.publicId),
  uniqueIndex('scholarships_title_unique').on(t.title),
  index('scholarships_active_idx').on(t.active),
  index('scholarships_region_idx').on(t.region),
  index('scholarships_category_idx').on(t.category),
])

export const researchPrograms = pgTable('research_programs', {
  id: serial('id').primaryKey(),
  publicId: integer('public_id'),
  name: text('name').notNull(),
  emoji: text('emoji'),
  category: text('category'),
  provider: text('provider'),
  grades: text('grades'),
  duration: text('duration'),
  paid: boolean('paid').default(false),
  stipend: text('stipend'),
  // free | fee | varies | unconfirmed. Defaults to unconfirmed so a row nobody
  // has checked cannot present itself as free; see Program.cost in data-loader.
  cost: text('cost').default('unconfirmed'),
  costNote: text('cost_note'),
  location: text('location'),
  eligibility: text('eligibility'),
  deadline: text('deadline'),
  url: text('url').notNull(),
  description: text('description'),
  lastVerified: text('last_verified'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, t => [
  uniqueIndex('research_programs_public_id_unique').on(t.publicId),
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

export const catalogueEntries = pgTable('catalogue_entries', {
  kind: text('kind').$type<'scholarship' | 'program'>().notNull(),
  publicId: integer('public_id').notNull(),
  published: jsonb('published').$type<Document>(),
  draft: jsonb('draft').$type<Document>(),
  draftBase: jsonb('draft_base').$type<Document>(),
  deleted: boolean('deleted').notNull().default(false),
  revision: integer('revision').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.kind, t.publicId] }), index('catalogue_updated_idx').on(t.kind, t.updatedAt.desc(), t.publicId.desc()),
  uniqueIndex('catalogue_name_unique').on(t.kind,sql`lower(btrim(coalesce(coalesce(${t.draft},${t.published})->>'title',coalesce(${t.draft},${t.published})->>'name')))` ).where(sql`not ${t.deleted} and coalesce(${t.draft},${t.published}) is not null`),
])

export const publicationRequests = pgTable('publication_requests', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('queued'),
  changes: jsonb('changes').$type<PublicationChange[]>().notNull(),
  message: text('message'),
  commitSha: text('commit_sha'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('publication_one_pending').on(sql`(true)`).where(sql`${t.status} in ('queued','processing','committed')`)])

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
