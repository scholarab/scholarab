// @vitest-environment node
import { expect, it } from 'vitest';
import { loadProgramsFromJson, loadScholarshipsFromJson } from './data-loader';
import { quizPayload, readQuizPayload } from './quiz-payload';
import { EMPTY_ELIGIBILITY } from './eligibility-defaults';
import type { Scholarship } from './data-loader';

it('preserves every catalogue identity and matching criterion after JSON transport', async () => {
  const scholarships = await loadScholarshipsFromJson();
  const programs = await loadProgramsFromJson();
  const data = readQuizPayload(JSON.parse(JSON.stringify(quizPayload(scholarships, programs))));
  expect(data.scholarships.map(s => s.id)).toEqual(scholarships.map(s => s.id));
  expect(data.programs.map(p => p.id)).toEqual(programs.map(p => p.id));
  expect(data.scholarships.map(s => s.eligibility)).toEqual(scholarships.map(s => s.eligibility));
  expect(data.programs.map(p => [p.active, p.grades, p.category, p.description]))
    .toEqual(programs.map(p => [p.active, p.grades, p.category, p.description]));
});

it('distinguishes unknown eligibility from known defaults and keeps restrictive values', () => {
  const criteria = [null, EMPTY_ELIGIBILITY, { ...EMPTY_ELIGIBILITY, genderRequired: 'female' as const, minAverage: 0, financialNeed: true }];
  const data = readQuizPayload(JSON.parse(JSON.stringify(quizPayload(
    criteria.map((eligibility, id) => ({ id, eligibility })) as Scholarship[], [],
  ))));
  expect(data.scholarships.map(s => s.eligibility)).toEqual(criteria);
});
