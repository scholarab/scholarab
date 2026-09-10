#!/usr/bin/env node
/** Mirror published JSON without touching drafts. --dry-run is read-only even
 * with --prune. Legacy tables retain their IDs and receive explicit public IDs. */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { validateCatalogue, type CatalogueKind } from '../src/lib/catalogue.ts';
import { planCatalogueSync } from '../src/lib/catalogue-sync.ts';

const dry = process.argv.includes('--dry-run');
const prune = process.argv.includes('--prune');
const url = process.env.DATABASE_URL;
if (!url) {
  console.log('DATABASE_URL not set. Nothing to sync.');
  process.exit(0);
}
// Parse both complete inputs before any database work.
const datasets = {
  scholarship: validateCatalogue(
    JSON.parse(readFileSync(new URL('../src/data/scholarships.json', import.meta.url), 'utf8')),
    'scholarship'
  ),
  program: validateCatalogue(
    JSON.parse(
      readFileSync(new URL('../src/data/research-programs.json', import.meta.url), 'utf8')
    ),
    'program'
  ),
};
const sql = neon(url);
const existing = await sql`SELECT kind, public_id, published, draft FROM catalogue_entries`;
const plan = planCatalogueSync(
  datasets,
  existing as Parameters<typeof planCatalogueSync>[1],
  prune
);
console.log(
  `${dry ? 'Would apply' : 'Plan'}: ${plan.upserts.length} published updates, ${plan.removals.length} removals; drafts preserved`
);
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
const mappings: { kind: CatalogueKind; id: number; publicId: number }[] = [];
for (const [kind, table, name] of [
  ['scholarship', 'scholarships', 'title'],
  ['program', 'research_programs', 'name'],
] as const) {
  const rows = await sql.query(`SELECT id, public_id, ${name} as name FROM ${table}`);
  for (const document of datasets[kind]) {
    const already = rows.find((r) => r.public_id === document.id);
    if (already) continue; // Once assigned, identity survives renames.
    const candidates = rows.filter(
      (r) => r.public_id == null && key(r.name) === key(String(document[name]))
    );
    if (candidates.length > 1)
      throw new Error(`${kind} ${document.id}: ambiguous legacy identity; review before syncing`);
    if (candidates[0]) mappings.push({ kind, id: candidates[0].id, publicId: document.id });
  }
}
if (dry) {
  console.log(`Would map ${mappings.length} legacy IDs; no writes performed`);
  process.exit(0);
}
const queries = [];
if (plan.upserts.length)
  queries.push(sql`
  INSERT INTO catalogue_entries (kind, public_id, published)
  SELECT x.kind, x.public_id, x.document FROM jsonb_to_recordset(${JSON.stringify(plan.upserts)}::jsonb)
    AS x(kind text, public_id integer, document jsonb)
  ON CONFLICT (kind, public_id) DO UPDATE SET
    published = excluded.published,
    revision = catalogue_entries.revision + CASE WHEN catalogue_entries.draft IS NULL THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE catalogue_entries.published IS DISTINCT FROM excluded.published`);
if (plan.removals.length)
  queries.push(sql`
  UPDATE catalogue_entries c SET published=NULL,revision=revision+1,updated_at=now() FROM jsonb_to_recordset(${JSON.stringify(plan.removals)}::jsonb) AS x(kind text, public_id integer)
  WHERE c.kind=x.kind AND c.public_id=x.public_id AND c.draft IS NULL AND NOT c.deleted`);
for (const [kind, table] of [
  ['scholarship', 'scholarships'],
  ['program', 'research_programs'],
] as const) {
  const mapped = mappings.filter((m) => m.kind === kind);
  if (mapped.length)
    queries.push(
      sql.query(
        `UPDATE ${table} t SET public_id=x."publicId" FROM jsonb_to_recordset($1::jsonb) AS x(id integer,"publicId" integer) WHERE t.id=x.id AND t.public_id IS NULL`,
        [JSON.stringify(mapped)]
      )
    );
}
if (queries.length) await sql.transaction(queries);
// No direct updates to legacy content: it is retained as historical data.
console.log(`Applied atomically; ${mappings.length} legacy identities mapped`);
