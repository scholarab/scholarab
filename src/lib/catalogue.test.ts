import { describe, it, expect } from 'vitest';
import {
  applyPublication,
  validateCatalogue,
  type Document,
  type PublicationChange,
} from './catalogue';
import { planCatalogueSync } from './catalogue-sync';
const base: Document = {
  id: 1,
  title: 'Award',
  url: 'https://example.com',
  notes: 'old',
  alsoOpenTo: ['Beaumont'],
};
const change = (value: Document | null): PublicationChange => ({
  kind: 'scholarship',
  publicId: 1,
  base,
  value,
  revision: 1,
});
describe('publication three-way merge', () => {
  it('preserves JSON-only fields and independent newer changes', () => {
    const result = applyPublication(
      [{ ...base, notes: 'new' }],
      [change({ ...base, title: 'Renamed' })],
      'scholarship'
    );
    expect(result[0]).toEqual({ ...base, title: 'Renamed', notes: 'new' });
  });
  it('refuses to overwrite concurrent edits to the same field', () => {
    expect(() =>
      applyPublication(
        [{ ...base, title: 'Other' }],
        [change({ ...base, title: 'Renamed' })],
        'scholarship'
      )
    ).toThrow('changed since');
  });
  it('does not repeat a previously committed change', () => {
    const next = { ...base, title: 'Renamed' };
    expect(applyPublication([next], [change(next)], 'scholarship')).toEqual([next]);
  });
  it('does not reuse an occupied public ID', () => {
    expect(() =>
      applyPublication(
        [base],
        [{ ...change({ ...base, title: 'New' }), base: null }],
        'scholarship'
      )
    ).toThrow('ID already exists');
  });
  it('removes a requested unchanged listing while preserving others', () => {
    expect(applyPublication([base, { ...base, id: 2 }], [change(null)], 'scholarship')).toEqual([
      { ...base, id: 2 },
    ]);
  });
  it('refuses a deletion when the public listing changed', () => {
    expect(() =>
      applyPublication(
        [
          { ...base, notes: 'new' },
          { ...base, id: 2 },
        ],
        [change(null)],
        'scholarship'
      )
    ).toThrow('deletion conflicts');
  });
  it.each([[], null, [base, base], [{ ...base, id: 0 }], [{ ...base, open_date: '2026-01-01' }]])(
    'rejects unsafe catalogue %j',
    (rows) => {
      expect(() => validateCatalogue(rows, 'scholarship')).toThrow();
    }
  );
});
describe('sync planning is pure and preserves drafts', () => {
  const data = {
    scholarship: [base],
    program: [{ id: 1, name: 'Program', url: 'https://example.com' }],
  };
  it.each([false, true])('dry-run/prune plan does not mutate inputs; prune=%s', (prune) => {
    const before = JSON.stringify(data);
    const plan = planCatalogueSync(data, [], prune);
    expect(plan.upserts).toHaveLength(2);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('protects drafts on rows removed from JSON', () => {
    const rows = [
      {
        kind: 'scholarship' as const,
        public_id: 2,
        published: { ...base, id: 2 },
        draft: { ...base, id: 2, title: 'Draft' },
      },
    ];
    expect(planCatalogueSync(data, rows, true).removals).toHaveLength(0);
  });
  it('rejects a truncated catalogue before planning destructive work', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      kind: 'scholarship' as const,
      public_id: i + 1,
      published: { ...base, id: i + 1 },
      draft: null,
    }));
    expect(() => planCatalogueSync(data, rows, true)).toThrow('large removal');
  });
});
