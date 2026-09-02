#!/usr/bin/env node
/**
 * Pre-send gate for counsellor and district outreach.
 *
 * Two things go wrong with a cold send to five hundred schools, and both have
 * gone wrong here before. This refuses to produce a send list when either is
 * present, because a rule written in a plan is not a rule when the list is a
 * 524-row spreadsheet.
 *
 *   1. Provenance. The CASL basis for this outreach is implied consent under
 *      s.10(9)(b): an address conspicuously published by the recipient, with
 *      no statement refusing such messages, and a message relevant to their
 *      role. The burden of proving that sits with the sender, so a row whose
 *      address came from nowhere recordable is unmailable, not merely
 *      undocumented. Two years on, when the page has been redesigned, the
 *      saved source URL is the whole of the evidence. See docs/compliance.md.
 *
 *   2. Counts. Anything said about the size of the directory is a
 *      representation under the Competition Act, not marketing licence, and a
 *      cold email to 511 schools gets forwarded. The catalog total, the
 *      Alberta-scoped total, and the number open to apply today are three
 *      different numbers, and outreach copy has previously used the wrong one
 *      of the three. This prints all of them from src/data so the template can
 *      be filled from output rather than from memory.
 *
 * The contact CSVs are gitignored and stay that way: this reads them, counts
 * them, and prints addresses only under `list`, which is for piping into a
 * mail merge and never into a commit.
 *
 *   tsx scripts/check-outreach.ts check          Gate. Non-zero if anything fails.
 *   tsx scripts/check-outreach.ts counts         Just the send-time numbers.
 *   tsx scripts/check-outreach.ts list           Mailable rows, TSV, to stdout.
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { enrichScholarships } from '../src/lib/enrich.ts'
import { getScholarshipStatus, regionMatches } from '../src/lib/list-core.ts'
import { programIsListed } from '../src/lib/status.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const OUTREACH = join(root, 'outreach')

/* ── CSV ───────────────────────────────────────────────────────────────── */

/**
 * RFC 4180 enough for these two files. The naive split(',') is wrong here and
 * silently so: `counsellor_emails` holds comma-separated lists inside quotes,
 * so a split would shift every column after it and hand the provenance check a
 * fragment of an email address where it expected a URL.
 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  const [header, ...body] = rows.filter(r => r.some(c => c.trim() !== ''))
  if (!header) return []
  return body.map(cells =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])),
  )
}

function readCsv(name: string): Record<string, string>[] {
  const path = join(OUTREACH, `${name}.csv`)
  if (!existsSync(path)) {
    console.error(`Missing ${path}. The contact sheets are gitignored; this runs on your machine only.`)
    process.exit(2)
  }
  return parseCsv(readFileSync(path, 'utf8'))
}

/* ── Rows ──────────────────────────────────────────────────────────────── */

/** Every address on a row, from whichever of its columns hold them. */
function addressesOf(row: Record<string, string>, columns: string[]): string[] {
  const out: string[] = []
  for (const col of columns) {
    for (const part of (row[col] ?? '').split(/[,;]/)) {
      const a = part.trim().toLowerCase()
      // Not validation: the sheet is hand-assembled, and the only thing that
      // matters here is whether something address-shaped is present.
      if (a.includes('@') && a.includes('.')) out.push(a)
    }
  }
  return [...new Set(out)]
}

/**
 * Where the address was published. `counselling_page` is the better evidence
 * because it is the page that makes the message relevant to the role; the
 * school or division website is the fallback, and is still a published source.
 * A row with neither is not mailable at all.
 */
function provenanceOf(row: Record<string, string>): string | null {
  const p = (row.counselling_page ?? '').trim() || (row.website ?? '').trim()
  return p || null
}

type Row = {
  sheet: 'counsellor' | 'district'
  code: string
  name: string
  addresses: string[]
  provenance: string | null
}

function loadRows(): Row[] {
  const counsellor = readCsv('counsellor_contacts').map((r): Row => ({
    sheet: 'counsellor',
    code: r.code ?? '',
    name: r.name ?? '',
    addresses: addressesOf(r, ['counsellor_emails', 'school_email', 'other_emails']),
    provenance: provenanceOf(r),
  }))
  const district = readCsv('districts_contacts').map((r): Row => ({
    sheet: 'district',
    code: r.code ?? '',
    name: r.name ?? '',
    addresses: addressesOf(r, ['student_services', 'office_email', 'communications', 'superintendent']),
    provenance: provenanceOf(r),
  }))
  return [...counsellor, ...district]
}

/* ── Counts ────────────────────────────────────────────────────────────── */

/**
 * The three numbers that are not the same number.
 *
 * `total` is the catalog, all of it browsable. `alberta` excludes the national
 * awards and is the only one that may be called "Alberta scholarships".
 * `openToday` is what a counsellor clicking the link can actually apply to
 * this week, and is far smaller, because most of the catalog sits in a future
 * cycle for most of the year.
 *
 * Every one of these comes from the same functions the pages themselves call.
 * A first draft of this script reimplemented the open test inline and got 171
 * where the directory shows 53, and reported the raw programs array where the
 * page hides retired ones. That is precisely the failure this section exists
 * to stop, so the definitions are imported rather than restated: if the site
 * changes what "open" means, this moves with it.
 */
function counts() {
  const raw = JSON.parse(readFileSync(join(root, 'src/data/scholarships.json'), 'utf8'))
  const programs = JSON.parse(readFileSync(join(root, 'src/data/research-programs.json'), 'utf8'))
  const scholarships = enrichScholarships(raw)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alberta = scholarships.filter(s => regionMatches('Alberta-wide', s)).length
  const openToday = scholarships.filter(s => getScholarshipStatus(s) === 'active').length

  return {
    total: scholarships.length,
    alberta,
    national: scholarships.length - alberta,
    openToday,
    programs: programs.filter((p: Parameters<typeof programIsListed>[0]) => programIsListed(p, today)).length,
  }
}

function printCounts() {
  const c = counts()
  console.log('\nSend-time counts, from src/data. Use these and no others.\n')
  console.log(`  ${String(c.total).padStart(4)}  scholarships in the directory, all browsable`)
  console.log(`  ${String(c.alberta).padStart(4)}  of those are Alberta-scoped  <- the only one you may call "Alberta scholarships"`)
  console.log(`  ${String(c.national).padStart(4)}  are national awards open to Albertans`)
  console.log(`  ${String(c.openToday).padStart(4)}  are open to apply today  <- the only one you may call "open"`)
  console.log(`  ${String(c.programs).padStart(4)}  research programs`)
  console.log('\n  Not interchangeable. Saying "345 Alberta scholarships" overstates by 29,')
  console.log('  and saying "345 open" overstates by an order of magnitude.\n')
}

/* ── Gate ──────────────────────────────────────────────────────────────── */

function check(): void {
  const rows = loadRows()
  let failed = false

  const withAddress = rows.filter(r => r.addresses.length > 0)
  const noAddress = rows.filter(r => r.addresses.length === 0)

  // The real gate. Not a warning: this row cannot be mailed.
  const noProvenance = withAddress.filter(r => !r.provenance)
  if (noProvenance.length > 0) {
    failed = true
    console.error(`\nUNMAILABLE: ${noProvenance.length} row(s) hold an address with no published source.`)
    console.error('Implied consent under CASL s.10(9)(b) has to be provable by the sender.')
    console.error('Record counselling_page (or website) for each, or drop the row.\n')
    for (const r of noProvenance.slice(0, 20)) console.error(`  [${r.sheet}] ${r.code} ${r.name}`)
    if (noProvenance.length > 20) console.error(`  ... and ${noProvenance.length - 20} more`)
  }

  // One school reached twice in a wave reads as a mailing list, which is the
  // opposite of the individual, role-relevant message the consent basis rests
  // on. Cross-sheet, because a district office and its school can share one.
  const seen = new Map<string, Row[]>()
  for (const r of withAddress) {
    for (const a of r.addresses) {
      if (!seen.has(a)) seen.set(a, [])
      seen.get(a)!.push(r)
    }
  }
  const dupes = [...seen.entries()].filter(([, rs]) => rs.length > 1)
  if (dupes.length > 0) {
    failed = true
    console.error(`\nDUPLICATE: ${dupes.length} address(es) appear on more than one row.`)
    console.error('Pick one row per address before sending; the other is a second copy to the same inbox.\n')
    for (const [, rs] of dupes.slice(0, 20)) {
      console.error(`  ${rs.map(r => `[${r.sheet}] ${r.code} ${r.name}`).join('  +  ')}`)
    }
    if (dupes.length > 20) console.error(`  ... and ${dupes.length - 20} more`)
  }

  console.log('')
  console.log(`Rows:            ${rows.length}`)
  console.log(`  mailable:      ${withAddress.length - noProvenance.length}`)
  console.log(`  no address:    ${noAddress.length}  (use the contact form or a staff directory by hand)`)
  console.log(`  no provenance: ${noProvenance.length}`)
  console.log(`Unique addresses: ${seen.size}`)

  printCounts()

  if (failed) {
    console.error('FAILED. Nothing should send until the rows above are fixed.\n')
    process.exitCode = 1
  } else {
    console.log('OK. Every address carries a published source and appears once.\n')
  }
}

/**
 * The send list, for a mail merge. Addresses on stdout, so redirect it to a
 * file outside the repo, or pipe it straight into the merge tool. `outreach/`
 * is gitignored, which makes it the only safe place inside the repo.
 */
function list(): void {
  const rows = loadRows().filter(r => r.addresses.length > 0 && r.provenance)
  console.log(['sheet', 'code', 'name', 'email', 'source'].join('\t'))
  for (const r of rows) {
    for (const a of r.addresses) {
      console.log([r.sheet, r.code, r.name, a, r.provenance].join('\t'))
    }
  }
}

const mode = process.argv[2] ?? 'check'
if (mode === 'check') check()
else if (mode === 'counts') printCounts()
else if (mode === 'list') list()
else {
  console.log('Usage:')
  console.log('  tsx scripts/check-outreach.ts check    Gate; non-zero if any row is unmailable')
  console.log('  tsx scripts/check-outreach.ts counts   Send-time numbers for the template')
  console.log('  tsx scripts/check-outreach.ts list     Mailable rows as TSV')
  process.exitCode = 1
}
