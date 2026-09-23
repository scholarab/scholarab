import type { EligibilityCriteria } from './eligibility-types';

/**
 * The requirements a student scans a directory row for, as short plain facts
 * ("80% average", "Financial need"). The row's audience line already says who
 * the award is for (the town, the board, the program), so this carries only
 * what that line tends to leave out. Grade 12 is the reader this site is
 * built for, so a grade is named only when it is something else.
 */
export function eligibilityFacts(e: Partial<EligibilityCriteria> | null | undefined): string[] {
  if (!e) return [];
  const facts: string[] = [];
  const grade = gradeFact(e.grades ?? []);
  if (grade) facts.push(grade);
  if (e.minAverage) facts.push(`${e.minAverage}% average`);
  if (e.financialNeed) facts.push('Financial need');
  return facts;
}

function gradeFact(grades: string[]): string | null {
  const nums = grades.map(Number).filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  const post = grades.includes('post-secondary');
  if (!nums.length) return post ? 'Post-secondary students' : null;
  if (nums.length === 1 && nums[0] === 12 && !post) return null;
  const range = nums.length === 1 ? `Grade ${nums[0]}` : `Grades ${nums[0]} to ${nums[nums.length - 1]}`;
  return post ? `${range} or post-secondary` : range;
}
