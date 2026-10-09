import type { Scholarship, Program } from './data-loader';
import type { ComboEntry } from './combo-pick';
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
  | 'localArea'
> & {
  // Sparse: present only when they change the status (see quizPayload).
  openDate?: string | null;
  active?: boolean;
  deadlineEstimated?: boolean;
  rolling?: boolean;
};
export type QuizProgram = Pick<
  Program,
  | 'id'
  | 'name'
  | 'provider'
  | 'category'
  | 'grades'
  | 'deadline'
  | 'openDate'
  | 'active'
  | 'paid'
  | 'stipend'
  | 'url'
  | 'eligibility'
  | 'description'
  | 'location'
>;
/** `combos` is combos.ts's comboIndex, built beside this payload so the
 *  results can name a student's combo without a second download. */
export function quizPayload(scholarships: Scholarship[], programs: Program[], combos: ComboEntry[] = []) {
  return {
    version: 1 as const,
    combos,
    scholarships: scholarships.map(
      ({ id, title, amount, deadline, audience, url, region, eligibility, alsoOpenTo, localArea, concluded, openDate, active, deadlineEstimated, rolling }) => ({
        id,
        title,
        amount,
        deadline,
        audience,
        url,
        region,
        eligibility,
        alsoOpenTo,
        ...(localArea ? { localArea } : {}),
        // Only when true, so the rest of the catalogue ships no extra bytes.
        ...(concluded ? { concluded: true } : {}),
        // What the results need to say whether a match is open today, in the
        // same sparse style: most listings are active with no open date.
        ...(openDate ? { openDate } : {}),
        ...(active === false ? { active: false } : {}),
        ...(deadlineEstimated ? { deadlineEstimated: true } : {}),
        ...(rolling ? { rolling: true } : {}),
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
        openDate,
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
        ...(openDate ? { openDate } : {}),
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
