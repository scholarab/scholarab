import { expect, it } from 'vitest';
import { normalizeOpportunity } from './normalize';
import { createMatchingEngine } from './engine';
import { evaluationProjection } from './client-catalogue';
import { essentialProfile, freshSession } from './session';
const now = new Date('2026-09-10T12:00:00Z');
const profile = essentialProfile({ ...freshSession('test'), stage: '12', community: 'Calgary' });
const rows = [
  normalizeOpportunity({ id: 1, title: 'General', url: 'https://example.org' }, 'scholarship'),
  normalizeOpportunity(
    {
      id: 2,
      title: 'Local',
      url: 'https://example.org',
      region: 'Calgary',
      eligibility: { grades: ['12'] },
    },
    'scholarship'
  ),
  normalizeOpportunity(
    {
      id: 3,
      title: 'Other',
      url: 'https://example.org',
      region: 'Edmonton',
      eligibility: { grades: ['10'] },
    },
    'scholarship'
  ),
];
it('personalizes discovery without excluding or confirming unreviewed requirements', () => {
  const result = createMatchingEngine(rows).assess(profile, { now });
  expect(result.all[0]!.key).toBe('scholarship:2');
  expect(result.recommendations).toHaveLength(3);
  expect(result.all.every((a) => a.eligibility === 'worth_checking')).toBe(true);
  expect(result.all[0]!.rankingReasons.join(' ')).toContain('unverified');
  expect(createMatchingEngine(rows.map(evaluationProjection)).assess(profile, { now })).toEqual(
    result
  );
});
it('does not interpret program venue as residence or ages as education stage', () => {
  const program = normalizeOpportunity(
    {
      id: 1,
      name: 'Program',
      url: 'https://example.org',
      location: 'Calgary',
      grades: 'Ages 15–22',
    },
    'program'
  );
  expect(program.discovery).toEqual({ stages: [], communities: [] });
});
it('only recognizes explicitly supported grade labels', () => {
  for (const [grades, stages] of [
    ['Grades 10–11', ['10', '11']],
    ['Grade 12', ['12']],
    ['High school', ['10', '11', '12']],
    ['Grade 11 or equivalent, subject to approval', []],
  ] as const) {
    expect(
      normalizeOpportunity(
        { id: 1, name: 'Program', url: 'https://example.org', grades },
        'program'
      ).discovery.stages
    ).toEqual(stages);
  }
});
it('does not give typo communities a local ranking signal', () => {
  const typo = essentialProfile({ ...freshSession('test'), community: 'Calgar' });
  const result = createMatchingEngine(rows).assess(typo, { now, sort: 'local' });
  expect(result.all.every((a) => !a.communityListed)).toBe(true);
  expect(result.recommendations).toHaveLength(3);
});

import { evidenceOpportunity } from './client-catalogue';
it('selects exact evidence identities from a bounded pack and rejects mismatches', () => {
  const pack = { version: 2, catalogueHash: 'current', opportunities: rows };
  expect(evidenceOpportunity(pack, 'current', 'scholarship:2')).toEqual(rows[1]);
  expect(() => evidenceOpportunity(pack, 'stale', 'scholarship:2')).toThrow();
  expect(() => evidenceOpportunity(pack, 'current', 'program:2')).toThrow();
  expect(() =>
    evidenceOpportunity({ ...pack, opportunities: [rows[1], rows[1]] }, 'current', 'scholarship:2')
  ).toThrow();
  expect(
    evidenceOpportunity(
      { version: 1, catalogueHash: 'current', opportunity: rows[1] },
      'current',
      'scholarship:2'
    )
  ).toEqual(rows[1]);
});

it('orders by upcoming listed dates without claiming unverified applications are open', () => {
  const opportunities = ['2026-12-01', '2026-09-11', '2025-01-01'].map((deadline, i) =>
    normalizeOpportunity(
      { id: i + 1, title: `Date ${i}`, url: 'https://example.org', deadline },
      'scholarship'
    )
  );
  const result = createMatchingEngine(opportunities).assess(
    { answers: {} },
    { now, sort: 'closing_soon' }
  );
  expect(result.all.map((a) => a.publicId)).toEqual([2, 1, 3]);
  expect(result.all.map((a) => a.availability.status)).toEqual(['unknown', 'unknown', 'closed']);
});
