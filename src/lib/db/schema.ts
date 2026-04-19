import { pgTable, serial, text, boolean, timestamp, jsonb, index, uniqueIndex, integer } from 'drizzle-orm/pg-core'

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

export const deployLog = pgTable('deploy_log', {
  id: serial('id').primaryKey(),
  triggeredBy: text('triggered_by'),
  triggerReason: text('trigger_reason'),
  deployResponse: jsonb('deploy_response'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const parseLog = pgTable('parse_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('parse_log_userId_idx').on(t.userId)])

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),        // 'CREATE' | 'UPDATE' | 'DELETE'
  resourceType: text('resource_type').notNull(), // 'scholarship' | 'program'
  resourceId: integer('resource_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [index('audit_log_userId_idx').on(t.userId)])
