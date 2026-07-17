#!/usr/bin/env node
// Housekeeping for the first-party analytics tables. Safe to re-run; runs
// monthly via .github/workflows/prune-events.yml and by hand when needed.
//
//   1. Retention: events older than 180 days (dashboard reads 30)
//   2. Junk search_empty rows that predate the server-side hygiene rules
//      (added 2026-07-16): null/short metas, no letters, email-shaped
//   3. Orphans: events pointing at item ids no longer in the data files
//   4. rate_limit rows older than 2 days (window is 15 minutes)
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1) }
const sql = neon(url)

const scholarshipIds = (JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')) as { id: number }[]).map(s => s.id)
const programIds = (JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')) as { id: number }[]).map(p => p.id)

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

const [stale] = await sql`
  with del as (delete from rate_limit where created_at < now() - interval '2 days' returning 1)
  select count(*)::int as n from del
`
console.log(`stale rate_limit rows: ${stale!.n} deleted`)

const [total] = await sql`select count(*)::int as n from events`
console.log(`events table now holds ${total!.n} rows`)
