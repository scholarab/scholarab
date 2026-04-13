#!/usr/bin/env node
// Show active scholarships that have null minAverage, with their audience text
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
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
  .select({ id: scholarships.id, title: scholarships.title, audience: scholarships.audience, eligibility: scholarships.eligibility })
  .from(scholarships)
  .where(eq(scholarships.active, true))

const nullAvg = rows.filter(r => {
  const e = r.eligibility as Record<string, unknown> | null
  return !e || e.minAverage === null || e.minAverage === undefined
})

console.log(`Active scholarships with no minAverage: ${nullAvg.length}\n`)
for (const r of nullAvg) {
  const e = r.eligibility as Record<string, unknown> | null
  console.log(`[${r.id}] ${r.title}`)
  if (r.audience) console.log(`  audience: ${r.audience}`)
  if (e) console.log(`  has eligibility: yes (grades: [${(e.grades as string[] ?? []).join(',')}])`)
  else console.log(`  has eligibility: no`)
  console.log()
}
