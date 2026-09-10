import { sql, desc } from 'drizzle-orm';
import { db } from '../db/client';
import {
  catalogueEntries,
  scholarships,
  researchPrograms,
  publicationRequests,
} from '../db/schema';
import scholarshipData from '../../data/scholarships.json';
import programData from '../../data/research-programs.json';
import dispositions from '../../data/matching-legacy-dispositions.json';
import { reconcileDatabase, type LegacyDisposition, type LegacyRecord } from './catalogue';
import { normalizeOpportunity } from './normalize';

export async function matchingCoverage() {
  const [rows, oldScholarships, oldPrograms, requests] = await db.batch([
    db.select().from(catalogueEntries),
    db
      .select({
        kind: sql<'scholarship'>`'scholarship'`,
        legacyId: scholarships.id,
        publicId: scholarships.publicId,
        title: scholarships.title,
      })
      .from(scholarships),
    db
      .select({
        kind: sql<'program'>`'program'`,
        legacyId: researchPrograms.id,
        publicId: researchPrograms.publicId,
        title: researchPrograms.name,
      })
      .from(researchPrograms),
    db
      .select({ status: publicationRequests.status, commitSha: publicationRequests.commitSha })
      .from(publicationRequests)
      .orderBy(desc(publicationRequests.createdAt))
      .limit(1),
  ]);
  const report = await reconcileDatabase(
    { scholarship: scholarshipData, program: programData },
    rows,
    [...oldScholarships, ...oldPrograms] as LegacyRecord[],
    dispositions as LegacyDisposition[],
    requests[0]?.status ?? 'idle'
  );
  const queue = rows
    .filter((r) => r.draft || r.published)
    .map((row) => {
      const document = row.draft ?? row.published!;
      try {
        const opportunity = normalizeOpportunity(document, row.kind);
        return {
          key: opportunity.key,
          kind: row.kind,
          id: row.publicId,
          title: opportunity.title,
          revision: row.revision,
          hasDraft: !!row.draft,
          deleted: row.deleted,
          issues: opportunity.issues,
          deadline: opportunity.matching.availability.closesOn,
        };
      } catch {
        return {
          key: `${row.kind}:${row.publicId}`,
          kind: row.kind,
          id: row.publicId,
          title: String(document.title ?? document.name),
          revision: row.revision,
          hasDraft: !!row.draft,
          deleted: row.deleted,
          issues: ['invalid-matching-contract'],
          deadline: null,
        };
      }
    })
    .sort(
      (a, b) =>
        Number(b.issues.includes('invalid-matching-contract')) -
          Number(a.issues.includes('invalid-matching-contract')) ||
        (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
        a.key.localeCompare(b.key)
    );
  return { ...report, publication: requests[0] ?? null, queue };
}
export type Coverage = Awaited<ReturnType<typeof matchingCoverage>>;
