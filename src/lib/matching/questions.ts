import type { Opportunity } from './normalize';
import type { Assessment } from './rank';
import type { Requirement } from './schema';
import type { Profile } from './types';
export interface FollowUp {
  key: string;
  rule: Requirement;
  opportunity: Opportunity;
  affected: number;
  personal: boolean;
}
const personalFields = new Set([
  'identity',
  'citizenship',
  'membership',
  'financialNeed',
  'familyIncome',
]);
/** Only ask supported unresolved checks, never infer private characteristics.
 * One explicit attempt per session prevents overlap/uncertainty loops. */
export function nextQuestions(
  opportunities: Opportunity[],
  assessments: Assessment[],
  profile: Profile,
  attempted: string[],
  personal: boolean
): FollowUp[] {
  const byKey = new Map(opportunities.map((o) => [o.key, o]));
  const candidates = new Map<string, FollowUp>();
  for (const a of assessments) {
    if (a.eligibility === 'known_ineligible' || a.availability.status === 'closed') continue;
    const opportunity = byKey.get(a.key)!;
    for (const result of a.rules) {
      const key = result.questionKey;
      if (!key || attempted.includes(key) || profile.answers[key]?.state === 'declined') continue;
      const rule = opportunity.matching.requirements.find((r) => r.id === result.id)!;
      if (
        (['institution', 'average', 'educationStage', 'residence'].includes(rule.field) &&
          !rule.basis) ||
        (rule.field === 'age' && !rule.referenceDate)
      )
        continue;
      if (rule.condition.operator === 'manual' || rule.field === 'familyIncome') continue;
      const sensitive = personalFields.has(rule.field);
      if (sensitive && !personal) continue;
      // Different bases/dates cannot safely share one answer. Ask the first
      // context explicitly and count only rules with that exact contract.
      const current = candidates.get(key);
      if (
        current &&
        JSON.stringify([current.rule.basis, current.rule.referenceDate, current.rule.condition]) ===
          JSON.stringify([rule.basis, rule.referenceDate, rule.condition])
      )
        current.affected++;
      else if (!current)
        candidates.set(key, { key, rule, opportunity, affected: 1, personal: sensitive });
    }
  }
  return [...candidates.values()].sort(
    (a, b) => b.affected - a.affected || a.key.localeCompare(b.key)
  );
}
