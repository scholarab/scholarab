import { expect, it } from 'vitest';
import documents from '../../tests/fixtures/matching/release-documents.json';
import scholarships from '../../data/scholarships.json';
import programs from '../../data/research-programs.json';
import { normalizeOpportunity } from './normalize';
import { createMatchingEngine } from './engine';
import { matchingSchema } from './schema';
import { evaluationProjection } from './client-catalogue';
import type { Profile } from './types';
const opportunities = documents.map((d) => {
  const [kind, id] = d.key.split(':');
  const row =
    kind === 'program'
      ? programs.find((r) => r.id === +id!)!
      : scholarships.find((r) => r.id === +id!)!;
  return normalizeOpportunity(
    { ...row, matching: matchingSchema.parse(d.matching) },
    kind as 'program' | 'scholarship'
  );
});
const now = new Date('2026-09-10T12:00:00Z');
const age = (value: number, asOf: string): Profile['answers'][string] => ({
  state: 'answered',
  fact: {
    kind: 'number',
    min: value,
    max: value,
    minInclusive: true,
    maxInclusive: true,
    basis: 'age-at-provider-reference',
    asOf,
  },
});
const cases: { label: string; answers: Profile['answers']; excluded: boolean }[] = [
  { label: 'no age answers', answers: {}, excluded: false },
  {
    label: 'minimum below boundary',
    answers: { 'breakthrough-2026-min-age': age(12, '2026-05-11') },
    excluded: false,
  },
  {
    label: 'minimum boundary',
    answers: { 'breakthrough-2026-min-age': age(13, '2026-05-11') },
    excluded: false,
  },
  {
    label: 'maximum boundary',
    answers: { 'breakthrough-2026-max-age': age(18, '2026-10-01') },
    excluded: false,
  },
  {
    label: 'maximum exceeded',
    answers: { 'breakthrough-2026-max-age': age(19, '2026-10-01') },
    excluded: false,
  },
  {
    label: 'both age checks satisfied, other rules unresolved',
    answers: {
      'breakthrough-2026-min-age': age(13, '2026-05-11'),
      'breakthrough-2026-max-age': age(13, '2026-10-01'),
    },
    excluded: false,
  },
  {
    label: 'wrong reference date cannot exclude',
    answers: { 'breakthrough-2026-min-age': age(12, '2026-09-10') },
    excluded: false,
  },
  {
    label: 'declined age',
    answers: { 'breakthrough-2026-min-age': { state: 'declined' } },
    excluded: false,
  },
];
for (const c of cases)
  it(`Unapproved Breakthrough proposal: ${c.label}`, () => {
    const o = opportunities[0]!;
    const full = createMatchingEngine([o]).assess({ answers: c.answers }, { now });
    expect(full.all[0]!.eligibility).toBe(c.excluded ? 'known_ineligible' : 'worth_checking');
    expect(full.all[0]!.availability.status).toBe('unknown');
    expect(
      createMatchingEngine([evaluationProjection(o)]).assess({ answers: c.answers }, { now })
    ).toEqual(full);
  });
for (const [status, excluded] of [
  ['Canadian citizen', false],
  ['Permanent resident', false],
  ['Protected person', false],
  ['Visa student', false],
] as const)
  it(`Unapproved Rutherford proposal: ${status}`, () => {
    const profile: Profile = {
      answers: {
        'rutherford-legal-status': {
          state: 'answered',
          fact: {
            kind: 'choices',
            mode: 'actual',
            complete: true,
            values: [status],
            basis: 'legal-status',
          },
        },
      },
    };
    const full = createMatchingEngine([opportunities[1]!]).assess(profile, { now });
    expect(full.all[0]!.eligibility).toBe(excluded ? 'known_ineligible' : 'worth_checking');
    expect(full.all[0]!.availability.status).toBe('unknown');
  });
for (const [time, status] of [
  ['2026-05-11T06:59:00Z', 'unknown'],
  ['2026-09-16T06:59:00Z', 'unknown'],
  ['2026-09-16T07:00:00Z', 'closed'],
] as const)
  it(`Pacific application boundary ${time}`, () => {
    expect(
      createMatchingEngine([opportunities[0]!]).assess({ answers: {} }, { now: new Date(time) })
        .all[0]!.availability.status
    ).toBe(status);
  });
