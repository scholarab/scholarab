#!/usr/bin/env node
/**
 * Applies all audit-identified deletions and fixes to the JSON files.
 * Run once, then run full-sync.ts to push changes to the DB.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── SCHOLARSHIPS ─────────────────────────────────────────────────────────────

const schPath = join(__dirname, '../src/data/scholarships.json')
let sch: any[] = JSON.parse(readFileSync(schPath, 'utf8'))

const schDeletes = new Set([
  61,  // NSERC STEAM Horizon Award — program discontinued
  69,  // Stacey Levitt Memorial Award — permanently ended 2022
  115, // Jo-Anne Koch Bright Children Society — for 2nd-year+ students, not HS entrants
  139, // Alberta Federation of Shooting Sports — domain hijacked (afss.com → US aviation)
  145, // Leonard Foundation — leonardfoundation.org is an Oregon foundation, not Canadian
  161, // Dr. Martha Kostuch Memorial — pamz.ca domain dead (NXDOMAIN)
  163, // Central Alberta Co-op Scholarship — centralalbertacoop.ca dead (NXDOMAIN)
])

const schFixes: Record<number, Record<string, unknown>> = {
  12:  { url: 'https://mhpsd.ca/' },
  54:  { amount: '$1,200', notes: 'Awarded to Alberta students who win a WorldSkills provincial championship. Apply through your school or Alberta Student Aid. Amount is $1,200.' },
  63:  { amount: 'up to $20,000', notes: 'For low-income, rural, and Indigenous applicants to UCalgary undergraduate programs. Award is $5,000/year renewable for up to 4 years (up to $20,000 total). Apply through UCalgary Awards Hub.' },
  86:  { audience: 'Students with the surname "Mah" entering post-secondary in Canada', notes: 'Open to students with the surname "Mah" of any background. Offered by the Mah Society of Edmonton. Contact the Society directly for application details.' },
  128: { url: 'https://www.era.ca/' },
  147: { url: 'https://www.ecf.ca/' },
  159: { url: 'https://canada.mensa.org/scholarship/' },
}

const beforeSch = sch.length
sch = sch.filter(s => !schDeletes.has(s.id))
sch = sch.map(s => schFixes[s.id] ? { ...s, ...schFixes[s.id] } : s)
writeFileSync(schPath, JSON.stringify(sch, null, 2) + '\n', 'utf8')
console.log(`Scholarships: ${beforeSch} → ${sch.length} (removed ${beforeSch - sch.length}, fixed ${Object.keys(schFixes).length})`)

// ── PROGRAMS ─────────────────────────────────────────────────────────────────

const progPath = join(__dirname, '../src/data/research-programs.json')
let prog: any[] = JSON.parse(readFileSync(progPath, 'utf8'))

const progDeletes = new Set([
  38,  // Alberta Envirothon — albertaenvirothon.ca domain dead (NXDOMAIN)
  47,  // UCalgary Minds in Motion HS — "Minds in Motion" is an elementary program; no HS version verifiable
  51,  // CanSat Canada — cansatcanada.ca domain dead (NXDOMAIN)
  57,  // UAlberta HSMUN — hsmun.ca domain dead (NXDOMAIN)
  62,  // Quantum City — quantumcity.ca domain dead (NXDOMAIN)
  65,  // AHSMC — snap.math.ualberta.ca domain dead (NXDOMAIN)
  66,  // JA Alberta Company Program — jaalberta.ca domain dead (NXDOMAIN)
  76,  // League of Innovators — domain for sale, organization defunct
  77,  // Ignite Fair — ignitefair.ca domain dead (NXDOMAIN)
  85,  // Youth Innovation Showcase — youthinnovationshowcase.ca domain dead
  86,  // Atlas Fellowship — program officially discontinued Nov 2023
  88,  // CAREERS ICT Internships — careers-next-gen.com NXDOMAIN
  96,  // APEX Youth Innovation — hat.ca dead, program unverifiable
  99,  // CAREERS RAP Southeast AB — same dead domain as 88
  103, // HYRS Digital Health Track — near-duplicate of ID 1; same URL/application
  105, // Caribou Mathematics — program permanently closed after founder's death
  113, // Alberta Youth Parliament — domain dead (both www and bare)
])

const progFixes: Record<number, Record<string, unknown>> = {
  14:  { provider: 'Verna J. Kirkness Foundation (multiple Canadian universities)' },
  29:  { url: 'https://cwf-fcf.org/' },
  31:  { url: 'https://perimeterinstitute.ca/education/students/' },
  32:  { name: 'Quantum School for Young Students (QSYS)', description: 'Intensive week-long dive into quantum information science and cryptography at IQC, University of Waterloo (formerly known as QCSYS, now rebranded QSYS). Combines lectures, hands-on labs, and direct interaction with quantum computing researchers.' },
  34:  { url: 'https://temertymedicine.utoronto.ca/' },
  35:  { url: 'https://www.neuroscience.ca/en/brain-bee' },
  40:  { provider: 'HOSA – Future Health Professionals (International)', description: 'International organization supporting health science students (no separate Canadian entity). Students conduct deep research to compete in events spanning biomedical laboratory science, epidemiology, and medical law. Canadian students can form local chapters at their own high schools and compete at HOSA international levels.' },
  48:  { url: 'https://www.apega.ca/about-apega/outreach' },
  55:  { url: 'https://www.nyas.org/programs/junior-academy/' },
  58:  { url: 'https://cdnmedhall.ca/education/' },
  61:  { url: 'https://www.amii.ca/' },
  64:  { url: 'https://www.mhc.ab.ca/' },
  70:  { url: 'http://ssep.ncesse.org/' },
  71:  { url: 'https://cheminst.ca/national-chemistry-olympiad/' },
  72:  { url: 'https://cemc.uwaterloo.ca/contests/sir-isaac-newton/' },
  74:  { name: 'Agriculture in the Classroom Canada (AITC)', url: 'https://www.aitc-canada.ca/', provider: 'Agriculture in the Classroom Canada (AITC)' },
  102: { url: 'https://www.albertahealthservices.ca/volunteers.asp' },
  107: { url: 'https://triumf.ca/education/k-12/' },
  109: { url: 'https://www.oceannetworks.ca/learning/' },
}

const beforeProg = prog.length
prog = prog.filter(p => !progDeletes.has(p.id))
prog = prog.map(p => progFixes[p.id] ? { ...p, ...progFixes[p.id] } : p)
writeFileSync(progPath, JSON.stringify(prog, null, 2) + '\n', 'utf8')
console.log(`Programs: ${beforeProg} → ${prog.length} (removed ${beforeProg - prog.length}, fixed ${Object.keys(progFixes).length})`)
