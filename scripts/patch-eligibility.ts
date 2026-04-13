#!/usr/bin/env node
/**
 * Comprehensive eligibility patch script.
 *
 * Assigns missing grades, fields, financial need, and other fields based on
 * audience/notes text analysis. Each patch is fully justified in comments.
 *
 * Run: npx tsx scripts/patch-eligibility.ts
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
} catch { /* no .env.local */ }

const db = drizzle(neon(process.env.DATABASE_URL!))

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

type Patch = {
  id: number
  title: string
  patch: Partial<typeof EMPTY_ELIGIBILITY>
  evidence: string
}

const PATCHES: Patch[] = [
  // ── GRADE ASSIGNMENTS ────────────────────────────────────────────────────────

  {
    id: 2,
    title: 'Medicine Hat College Entrance Scholarship',
    patch: { grades: ['post-secondary'] },
    evidence: '"First-year MHC students" — entering post-secondary, no high school grade required',
  },
  {
    id: 12,
    title: 'MHPSD Financial Assistance',
    patch: { grades: ['12', 'post-secondary'] },
    evidence: 'Financial assistance for MHPSD students — context is graduating or enrolled students needing aid',
  },
  {
    id: 16,
    title: 'Cypress County Agricultural Scholarship',
    patch: { grades: ['12'] },
    evidence: '"Students from Cypress County pursuing ag-related studies" — pursuing = entering, consistent with Grade 12',
  },
  {
    id: 17,
    title: 'Medicine Hat Exhibition & Stampede Scholarship',
    patch: { grades: ['12'] },
    evidence: '"Local students pursuing agriculture, trades, or western heritage" — guidance counsellor applies; standard graduating scholarship',
  },
  {
    id: 20,
    title: 'ATA Local 21 Scholarship',
    patch: { grades: ['12'] },
    evidence: 'Teacher union scholarship for children of teachers — entering post-secondary, standard Grade 12 graduating scholarship',
  },
  {
    id: 26,
    title: 'Saamis Memorial Funeral Chapel Scholarship',
    patch: { grades: ['12'] },
    evidence: '"Local students pursuing healthcare or mortuary science" — guidance counsellor applies; graduating scholarship',
  },
  {
    id: 29,
    title: 'Medicine Hat Lions Club Community Grant',
    patch: { grades: ['12'] },
    evidence: '"Students with strong volunteer history in Medicine Hat" — community grant context is graduating high school students',
  },
  {
    id: 33,
    title: 'City of Medicine Hat Environmental Bursary',
    patch: { grades: ['12'] },
    evidence: '"Students pursuing environmental sciences" — guidance counsellor applies; graduating scholarship context',
  },
  {
    id: 53,
    title: 'Horatio Alger Association of Canada Scholarship',
    patch: { grades: ['12'] },
    evidence: 'Canadian graduating scholarship for students with financial need — standard Grade 12 entry',
  },
  {
    id: 57,
    title: 'Loran Scholarship',
    patch: { grades: ['12'] },
    evidence: '"Canadian high school students — each school may nominate up to 3 students" — school nomination = Grade 12 graduating',
  },
  {
    id: 59,
    title: 'TD Scholarships for Community Leadership',
    patch: { grades: ['12'] },
    evidence: 'TD community scholarship — standard Grade 12 graduating scholarship with community involvement',
  },
  {
    id: 62,
    title: 'Advancing Futures Bursary',
    patch: { grades: ['post-secondary'] },
    evidence: '"Alberta youth aged 18–24 who have been in government care" — enrolling in or enrolled at post-secondary',
  },
  {
    id: 64,
    title: 'Keyera Energy — Peter J. Renton Memorial Scholarship',
    patch: { grades: ['12'] },
    evidence: '"entering first year of an oil & gas related degree" — entering first year = Grade 12 graduating',
  },
  {
    id: 65,
    title: 'NADC Northern Alberta Development Council Bursary',
    patch: { grades: ['12', 'post-secondary'] },
    evidence: '"planning to enroll full-time in post-secondary" — both Grade 12 and enrolled post-secondary students eligible',
  },
  {
    id: 67,
    title: "Premier's Citizenship Award",
    patch: { grades: ['12'] },
    evidence: '"Alberta high school students — each school nominates ONE student per year" — school nomination = Grade 12',
  },
  {
    id: 71,
    title: 'Anna & John Kolesar Memorial Scholarship',
    patch: { grades: ['post-secondary'] },
    evidence: '"Alberta residents pursuing an Education degree, first-generation university student" — enrolled in post-secondary',
  },
  {
    id: 73,
    title: 'RAP/CTS Apprenticeship Scholarships',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"Alberta high school students in the Registered Apprenticeship Program or CTS" — RAP begins Grade 10',
  },
  {
    id: 74,
    title: 'Canadian Natural Resources Scholarship',
    patch: { grades: ['12', 'post-secondary'] },
    evidence: '"Students entering technical or trades training" — both entering (Grade 12) and enrolled applicable',
  },
  {
    id: 86,
    title: 'Mah Society of Edmonton Centennial Scholarship',
    patch: { grades: ['post-secondary'] },
    evidence: '"students with the surname Mah entering post-secondary in Canada" — entering post-secondary',
  },
  {
    id: 88,
    title: 'Lethbridge School Division ICE Scholarship',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"Lethbridge School Division students demonstrating innovation" — school district scholarship = high school students',
  },
  {
    id: 95,
    title: 'Hec Gervais Academic and Curling Scholarship',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"Alberta youth curlers eligible for U20 sanctioned season" — U20 competition is high school age',
  },
  {
    id: 98,
    title: 'MindFuel Scholarship',
    patch: { grades: ['12'] },
    evidence: '"entering first year of an undergraduate applied science or science education program" — entering = Grade 12 graduating',
  },
  {
    id: 99,
    title: 'High School Apprenticeship Scholarship',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"Alberta high school students registered in the Registered Apprenticeship Program or CTS" — RAP begins Grade 10',
  },
  {
    id: 106,
    title: 'Enmax Environmental Scholarship',
    patch: { grades: ['12'] },
    evidence: '"Alberta students entering a diploma or degree program in Environmental Studies" — entering = Grade 12 graduating',
  },
  {
    id: 116,
    title: "UCalgary President's Admission Scholarship",
    patch: { grades: ['12'] },
    evidence: '"First-year University of Calgary students with a 95%+ admission average" — awarded on admission = Grade 12',
  },
  {
    id: 120,
    title: 'TC Energy STEM & Trades Scholarships',
    patch: { grades: ['12', 'post-secondary'] },
    evidence: '"Students entering or enrolled in a STEM or trades program" — both entering (Grade 12) and enrolled applicable',
  },
  {
    id: 121,
    title: 'RBC Ignite Scholarship',
    patch: { grades: ['10', '11', '12', 'post-secondary'] },
    evidence: '"Canadians ages 16–20" — spans high school (Grade 10+) through early post-secondary',
  },
  {
    id: 127,
    title: 'Wolf Scholars Program',
    patch: { grades: ['12'] },
    evidence: '"entering U of T Faculty of Arts & Science with 90–100% average" — admission scholarship for entering students',
  },
  {
    id: 131,
    title: 'High School Apprenticeship Scholarship: Bright Futures',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"Alberta high school students registered in both RAP and a CTS Apprenticeship Pathway" — RAP begins Grade 10',
  },
  {
    id: 140,
    title: 'Elmer and Ona Hansen Memorial Fund',
    patch: { grades: ['12'] },
    evidence: '"entering first-year post-secondary with no prior post-secondary enrollment" — first-time entrant = Grade 12 graduating',
  },
  {
    id: 141,
    title: 'AAAF Memorial Bursary',
    patch: { grades: ['12'] },
    evidence: '"Alberta residents entering an agriculture or environmental science program" — entering = Grade 12 graduating',
  },
  {
    id: 145,
    title: 'Volleyball Alberta Hugh Hoyles Scholarship Fund',
    patch: { grades: ['10', '11', '12', 'post-secondary'] },
    evidence: '"Alberta residents selected to a Team Alberta volleyball program" — Team Alberta spans high school through early post-secondary',
  },

  // ── FIELDS ASSIGNMENTS ───────────────────────────────────────────────────────

  {
    id: 93,
    title: 'LaDue Ladies Lunch Scholarship',
    patch: { fields: [], citizenship: 'canadian' },
    evidence: '"Female-identifying Grade 12 students in Alberta entering post-secondary" — no field restriction; Canadian context',
  },
  {
    id: 119,
    title: 'ATCO Indigenous Education High School Merit Award',
    patch: { fields: [] },
    evidence: 'No field restriction — open to any field of study for Indigenous students Grades 10–12',
  },
  {
    id: 123,
    title: 'Cenovus Energy Indigenous Scholarship',
    patch: { grades: ['post-secondary'], fields: [] },
    evidence: '"Indigenous students pursuing post-secondary education" — no field restriction; post-secondary',
  },
  {
    id: 55,
    title: 'First Nations, Métis and Inuit Bursary',
    patch: { fields: [] },
    evidence: '"Indigenous students pursuing post-secondary education" — no field restriction stated',
  },
  {
    id: 50,
    title: 'Kelly & Creaghan Stepping Up in the Community Award',
    patch: { fields: [] },
    evidence: '"Grade 12 Alberta students who demonstrate leadership through volunteering" — no field restriction',
  },
  {
    id: 48,
    title: 'David Bentley FCPA and Janet Bentley High School Excellence Award',
    patch: { fields: [] },
    evidence: '"Grade 12 Alberta students, preference for those relocating within AB" — no field restriction',
  },
  {
    id: 52,
    title: 'Paula Weiss & Spencer Weiss BIPOC Success Award',
    patch: { fields: [] },
    evidence: '"Grade 12 Alberta BIPOC students demonstrating good character and leadership" — no field restriction',
  },
  {
    id: 72,
    title: 'IODE Coronation Bursary',
    patch: { fields: [] },
    evidence: '"entering any degree program in AB" — explicitly any field',
  },
  {
    id: 70,
    title: 'ASAA Alberta Milk Scholarship',
    patch: { fields: [] },
    evidence: '"Grade 12 ASAA member school students" — no field restriction',
  },
  {
    id: 82,
    title: 'Sandra B. Woitas Opportunity Through Education Scholarship',
    patch: { fields: [] },
    evidence: '"Edmonton Public Schools Grade 12 students demonstrating educational commitment" — no field restriction',
  },
  {
    id: 80,
    title: 'Grace Elaine Campbell Scholarship',
    patch: { fields: [], citizenship: 'canadian' },
    evidence: '"Edmonton Public Schools Grade 12 students" — no field restriction; EPS context is Canadian students',
  },
  {
    id: 83,
    title: 'LeRoy Warden & Associates Scholarship',
    patch: { fields: [], citizenship: 'canadian' },
    evidence: '"Edmonton Public Schools Grade 12 students" — no field restriction; EPS context',
  },
  {
    id: 81,
    title: 'James P. Jones Scholarship',
    patch: { fields: [] },
    evidence: '"Edmonton Public Schools Grade 12 students" — no field restriction',
  },
  {
    id: 79,
    title: 'Esther and Peter Cunliffe Scholarship',
    patch: { fields: [], citizenship: 'canadian' },
    evidence: '"Edmonton Public Schools Grade 12 students" — no field restriction',
  },
  {
    id: 78,
    title: 'Betty Finch Scholarship',
    patch: { fields: [], citizenship: 'canadian' },
    evidence: '"Edmonton Public Schools Grade 12 students" — no field restriction',
  },
  {
    id: 49,
    title: 'CPA Alberta Empowered Young Woman Award',
    patch: { fields: [] },
    evidence: '"Grade 12 Alberta students who identify as a girl/woman" — no field restriction stated',
  },
  {
    id: 42,
    title: 'Big Brothers Big Sisters Society of Calgary Scholarship',
    patch: { fields: [] },
    evidence: '"Graduating Calgary CBE/CCSD students" — no field restriction',
  },
  {
    id: 37,
    title: 'Marguerite Patricia P. Bannister Memorial Degree Awards',
    patch: { fields: [] },
    evidence: '"Graduating Calgary CBE/CCSD high school students entering University of Calgary" — no field restriction',
  },
  {
    id: 39,
    title: 'Optimist Club William J. Cummer Scholarship',
    patch: { fields: [] },
    evidence: '"Graduating Calgary high school students with community involvement" — no field restriction',
  },
  {
    id: 40,
    title: 'Calgary Flames Foundation Community Involvement Scholarship',
    patch: { fields: [] },
    evidence: '"Grade 12 Calgary CBE/CCSD students demonstrating leadership through volunteering" — no field restriction',
  },
  {
    id: 23,
    title: 'Hat High (MHHS) Alumni Memorial Scholarship',
    patch: { fields: [] },
    evidence: '"Graduating students from Medicine Hat High School" — no field restriction',
  },
  {
    id: 25,
    title: 'Monsignor McCoy Faith in Action Award',
    patch: { fields: [] },
    evidence: '"Graduating students from McCoy Catholic High School" — no field restriction',
  },
  {
    id: 14,
    title: 'Alexander Rutherford Scholarship',
    patch: { fields: [] },
    evidence: '"Alberta high school students based on academic averages" — no field restriction; automatic government scholarship',
  },
  {
    id: 4,
    title: 'South Country Co-op Scholarship',
    patch: { fields: [] },
    evidence: '"High school students in the South Country Co-op trading area" — no field restriction',
  },
  {
    id: 135,
    title: 'Football Alberta Scholarships',
    patch: { fields: [] },
    evidence: '"Graduating Grade 12 ASAA tackle football players continuing to play at post-secondary" — no field restriction',
  },
  {
    id: 139,
    title: 'Aufricht Family Fund Student Award',
    patch: { fields: [] },
    evidence: '"Graduating Calgary CBE or CCSD students entering UCalgary or SAIT" — no field restriction specified',
  },
  {
    id: 162,
    title: 'Rogers Birdies for Kids / AltaLink Scholarship',
    patch: { fields: [] },
    evidence: '"Graduating Grade 12 students entering first-year post-secondary" — no field restriction',
  },
  {
    id: 3,
    title: 'Kinsmen Club of Medicine Hat Grant',
    patch: { grades: ['12'], fields: [] },
    evidence: '"Students demonstrating community service" — community service context = graduating students; no field restriction',
  },
  {
    id: 77,
    title: 'Catherine and Robert Povaschuk Scholarship',
    patch: { fields: [] },
    evidence: '"Edmonton Public Schools Grade 12 students with honours standing, conditional acceptance to UofA" — no field restriction',
  },
  {
    id: 116,
    title: "UCalgary President's Admission Scholarship",
    patch: { fields: [] },
    evidence: '"any faculty, any citizenship" — explicitly no field restriction',
  },
  {
    id: 124,
    title: 'Calgary Black Chambers Legacy Entrance Scholarship',
    patch: { fields: [], financialNeed: true },
    evidence: '"minimum 70% GPA; financial need considered" — financial need is part of criteria; no field restriction',
  },
  {
    id: 128,
    title: 'Electronic Recycling Association Scholarship',
    patch: { grades: ['10', '11', '12', 'post-secondary'], fields: [] },
    evidence: '"Full-time or part-time students in Canada" — open to all students; no field restriction',
  },
  {
    id: 126,
    title: "Canada's Luckiest Student",
    patch: { grades: ['10', '11', '12', 'post-secondary'], fields: [] },
    evidence: '"All students in Canada" — explicitly no restrictions; open to all grades',
  },
  {
    id: 122,
    title: 'MADD Canada Youth Bursary Fund',
    patch: { grades: ['post-secondary'], fields: [] },
    evidence: '"Must enrol full-time in an approved post-secondary program" — post-secondary; no field restriction',
  },
  {
    id: 29,
    title: 'Medicine Hat Lions Club Community Grant',
    patch: { fields: [] },
    evidence: '"Students with strong volunteer history in Medicine Hat" — no field restriction',
  },
  {
    id: 20,
    title: 'ATA Local 21 Scholarship',
    patch: { grades: ['12'], fields: [] },
    evidence: '"Children of Elk Island Catholic Schools teachers" — no field restriction; graduating scholarship',
  },
  {
    id: 17,
    title: 'Medicine Hat Exhibition & Stampede Scholarship',
    patch: { grades: ['12'] },
    evidence: 'Already has fields assigned — only adding grades',
  },
  {
    id: 151,
    title: 'Royal Canadian Legion Ladies Auxiliary AB-NWT Bursary',
    patch: { fields: [] },
    evidence: '"entering first-term post-secondary" — no field restriction',
  },
  {
    id: 159,
    title: 'Alberta Moose Association Youth Awareness Scholarship',
    patch: { fields: [] },
    evidence: '"Alberta grade 9–12 students who participated in AMA KidsTalks program" — no field restriction',
  },
  {
    id: 138,
    title: 'Alberta Centennial Award',
    patch: { fields: [] },
    evidence: '"Alberta high school graduates nominated for the Premier\'s Citizenship Award" — no field restriction',
  },
  {
    id: 153,
    title: 'UFCW Local 401 Scholarships',
    patch: { fields: [] },
    evidence: '"UFCW Local 401 members or their dependents entering post-secondary" — no field restriction',
  },
  {
    id: 152,
    title: 'UFCW Canada Begg\'s-Doling-Mathieu Scholarship',
    patch: { grades: ['post-secondary'], fields: [] },
    evidence: '"entering full-time post-secondary studies in Canada" — no field restriction; post-secondary',
  },
  {
    id: 57,
    title: 'Loran Scholarship',
    patch: { fields: [] },
    evidence: '"Canadian high school students" — no field restriction; leadership-based',
  },
  {
    id: 59,
    title: 'TD Scholarships for Community Leadership',
    patch: { fields: [] },
    evidence: '"Canadian students with 75%+ GPA and significant community involvement" — no field restriction',
  },
  {
    id: 92,
    title: 'University of Lethbridge Grade 11 Merit Award',
    patch: { fields: [] },
    evidence: '"Grade 11 students planning to attend ULethbridge" — no field restriction; merit-based',
  },
  {
    id: 87,
    title: 'Don and Norine Lowry Awards for Women of Excellence',
    patch: { citizenship: 'canadian' },
    evidence: '"Women in Edmonton pursuing post-secondary studies" — Canadian institution/award; adding citizenship',
  },

  // ── FINANCIAL NEED FLAGS ─────────────────────────────────────────────────────

  {
    id: 97,
    title: 'Lethbridge County Bursary Program',
    patch: { financialNeed: true },
    evidence: 'notes: "Financial need considered" — financial need is a selection criterion',
  },
  {
    id: 134,
    title: 'Alberta Golf Association Foundation Scholarships',
    patch: { financialNeed: true },
    evidence: 'notes: "Criteria include academic performance, financial need, volunteer involvement, and golf participation"',
  },
  {
    id: 144,
    title: 'Roane Family Bursary for Queen\'s University',
    patch: { grades: ['12', 'post-secondary'], financialNeed: true, fields: [] },
    evidence: '"demonstrated financial need" explicitly stated in notes; entering or attending Queen\'s',
  },
  {
    id: 146,
    title: 'PEO Florence E. Taylor Charitable Scholarship Fund',
    patch: { financialNeed: true, fields: [] },
    evidence: 'notes: "Financial need considered" — selection criterion; no field restriction',
  },
  {
    id: 150,
    title: 'Charmaine Letourneau Scholarship',
    patch: { financialNeed: true, fields: [] },
    evidence: 'notes: "Must demonstrate financial need and knowledge of sign language"',
  },
  {
    id: 140,
    title: 'Elmer and Ona Hansen Memorial Fund',
    patch: { fields: [] },
    evidence: '"Alberta rural farm youth entering first-year post-secondary" — no field restriction',
  },
  {
    id: 65,
    title: 'NADC Northern Alberta Development Council Bursary',
    patch: { fields: [] },
    evidence: '"Alberta residents planning to enroll full-time in post-secondary" — no field restriction',
  },
  {
    id: 62,
    title: 'Advancing Futures Bursary',
    patch: { fields: [] },
    evidence: '"Alberta youth aged 18–24 who have been in government care" — no field restriction',
  },
  {
    id: 56,
    title: 'New Beginnings Bursary',
    patch: { fields: [] },
    evidence: '"Alberta students eligible for full-time student loan funding" — no field restriction; financial need implicit',
  },

  // ── MINOR FIXES ──────────────────────────────────────────────────────────────

  {
    id: 76,
    title: 'Dr. Ernest and Minnie Mehl Scholarship',
    patch: { grades: ['10', '11', '12'], fields: [] },
    evidence: '"automatically considered when applying for the Alexander Rutherford Scholarship" — same grade range as Rutherford (10–12)',
  },
  {
    id: 94,
    title: 'Bette Joan Rac Piano Scholarship',
    patch: { grades: ['10', '11', '12', 'post-secondary'] },
    evidence: '"Piano students in Alberta" — no grade restriction; encompasses all levels',
  },
  {
    id: 136,
    title: 'ASAA Pay It Forward Scholarship',
    patch: { fields: [] },
    evidence: '"Grade 12 Alberta student-athletes who coached or officiated" — no field restriction',
  },
  {
    id: 149,
    title: 'Beyond the North Scholarship',
    patch: { fields: [] },
    evidence: '"Grade 12 students graduating from a Fairview area high school" — no field restriction',
  },
  {
    id: 4,
    title: 'South Country Co-op Scholarship',
    patch: { grades: ['10', '11', '12'] },
    evidence: '"High school students in the South Country Co-op trading area" — grades 10–12 typical for co-op scholarships',
  },
  {
    id: 71,
    title: 'Anna & John Kolesar Memorial Scholarship',
    patch: { fields: ['education'] },
    evidence: '"pursuing an Education degree" — education field explicitly stated',
  },
  {
    id: 64,
    title: 'Keyera Energy — Peter J. Renton Memorial Scholarship',
    patch: { fields: ['STEM', 'engineering'] },
    evidence: '"entering first year of an oil & gas related degree or diploma" — STEM/engineering field',
  },
  {
    id: 74,
    title: 'Canadian Natural Resources Scholarship',
    patch: { fields: ['trades', 'STEM'] },
    evidence: '"Students entering technical or trades training related to oil & gas" — trades and STEM',
  },
  {
    id: 66,
    title: 'MindFuel Science Scholarships',
    patch: { fields: ['STEM'] },
    evidence: '"Alberta high school graduates entering first year of science or science education at an AB institution" — STEM field',
  },
  {
    id: 33,
    title: 'City of Medicine Hat Environmental Bursary',
    patch: { fields: ['environmental', 'STEM'] },
    evidence: '"Students pursuing environmental sciences" — environmental/STEM field',
  },
]

// De-duplicate by id — later patches for same id are merged in
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
  const merged = { ...EMPTY_ELIGIBILITY, ...current, ...patch }

  await db
    .update(scholarships)
    .set({ eligibility: merged, updatedAt: new Date() })
    .where(eq(scholarships.id, id))

  const changes = Object.entries(patch)
    .map(([k, v]) => {
      const prev = JSON.stringify((current as Record<string, unknown>)[k] ?? null)
      const next = JSON.stringify(v)
      return prev === next ? null : `${k}: ${prev} → ${next}`
    })
    .filter(Boolean)
    .join(', ')

  if (changes) {
    console.log(`  ✓ [${id}] ${row.title}`)
    console.log(`    ${changes}`)
    console.log(`    evidence: ${evidence}\n`)
    updated++
  } else {
    console.log(`  ~ [${id}] ${row.title} — already up to date\n`)
  }
}

console.log(`Done. ${updated} updated, ${skipped} skipped.`)
