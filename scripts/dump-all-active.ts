#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { scholarships } from '../src/lib/db/schema.js'
import { eq } from 'drizzle-orm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
try {
  const c = readFileSync(envPath, 'utf8')
  for (const line of c.split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* */ }

const db = drizzle(neon(process.env.DATABASE_URL!))
const rows = await db
  .select({ id: scholarships.id, title: scholarships.title, audience: scholarships.audience, notes: scholarships.notes, region: scholarships.region, eligibility: scholarships.eligibility })
  .from(scholarships)
  .where(eq(scholarships.active, true))

for (const r of rows) {
  const e = r.eligibility as Record<string, unknown> | null
  console.log(JSON.stringify({ id: r.id, title: r.title, audience: r.audience, notes: r.notes, region: r.region, eligibility: e }))
}
