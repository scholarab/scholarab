#!/usr/bin/env node
/**
 * One-time script: assign grade requirements to scholarships where the audience
 * text makes the grade unambiguous.
 *
 * Only updates the `grades` field — all other eligibility fields are preserved
 * (or initialised from EMPTY_ELIGIBILITY if no eligibility exists yet).
 *
 * Run: npx tsx scripts/assign-grades.ts
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { scholarships } from '../src/lib/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
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

// Scholarships with unambiguous grade requirements
// Evidence is the audience text from the JSON / known scholarship rules
const GRADE_ASSIGNMENTS: Array<{ id: number; title: string; grades: string[]; evidence: string }> = [
  {
    id: 1,
    title: 'Community Foundation of Southeastern Alberta Award',
    grades: ['12'],
    evidence: '"Graduating High School Seniors in Medicine Hat"',
  },
  {
    id: 14,
    title: 'Alexander Rutherford Scholarship',
    grades: ['10', '11', '12'],
    evidence: 'Awards paid for Grade 10, 11, and 12 results separately — all three grades are eligible',
  },
  {
    id: 21,
    title: 'Medicine Hat Police Association Bursary',
    grades: ['12'],
    evidence: '"Local high school graduates pursuing criminal justice" — graduates = Grade 12',
  },
  {
    id: 23,
    title: 'Hat High (MHHS) Alumni Memorial Scholarship',
    grades: ['12'],
    evidence: '"Graduating students from Medicine Hat High School"',
  },
  {
    id: 24,
    title: 'Crescent Heights High School Leadership Award',
    grades: ['12'],
    evidence: '"Graduating students from CHHS demonstrating leadership"',
  },
  {
    id: 25,
    title: 'Monsignor McCoy Faith in Action Award',
    grades: ['12'],
    evidence: '"Graduating students from McCoy Catholic High School"',
  },
  {
    id: 36,
    title: 'Kermet Archibald & Jacoba Van den Brink Memorial Scholarship',
    grades: ['12'],
    evidence: '"Graduating Calgary CBE/CCSD high school students entering science, health, engineering, or trades"',
  },
  {
    id: 37,
    title: 'Marguerite Patricia P. Bannister Memorial Degree Awards',
    grades: ['12'],
    evidence: '"Graduating Calgary CBE/CCSD high school students entering University of Calgary"',
  },
  {
    id: 39,
    title: 'Optimist Club William J. Cummer Scholarship',
    grades: ['12'],
    evidence: '"Graduating Calgary high school students with community involvement"',
  },
  {
    id: 40,
    title: 'Calgary Flames Foundation Community Involvement Scholarship',
    grades: ['12'],
    evidence: '"Grade 12 Calgary CBE/CCSD students demonstrating leadership through volunteering" — Grade 12 explicit',
  },
]

console.log(`Assigning grades to ${GRADE_ASSIGNMENTS.length} scholarships...\n`)

let updated = 0
let skipped = 0

for (const { id, title, grades, evidence } of GRADE_ASSIGNMENTS) {
  const [row] = await db
    .select({ id: scholarships.id, title: scholarships.title, eligibility: scholarships.eligibility })
    .from(scholarships)
    .where(eq(scholarships.id, id))

  if (!row) {
    console.log(`  SKIP [${id}] — not found in DB`)
    skipped++
    continue
  }

  // Merge: preserve existing eligibility, only set grades
  const current = (row.eligibility as Record<string, unknown> | null) ?? {}
  const merged = { ...EMPTY_ELIGIBILITY, ...current, grades }

  await db
    .update(scholarships)
    .set({ eligibility: merged, updatedAt: new Date() })
    .where(eq(scholarships.id, id))

  const prev = Array.isArray(current.grades) && current.grades.length > 0
    ? (current.grades as string[]).join(', ')
    : 'none'
  const next = grades.join(', ')
  console.log(`  ✓ [${id}] ${row.title}`)
  console.log(`    grades: [${prev}] → [${next}]`)
  console.log(`    evidence: ${evidence}\n`)
  updated++
}

console.log(`Done. ${updated} updated, ${skipped} skipped.`)
