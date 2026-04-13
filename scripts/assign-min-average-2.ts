#!/usr/bin/env node
/**
 * Batch 2: assign minAverage to 4 more scholarships with confident evidence.
 * Run: npx tsx scripts/assign-min-average-2.ts
 */
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

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')
const db = drizzle(neon(url))

const EMPTY_ELIGIBILITY = {
  grades: [], schoolBoards: [], specificSchools: [], targetInstitutions: [],
  fields: [], minAverage: null, minAge: null, maxAge: null, genderRequired: null,
  indigenousRequired: false, bipocRequired: false, financialNeed: false,
  maxFamilyIncome: null, fosterCare: false, citizenship: 'any',
  apprenticeship: false, extracurriculars: [],
}

const ASSIGNMENTS: Array<{ id: number; title: string; minAverage: number; evidence: string }> = [
  {
    id: 162,
    title: 'Rogers Birdies for Kids / AltaLink Scholarship',
    minAverage: 70,
    evidence: 'DB notes: "Minimum 70% GPA. Administered by Calgary Foundation."',
  },
  {
    id: 14,
    title: 'Alexander Rutherford Scholarship',
    minAverage: 75,
    evidence: 'Alberta Student Aid: 75% minimum in 5 qualifying subjects per grade year',
  },
  {
    id: 76,
    title: 'Dr. Ernest and Minnie Mehl Scholarship',
    minAverage: 75,
    evidence: 'Auto-considered when applying for Alexander Rutherford — same 75% threshold applies',
  },
  {
    id: 57,
    title: 'Loran Scholarship',
    minAverage: 85,
    evidence: 'Loran Award requires minimum 85% average in most recent complete academic year',
  },
]

console.log(`Assigning minAverage to ${ASSIGNMENTS.length} scholarships...\n`)

let updated = 0
let skipped = 0

for (const { id, title, minAverage, evidence } of ASSIGNMENTS) {
  const [row] = await db
    .select({ id: scholarships.id, title: scholarships.title, eligibility: scholarships.eligibility })
    .from(scholarships)
    .where(eq(scholarships.id, id))

  if (!row) {
    console.log(`  SKIP [${id}] ${title} — not found in DB`)
    skipped++
    continue
  }

  const current = (row.eligibility as Record<string, unknown> | null) ?? {}
  const prev = current.minAverage ?? null
  const merged = { ...EMPTY_ELIGIBILITY, ...current, minAverage }

  await db
    .update(scholarships)
    .set({ eligibility: merged, updatedAt: new Date() })
    .where(eq(scholarships.id, id))

  console.log(`  ✓ [${id}] ${row.title}`)
  console.log(`    minAverage: ${prev} → ${minAverage}`)
  console.log(`    evidence: ${evidence}\n`)
  updated++
}

console.log(`Done. ${updated} updated, ${skipped} skipped.`)
