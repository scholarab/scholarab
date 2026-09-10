// @vitest-environment node
import { expect, it } from 'vitest';
import scholarships from '../../data/scholarships.json';
import { normalizeOpportunity } from './normalize';
import { createMatchingEngine } from './engine';
import { evaluationProjection } from './client-catalogue';
import { nextQuestions } from './questions';

const now = new Date('2026-09-10T12:00:00Z');
it('connects every school-managed scholarship to the counsellor outcome', () => {
  const rows = scholarships.filter((s) => s.applyViaGuidance);
  expect(rows).toHaveLength(542);
  const opportunities = rows.map((s) => normalizeOpportunity(s, 'scholarship'));
  const profile = { answers: {} };
  const result = createMatchingEngine(opportunities).assess(profile, { now });
  expect(result.excluded).toHaveLength(0);
  expect(result.recommendations).toHaveLength(rows.length);
  for (const a of result.all) {
    expect(a.eligibility).toBe('school_decides');
    expect(a.availability.nextAction).toBe(
      'Your school decides this one. Ask your counsellor, and bring this page'
    );
  }
  expect(nextQuestions(opportunities, result.all, profile, [], true)).toEqual([]);
  expect(createMatchingEngine(opportunities.map(evaluationProjection)).assess(profile, { now }))
    .toEqual(result);
});

it('does not apply a scholarship school-management flag to programs', () => {
  const program = normalizeOpportunity(
    { id: 1, name: 'Program fixture', url: 'https://example.test', applyViaGuidance: true },
    'program'
  );
  expect(createMatchingEngine([program]).assess({ answers: {} }, { now }).all[0]!.eligibility)
    .toBe('worth_checking');
});
