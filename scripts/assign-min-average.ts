#!/usr/bin/env node
/**
 * One-time script: assign minAverage to scholarships where the audience/notes
 * text states a minimum academic average explicitly.
 *
 * Only updates the `minAverage` field — all other eligibility fields preserved.
 *
 * Run: npx tsx scripts/assign-min-average.ts
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
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local */ }

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set in .env.local')

const db = drizzle(neon(url))

const EMPTY_ELIGIBILITY = {
  grades: [],
  schoolBoards: [],
  specificSchools: [],
  targetInstitutions: [],
  fields: [],
  minAverage: null,
  minAge: null,
  maxAge: null,
  genderRequired: null,
  indigenousRequired: false,
  bipocRequired: false,
  financialNeed: false,
  maxFamilyIncome: null,
  fosterCare: false,
  citizenship: 'any',
  apprenticeship: false,
  extracurriculars: [],
}

const AVERAGE_ASSIGNMENTS: Array<{ id: number; title: string; minAverage: number; evidence: string }> = [
  {
    id: 53,
    title: 'Horatio Alger Association of Canada Scholarship',
    minAverage: 65,
    evidence: '"65% minimum average" stated directly in audience text',
  },
  {
    id: 59,
    title: 'TD Scholarships for Community Leadership',
    minAverage: 75,
    evidence: '"75%+ GPA" stated directly in audience text',
  },
  {
    id: 77,
    title: 'Catherine and Robert Povaschuk Scholarship',
    minAverage: 80,
    evidence: '"Honours standing" — Alberta defines honours as 80%+',
  },
  {
    id: 92,
    title: 'University of Lethbridge Grade 11 Merit Award',
    minAverage: 75,
    evidence: '"75% average and above" stated directly in audience text',
  },
  {
    id: 116,
    title: 'UCalgary President\'s Admission Scholarship',
    minAverage: 95,
    evidence: '"95%+ admission average" stated directly in audience text and notes',
  },
  {
    id: 117,
    title: 'MacEwan University Chancellor\'s Scholarship',
    minAverage: 80,
    evidence: '"80%+ average" — this is the minimum tier; notes confirm 80–85% bracket earns $2,999',
  },
  {
    id: 118,
    title: 'Mount Royal University Entrance Scholarship',
    minAverage: 80,
    evidence: '"Grade 12 students entering any MRU program with an 80%+ average"',
  },
  {
    id: 124,
    title: 'Calgary Black Chambers Legacy Entrance Scholarship',
    minAverage: 70,
    evidence: '"Minimum 70% GPA" stated in notes',
  },
  {
    id: 127,
    title: 'Wolf Scholars Program',
    minAverage: 90,
    evidence: '"90–100% average" — 90 is the stated floor',
  },
  {
    id: 153,
    title: 'Red Deer Polytechnic High School Entrance Scholarship',
    minAverage: 80,
    evidence: '"80%+ average in five 5-credit grade 11 or 12 subjects"',
  },
]

console.log(`Assigning minAverage to ${AVERAGE_ASSIGNMENTS.length} scholarships...\n`)

let updated = 0
let skipped = 0

for (const { id, title, minAverage, evidence } of AVERAGE_ASSIGNMENTS) {
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
  console.log(`    minAverage: ${prev ?? 'null'} → ${minAverage}`)
  console.log(`    evidence: ${evidence}\n`)
  updated++
}

console.log(`Done. ${updated} updated, ${skipped} skipped.`)
