import type { Scholarship, Program } from './data-loader';
/** Keep only matching inputs and fields actually rendered in results. */
export type QuizScholarship = Pick<
  Scholarship,
  | 'id'
  | 'title'
  | 'amount'
  | 'deadline'
  | 'audience'
  | 'url'
  | 'region'
  | 'eligibility'
  | 'alsoOpenTo'
>;
export type QuizProgram = Pick<
  Program,
  | 'id'
  | 'name'
  | 'provider'
  | 'category'
  | 'grades'
  | 'deadline'
  | 'active'
  | 'paid'
  | 'stipend'
  | 'url'
  | 'eligibility'
  | 'description'
  | 'location'
>;
export function quizPayload(scholarships: Scholarship[], programs: Program[]) {
  return {
    version: 1 as const,
    scholarships: scholarships.map(
      ({ id, title, amount, deadline, audience, url, region, eligibility, alsoOpenTo }) => ({
        id,
        title,
        amount,
        deadline,
        audience,
        url,
        region,
        eligibility,
        alsoOpenTo,
      })
    ),
    programs: programs.map(
      ({
        id,
        name,
        provider,
        category,
        grades,
        deadline,
        active,
        paid,
        stipend,
        url,
        eligibility,
        description,
        location,
      }) => ({
        id,
        name,
        provider,
        category,
        grades,
        deadline,
        active,
        paid,
        stipend,
        url,
        eligibility,
        description,
        location,
      })
    ),
  };
}
