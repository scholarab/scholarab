import type { Scholarship, Program } from './data-loader';
import { EMPTY_ELIGIBILITY } from './eligibility-defaults';

/** Matching inputs plus the fields shown on a result row. Full details stay on the listing. */
export type QuizScholarship = Pick<Scholarship,
  'id' | 'title' | 'amount' | 'deadline' | 'url' | 'region' | 'eligibility' | 'alsoOpenTo' | 'concluded'>;
export type QuizProgram = Pick<Program,
  'id' | 'name' | 'provider' | 'category' | 'grades' | 'deadline' | 'active' | 'paid' | 'stipend' | 'url' | 'description'>;

export function quizPayload(scholarships: Scholarship[], programs: Program[]) {
  return {
    version: 2 as const,
    scholarships: scholarships.map(({ id, title, amount, deadline, url, region, eligibility, alsoOpenTo, concluded }) => ({
      id, title, amount, deadline, url, region, alsoOpenTo,
      // Omit schema defaults in transit. An empty object still means known
      // criteria, distinct from null, which the matcher scores differently.
      eligibility: eligibility ? Object.fromEntries(Object.entries(eligibility).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(EMPTY_ELIGIBILITY[key as keyof typeof EMPTY_ELIGIBILITY]))) : null,
      ...(concluded ? { concluded: true } : {}),
    })),
    programs: programs.map(({ id, name, provider, category, grades, deadline, active, paid, stipend, url, description }) => ({
      id, name, provider, category, grades, deadline, active, paid, stipend, url, description,
    })),
  };
}

/** Expand once at the boundary; the matcher keeps its original input contract. */
export function readQuizPayload(value: unknown): { version: 2; scholarships: QuizScholarship[]; programs: QuizProgram[] } {
  const data = value as ReturnType<typeof quizPayload> | null;
  if (!data || data.version !== 2 || !Array.isArray(data.scholarships) || !Array.isArray(data.programs))
    throw new Error('Please reload to get the latest quiz');
  return { ...data, scholarships: data.scholarships.map(row => ({
    ...row, eligibility: row.eligibility ? { ...EMPTY_ELIGIBILITY, ...row.eligibility } : null,
  })) };
}
