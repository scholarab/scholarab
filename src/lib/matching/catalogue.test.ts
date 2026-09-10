// @vitest-environment node
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildMatchingCatalogue,
  verifyMatchingCatalogue,
  assertIdentitySets,
  reconcileDatabase,
} from './catalogue';
import { legacyMatching, normalizeOpportunity } from './normalize';
import { matchingSchema } from './schema';
import { resolveEntity, schoolBoardEntities } from './aliases';
import { applyPublication, validateCatalogue } from '../catalogue';
import { planCatalogueSync } from '../catalogue-sync';
const scholarship = {
  id: 1,
  title: 'Award',
  url: 'https://example.com',
  eligibility: { minAge: 18, maxAge: 20, minAverage: 85 },
  active: false,
  openDate: '2027-01-01',
  deadline: '2027-02-01',
};
const program = {
  id: 1,
  name: 'Program',
  url: 'https://example.com/program',
  eligibility: 'Ages 16–18; nomination required',
};
const snapshot = { scholarship: [scholarship], program: [program] };
it('connects both kinds including inactive and future opportunities, with exact hashes', async () => {
  const bundle = await buildMatchingCatalogue(snapshot);
  expect(bundle.manifest.counts).toEqual({ scholarship: 1, program: 1 });
  expect(bundle.opportunities.map((o) => o.key)).toEqual(['program:1', 'scholarship:1']);
  expect(bundle.opportunities[1]).toMatchObject({ active: false, legacyOpenDate: '2027-01-01' });
  await verifyMatchingCatalogue(snapshot, bundle.manifest, bundle.opportunities);
  const altered = structuredClone(bundle);
  altered.opportunities[0]!.title = 'tampered';
  await expect(
    verifyMatchingCatalogue(snapshot, altered.manifest, altered.opportunities)
  ).rejects.toThrow('hashes');
  const changed = { ...snapshot, program: [{ ...program, name: 'Renamed' }] };
  await expect(
    verifyMatchingCatalogue(changed, bundle.manifest, bundle.opportunities)
  ).rejects.toThrow('hashes');
});
it('rejects omissions, duplicates, malformed IDs, and swapped counts', async () => {
  expect(() =>
    assertIdentitySets(['scholarship:1', 'program:1'], ['scholarship:1', 'scholarship:1'], 'test')
  ).toThrow('duplicate');
  expect(() => assertIdentitySets(['scholarship:1'], ['program:1'], 'test')).toThrow('missing');
  await expect(
    buildMatchingCatalogue({ ...snapshot, program: [{ ...program, id: 0 }] })
  ).rejects.toThrow('ID');
});
it('imports real complete corpus without a 1000-item cap or invented certainty', async () => {
  const read = (name: string) => JSON.parse(readFileSync(`src/data/${name}.json`, 'utf8'));
  const full = { scholarship: read('scholarships'), program: read('research-programs') };
  const result = await buildMatchingCatalogue(full);
  expect(result.opportunities.length).toBe(full.scholarship.length + full.program.length);
  expect(result.opportunities.length).toBeGreaterThan(1000);
  expect(
    result.opportunities.every(
      (o) => o.matching.coverage === 'partial' || o.matching.coverageEvidence.status === 'reviewed'
    )
  ).toBe(true);
  const ages = full.scholarship.filter(
    (r: any) => r.eligibility?.minAge != null || r.eligibility?.maxAge != null
  );
  for (const row of ages)
    expect(
      result.opportunities
        .find((o) => o.key === `scholarship:${row.id}`)
        ?.matching.requirements.some((r) => r.field === 'age')
    ).toBe(true);
});
it('preserves unknown rules and program text as manual checks; excludes private fields', () => {
  const row = {
    ...scholarship,
    internalNote: 'DO NOT PUBLISH',
    subscriberEmail: 'PRIVATE',
    eligibility: { futureRule: 'unrecognized' },
  };
  const result = normalizeOpportunity(row, 'scholarship');
  expect(JSON.stringify(result)).not.toMatch(/DO NOT PUBLISH|PRIVATE/);
  expect(JSON.stringify(result.matching)).toContain('futureRule');
  expect(JSON.stringify(normalizeOpportunity(program, 'program'))).toContain('nomination required');
  expect(result.issues).toContain('coverage-unreviewed');
});
it('requires evidence and date for reviewed age rules and complete group references', () => {
  const m = legacyMatching(scholarship, 'scholarship');
  m.coverage = 'reviewed';
  expect(matchingSchema.safeParse(m).success).toBe(false);
  const invalid = legacyMatching(scholarship, 'scholarship');
  invalid.groups[0]!.children.push('missing');
  expect(matchingSchema.safeParse(invalid).success).toBe(false);
  invalid.groups[0]!.children = ['legacy-root'];
  expect(matchingSchema.safeParse(invalid).success).toBe(false);
  const age = m.requirements.find((r) => r.field === 'age')!;
  age.evidence = {
    status: 'reviewed',
    sourceUrl: 'https://example.com',
    excerpt: 'Age 18 on Jan 1',
    verifiedAt: '2026-09-09',
  };
  expect(matchingSchema.safeParse({ ...m, coverage: 'partial' }).success).toBe(false);
  age.referenceDate = '2027-01-01';
  expect(matchingSchema.safeParse({ ...m, coverage: 'partial' }).success).toBe(true);
});
it('preserves matching fields through draft merge and sync, retaining public identity on rename', () => {
  const value = {
    ...scholarship,
    title: 'Renamed',
    matching: legacyMatching(scholarship, 'scholarship'),
  };
  const published = applyPublication(
    [scholarship],
    [{ kind: 'scholarship', publicId: 1, base: scholarship, value, revision: 2 }],
    'scholarship'
  );
  expect(published[0]).toEqual(value);
  expect(normalizeOpportunity(published[0]!, 'scholarship').key).toBe('scholarship:1');
  const plan = planCatalogueSync({ ...snapshot, scholarship: published }, [], false);
  expect(plan.upserts.find((r) => r.kind === 'scholarship')?.document.matching).toEqual(
    value.matching
  );
  expect(() =>
    validateCatalogue([{ ...value, matching: { version: 99 } }], 'scholarship')
  ).toThrow();
});
it('accounts for draft-only, deletion, archived history and restoration without publishing drafts', async () => {
  const rows = [
    {
      kind: 'scholarship' as const,
      publicId: 1,
      published: scholarship,
      draft: null,
      deleted: false,
      revision: 1,
    },
    {
      kind: 'program' as const,
      publicId: 1,
      published: program,
      draft: null,
      deleted: true,
      revision: 1,
    },
    {
      kind: 'program' as const,
      publicId: 2,
      published: null,
      draft: { ...program, id: 2 },
      deleted: false,
      revision: 1,
    },
    {
      kind: 'program' as const,
      publicId: 3,
      published: null,
      draft: null,
      deleted: false,
      revision: 1,
    },
  ];
  const legacy = [{ kind: 'scholarship' as const, legacyId: 90, publicId: null, title: 'Old' }];
  const dispositions = [
    { ...legacy[0]!, disposition: 'archived' as const, reason: 'Reviewed historical row' },
  ];
  const r = await reconcileDatabase(snapshot, rows, legacy, dispositions);
  expect(r.comparison).toBe('aligned');
  expect(r.records.map((x) => x.state)).toEqual([
    'published',
    'published',
    'draft-only',
    'archived',
  ]);
  expect(r.legacy[0]!.state).toBe('archived');
  const unknown = await reconcileDatabase(snapshot, rows, legacy, [], 'committed');
  expect(unknown.comparison).toBe('drift');
  const changed = structuredClone(rows);
  changed[0]!.published = { ...scholarship, title: 'New' };
  expect(
    (await reconcileDatabase(snapshot, changed, legacy, dispositions, 'committed')).comparison
  ).toBe('in-flight-difference');
  expect((await reconcileDatabase(snapshot, changed, legacy, dispositions)).comparison).toBe(
    'drift'
  );
});
it('resolves only explicit aliases without substring guesses', () => {
  expect(resolveEntity('  cbe ', schoolBoardEntities)).toBe('CBE');
  expect(resolveEntity('Calgary', schoolBoardEntities)).toBeNull();
  expect(
    resolveEntity('x', [
      { id: 'a', label: 'a', aliases: ['x'] },
      { id: 'b', label: 'b', aliases: ['x'] },
    ])
  ).toBeNull();
});
