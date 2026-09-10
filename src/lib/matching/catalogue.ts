import { stableJson, validateCatalogue, type CatalogueKind, type Document } from '../catalogue';
import { identity, normalizeOpportunity, type Opportunity } from './normalize';
export async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(value)));
  return Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, '0')).join('');
}
export type Snapshot = { scholarship: Document[]; program: Document[] };
export interface ManifestEntry {
  key: string;
  recordHash: string;
  inputHash: string;
  detailPath: string;
  active: boolean;
}
export interface Manifest {
  version: 1;
  catalogueHash: string;
  assetHash: string;
  counts: { scholarship: number; program: number };
  entries: ManifestEntry[];
}
export function assertIdentitySets(expected: string[], actual: string[], label: string) {
  const wanted = new Set(expected),
    got = new Set(actual);
  if (wanted.size !== expected.length || got.size !== actual.length)
    throw new Error(`${label}: duplicate identities`);
  const missing = expected.filter((x) => !got.has(x)),
    extra = actual.filter((x) => !wanted.has(x));
  if (missing.length || extra.length)
    throw new Error(`${label}: missing [${missing.join(',')}], unexpected [${extra.join(',')}]`);
}
export async function buildMatchingCatalogue(
  snapshot: Snapshot
): Promise<{ manifest: Manifest; opportunities: Opportunity[] }> {
  const records = (['scholarship', 'program'] as const).flatMap((kind) =>
    validateCatalogue(snapshot[kind], kind).map((row) => ({ kind, row }))
  );
  records.sort((a, b) => identity(a.kind, a.row.id).localeCompare(identity(b.kind, b.row.id)));
  const opportunities = records.map(({ row, kind }) => normalizeOpportunity(row, kind));
  assertIdentitySets(
    records.map(({ row, kind }) => identity(kind, row.id)),
    opportunities.map((o) => o.key),
    'Matching input'
  );
  const entries = await Promise.all(
    records.map(async ({ row }, i) => ({
      key: opportunities[i]!.key,
      recordHash: await digest(row),
      inputHash: await digest(opportunities[i]),
      detailPath: opportunities[i]!.detailPath,
      active: opportunities[i]!.active,
    }))
  );
  const manifest: Manifest = {
    version: 1,
    catalogueHash: await digest(entries.map(({ key, recordHash }) => ({ key, recordHash }))),
    assetHash: await digest(opportunities),
    counts: { scholarship: snapshot.scholarship.length, program: snapshot.program.length },
    entries,
  };
  return { manifest, opportunities };
}
export async function verifyMatchingCatalogue(
  snapshot: Snapshot,
  manifest: Manifest,
  opportunities: Opportunity[]
) {
  const expected = await buildMatchingCatalogue(snapshot);
  assertIdentitySets(
    expected.manifest.entries.map((e) => e.key),
    manifest.entries.map((e) => e.key),
    'Manifest'
  );
  assertIdentitySets(
    manifest.entries.map((e) => e.key),
    opportunities.map((o) => o.key),
    'Matching asset'
  );
  if (
    stableJson(expected.manifest) !== stableJson(manifest) ||
    (await digest(opportunities)) !== manifest.assetHash
  )
    throw new Error('Matching catalogue record/content hashes do not agree');
}
export interface DatabaseRecord {
  kind: CatalogueKind;
  publicId: number;
  published: Document | null;
  draft: Document | null;
  deleted: boolean;
  revision: number;
}
export interface LegacyRecord {
  kind: CatalogueKind;
  legacyId: number;
  publicId: number | null;
  title: string;
}
export interface LegacyDisposition {
  kind: CatalogueKind;
  legacyId: number;
  title: string;
  disposition: 'archived';
  reason: string;
}
export async function reconcileDatabase(
  snapshot: Snapshot,
  rows: DatabaseRecord[],
  legacy: LegacyRecord[],
  dispositions: LegacyDisposition[],
  publicationStatus = 'idle'
) {
  const expected = await buildMatchingCatalogue(snapshot);
  const snapshotHashes = new Map(expected.manifest.entries.map((e) => [e.key, e.recordHash]));
  const seen = new Set<string>();
  const drift: string[] = [];
  const records = await Promise.all(
    rows.map(async (row) => {
      const key = identity(row.kind, row.publicId);
      if (seen.has(key)) drift.push(`duplicate:${key}`);
      seen.add(key);
      const state = row.published ? 'published' : row.draft ? 'draft-only' : 'archived';
      if (row.published) {
        if (row.published.id !== row.publicId) drift.push(`embedded-id:${key}`);
        if ((await digest(row.published)) !== snapshotHashes.get(key))
          drift.push(`published-content:${key}`);
      } else if (snapshotHashes.has(key)) drift.push(`missing-published:${key}`);
      if (row.draft && row.draft.id !== row.publicId) drift.push(`draft-id:${key}`);
      let previewIssue: string | null = null;
      if (row.draft) {
        try {
          normalizeOpportunity(row.draft, row.kind);
        } catch {
          previewIssue = 'invalid-draft-matching';
        }
      }
      return {
        key,
        state,
        revision: row.revision,
        hasDraft: !!row.draft,
        pendingDeletion: row.deleted,
        previewIssue,
      };
    })
  );
  for (const key of snapshotHashes.keys())
    if (!seen.has(key)) drift.push(`missing-canonical:${key}`);
  const legacyMappings = new Set<string>();
  const history = legacy.map((row) => {
    const key = identity(row.kind, row.legacyId);
    const archived = dispositions.find(
      (d) => d.kind === row.kind && d.legacyId === row.legacyId && d.title === row.title
    );
    if (row.publicId != null) {
      const publicKey = identity(row.kind, row.publicId);
      if (!seen.has(publicKey) || legacyMappings.has(publicKey))
        drift.push(`legacy-mapping:${key}`);
      legacyMappings.add(publicKey);
      return { ...row, state: 'mapped', key: publicKey };
    }
    if (!archived) drift.push(`unresolved-legacy:${key}`);
    return {
      ...row,
      state: archived ? 'archived' : 'unresolved',
      reason: archived?.reason ?? 'Review required',
    };
  });
  const inFlight =
    ['queued', 'processing', 'committed'].includes(publicationStatus) &&
    drift.every((issue) => /^(published-content|missing-published|missing-canonical):/.test(issue));
  return {
    catalogueHash: expected.manifest.catalogueHash,
    publicationStatus,
    comparison: drift.length ? (inFlight ? 'in-flight-difference' : 'drift') : 'aligned',
    drift,
    records,
    legacy: history,
    counts: expected.manifest.counts,
  };
}
