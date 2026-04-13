#!/usr/bin/env node
// Find active scholarships with null minAverage that mention a % in audience or notes
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, isNull, sql } from 'drizzle-orm'
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
  .select({
    id: scholarships.id,
    title: scholarships.title,
    audience: scholarships.audience,
    notes: scholarships.notes,
    eligibility: scholarships.eligibility,
  })
  .from(scholarships)
  .where(eq(scholarships.active, true))

const avgPattern = /\b(\d{2,3})\s*%|\bhonours?\b|\b(\d{2,3})\s*percent|minimum\s+average|gpa/i

const hits = rows.filter(r => {
  const e = r.eligibility as Record<string, unknown> | null
  if (e?.minAverage !== null && e?.minAverage !== undefined) return false  // already set
  const text = [r.audience ?? '', r.notes ?? ''].join(' ')
  return avgPattern.test(text)
})

console.log(`Unassigned scholarships with average-related text: ${hits.length}\n`)
for (const r of hits) {
  const e = r.eligibility as Record<string, unknown> | null
  console.log(`[${r.id}] ${r.title}`)
  if (r.audience) console.log(`  audience: ${r.audience}`)
  if (r.notes)    console.log(`  notes: ${r.notes}`)
  const nums = [...[r.audience ?? '', r.notes ?? ''].join(' ').matchAll(/\b(\d{2,3})\b/g)]
    .map(m => parseInt(m[1]))
    .filter(n => n >= 60 && n <= 100)
  console.log(`  => numbers in 60-100 range: [${[...new Set(nums)].join(', ')}]`)
  console.log()
}
