#!/usr/bin/env node
// Run once to create the subscribers table in Neon:
//   DATABASE_URL=... npx tsx scripts/migrate-subscribers.ts
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS subscribers (
    id        serial PRIMARY KEY,
    email     text NOT NULL,
    item_type text NOT NULL DEFAULT 'scholarship',
    item_id   integer NOT NULL,
    token     text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscribers_email_item_unique UNIQUE (email, item_type, item_id),
    CONSTRAINT subscribers_token_unique UNIQUE (token)
  )
`

await sql`CREATE INDEX IF NOT EXISTS subscribers_item_idx ON subscribers (item_type, item_id)`

console.log('subscribers table ready')
