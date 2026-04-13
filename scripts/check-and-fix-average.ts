#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, ilike, or } from 'drizzle-orm'
import { scholarships } from '../src/lib/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local */ }

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')
const db = drizzle(neon(url))

// 1. Check what UFCW and Red Deer Polytechnic actually look like in the DB
const rows = await db
  .select({ id: scholarships.id, title: scholarships.title, eligibility: scholarships.eligibility })
  .from(scholarships)
  .where(or(
    ilike(scholarships.title, '%UFCW%'),
    ilike(scholarships.title, '%Red Deer Polytechnic%'),
    ilike(scholarships.title, '%RDP%'),
  ))

console.log('Found:')
for (const r of rows) {
  const elig = r.eligibility as Record<string, unknown> | null
  console.log(`  [${r.id}] ${r.title}`)
  console.log(`    minAverage: ${elig?.minAverage ?? null}`)
}

// 2. Revert UFCW if it got the wrong minAverage (should not have 80%)
// UFCW Local 401 gives to union members' children — no stated minimum average
const ufcw = rows.find(r => r.title.toLowerCase().includes('ufcw'))
if (ufcw) {
  const elig = (ufcw.eligibility as Record<string, unknown> | null) ?? {}
  if (elig.minAverage === 80) {
    const fixed = { ...elig, minAverage: null }
    await db.update(scholarships).set({ eligibility: fixed, updatedAt: new Date() }).where(eq(scholarships.id, ufcw.id))
    console.log(`\n  ✓ Reverted [${ufcw.id}] ${ufcw.title} minAverage 80 → null`)
  } else {
    console.log(`\n  OK [${ufcw.id}] ${ufcw.title} minAverage was already ${elig.minAverage ?? null}, no revert needed`)
  }
}

// 3. Find Red Deer Polytechnic and apply 80% if found
const rdp = rows.find(r => r.title.toLowerCase().includes('red deer polytechnic') || r.title.toLowerCase().includes(' rdp'))
if (rdp) {
  const elig = (rdp.eligibility as Record<string, unknown> | null) ?? {}
  const merged = { ...elig, minAverage: 80 }
  await db.update(scholarships).set({ eligibility: merged, updatedAt: new Date() }).where(eq(scholarships.id, rdp.id))
  console.log(`  ✓ Set [${rdp.id}] ${rdp.title} minAverage → 80`)
} else {
  console.log('\n  Red Deer Polytechnic not found in DB by title — check the title manually')
  // Print all titles with IDs for inspection
  const all = await db.select({ id: scholarships.id, title: scholarships.title }).from(scholarships)
  const rdpLike = all.filter(r => r.title.toLowerCase().includes('red deer') || r.title.toLowerCase().includes('polytechnic'))
  if (rdpLike.length > 0) {
    console.log('  Possible matches:')
    rdpLike.forEach(r => console.log(`    [${r.id}] ${r.title}`))
  } else {
    console.log('  No matches found — scholarship may not be in DB yet')
  }
}
