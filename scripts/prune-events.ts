#!/usr/bin/env node
// Housekeeping for the first-party analytics tables. Safe to re-run; runs
// monthly via .github/workflows/prune-events.yml and by hand when needed.
//
//   1. Retention: events older than 180 days (dashboard reads 30)
//   2. Junk search_empty rows that predate the server-side hygiene rules
//      (added 2026-07-16): null/short metas, no letters, email-shaped
//   3. Orphans: events pointing at item ids no longer in the data files
//   4. rate_limit_counter windows older than 2 days (window is 15 minutes)
//   5. Subscriptions whose deadline is far enough past that no reminder can
//      ever be sent to them again
//   6. Sign-ups that were never confirmed and are now more than 30 days old
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1) }
const sql = neon(url)

type Listing = { id: number; deadline?: string | null }
const scholarships = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')) as Listing[]
const programs = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')) as Listing[]
const scholarshipIds = scholarships.map(s => s.id)
const programIds = programs.map(p => p.id)

const [retention] = await sql`
  with del as (delete from events where ts < now() - interval '180 days' returning 1)
  select count(*)::int as n from del
`
console.log(`retention (>180d): ${retention!.n} events deleted`)

const [junk] = await sql`
  with del as (
    delete from events
    where event = 'search_empty'
      and (meta is null
        or char_length(meta) < 3
        or meta !~ '[[:alpha:]]'
        or meta ~ '\\S+@\\S+\\.\\S+')
    returning 1
  )
  select count(*)::int as n from del
`
console.log(`junk search_empty: ${junk!.n} deleted`)

const [orphans] = await sql`
  with del as (
    delete from events
    where item_id is not null
      and (
        (item_type = 'scholarship' and item_id <> all(${scholarshipIds}))
        or (item_type = 'program' and item_id <> all(${programIds}))
      )
    returning 1
  )
  select count(*)::int as n from del
`
console.log(`orphaned item ids: ${orphans!.n} deleted`)

// rate_limit was dropped in 0012 along with the better-auth leftovers;
// rate_limit_counter replaced it in 0011. hitRateLimit sweeps this on a 5%
// sample of calls, so this is a backstop for a quiet month, not the mechanism.
const [stale] = await sql`
  with del as (delete from rate_limit_counter where window_start < now() - interval '2 days' returning 1)
  select count(*)::int as n from del
`
console.log(`stale rate_limit_counter windows: ${stale!.n} deleted`)

// Every stored email is a liability if DATABASE_URL ever leaks, and a
// subscription to a deadline that has passed can never be mailed again; the
// row is pure exposure. The grace period is generous on purpose: deadlines get
// corrected, and a listing whose date moves forward should still have its
// subscribers. Anything older than that is gone from the data files too.
const deadItemIds = { scholarship: new Set<number>(), program: new Set<number>() }
const CUTOFF_DAYS = 60
const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)
for (const [type, list] of [['scholarship', scholarships], ['program', programs]] as const) {
  for (const item of list) {
    const d = item.deadline
    // No deadline, TBA or Ongoing: nothing has passed, so nothing to prune.
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue
    if (new Date(d + 'T00:00:00') < cutoff) deadItemIds[type].add(item.id)
  }
}
// A sign-up for a listing no longer in the data files can never be mailed
// either; send-alerts.ts looks the item up and skips what it cannot find.
const liveIds = { scholarship: scholarshipIds, program: programIds }
// `item_id <> all('{}')` is true for every row, so an empty id list would
// delete every subscription rather than none. That can only happen if a data
// file failed to load, which is a reason to stop, not to prune.
if (scholarshipIds.length === 0 || programIds.length === 0) {
  console.error('[prune] a data file loaded empty, refusing to prune subscribers')
  process.exit(1)
}
for (const type of ['scholarship', 'program'] as const) {
  const [gone] = await sql`
    with del as (
      delete from subscribers
      where item_type = ${type}
        and (item_id = any(${[...deadItemIds[type]]}) or item_id <> all(${liveIds[type]}))
      returning 1
    )
    select count(*)::int as n from del
  `
  console.log(`unmailable ${type} subscriptions: ${gone!.n} deleted`)
}

// An address that was never confirmed is one we collected and never got
// consent for; send-alerts.ts will not mail a reminder to it, and after a
// month of confirmation emails going unanswered it never will. Holding it any
// longer is retention without a purpose, which is the thing PIPEDA's limiting
// principle is about. The window is generous: a student who signs up in June
// and clears their inbox in July still lands inside it.
const [unconfirmed] = await sql`
  with del as (
    delete from subscribers
    where confirmed_at is null
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::int as n from del
`
console.log(`unconfirmed sign-ups (>30d): ${unconfirmed!.n} deleted`)

const [subs] = await sql`select count(*)::int as n from subscribers`
console.log(`subscribers table now holds ${subs!.n} rows`)

const [total] = await sql`select count(*)::int as n from events`
console.log(`events table now holds ${total!.n} rows`)
