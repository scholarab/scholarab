#!/usr/bin/env node
/**
 * Second eligibility patch pass.
 *
 * Fixes:
 * - Data bugs (wrong bipocRequired, wrong schoolBoards)
 * - citizenship 'any' → 'canadian' where clearly a local/provincial award
 * - fields corrections (too narrow, too broad, or missing)
 * - minAge assignments where age range is explicit in audience text
 * - financialNeed flags missed in first pass
 * - targetInstitutions and extracurriculars gaps
 *
 * Run: npx tsx scripts/patch-eligibility-2.ts
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

const db = drizzle(neon(process.env.DATABASE_URL!))

type Patch = {
  id: number
  title: string
  patch: Record<string, unknown>
  evidence: string
}

const PATCHES: Patch[] = [

  // ── BUG FIXES ─────────────────────────────────────────────────────────────

  {
    id: 86,
    title: 'Mah Society of Edmonton Centennial Scholarship',
    patch: { bipocRequired: false, citizenship: 'any' },
    evidence: 'bipocRequired was wrongly set to true — scholarship is for students with the surname "Mah", not BIPOC identity. citizenship kept any (open to any background per notes).',
  },
  {
    id: 20,
    title: 'ATA Local 21 Scholarship',
    patch: { schoolBoards: [] },
    evidence: 'Scholarship is for CHILDREN OF TEACHERS at Elk Island Catholic Schools — the student\'s own school board is irrelevant and should not be filtered. Clearing schoolBoards prevents false negatives.',
  },

  // ── CITIZENSHIP: 'any' → 'canadian' ──────────────────────────────────────
  // Local MH/AB school-district and community awards are Canadian students only.
  // Clearing 'any' helps filter when a student reports non-canadian citizenship.

  {
    id: 2,
    title: 'Medicine Hat College Entrance Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Medicine Hat College scholarship — effectively Canadian students only.',
  },
  {
    id: 12,
    title: 'MHPSD Financial Assistance',
    patch: { citizenship: 'canadian' },
    evidence: 'MHPSD district scholarship — Canadian students.',
  },
  {
    id: 23,
    title: 'Hat High (MHHS) Alumni Memorial Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Medicine Hat High School alumni scholarship — Canadian students.',
  },
  {
    id: 24,
    title: 'Crescent Heights High School Leadership Award',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Crescent Heights High School scholarship — Canadian students.',
  },
  {
    id: 25,
    title: 'Monsignor McCoy Faith in Action Award',
    patch: { citizenship: 'canadian' },
    evidence: 'Local McCoy Catholic High School scholarship — Canadian students.',
  },
  {
    id: 29,
    title: 'Medicine Hat Lions Club Community Grant',
    patch: { citizenship: 'canadian' },
    evidence: 'Medicine Hat Lions Club community grant — Canadian students.',
  },
  {
    id: 77,
    title: 'Catherine and Robert Povaschuk Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Edmonton Public Schools scholarship — Canadian students (EPS serves Canadian residents).',
  },
  {
    id: 88,
    title: 'Lethbridge School Division ICE Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Lethbridge School Division scholarship — Canadian students.',
  },
  {
    id: 3,
    title: 'Kinsmen Club of Medicine Hat Grant',
    patch: { citizenship: 'canadian' },
    evidence: 'Kinsmen Club of Medicine Hat community grant — Canadian students.',
  },

  // ── FIELDS CORRECTIONS ───────────────────────────────────────────────────

  {
    id: 88,
    title: 'Lethbridge School Division ICE Scholarship',
    patch: { fields: ['business'] },
    evidence: '"demonstrating innovation, creativity, and entrepreneurship" — business/entrepreneurship field.',
  },
  {
    id: 101,
    title: '4-H Canada Scholarships',
    patch: { fields: ['agriculture', 'trades'] },
    evidence: '4-H is primarily an agriculture youth program — agriculture belongs alongside trades.',
  },
  {
    id: 121,
    title: 'RBC Ignite Scholarship',
    patch: { fields: [] },
    evidence: 'Covers "lifeguarding, first aid, coding, language, graphic design, coach certification, and more" — not trades-only; no field restriction applies.',
  },
  {
    id: 75,
    title: 'Bayer Fund Opportunity Scholarship',
    patch: { fields: ['agriculture', 'health'] },
    evidence: '"entering agriculture, food science, or culinary programs" — agriculture and health fields.',
  },
  {
    id: 66,
    title: 'MindFuel Science Scholarships',
    patch: { fields: ['STEM'] },
    evidence: '"entering first year of science or science education at an AB institution" — STEM only (was STEM+education, science education is STEM).',
  },
  {
    id: 104,
    title: 'Alberta Foundation for the Arts Performing Arts Scholarship',
    patch: { fields: ['arts', 'music'], extracurriculars: ['music'] },
    evidence: 'Performing arts explicitly includes music. Adding music extracurricular signal.',
  },
  {
    id: 102,
    title: 'Dr. MacEwan Literary Arts Scholarship',
    patch: { fields: ['arts'] },
    evidence: '"literary arts" — arts field. (already set, confirming)',
  },
  {
    id: 87,
    title: 'Don and Norine Lowry Awards for Women of Excellence',
    patch: { fields: ['STEM', 'business', 'engineering'] },
    evidence: '"energy, power, water, business, finance, or safety" — STEM, business, and engineering fields (already set, confirming)',
  },
  {
    id: 71,
    title: 'Anna & John Kolesar Memorial Scholarship',
    patch: { fields: ['education'] },
    evidence: '"pursuing an Education degree" — education only (already set, confirming)',
  },

  // ── EXTRACURRICULARS ─────────────────────────────────────────────────────

  {
    id: 70,
    title: 'ASAA Alberta Milk Scholarship',
    patch: { extracurriculars: ['sports'] },
    evidence: 'ASAA = Alberta Schools Athletic Association — sports extracurricular required (school nominates via ASAA).',
  },
  {
    id: 67,
    title: "Premier's Citizenship Award",
    patch: { extracurriculars: ['volunteer'] },
    evidence: 'Citizenship award — community service/volunteering is the primary selection criterion.',
  },
  {
    id: 24,
    title: 'Crescent Heights High School Leadership Award',
    patch: { extracurriculars: ['volunteer'] },
    evidence: '"demonstrating leadership" — leadership/volunteer extracurricular signal.',
  },
  {
    id: 47,
    title: 'CPA Alberta Young Emerging Professional Award',
    patch: { extracurriculars: ['volunteer'] },
    evidence: '"demonstrating professionalism, integrity, and leadership" — leadership/volunteer extracurricular signal.',
  },
  {
    id: 52,
    title: 'Paula Weiss & Spencer Weiss BIPOC Success Award',
    patch: { extracurriculars: ['volunteer'] },
    evidence: '"demonstrating good character and leadership" — leadership/volunteer signal.',
  },
  {
    id: 82,
    title: 'Sandra B. Woitas Opportunity Through Education Scholarship',
    patch: { extracurriculars: ['volunteer'] },
    evidence: '"demonstrating educational commitment" — community/school involvement implied.',
  },
  {
    id: 136,
    title: 'ASAA Pay It Forward Scholarship',
    patch: { extracurriculars: ['sports', 'volunteer'] },
    evidence: '"student-athletes who coached or officiated" — both sports participation and volunteer coaching.',
  },
  {
    id: 135,
    title: 'Football Alberta Scholarships',
    patch: { extracurriculars: ['sports'] },
    evidence: '"tackle football players continuing to play at post-secondary" — sports extracurricular (already has sports, confirming)',
  },
  {
    id: 138,
    title: 'Alberta Centennial Award',
    patch: { extracurriculars: ['volunteer'] },
    evidence: 'Flows from Premier\'s Citizenship Award nomination — citizenship/volunteer extracurricular.',
  },

  // ── minAge ASSIGNMENTS ────────────────────────────────────────────────────
  // minAge/maxAge not currently used in matcher but stored for completeness.

  {
    id: 62,
    title: 'Advancing Futures Bursary',
    patch: { minAge: 18 },
    evidence: '"Alberta youth aged 18–24" — minimum age is 18.',
  },
  {
    id: 121,
    title: 'RBC Ignite Scholarship',
    patch: { minAge: 16 },
    evidence: '"Canadians ages 16–20" — minimum age is 16.',
  },

  // ── financialNeed ADDITIONS ───────────────────────────────────────────────

  {
    id: 72,
    title: 'IODE Coronation Bursary',
    patch: { financialNeed: true },
    evidence: '"Alberta high school students … financial need" — financial need is explicitly stated in audience.',
  },

  // ── targetInstitutions CORRECTIONS ───────────────────────────────────────

  {
    id: 51,
    title: 'Michael Burnyeat FCPA Sparking Great Careers High School Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering BBA, B.Mgmt, or B.Comm at an Alberta institution" — any Alberta institution; already set correctly.',
  },
  {
    id: 55,
    title: 'First Nations, Métis and Inuit Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Open to any post-secondary; already set correctly.',
  },

  // ── REGION-BASED citizenship ADDITIONS ────────────────────────────────────

  {
    id: 159,
    title: 'Alberta Moose Association Youth Awareness Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Alberta Moose Association provincial program — Canadian students.',
  },
  {
    id: 4,
    title: 'South Country Co-op Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'South Country Co-op is a local AB co-op — Canadian members only.',
  },
  {
    id: 17,
    title: 'Medicine Hat Exhibition & Stampede Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Medicine Hat Exhibition & Stampede local scholarship — Canadian students.',
  },
  {
    id: 26,
    title: 'Saamis Memorial Funeral Chapel Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Medicine Hat scholarship — Canadian students.',
  },
  {
    id: 1,
    title: 'Community Foundation of Southeastern Alberta Award',
    patch: { citizenship: 'canadian' },
    evidence: 'Community Foundation of SE Alberta — Canadian students only.',
  },
  {
    id: 21,
    title: 'Medicine Hat Police Association Bursary',
    patch: { citizenship: 'canadian' },
    evidence: 'Medicine Hat Police Association local bursary — Canadian students.',
  },
  {
    id: 33,
    title: 'City of Medicine Hat Environmental Bursary',
    patch: { citizenship: 'canadian' },
    evidence: 'City of Medicine Hat municipal bursary — Canadian students.',
  },
  {
    id: 88,
    title: 'Lethbridge School Division ICE Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Local Lethbridge School Division — Canadian students.',
  },
]

// Merge patches by id
const patchMap = new Map<number, Patch>()
for (const p of PATCHES) {
  const existing = patchMap.get(p.id)
  if (existing) {
    existing.patch = { ...existing.patch, ...p.patch }
    existing.evidence += '; ' + p.evidence
  } else {
    patchMap.set(p.id, { ...p, patch: { ...p.patch } })
  }
}

const deduped = [...patchMap.values()]
console.log(`Patching ${deduped.length} scholarships...\n`)

let updated = 0
let skipped = 0
let noChange = 0

for (const { id, title, patch, evidence } of deduped) {
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
  const merged = { ...current, ...patch }

  const changes = Object.entries(patch)
    .map(([k, v]) => {
      const prev = JSON.stringify((current)[k] ?? null)
      const next = JSON.stringify(v)
      return prev === next ? null : `${k}: ${prev} → ${next}`
    })
    .filter(Boolean)

  if (changes.length === 0) {
    console.log(`  ~ [${id}] ${row.title} — already up to date`)
    noChange++
    continue
  }

  await db
    .update(scholarships)
    .set({ eligibility: merged, updatedAt: new Date() })
    .where(eq(scholarships.id, id))

  console.log(`  ✓ [${id}] ${row.title}`)
  for (const c of changes) console.log(`    ${c}`)
  console.log(`    evidence: ${evidence}\n`)
  updated++
}

console.log(`\nDone. ${updated} updated, ${noChange} already correct, ${skipped} not found.`)
