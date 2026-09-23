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
  | 'concluded'
> & {
  // Sparse: present only when they change the status (see quizPayload).
  openDate?: string | null;
  active?: boolean;
  deadlineEstimated?: boolean;
};
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
      ({ id, title, amount, deadline, audience, url, region, eligibility, alsoOpenTo, concluded, openDate, active, deadlineEstimated }) => ({
        id,
        title,
        amount,
        deadline,
        audience,
        url,
        region,
        eligibility,
        alsoOpenTo,
        // Only when true, so the rest of the catalogue ships no extra bytes.
        ...(concluded ? { concluded: true } : {}),
        // What the results need to say whether a match is open today, in the
        // same sparse style: most listings are active with no open date.
        ...(openDate ? { openDate } : {}),
        ...(active === false ? { active: false } : {}),
        ...(deadlineEstimated ? { deadlineEstimated: true } : {}),
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
