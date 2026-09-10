// @vitest-environment node
import { it, expect, vi, beforeEach } from 'vitest';
const state = vi.hoisted(() => ({ admin: true, record: null as any }));
vi.mock('../../lib/adminAuth', () => ({ isAdminRequest: async () => state.admin }));
vi.mock('../../lib/matching/store', () => ({
  matchingCoverage: vi.fn(async () => ({ counts: { scholarship: 1078, program: 129 } })),
}));
vi.mock('../../lib/catalogue-store', () => ({
  getCatalogueEntry: vi.fn(async () => state.record),
}));
import { GET } from '../../pages/admin/api/matching';
import { legacyMatching } from '../../lib/matching/normalize';
const call = (query = '') =>
  GET({ request: new Request('https://scholarab.ca/admin/api/matching' + query) } as any);
beforeEach(() => {
  state.admin = true;
  state.record = null;
});
it('protects coverage and draft previews from unauthenticated requests', async () => {
  state.admin = false;
  expect((await call()).status).toBe(401);
  expect((await call('?kind=program&id=1')).status).toBe(401);
});
it('returns full counts with no-store caching', async () => {
  const r = await call();
  expect(r.headers.get('cache-control')).toContain('no-store');
  expect(await r.json()).toMatchObject({ counts: { scholarship: 1078, program: 129 } });
});
it('validates the namespaced identity', async () => {
  for (const query of ['?kind=unknown&id=1', '?kind=program&id=1e2', '?id=1', '?kind=scholarship'])
    expect((await call(query)).status).toBe(400);
  expect((await call('?kind=program&id=1')).status).toBe(404);
});
it('previews the draft with its revision while preserving the public record', async () => {
  state.record = {
    revision: 4,
    deleted: false,
    published: { id: 1, name: 'Old', url: 'https://example.com' },
    draft: {
      id: 1,
      name: 'Draft',
      url: 'https://example.com',
      eligibility: 'Nomination required',
      internalNote: 'secret',
    },
  };
  const r = await call('?kind=program&id=1');
  const d = await r.json();
  expect(d).toMatchObject({
    revision: 4,
    hasDraft: true,
    preview: { key: 'program:1', title: 'Draft' },
  });
  expect(JSON.stringify(d)).not.toContain('secret');
  expect(state.record.published.name).toBe('Old');
});

it.each(['scholarship', 'program'] as const)('returns an uncompiled editable base for %s field evidence', async (kind) => {
  const record = { id: 1, title: 'Award', name: 'Program', url: 'https://example.com' };
  const matching = legacyMatching(record, kind);
  const eligibilityEvidence = {
    minAge: {
      value: 13, tier: 'gate', status: 'partial', sourceUrl: 'https://example.com/rules',
      quote: 'Synthetic age criterion for this API fixture.', summary: 'Fixture only.',
      verifiedAt: '2026-09-10', referenceDate: '2026-10-01',
    },
  };
  state.record = { revision: 2, deleted: false, published: null, draft: { ...record, matching, eligibilityEvidence } };
  const response = await call(`?kind=${kind}&id=1`);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.editableMatching).toEqual(matching);
  expect(data.eligibilityEvidence).toEqual(eligibilityEvidence);
  expect(data.preview.matching.requirements).toHaveLength(matching.requirements.length + 1);
  expect(data.preview.matching.root).toBe('eligibility-evidence-root');
  expect(state.record.draft.matching).toEqual(matching);
});
