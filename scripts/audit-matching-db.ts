import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { reconcileDatabase } from '../src/lib/matching/catalogue.ts';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required; this audit performs SELECTs only');
const sql = neon(process.env.DATABASE_URL);
const [records, legacy, requests] = await sql.transaction(
  [
    sql`SELECT kind,public_id AS "publicId",published,draft,deleted,revision FROM catalogue_entries`,
    sql`SELECT 'scholarship' AS kind,id AS "legacyId",public_id AS "publicId",title FROM scholarships UNION ALL SELECT 'program' AS kind,id AS "legacyId",public_id AS "publicId",name AS title FROM research_programs`,
    sql`SELECT status FROM publication_requests ORDER BY created_at DESC LIMIT 1`,
  ],
  { isolationLevel: 'RepeatableRead', readOnly: true }
);
const report = await reconcileDatabase(
  {
    scholarship: read('src/data/scholarships.json'),
    program: read('src/data/research-programs.json'),
  },
  records as Parameters<typeof reconcileDatabase>[1],
  legacy as Parameters<typeof reconcileDatabase>[2],
  read('src/data/matching-legacy-dispositions.json'),
  requests?.[0]?.status ?? 'idle'
);
console.log(
  JSON.stringify(
    process.argv.includes('--details')
      ? report
      : {
          catalogueHash: report.catalogueHash,
          comparison: report.comparison,
          publicationStatus: report.publicationStatus,
          counts: report.counts,
          canonicalRecords: report.records.length,
          legacyRecords: report.legacy.length,
          archivedLegacy: report.legacy.filter((r) => r.state === 'archived'),
          drift: report.drift,
        },
    null,
    2
  )
);
if (report.comparison === 'drift') process.exitCode = 1;
