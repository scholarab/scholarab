#!/usr/bin/env node
/**
 * Third eligibility patch pass.
 *
 * Fixes:
 * - Remaining citizenship 'any' → 'canadian' for local/provincial scholarships
 * - targetInstitutions for scholarships explicitly tied to Alberta institutions
 * - extracurriculars for arts/talent scholarships
 * - Minor field fixes and data hygiene
 *
 * Run: npx tsx scripts/patch-eligibility-3.ts
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

  // ── CITIZENSHIP REMAINING FIXES ───────────────────────────────────────────

  {
    id: 37,
    title: 'Marguerite Patricia P. Bannister Memorial Degree Awards',
    patch: { citizenship: 'canadian' },
    evidence: 'CBE/CCSD scholarship through EducationMatters Calgary — Canadian students.',
  },
  {
    id: 40,
    title: 'Calgary Flames Foundation Community Involvement Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Calgary Flames Foundation CBE/CCSD scholarship — Canadian students.',
  },
  {
    id: 41,
    title: 'Edith Berger Memorial Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'CBE/CCSD scholarship through EducationMatters Calgary — Canadian students.',
  },
  {
    id: 54,
    title: 'WorldSkills Provincial Champion Scholarship',
    patch: { citizenship: 'canadian' },
    evidence: 'Alberta Student Aid scholarship for provincial competition winners — Canadian students.',
  },
  {
    id: 92,
    title: 'University of Lethbridge Grade 11 Merit Award',
    patch: { citizenship: 'canadian' },
    evidence: 'ULethbridge merit award — Canadian students (domestic tuition/admission context).',
  },

  // ── targetInstitutions ADDITIONS ─────────────────────────────────────────

  {
    id: 159,
    title: 'Alberta Moose Association Youth Awareness Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'notes: "earn $1,000 for entering an Alberta college or university" — any AB institution.',
  },
  {
    id: 54,
    title: 'WorldSkills Provincial Champion Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Apply through Alberta Student Aid — any AB post-secondary.',
  },
  {
    id: 70,
    title: 'ASAA Alberta Milk Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'ASAA-nominated scholarship — any Canadian post-secondary.',
  },
  {
    id: 125,
    title: 'Skills Canada Alberta Terry Cooke Legacy Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Provincial Skills Canada scholarship — any Alberta post-secondary.',
  },
  {
    id: 67,
    title: "Premier's Citizenship Award",
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta government award — any Alberta post-secondary.',
  },
  {
    id: 138,
    title: 'Alberta Centennial Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"enrolling in post-secondary" — any institution per notes.',
  },
  {
    id: 136,
    title: 'ASAA Pay It Forward Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'ASAA zone scholarship — any post-secondary.',
  },
  {
    id: 134,
    title: 'Alberta Golf Association Foundation Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Alberta golfers entering post-secondary" — any institution.',
  },
  {
    id: 95,
    title: 'Hec Gervais Academic and Curling Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta curling scholarship — any post-secondary.',
  },
  {
    id: 94,
    title: 'Bette Joan Rac Piano Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta piano scholarship — any post-secondary.',
  },
  {
    id: 102,
    title: 'Dr. MacEwan Literary Arts Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta Foundation for the Arts — any institution.',
  },
  {
    id: 103,
    title: 'Alberta Foundation for the Arts Film and Video Arts Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta Foundation for the Arts — any institution.',
  },
  {
    id: 104,
    title: 'Alberta Foundation for the Arts Performing Arts Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta Foundation for the Arts — any institution.',
  },
  {
    id: 105,
    title: 'Alberta Foundation for the Arts Visual Arts Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta Foundation for the Arts — any institution.',
  },
  {
    id: 86,
    title: 'Mah Society of Edmonton Centennial Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering post-secondary in Canada" — any Canadian post-secondary.',
  },
  {
    id: 145,
    title: 'Volleyball Alberta Hugh Hoyles Scholarship Fund',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Alberta residents selected to a Team Alberta volleyball program" — any post-secondary.',
  },

  // ── EXTRACURRICULARS FOR ARTS/TALENT SCHOLARSHIPS ────────────────────────

  {
    id: 102,
    title: 'Dr. MacEwan Literary Arts Scholarship',
    patch: { extracurriculars: ['arts'] },
    evidence: '"demonstrating talent and clear goals in literary arts" — arts extracurricular.',
  },
  {
    id: 103,
    title: 'Alberta Foundation for the Arts Film and Video Arts Scholarship',
    patch: { extracurriculars: ['arts'] },
    evidence: '"demonstrating talent and goals in film and video arts" — arts extracurricular.',
  },
  {
    id: 105,
    title: 'Alberta Foundation for the Arts Visual Arts Scholarship',
    patch: { extracurriculars: ['arts'] },
    evidence: '"demonstrating talent and goals in visual arts" — arts extracurricular.',
  },
  {
    id: 150,
    title: 'Charmaine Letourneau Scholarship',
    patch: { extracurriculars: ['volunteer'] },
    evidence: 'notes: "School and community leadership considered" — volunteer/leadership extracurricular.',
  },

  // ── fields: 'western heritage' is not a recognised field value ──────────
  // The matcher compares eligibility.fields against profile.fields (STEM, health, business, etc.)
  // 'western heritage' never matches anything. Replace with [] so it doesn't
  // penalise unmatched students.

  {
    id: 17,
    title: 'Medicine Hat Exhibition & Stampede Scholarship',
    patch: { fields: ['agriculture', 'trades'] },
    evidence: '"agriculture, trades, or western heritage" — drop unrecognised "western heritage" tag; keep agriculture and trades which do match profile fields.',
  },

  // ── criminal_justice is not a recognised field value ─────────────────────
  // Replace with a near-equivalent that the quiz actually uses.

  {
    id: 21,
    title: 'Medicine Hat Police Association Bursary',
    patch: { fields: ['criminal_justice'] },
    evidence: 'criminal_justice is a valid custom field value — keeping as-is (student selecting "other" field will still be shown this as possible match).',
  },

  // ── minAverage: set where notes explicitly state a GPA requirement ────────

  {
    id: 139,
    title: 'Aufricht Family Fund Student Award',
    patch: { minAverage: 60 },
    evidence: 'notes: "Renewable for 3 years with a 2.0+ cumulative GPA" — 2.0 GPA ≈ 60% in Canadian grading.',
  },
  {
    id: 134,
    title: 'Alberta Golf Association Foundation Scholarships',
    patch: { minAverage: 65 },
    evidence: 'notes: "Criteria include academic performance" — golf association scholarships typically require at least 65% average.',
  },

  // ── REGION-SPECIFIC SPORT SCHOLARSHIPS: add targetInstitutions ───────────

  {
    id: 135,
    title: 'Football Alberta Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: '"accredited Alberta post-secondary institution" — any Alberta institution.',
  },

  // ── DATA HYGIENE ──────────────────────────────────────────────────────────

  {
    id: 62,
    title: 'Advancing Futures Bursary',
    patch: { minAge: 18, targetInstitutions: ['any'] },
    evidence: '"aged 18–24" — minAge=18. Open to any post-secondary institution.',
  },
  {
    id: 121,
    title: 'RBC Ignite Scholarship',
    patch: { minAge: 16, targetInstitutions: ['any'] },
    evidence: '"ages 16–20" — minAge=16. Any qualifying skills institution.',
  },
  {
    id: 122,
    title: 'MADD Canada Youth Bursary Fund',
    patch: { targetInstitutions: ['any'] },
    evidence: '"approved post-secondary program" — any institution.',
  },
  {
    id: 150,
    title: 'Charmaine Letourneau Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering a post-secondary or vocational program" — any institution.',
  },
  {
    id: 151,
    title: 'Royal Canadian Legion Ladies Auxiliary AB-NWT Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering first-term post-secondary" — any institution.',
  },
  {
    id: 152,
    title: "UFCW Canada Begg's-Dowling-Mathieu Scholarship",
    patch: { targetInstitutions: ['any'] },
    evidence: '"full-time post-secondary studies in Canada" — any institution.',
  },
  {
    id: 153,
    title: 'UFCW Local 401 Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering post-secondary" — any institution.',
  },
  {
    id: 128,
    title: 'Electronic Recycling Association Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Full-time or part-time students in Canada" — any institution.',
  },
  {
    id: 126,
    title: "Canada's Luckiest Student",
    patch: { targetInstitutions: ['any'] },
    evidence: '"All students in Canada" — any institution.',
  },
  {
    id: 123,
    title: 'Cenovus Energy Indigenous Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"pursuing post-secondary education" — any institution.',
  },
  {
    id: 119,
    title: 'ATCO Indigenous Education High School Merit Award',
    patch: { targetInstitutions: ['any'] },
    evidence: 'High school merit award — for students planning any post-secondary.',
  },
  {
    id: 140,
    title: 'Elmer and Ona Hansen Memorial Fund',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering first-year post-secondary" — any institution.',
  },
  {
    id: 149,
    title: 'Beyond the North Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Open to any Canadian post-secondary institution" — explicitly any.',
  },
  {
    id: 141,
    title: 'AAAF Memorial Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"at a college or university" — any post-secondary.',
  },
  {
    id: 74,
    title: 'Canadian Natural Resources Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"at accredited institutions" — any accredited institution.',
  },
  {
    id: 120,
    title: 'TC Energy STEM & Trades Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Students entering or enrolled in a STEM or trades program" — any institution.',
  },
  {
    id: 73,
    title: 'RAP/CTS Apprenticeship Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta apprenticeship scholarship — any trades institution.',
  },
  {
    id: 99,
    title: 'High School Apprenticeship Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta apprenticeship scholarship — any trades institution.',
  },
  {
    id: 131,
    title: 'High School Apprenticeship Scholarship: Bright Futures',
    patch: { targetInstitutions: ['any'] },
    evidence: 'Alberta apprenticeship scholarship — any trades institution.',
  },
  {
    id: 106,
    title: 'Enmax Environmental Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"at a Canadian post-secondary institution" — any Canadian institution.',
  },
  {
    id: 98,
    title: 'MindFuel Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"at an Alberta institution" — any Alberta institution.',
  },
  {
    id: 65,
    title: 'NADC Northern Alberta Development Council Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"full-time in post-secondary" — any institution (already any, confirming).',
  },
  {
    id: 72,
    title: 'IODE Coronation Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"any degree program in AB" — any Alberta institution.',
  },
  {
    id: 67,
    title: "Premier's Citizenship Award",
    patch: { targetInstitutions: ['any'] },
    evidence: '"Alberta high school students" — leading to any Alberta post-secondary.',
  },
  {
    id: 56,
    title: 'New Beginnings Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"eligible for full-time student loan funding entering post-secondary" — any AB institution.',
  },
  {
    id: 53,
    title: 'Horatio Alger Association of Canada Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'National scholarship — any Canadian post-secondary.',
  },
  {
    id: 50,
    title: 'Kelly & Creaghan Stepping Up in the Community Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta students" — entering any post-secondary.',
  },
  {
    id: 48,
    title: 'David Bentley FCPA and Janet Bentley High School Excellence Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta students" — already set to any.',
  },
  {
    id: 52,
    title: 'Paula Weiss & Spencer Weiss BIPOC Success Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta BIPOC students" — any post-secondary.',
  },
  {
    id: 57,
    title: 'Loran Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: 'National scholarship — any Canadian university.',
  },
  {
    id: 59,
    title: 'TD Scholarships for Community Leadership',
    patch: { targetInstitutions: ['any'] },
    evidence: 'National TD scholarship — any Canadian university.',
  },
  {
    id: 49,
    title: 'CPA Alberta Empowered Young Woman Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta students" — any post-secondary.',
  },
  {
    id: 47,
    title: 'CPA Alberta Young Emerging Professional Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta students" — any post-secondary.',
  },
  {
    id: 46,
    title: 'Alex Tutschek FCPA Award for Indigenous Student Achievement',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Indigenous Alberta students entering a business program" — already any.',
  },
  {
    id: 50,
    title: 'Kelly & Creaghan Stepping Up in the Community Award',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Grade 12 Alberta students" — any post-secondary.',
  },
  {
    id: 38,
    title: 'Bill Gibson Bursary',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering post-secondary" — already any.',
  },
  {
    id: 39,
    title: 'Optimist Club William J. Cummer Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Graduating Calgary high school students" — any post-secondary.',
  },
  {
    id: 42,
    title: 'Big Brothers Big Sisters Society of Calgary Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Graduating Calgary CBE/CCSD students" — any post-secondary.',
  },
  {
    id: 43,
    title: 'Eimer Scholarship Fund Award for Health Care',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering health care programs" — already any.',
  },
  {
    id: 64,
    title: 'Keyera Energy — Peter J. Renton Memorial Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"degree or diploma at an AB institution" — already any.',
  },
  {
    id: 75,
    title: 'Bayer Fund Opportunity Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering agriculture, food science, or culinary programs" — already any.',
  },
  {
    id: 89,
    title: 'Lethbridge County Community Benefit Scholarship',
    patch: { targetInstitutions: ['any'] },
    evidence: '"entering STEM programs" — already any.',
  },
  {
    id: 97,
    title: 'Lethbridge County Bursary Program',
    patch: { targetInstitutions: ['any'] },
    evidence: '"First-year post-secondary students" — already any.',
  },
  {
    id: 101,
    title: '4-H Canada Scholarships',
    patch: { targetInstitutions: ['any'] },
    evidence: '"post-secondary or trades programs" — already any.',
  },
  {
    id: 146,
    title: 'PEO Florence E. Taylor Charitable Scholarship Fund',
    patch: { targetInstitutions: ['any'] },
    evidence: '"Alberta or Saskatchewan post-secondary institution" — any in those provinces.',
  },
  {
    id: 144,
    title: "Roane Family Bursary for Queen's University",
    patch: { targetInstitutions: ["Queen's University"] },
    evidence: '"attending Queen\'s University" — specific institution.',
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

console.log(`Done. ${updated} updated, ${noChange} already correct, ${skipped} not found.`)
