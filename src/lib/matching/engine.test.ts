// @vitest-environment node
import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMatchingEngine } from './engine';
import { evaluateRequirement, evaluateEligibility } from './evaluate';
import { evaluateAvailability, dateInZone } from './availability';
import { normalizeOpportunity } from './normalize';
import { buildMatchingCatalogue } from './catalogue';
import { matchingSchema, type Requirement, type MatchingDocument } from './schema';
import type { Profile, Fact } from './types';
const now = new Date('2026-09-10T01:00:00Z'),
  context = { today: '2026-09-09' };
// Synthetic policy fixtures. The evidence is fixture text, not a certification
// of actual providers. Expected outcomes are independently specified below.
const evidence = {
  status: 'reviewed' as const,
  sourceUrl: 'https://example.com/fixture',
  summary: '',
    quote: 'Synthetic test policy',
  verifiedAt: '2026-09-01',
};
const rule = (changes: Partial<Requirement> = {}): Requirement => ({
  id: 'r',
  field: 'average',
  importance: 'mandatory',
  basis: 'admission-average',
  condition: { operator: 'minimum', value: 85 },
  explanation: 'Requires an admission average of 85%.',
  referenceDate: null,
  evidence,
  ...changes,
});
const number = (
  min: number | null,
  max: number | null,
  extras: Partial<Extract<Fact, { kind: 'number' }>> = {}
): Fact => ({
  kind: 'number',
  min,
  max,
  minInclusive: true,
  maxInclusive: true,
  basis: 'admission-average',
  ...extras,
});
const profile = (fact: Fact, key = 'average'): Profile => ({
  answers: { [key]: { state: 'answered', fact } },
});
const doc = (requirements: Requirement[] = [rule()]): MatchingDocument =>
  matchingSchema.parse({
    version: 1,
    coverage: 'reviewed',
    coverageEvidence: evidence,
    requirements,
    groups: requirements.length
      ? [{ id: 'root', operator: 'all', children: requirements.map((r) => r.id) }]
      : [],
    root: requirements.length ? 'root' : null,
    availability: {
      method: 'application',
      timing: 'dated',
      opensOn: '2026-09-01',
      closesOn: '2026-09-30',
      cycle: '2026',
      timezone: 'America/Edmonton',
      evidence,
    },
  });
const opportunity = (id = 1, kind: 'scholarship' | 'program' = 'scholarship', matching = doc()) =>
  normalizeOpportunity(
    { id, title: 'Award ' + id, name: 'Program ' + id, url: 'https://example.com', matching },
    kind
  );
describe('numeric ranges never become invented point estimates', () => {
  it.each([
    [80, 89, true, true, 'unresolved'],
    [85, 89, true, true, 'satisfied'],
    [90, null, true, true, 'satisfied'],
    [null, 85, true, false, 'not_satisfied'],
    [null, 85, true, true, 'unresolved'],
    [84, 84, true, true, 'not_satisfied'],
    [85, 85, true, true, 'satisfied'],
  ] as const)('minimum: %s..%s', (min, max, minInclusive, maxInclusive, expected) =>
    expect(
      evaluateRequirement(
        rule(),
        profile(number(min, max, { minInclusive, maxInclusive })),
        context
      ).state
    ).toBe(expected)
  );
  it.each([
    [19, 21, true, true, 'unresolved'],
    [null, 20, true, true, 'satisfied'],
    [20, null, false, true, 'not_satisfied'],
    [20, 21, true, true, 'unresolved'],
    [21, 21, true, true, 'not_satisfied'],
  ] as const)('maximum age: %s..%s', (min, max, minInclusive, maxInclusive, expected) => {
    expect(
      evaluateRequirement(
        rule({
          field: 'age',
          basis: undefined,
          referenceDate: '2026-12-31',
          condition: { operator: 'maximum', value: 20 },
        }),
        profile(number(min, max, { minInclusive, maxInclusive, asOf: '2026-12-31' }), 'age'),
        context
      ).state
    ).toBe(expected);
  });
  it('does not use current age for age at a future date or a different marks calculation', () => {
    expect(
      evaluateRequirement(
        rule({ field: 'age', referenceDate: '2027-01-01' }),
        profile(number(19, 19), 'age'),
        context
      ).code
    ).toBe('scope-mismatch');
    expect(
      evaluateRequirement(rule(), profile(number(90, 90, { basis: 'all-courses' })), context).state
    ).toBe('unresolved');
  });
});
it.each(['unanswered', 'declined', 'not-sure', 'not-applicable'] as const)(
  'keeps %s answers unresolved',
  (state) => {
    const result = evaluateRequirement(rule(), { answers: { average: { state } } }, context);
    expect(result.state).toBe('unresolved');
    if (state === 'declined') expect(result.questionKey).toBeNull();
  }
);
it.each(['legacy-unreviewed', 'ambiguous', 'stale'] as const)(
  'never hard-excludes on %s evidence',
  (status) =>
    expect(
      evaluateRequirement(
        rule({ evidence: { ...evidence, status } }),
        profile(number(20, 20)),
        context
      ).state
    ).toBe('unresolved')
);
it('rejects future evidence and leaves unknown strength/manual checks unresolved', () => {
  expect(
    evaluateRequirement(
      rule({ evidence: { ...evidence, verifiedAt: '2027-01-01' } }),
      profile(number(90, 90)),
      context
    ).state
  ).toBe('unresolved');
  expect(
    evaluateRequirement(rule({ importance: 'unknown' }), profile(number(90, 90)), context).state
  ).toBe('unresolved');
  expect(
    evaluateRequirement(
      rule({ condition: { operator: 'manual', text: 'Nomination required' } }),
      profile(number(90, 90)),
      context
    ).state
  ).toBe('unresolved');
});
it.each(['institution', 'educationStage', 'residence'] as const)(
  'requires explicit context for %s',
  (field) => {
    const r = rule({
      field,
      basis: undefined,
      condition: { operator: 'oneOf', values: ['Example'] },
    });
    expect(
      evaluateRequirement(
        r,
        profile({ kind: 'choices', values: ['Example'], mode: 'actual', complete: true }, field),
        context
      ).state
    ).toBe('unresolved');
  }
);
it('distinguishes intended from enrolled institutions and alternative possibilities', () => {
  const r = rule({
    field: 'institution',
    basis: 'enrolled',
    condition: { operator: 'oneOf', values: ['University A'] },
  });
  const fact: Fact = {
    kind: 'choices',
    values: ['University A', 'University B'],
    mode: 'possible',
    complete: true,
    basis: 'enrolled',
  };
  expect(evaluateRequirement(r, profile(fact, 'institution'), context).state).toBe('unresolved');
  expect(
    evaluateRequirement(
      r,
      profile({ ...fact, values: ['University A'], basis: 'intended' }, 'institution'),
      context
    ).state
  ).toBe('unresolved');
  expect(
    evaluateRequirement(
      r,
      profile({ ...fact, values: ['University B'], mode: 'actual' }, 'institution'),
      context
    ).state
  ).toBe('not_satisfied');
});
it('uses exact entities and never guesses one school from a substring', () => {
  const r = rule({
    field: 'school',
    basis: undefined,
    condition: { operator: 'oneOf', values: ['School A'] },
  });
  expect(
    evaluateRequirement(
      r,
      profile(
        { kind: 'choices', values: ['School A Annex'], complete: true, mode: 'actual' },
        'school'
      ),
      context
    ).state
  ).toBe('not_satisfied');
  const result = evaluateRequirement(
    { ...r, field: 'schoolBoard', condition: { operator: 'oneOf', values: ['CBE'] } },
    profile(
      { kind: 'choices', values: ['Calgary Board of Education'], mode: 'actual', complete: true },
      'schoolBoard'
    ),
    context
  );
  expect(result.state).toBe('satisfied');
});
it('respects secondary eligible communities and does not label province-wide fits local', () => {
  const residence = rule({
    field: 'residence',
    basis: 'community',
    condition: { operator: 'oneOf', values: ['Leduc', 'Beaumont'] },
  });
  const result = evaluateRequirement(
    residence,
    profile(
      { kind: 'choices', values: ['Beaumont'], basis: 'community', mode: 'actual', complete: true },
      'residence'
    ),
    context
  );
  expect(result).toMatchObject({ state: 'satisfied', local: true });
  expect(
    evaluateRequirement(
      { ...residence, basis: 'province', condition: { operator: 'oneOf', values: ['Alberta'] } },
      profile(
        { kind: 'choices', values: ['Alberta'], basis: 'province', mode: 'actual', complete: true },
        'residence'
      ),
      context
    ).local
  ).toBe(false);
});
it.each(['identity', 'membership', 'activity', 'financialNeed', 'nomination'] as const)(
  'requires a specific answer key for %s',
  (field) => {
    const r = rule({ field, basis: undefined, condition: { operator: 'equals', value: true } });
    expect(
      evaluateRequirement(r, profile({ kind: 'boolean', value: true }, field), context).state
    ).toBe('unresolved');
    expect(
      evaluateRequirement(
        { ...r, answerKey: field + '.provider' },
        profile({ kind: 'boolean', value: false }, field + '.provider'),
        context
      ).state
    ).toBe('not_satisfied');
  }
);
it('applies ANY alternatives correctly without treating an unused failed branch as ineligibility', () => {
  const m = doc([
    rule(),
    rule({
      id: 'other',
      field: 'apprenticeship',
      basis: undefined,
      condition: { operator: 'equals', value: true },
    }),
  ]);
  m.groups[0]!.operator = 'any';
  const result = evaluateEligibility(m, profile(number(90, 90)), context);
  expect(result.eligibility).toBe('meets_checked_requirements');
  expect(result.unresolvedRequirements).toEqual([]);
  expect(
    evaluateEligibility(
      m,
      {
        answers: {
          average: { state: 'answered', fact: number(70, 70) },
          apprenticeship: { state: 'answered', fact: { kind: 'boolean', value: false } },
        },
      },
      context
    ).eligibility
  ).toBe('known_ineligible');
});
it('preferences never exclude a student or supply eligibility for an ANY branch', () => {
  const m = doc([
    rule(),
    rule({
      id: 'preference',
      field: 'field',
      basis: undefined,
      importance: 'preference',
      condition: { operator: 'oneOf', values: ['STEM'] },
    }),
  ]);
  m.groups[0]!.operator = 'any';
  const result = evaluateEligibility(
    m,
    {
      answers: {
        average: { state: 'answered', fact: number(70, 70) },
        field: {
          state: 'answered',
          fact: { kind: 'choices', values: ['STEM'], mode: 'actual', complete: true },
        },
      },
    },
    context
  );
  expect(result.eligibility).toBe('known_ineligible');
  expect(result.preferenceMatches).toEqual(['preference']);
  const prefsOnly = doc([rule({ importance: 'preference' })]);
  expect(evaluateEligibility(prefsOnly, profile(number(20, 20)), context).eligibility).toBe(
    'meets_checked_requirements'
  );
});
it('keeps incomplete scope unresolved even when every recorded requirement is satisfied', () => {
  const m = doc();
  m.coverage = 'partial';
  expect(evaluateEligibility(m, profile(number(90, 90)), context).eligibility).toBe(
    'worth_checking'
  );
});
it('handles nested ALL/ANY groups', () => {
  const m = doc([
    rule(),
    rule({
      id: 'a',
      field: 'apprenticeship',
      basis: undefined,
      condition: { operator: 'equals', value: true },
    }),
    rule({
      id: 'b',
      field: 'field',
      basis: undefined,
      condition: { operator: 'oneOf', values: ['arts'] },
    }),
  ]);
  m.groups = [
    { id: 'alt', operator: 'any', children: ['a', 'b'] },
    { id: 'root', operator: 'all', children: ['r', 'alt'] },
  ];
  expect(
    evaluateEligibility(
      m,
      {
        answers: {
          average: { state: 'answered', fact: number(90, 90) },
          apprenticeship: { state: 'answered', fact: { kind: 'boolean', value: true } },
        },
      },
      context
    ).eligibility
  ).toBe('meets_checked_requirements');
});
it('handles Alberta midnight, DST, future openings, unknown windows, and inactive rows', () => {
  expect(dateInZone(now)).toBe('2026-09-09');
  expect(dateInZone(new Date('2026-03-08T08:00:00Z'))).toBe('2026-03-08');
  expect(dateInZone(new Date('2026-11-01T07:00:00Z'))).toBe('2026-11-01');
  const o = opportunity();
  expect(evaluateAvailability(o, now).status).toBe('open');
  o.matching.availability.opensOn = '2026-09-10';
  expect(evaluateAvailability(o, now).status).toBe('opens_later');
  o.matching.availability.opensOn = null;
  expect(evaluateAvailability(o, now).status).toBe('unknown');
  o.active = false;
  expect(evaluateAvailability(o, now).status).toBe('opens_later');
});
it('separates nomination/automatic methods and warns about deadline-day time', () => {
  const o = opportunity();
  o.matching.availability.method = 'nomination';
  o.matching.availability.closesOn = '2026-09-09';
  expect(evaluateAvailability(o, now)).toMatchObject({
    method: 'nomination',
    status: 'open',
    nextAction: 'Check the nomination process',
  });
  expect(evaluateAvailability(o, now).note).toContain('exact closing time');
  o.matching.availability.method = 'automatic';
  expect(evaluateAvailability(o, now).nextAction).toContain('automatic');
  o.matching.availability.evidence.status = 'stale';
  expect(evaluateAvailability(o, now)).toMatchObject({ method: 'unknown', status: 'unknown' });
});
it('accounts for the entire corpus for every synthetic profile, without upgrading legacy evidence', async () => {
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
  const bundle = await buildMatchingCatalogue({
    scholarship: read('src/data/scholarships.json'),
    program: read('src/data/research-programs.json'),
  });
  const engine = createMatchingEngine(bundle.opportunities);
  const fixtures = read('src/tests/fixtures/matching/profiles.json');
  for (const fixture of fixtures) {
    const result = engine.assess(
      {
        answers: {
          educationStage: {
            state: 'answered',
            fact: {
              kind: 'choices',
              values: [fixture.educationStage],
              mode: 'actual',
              complete: true,
              basis: 'current',
            },
          },
        },
      },
      { now }
    );
    expect(result.all.length).toBe(bundle.opportunities.length);
    expect(new Set(result.all.map((r) => r.key)).size).toBe(engine.size);
    expect(result.all.every((r) => ['worth_checking', 'school_decides'].includes(r.eligibility))).toBe(true);
  }
});
it('keeps known-ineligible items out of every recommendation sort, and retains all other results', () => {
  const inputs = [
    opportunity(2),
    opportunity(1, 'program', doc([])),
    opportunity(3, 'scholarship', doc([])),
  ];
  const engine = createMatchingEngine(inputs);
  for (const sort of ['best_fit', 'closing_soon', 'local'] as const) {
    const r = engine.assess(profile(number(70, 70)), { now, sort });
    expect(r.all.length).toBe(3);
    expect(r.excluded.map((x) => x.key)).toEqual(['scholarship:2']);
    expect(r.recommendations.length).toBe(2);
    expect(r.all.at(-1)?.key).toBe('scholarship:2');
  }
});
it('rejects duplicate inputs, corrupt rule groups, and invalid numeric answers', () => {
  expect(() => createMatchingEngine([opportunity(), opportunity()])).toThrow('duplicate');
  const o = opportunity();
  o.matching.groups[0]!.children = ['root'];
  expect(() => createMatchingEngine([o])).toThrow();
  expect(() =>
    createMatchingEngine([opportunity()]).assess(profile(number(90, 80)), { now })
  ).toThrow();
});
