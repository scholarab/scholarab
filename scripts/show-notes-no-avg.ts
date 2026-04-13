#!/usr/bin/env node
// Show full audience + notes for active scholarships with null minAverage where notes are non-empty
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, isNotNull } from 'drizzle-orm'
import { scholarships } from '../src/lib/db/schema.js'

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
  .select({ id: scholarships.id, title: scholarships.title, audience: scholarships.audience, notes: scholarships.notes, eligibility: scholarships.eligibility })
  .from(scholarships)
  .where(eq(scholarships.active, true))

for (const r of rows) {
  const e = r.eligibility as Record<string, unknown> | null
  if (e?.minAverage !== null && e?.minAverage !== undefined) continue
  if (!r.notes) continue
  console.log(`[${r.id}] ${r.title}`)
  if (r.audience) console.log(`  audience: ${r.audience}`)
  console.log(`  notes: ${r.notes}`)
  console.log()
}
