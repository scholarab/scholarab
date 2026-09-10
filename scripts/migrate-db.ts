#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const check = process.argv.includes('--check');
const bootstrap = process.argv.includes('--bootstrap');
// These maintained SQL files use no procedural/dollar-quoted bodies. Reject
// them rather than incorrectly splitting a future procedural migration.
function statements(path: string) {
  const source = readFileSync(path, 'utf8');
  if (/\$[a-z_]*\$/i.test(source))
    throw new Error('Procedural SQL requires an explicit migration runner update');
  return source
    .replace(/^\s*--.*$/gm, '')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
const [tables] =
  await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`;
if (bootstrap) {
  if (check || tables!.n !== 0)
    throw new Error('--bootstrap requires an empty database and cannot be combined with --check');
  await sql.transaction(statements('drizzle/bootstrap.sql').map((s) => sql.query(s)));
}
const [ledger] = await sql`SELECT to_regclass('public.schema_migrations') AS name`;
const applied = ledger!.name ? await sql`SELECT name,checksum FROM schema_migrations` : [];
const files = readdirSync('drizzle/migrations')
  .filter((f) => /^\d+.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= 13)
  .sort();
for (const file of files) {
  const path = `drizzle/migrations/${file}`;
  const checksum = createHash('sha256').update(readFileSync(path)).digest('hex');
  const prior = applied.find((r) => r.name === file);
  if (prior && prior.checksum !== checksum)
    throw new Error(`${file}: applied migration checksum differs`);
  if (prior) {
    console.log(`PASS ${file}`);
    continue;
  }
  if (check) throw new Error(`${file}: not applied`);
  const queries = statements(path).map((s) => sql.query(s));
  queries.push(sql`INSERT INTO schema_migrations (name,checksum) VALUES (${file},${checksum})`);
  await sql.transaction(queries);
  console.log(`APPLIED ${file}`);
}
// Read-only drift checks cover the runtime-critical types and indexes. Older
// audit/deploy/mutation logs are deliberately retained as historical objects.
const timestamps =
  await sql`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='subscribers' AND column_name IN ('created_at','confirmed_at','confirm_sent_at')`;
if (timestamps.length !== 3 || timestamps.some((r) => r.data_type !== 'timestamp with time zone'))
  throw new Error('Subscriber timestamp schema drift');
const indexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname='public'`;
for (const name of [
  'subscribers_item_idx',
  'subscribers_unconfirmed_idx',
  'catalogue_updated_idx',
  'catalogue_name_unique',
  'publication_one_pending',
  'mail_deliveries_updated_idx',
])
  if (!indexes.some((r) => r.indexname === name)) throw new Error(`Missing index: ${name}`);
console.log('PASS runtime schema checks');
