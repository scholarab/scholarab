import type { Profile } from './types';
import { describe, it, expect } from 'vitest';
import { normalizeOpportunity } from './normalize';
import { evaluationProjection, parseClientCatalogue } from './client-catalogue';
import { createMatchingEngine } from './engine';
import { nextQuestions } from './questions';
import { essentialProfile, freshSession, readSession, SESSION_KEY, TTL } from './session';
import { QUIZ_STORAGE_KEY } from '../quiz';
import scholarships from '../../data/scholarships.json';
import programs from '../../data/research-programs.json';
const now = new Date('2026-09-10T12:00:00Z');
function reviewed() {
  const o = normalizeOpportunity(
    { id: 1, title: 'Synthetic', url: 'https://example.org', eligibility: { minAverage: 85 } },
    'scholarship'
  );
  const r = o.matching.requirements[0]!;
  r.importance = 'mandatory';
  r.basis = 'admission';
  r.evidence = {
    status: 'reviewed',
    sourceUrl: o.url,
    summary: '',
    quote: 'Synthetic requirement, not a provider claim.',
    verifiedAt: '2026-01-01',
  };
  return o;
}
describe('adaptive connection', () => {
  it('preserves every assessment and ordering across the complete corpus', () => {
    const all = [
      ...scholarships.map((s) => normalizeOpportunity(s, 'scholarship')),
      ...programs.map((p) => normalizeOpportunity(p, 'program')),
    ];
    const projected = createMatchingEngine(all.map(evaluationProjection));
    const full = createMatchingEngine(all);
    for (const profile of [
      { answers: {} },
      {
        answers: {
          average: {
            state: 'answered' as const,
            fact: {
              kind: 'number' as const,
              min: 84,
              max: 84,
              minInclusive: true,
              maxInclusive: true,
              basis: 'admission',
            },
          },
        },
      },
    ] as Profile[])
      expect(projected.assess(profile, { now })).toEqual(full.assess(profile, { now }));
  });
  it('preserves verified checks through evidence projection', () => {
    const o = reviewed();
    expect(
      createMatchingEngine([evaluationProjection(o)]).assess({ answers: {} }, { now })
    ).toEqual(createMatchingEngine([o]).assess({ answers: {} }, { now }));
  });
  it('rejects stale versions, duplicates and missing evidence', () => {
    const o = reviewed(),
      core = {
        version: 1,
        catalogueHash: 'current',
        opportunities: [o],
        evidence: { [o.key]: 'a'.repeat(64) },
      };
    expect(() => parseClientCatalogue(core, 'old')).toThrow();
    expect(() => parseClientCatalogue({ ...core, opportunities: [o, o] }, 'current')).toThrow();
    expect(() => parseClientCatalogue({ ...core, evidence: {} }, 'current')).toThrow();
  });
});
describe('follow-up policy', () => {
  it('offers a question that changes an unresolved check and never loops', () => {
    const o = reviewed(),
      engine = createMatchingEngine([o]);
    const assessment = engine.assess({ answers: {} }, { now }).all;
    expect(nextQuestions([o], assessment, { answers: {} }, [], false).map((q) => q.key)).toEqual([
      'average',
    ]);
    expect(nextQuestions([o], assessment, { answers: {} }, ['average'], false)).toEqual([]);
    const resolved = engine.assess(
      {
        answers: {
          average: {
            state: 'answered',
            fact: {
              kind: 'number',
              min: 90,
              max: 90,
              minInclusive: true,
              maxInclusive: true,
              basis: 'admission',
            },
          },
        },
      },
      { now }
    );
    expect(resolved.all[0]!.rules[0]!.state).toBe('satisfied');
    expect(nextQuestions([o], resolved.all, { answers: {} }, [], false)).toEqual([]);
  });
  it('requires personal opt-in and suppresses declined or unsupported topics', () => {
    const o = reviewed(),
      r = o.matching.requirements[0]!;
    r.field = 'identity';
    r.answerKey = 'provider.identity';
    r.condition = { operator: 'equals', value: true };
    delete r.basis;
    const e = createMatchingEngine([o]),
      a = e.assess({ answers: {} }, { now }).all;
    expect(nextQuestions([o], a, { answers: {} }, [], false)).toEqual([]);
    expect(nextQuestions([o], a, { answers: {} }, [], true)).toHaveLength(1);
    expect(
      nextQuestions([o], a, { answers: { 'provider.identity': { state: 'declined' } } }, [], true)
    ).toEqual([]);
    r.evidence.status = 'legacy-unreviewed';
    expect(
      nextQuestions(
        [o],
        createMatchingEngine([o]).assess({ answers: {} }, { now }).all,
        { answers: {} },
        [],
        true
      )
    ).toEqual([]);
  });
});
describe('answer privacy and migration', () => {
  it('migrates exact teaser essentials but discards estimated marks and plans', () => {
    sessionStorage.clear();
    sessionStorage.setItem(
      QUIZ_STORAGE_KEY,
      JSON.stringify({
        savedAt: now.getTime(),
        answers: {
          searchType: 'both',
          grade: '12',
          city: 'Calgary',
          avg: '85',
          institution: 'University of Alberta',
        },
      })
    );
    const s = readSession(sessionStorage, 'catalogue', now.getTime());
    expect(s.stage).toBe('12');
    expect(s.profile.answers).toEqual({});
    expect(s.ready).toBe(false);
    expect(sessionStorage.getItem(QUIZ_STORAGE_KEY)).toBeNull();
  });
  it('expires and rejects a different catalogue without resurrecting old answers', () => {
    const s = freshSession('a', now.getTime());
    s.community = 'Calgary';
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    expect(readSession(sessionStorage, 'a', now.getTime() + TTL).community).toBe('');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    expect(readSession(sessionStorage, 'b', now.getTime()).community).toBe('');
  });
  it('does not let essentials overwrite a qualified optional answer', () => {
    const s = freshSession('a');
    s.stage = '12';
    s.profile.answers.educationStage = {
      state: 'answered',
      fact: {
        kind: 'choices',
        values: ['post-secondary'],
        mode: 'actual',
        complete: true,
        basis: 'next-year',
      },
    };
    expect(essentialProfile(s).answers.educationStage).toEqual(s.profile.answers.educationStage);
  });
});
it('does not reward an unreviewed listing for having fewer recorded rules', () => {
  const sparse = normalizeOpportunity(
    { id: 2, title: 'Sparse', url: 'https://example.org' },
    'scholarship'
  );
  const detailed = normalizeOpportunity(
    {
      id: 1,
      title: 'Detailed',
      url: 'https://example.org',
      eligibility: { minAverage: 85, grades: ['12'] },
    },
    'scholarship'
  );
  expect(
    createMatchingEngine([sparse, detailed])
      .assess({ answers: {} }, { now })
      .all.map((a) => a.publicId)
  ).toEqual([1, 2]);
});
it('round-trips shared templates without merging identities or mutable rules', async () => {
  const { encodeClientCatalogue } = await import('./client-catalogue');
  const a = evaluationProjection(reviewed()),
    b = structuredClone(a);
  b.key = 'scholarship:2';
  b.publicId = 2;
  b.url = 'https://second.example.org';
  b.matching.requirements[0]!.evidence.sourceUrl = b.url;
  const data = {
    version: 1 as const,
    catalogueHash: 'same',
    opportunities: [a, b],
    evidence: { [a.key]: 'a'.repeat(64), [b.key]: 'b'.repeat(64) },
  };
  const wire = encodeClientCatalogue(data);
  const decoded = parseClientCatalogue(wire, 'same');
  expect(decoded).toEqual(data);
  const previousWire = structuredClone(wire);
  previousWire.opportunities.forEach((o, i) => Object.assign(o, { key: data.opportunities[i]!.key }));
  expect(parseClientCatalogue(previousWire, 'same')).toEqual(data);
  Object.assign(previousWire.opportunities[0]!, { key: 'program:9999' });
  expect(() => parseClientCatalogue(previousWire, 'same')).toThrow('Incomplete matching catalogue');
  decoded.opportunities[0]!.matching.requirements[0]!.explanation = 'edited';
  expect(decoded.opportunities[1]!.matching.requirements[0]!.explanation).not.toBe('edited');
  wire.opportunities[0]!.matching = 999999;
  expect(() => parseClientCatalogue(wire, 'same')).toThrow('Missing matching template');
});
it('distinguishes an explicit none-of-these answer from unknown or misspelled community text', () => {
  const o = reviewed(),
    r = o.matching.requirements[0]!;
  r.field = 'residence';
  r.basis = 'community';
  r.condition = { operator: 'oneOf', values: ['Calgary'] };
  const s = freshSession('a');
  s.community = 'Unlisted / unsure';
  expect(createMatchingEngine([o]).assess(essentialProfile(s), { now }).all[0]!.eligibility).toBe(
    'worth_checking'
  );
  const profile = {
    answers: {
      residence: {
        state: 'answered' as const,
        fact: {
          kind: 'choices' as const,
          values: [],
          mode: 'actual' as const,
          complete: true,
          basis: 'community',
        },
      },
    },
  };
  expect(createMatchingEngine([o]).assess(profile, { now }).all[0]!.eligibility).toBe(
    'known_ineligible'
  );
  expect(() =>
    createMatchingEngine([o]).assess(
      {
        answers: {
          residence: {
            state: 'answered',
            fact: {
              kind: 'choices',
              values: [],
              mode: 'possible',
              complete: true,
              basis: 'community',
            },
          },
        },
      },
      { now }
    )
  ).toThrow();
});
