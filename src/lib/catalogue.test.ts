import { describe, it, expect } from 'vitest';
import { validateCatalogue, catalogueHash, type Document } from './catalogue';
const base: Document = {
  id: 1,
  title: 'Award',
  url: 'https://example.com',
  notes: 'old',
  alsoOpenTo: ['Beaumont'],
};
describe('deployed catalogue fingerprint', () => {
  it('ignores object key order but detects content, identity, and catalogue changes', async () => {
    const snapshot = { scholarship: [base], program: [] };
    const expected = await catalogueHash(snapshot);
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
    expect(await catalogueHash({ program: [], scholarship: [{ ...base }] })).toBe(expected);
    for (const changed of [
      { scholarship: [{ ...base, notes: 'changed' }], program: [] },
      { scholarship: [{ ...base, id: 2 }], program: [] },
      { scholarship: [], program: [base] },
    ]) expect(await catalogueHash(changed)).not.toBe(expected);
  });
});
describe('catalogue validation', () => {
  it.each([[], null, [base, base], [{ ...base, id: 0 }], [{ ...base, open_date: '2026-01-01' }]])(
    'rejects unsafe catalogue %j',
    (rows) => {
      expect(() => validateCatalogue(rows, 'scholarship')).toThrow();
    }
  );
});
