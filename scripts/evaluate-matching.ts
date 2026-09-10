/** Reproducible Phase 2 full-catalogue evaluation. Inputs are synthetic fixtures;
 * output contains aggregate counts and timings, never real student answers. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildMatchingCatalogue } from '../src/lib/matching/catalogue.ts';
import { createMatchingEngine } from '../src/lib/matching/engine.ts';
import { matchAll } from '../src/lib/eligibility-matcher.ts';
import type { StudentProfile } from '../src/lib/eligibility-types.ts';
import type { Profile } from '../src/lib/matching/types.ts';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const scholarship = read('src/data/scholarships.json'),
  program = read('src/data/research-programs.json');
const catalogue = await buildMatchingCatalogue({ scholarship, program });
const engine = createMatchingEngine(catalogue.opportunities);
const fixtures = read('src/tests/fixtures/matching/profiles.json') as Array<{
  id: string;
  educationStage: string;
  community: string;
}>;
const results = fixtures.map((f) => {
  const profile: Profile = {
    answers: {
      educationStage: {
        state: 'answered',
        fact: {
          kind: 'choices',
          values: [f.educationStage],
          mode: 'actual',
          complete: true,
          basis: 'current',
        },
      },
      residence: {
        state: 'answered',
        fact: {
          kind: 'choices',
          values: [f.community],
          mode: 'actual',
          complete: true,
          basis: 'community',
        },
      },
    },
  };
  const start = performance.now();
  const result = engine.assess(profile, { now: new Date('2026-09-10T01:00:00Z') });
  const elapsedMs = performance.now() - start;
  const previous: StudentProfile = {
    grade:
      f.educationStage === '10'
        ? '10'
        : f.educationStage === '11'
          ? '11'
          : ['12', 'entering-post-secondary'].includes(f.educationStage)
            ? '12'
            : 'post-secondary',
    city: f.community === 'unlisted-community' ? 'Other Alberta' : f.community,
    schoolBoard: null,
    specificSchool: null,
    targetInstitution: null,
    fields: [],
    averagePercent: null,
    identifiesAsFemale: null,
    identifiesAsIndigenous: null,
    identifiesAsBIPOC: null,
    hasFinancialNeed: null,
    familyIncome: null,
    inFosterCare: null,
    inApprenticeship: null,
    extracurriculars: [],
    citizenship: null,
  };
  const oldMatches = matchAll(previous, scholarship);
  if (
    result.all.length !== engine.size ||
    new Set(result.all.map((r) => r.key)).size !== engine.size
  )
    throw new Error('Full catalogue evaluation lost identities');
  return {
    fixture: f.id,
    evaluated: result.all.length,
    meets: result.all.filter((r) => r.eligibility === 'meets_checked_requirements').length,
    unresolved: result.all.filter((r) => r.eligibility === 'worth_checking').length,
    excluded: result.excluded.length,
    oldScholarshipMatches: oldMatches.length,
    elapsedMs,
  };
});
const timings = results.map((r) => r.elapsedMs).sort((a, b) => a - b);
const report = {
  catalogueHash: catalogue.manifest.catalogueHash,
  counts: catalogue.manifest.counts,
  profileCount: fixtures.length,
  conditions:
    'Node local CPU, compile/schema validation excluded, fixed 2026-09-10T01:00:00Z clock; not browser INP',
  p95Ms: timings[Math.ceil(timings.length * 0.95) - 1],
  interpretation:
    'Legacy requirements remain unreviewed, so the new engine reports uncertainty instead of reusing old unverified hard filters. Old/new counts are diagnostic, not a conversion or quality improvement claim.',
  results,
};
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/matching-engine-evaluation.json', JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      counts: report.counts,
      profiles: report.profileCount,
      p95Ms: report.p95Ms,
      allIdentitiesEvaluated: true,
      interpretation: report.interpretation,
    },
    null,
    2
  )
);
