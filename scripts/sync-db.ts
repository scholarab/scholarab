#!/usr/bin/env node
/**
 * Push src/data/*.json into the Neon database that backs the admin panel.
 *
 * Why this exists: builds read the JSON files and the admin panel reads the
 * DB, and until 2026-09-03 nothing carried new listings from one to the other.
 * scripts/auto-expire.ts syncs the DB, but only by flipping `active` on rows
 * that are already there, so every listing added to JSON after the DB was
 * seeded simply never appeared in the admin. By the time this was written the
 * admin showed 155 scholarships against 345 in JSON, and every one of the 119
 * rows the two did share had drifted on at least one field.
 *
 * Direction is one way on purpose. JSON is the source of truth for the site
 * (npm run build pins DATABASE_URL= so a build cannot read the DB), so the DB
 * is a mirror for the editing UI. Anything typed into the admin that is not
 * also in JSON never reaches the public site, and this script will overwrite
 * it on the next run.
 *
 *   npx tsx scripts/sync-db.ts             # apply
 *   npx tsx scripts/sync-db.ts --dry-run   # report only
 *
 * Rows in the DB with no JSON counterpart are left alone rather than deleted:
 * they are retired listings and a few pre-existing duplicates, and deciding
 * which of those should come back into JSON is a human call. Run with
 * --report-extras to list them.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DRY = process.argv.includes('--dry-run');
const REPORT_EXTRAS = process.argv.includes('--report-extras');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('DATABASE_URL not set. Nothing to sync.');
  process.exit(0);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(dbUrl);

/**
 * Identity for matching a JSON row to a DB row.
 *
 * Punctuation is stripped rather than compared. The 2026-08-26 em dash purge
 * renamed listings in JSON without touching the DB, so the same award exists
 * as "HYRS — University of Alberta" there and "HYRS: University of Alberta"
 * here. Matching on the raw title treats the new spelling as a new listing and
 * inserts a third copy, which is how the DB ended up with duplicate HYRS rows
 * in the first place.
 */
const key = (s: string): string =>
  (s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

const nn = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

/**
 * When one key maps to several DB rows, the active row is the survivor of a
 * rename and its twin is the stale copy. Update the survivor and leave the
 * twin for a human, so a sync never silently picks the dead row.
 */
const pick = <T extends { id: number; active: boolean | null }>(rows: T[]): T => {
  // Callers only reach this with a group() bucket, which is never empty.
  const sorted = rows.slice().sort((a, b) => Number(b.active) - Number(a.active) || b.id - a.id);
  return sorted[0] as T;
};

const group = <T>(rows: T[], name: (r: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(name(r));
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return m;
};

interface Counts { insert: number; update: number; skip: number; twins: number }

type ScholarshipRow = { id: number; title: string; active: boolean | null } & Record<string, unknown>;
type ProgramRow = { id: number; name: string; active: boolean | null } & Record<string, unknown>;

/**
 * Only write when something actually changed.
 *
 * The admin list is ordered by updated_at DESC, so an unconditional UPDATE on
 * every row would stamp the whole table with one timestamp on each nightly run
 * and destroy the "what did I touch recently" ordering the panel depends on.
 */
const differs = (cur: Record<string, unknown>, want: Record<string, unknown>): boolean =>
  Object.entries(want).some(([k, v]) => {
    const a = cur[k];
    if (k === 'eligibility') return stable(a) !== stable(v);
    if (typeof v === 'boolean') return Boolean(a) !== v;
    return String(a ?? '') !== String(v ?? '');
  });

/**
 * Key-sorted JSON, because Postgres stores jsonb with its own key order and
 * hands it back reordered. A plain JSON.stringify comparison therefore reports
 * every eligibility object as changed and rewrites all 345 rows on every run.
 */
function stable(v: unknown): string {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.fromEntries(
        Object.entries(x as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, val]) => [k, walk(val)]),
      );
    }
    return x;
  };
  return JSON.stringify(walk(v ?? null));
}

// ── scholarships ────────────────────────────────────────────────────────────
const scholarships = JSON.parse(
  readFileSync(join(root, 'src/data/scholarships.json'), 'utf8'),
) as Record<string, unknown>[];

const sRows = (await sql`
  SELECT id, title, amount, deadline, open_date, audience, url, category, last_verified,
         region, notes, apply_via_guidance, active, eligibility
    FROM scholarships`) as ScholarshipRow[];
const sByKey = group(sRows, r => r.title);
const s: Counts = { insert: 0, update: 0, skip: 0, twins: 0 };

for (const j of scholarships) {
  const title = j.title as string;
  const w = {
    amount: String(j.amount ?? ''),
    deadline: nn(j.deadline as string | undefined),
    openDate: nn(j.openDate as string | undefined),
    audience: nn(j.audience as string | undefined),
    url: j.url as string,
    category: nn(j.category as string | undefined),
    lastVerified: nn(j.lastVerified as string | undefined),
    region: nn(j.region as string | undefined),
    notes: nn(j.notes as string | undefined),
    applyViaGuidance: (j.applyViaGuidance as boolean | undefined) ?? false,
    active: (j.active as boolean | undefined) ?? true,
    eligibility: nn(j.eligibility),
  };
  const cands = sByKey.get(key(title));
  if (!cands) {
    s.insert++;
    if (!DRY) {
      await sql`INSERT INTO scholarships
        (title, amount, deadline, open_date, audience, url, category, last_verified,
         region, notes, apply_via_guidance, active, eligibility, updated_at)
        VALUES (${title}, ${w.amount}, ${w.deadline}, ${w.openDate}, ${w.audience}, ${w.url},
                ${w.category}, ${w.lastVerified}, ${w.region}, ${w.notes},
                ${w.applyViaGuidance}, ${w.active}, ${w.eligibility as never}, now())`;
    }
  } else {
    const cur = pick(cands);
    s.twins += cands.length - 1;
    // Compare against the DB's own column names, not the camelCase field names.
    const cmp = {
      title, amount: w.amount, deadline: w.deadline, open_date: w.openDate, audience: w.audience,
      url: w.url, category: w.category, last_verified: w.lastVerified, region: w.region,
      notes: w.notes, apply_via_guidance: w.applyViaGuidance, active: w.active,
      eligibility: w.eligibility,
    };
    if (!differs(cur, cmp)) { s.skip++; continue; }
    s.update++;
    if (!DRY) {
      await sql`UPDATE scholarships SET
        title = ${title}, amount = ${w.amount}, deadline = ${w.deadline}, open_date = ${w.openDate},
        audience = ${w.audience}, url = ${w.url}, category = ${w.category},
        last_verified = ${w.lastVerified}, region = ${w.region}, notes = ${w.notes},
        apply_via_guidance = ${w.applyViaGuidance}, active = ${w.active},
        eligibility = ${w.eligibility as never}, updated_at = now()
        WHERE id = ${cur.id}`;
    }
  }
}

// ── research programs ───────────────────────────────────────────────────────
const programs = JSON.parse(
  readFileSync(join(root, 'src/data/research-programs.json'), 'utf8'),
) as Record<string, unknown>[];

const pRows = (await sql`
  SELECT id, name, category, provider, grades, duration, paid, stipend, location,
         eligibility, deadline, url, description, last_verified, active
    FROM research_programs`) as ProgramRow[];
const pByKey = group(pRows, r => r.name);
const p: Counts = { insert: 0, update: 0, skip: 0, twins: 0 };

for (const j of programs) {
  const name = j.name as string;
  const w = {
    category: nn(j.category as string | undefined),
    provider: nn(j.provider as string | undefined),
    grades: nn(j.grades as string | undefined),
    duration: nn(j.duration as string | undefined),
    paid: (j.paid as boolean | undefined) ?? false,
    stipend: nn(j.stipend as string | undefined),
    location: nn(j.location as string | undefined),
    eligibility: nn(j.eligibility as string | undefined),
    deadline: nn(j.deadline as string | undefined),
    url: j.url as string,
    description: nn(j.description as string | undefined),
    lastVerified: nn(j.lastVerified as string | undefined),
    // Mirrors loadPrograms: a missing `active` means true, and letting
    // undefined through is what left the quiz's program results empty in
    // production for a month in 2026-07.
    active: (j.active as boolean | undefined) ?? true,
  };
  const cands = pByKey.get(key(name));
  if (!cands) {
    p.insert++;
    if (!DRY) {
      await sql`INSERT INTO research_programs
        (name, category, provider, grades, duration, paid, stipend, location,
         eligibility, deadline, url, description, last_verified, active, updated_at)
        VALUES (${name}, ${w.category}, ${w.provider}, ${w.grades}, ${w.duration}, ${w.paid},
                ${w.stipend}, ${w.location}, ${w.eligibility}, ${w.deadline}, ${w.url},
                ${w.description}, ${w.lastVerified}, ${w.active}, now())`;
    }
  } else {
    const cur = pick(cands);
    p.twins += cands.length - 1;
    const cmp = {
      name, category: w.category, provider: w.provider, grades: w.grades, duration: w.duration,
      paid: w.paid, stipend: w.stipend, location: w.location, eligibility: w.eligibility,
      deadline: w.deadline, url: w.url, description: w.description,
      last_verified: w.lastVerified, active: w.active,
    };
    if (!differs(cur, cmp)) { p.skip++; continue; }
    p.update++;
    if (!DRY) {
      await sql`UPDATE research_programs SET
        name = ${name}, category = ${w.category}, provider = ${w.provider}, grades = ${w.grades},
        duration = ${w.duration}, paid = ${w.paid}, stipend = ${w.stipend}, location = ${w.location},
        eligibility = ${w.eligibility}, deadline = ${w.deadline}, url = ${w.url},
        description = ${w.description}, last_verified = ${w.lastVerified}, active = ${w.active},
        updated_at = now()
        WHERE id = ${cur.id}`;
    }
  }
}

const label = DRY ? 'would' : 'did';
console.log(`scholarships: ${label} insert ${s.insert}, update ${s.update}, leave ${s.skip} unchanged (${s.twins} stale twin(s) left alone)`);
console.log(`programs:     ${label} insert ${p.insert}, update ${p.update}, leave ${p.skip} unchanged (${p.twins} stale twin(s) left alone)`);

if (REPORT_EXTRAS) {
  const jsonS = new Set(scholarships.map(x => key(x.title as string)));
  const jsonP = new Set(programs.map(x => key(x.name as string)));
  const extraS = ((await sql`SELECT id, title, active FROM scholarships`) as typeof sRows)
    .filter(r => !jsonS.has(key(r.title)));
  const extraP = ((await sql`SELECT id, name, active FROM research_programs`) as typeof pRows)
    .filter(r => !jsonP.has(key(r.name)));
  console.log(`\nDB rows with no JSON counterpart (not touched by this script):`);
  console.log(`  scholarships: ${extraS.length}`);
  for (const r of extraS) console.log(`    [${r.id}] ${r.active ? 'active  ' : 'inactive'} ${r.title}`);
  console.log(`  programs: ${extraP.length}`);
  for (const r of extraP) console.log(`    [${r.id}] ${r.active ? 'active  ' : 'inactive'} ${r.name}`);
}
