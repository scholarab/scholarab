#!/usr/bin/env node
// Show ALL scholarships with a non-null minAverage (to audit AI parsing accuracy)
// Also show inactive ones with explicit average text we haven't assigned yet
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
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
  .select({ id: scholarships.id, title: scholarships.title, active: scholarships.active, audience: scholarships.audience, notes: scholarships.notes, eligibility: scholarships.eligibility })
  .from(scholarships)

console.log('=== Already have minAverage (active) ===')
for (const r of rows) {
  const e = r.eligibility as Record<string, unknown> | null
  if (!r.active) continue
  if (e?.minAverage === null || e?.minAverage === undefined) continue
  console.log(`[${r.id}] ${r.title}: minAverage=${e.minAverage}`)
  if (r.audience) console.log(`  audience: ${r.audience}`)
}

console.log('\n=== Inactive with average text (not yet assigned) ===')
const avgPat = /\b(\d{2,3})\s*%|\bhonours?\b|\bgpa\b|\bminimum average\b/i
for (const r of rows) {
  const e = r.eligibility as Record<string, unknown> | null
  if (r.active) continue
  if (e?.minAverage !== null && e?.minAverage !== undefined) continue
  const text = [r.audience ?? '', r.notes ?? ''].join(' ')
  if (!avgPat.test(text)) continue
  const nums = [...text.matchAll(/\b(\d{2,3})\b/g)].map(m => parseInt(m[1])).filter(n => n >= 60 && n <= 100)
  console.log(`[${r.id}] ${r.title} => [${[...new Set(nums)].join(', ')}]`)
  if (r.audience) console.log(`  audience: ${r.audience}`)
  if (r.notes) console.log(`  notes: ${r.notes}`)
}
