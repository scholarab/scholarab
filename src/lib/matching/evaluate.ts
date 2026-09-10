import type { MatchingDocument, Requirement } from './schema';
import type { Profile, RuleResult, RuleState, GroupResult, Eligibility } from './types';
import { schoolBoardEntities, resolveEntity, type Entity } from './aliases';
export interface EvaluationContext {
  today: string;
  entities?: Partial<Record<Requirement['field'], Entity[]>>;
}
const fold = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-CA');
const messages: Record<string, string> = {
  'evidence-unreviewed': 'The provider requirement still needs source verification.',
  'manual-check': 'Check this requirement on the provider’s official page.',
  'importance-unknown': 'Confirm whether this is an eligibility requirement or a preference.',
  'answer-missing': 'An answer is needed to check this requirement.',
  'answer-declined': 'You skipped this topic; this requirement remains unchecked.',
  'answer-uncertain':
    'This requirement remains unchecked because the answer is uncertain or not applicable.',
  'scope-mismatch': 'The answer concerns a different date or qualification basis.',
  'specific-question-needed': 'This requirement needs a provider-specific question.',
  'answer-type-mismatch': 'The answer cannot be compared with this requirement.',
  'interval-overlap': 'Your answer range crosses the provider’s threshold.',
  'choices-incomplete': 'The information supplied does not resolve this requirement.',
  satisfied: 'Your answer meets this checked requirement.',
  'not-satisfied': 'Your answer does not meet this checked requirement.',
};
export function evaluateRequirement(
  rule: Requirement,
  profile: Profile,
  context: EvaluationContext
): RuleResult {
  const key = rule.answerKey ?? rule.field;
  const result = (
    state: RuleState,
    code: string,
    questionKey: string | null = null
  ): RuleResult => ({
    id: rule.id,
    field: rule.field,
    importance: rule.importance,
    state,
    code,
    explanation: `${rule.explanation} ${messages[code] ?? code}`,
    sourceUrl: rule.evidence.sourceUrl,
    questionKey,
    local: rule.field === 'residence' && rule.basis === 'community' && state === 'satisfied',
  });
  if (
    rule.evidence.status !== 'reviewed' ||
    !rule.evidence.verifiedAt ||
    rule.evidence.verifiedAt > context.today ||
    !rule.evidence.sourceUrl ||
    !rule.evidence.excerpt.trim()
  )
    return result('unresolved', 'evidence-unreviewed');
  if (rule.condition.operator === 'manual' || rule.field === 'manual')
    return result('unresolved', 'manual-check');
  if (rule.importance === 'unknown') return result('unresolved', 'importance-unknown');
  // A generic identity/membership/need boolean cannot answer distinct providers'
  // criteria. Never infer one identity, affiliation, or need standard from another.
  if (
    ['identity', 'membership', 'activity', 'financialNeed', 'nomination'].includes(rule.field) &&
    !rule.answerKey
  )
    return result('unresolved', 'specific-question-needed');
  const answer = profile.answers[key];
  if (!answer || answer.state === 'unanswered') return result('unresolved', 'answer-missing', key);
  if (answer.state === 'declined') return result('unresolved', 'answer-declined');
  if (answer.state !== 'answered')
    return result('unresolved', 'answer-uncertain', answer.state === 'not-sure' ? key : null);
  const fact = answer.fact;
  if (
    (rule.basis && rule.basis !== fact.basis) ||
    (rule.referenceDate && rule.referenceDate !== fact.asOf) ||
    (rule.field === 'age' && !rule.referenceDate)
  )
    return result('unresolved', 'scope-mismatch', key);
  // Institution and marks must distinguish enrollment/plans and the provider's
  // average calculation. Legacy unqualified rules cannot silently hard-filter.
  if (['institution', 'average', 'educationStage', 'residence'].includes(rule.field) && !rule.basis)
    return result('unresolved', 'specific-question-needed');
  let state: RuleState = 'unresolved';
  let code = 'answer-type-mismatch';
  const condition = rule.condition;
  if (condition.operator === 'minimum' || condition.operator === 'maximum') {
    if (fact.kind === 'number') {
      if (
        ['age', 'average', 'familyIncome'].includes(rule.field) &&
        ((fact.min !== null && fact.min < 0) ||
          (fact.max !== null && fact.max < 0) ||
          (rule.field === 'average' && ((fact.min ?? 0) > 100 || (fact.max ?? 100) > 100)))
      )
        return result('unresolved', 'answer-type-mismatch', key);

      const threshold = condition.value;
      if (condition.operator === 'minimum')
        state =
          fact.min !== null && fact.min >= threshold
            ? 'satisfied'
            : fact.max !== null &&
                (fact.max < threshold || (fact.max === threshold && !fact.maxInclusive))
              ? 'not_satisfied'
              : 'unresolved';
      else
        state =
          fact.max !== null && fact.max <= threshold
            ? 'satisfied'
            : fact.min !== null &&
                (fact.min > threshold || (fact.min === threshold && !fact.minInclusive))
              ? 'not_satisfied'
              : 'unresolved';
      code =
        state === 'unresolved'
          ? 'interval-overlap'
          : state === 'satisfied'
            ? 'satisfied'
            : 'not-satisfied';
    }
  } else if (condition.operator === 'equals' && fact.kind === 'boolean') {
    state = fact.value === condition.value ? 'satisfied' : 'not_satisfied';
    code = state === 'satisfied' ? 'satisfied' : 'not-satisfied';
  } else if (condition.operator === 'oneOf' && fact.kind === 'choices') {
    const entities =
      context.entities?.[rule.field] ??
      (rule.field === 'schoolBoard' ? schoolBoardEntities : undefined);
    const normalize = (v: string) => (entities ? resolveEntity(v, entities) : fold(v));
    const wanted = condition.values.map(normalize),
      actual = fact.values.map(normalize);
    if (wanted.some((v) => v === null) || actual.some((v) => v === null))
      return result('unresolved', 'choices-incomplete', key);
    const hits = actual.filter((v) => wanted.includes(v)).length;
    state =
      fact.mode === 'possible'
        ? hits === actual.length
          ? 'satisfied'
          : hits === 0 && fact.complete
            ? 'not_satisfied'
            : 'unresolved'
        : hits > 0
          ? 'satisfied'
          : fact.complete
            ? 'not_satisfied'
            : 'unresolved';
    code =
      state === 'unresolved'
        ? 'choices-incomplete'
        : state === 'satisfied'
          ? 'satisfied'
          : 'not-satisfied';
  }
  return result(state, code, state === 'unresolved' ? key : null);
}
export function evaluateEligibility(
  document: MatchingDocument,
  profile: Profile,
  context: EvaluationContext
) {
  const rules = document.requirements.map((r) => evaluateRequirement(r, profile, context));
  const ruleMap = new Map(rules.map((r) => [r.id, r])),
    groupMap = new Map(document.groups.map((g) => [g.id, g]));
  const groups: GroupResult[] = [];
  const visit = (id: string, path: Set<string>): RuleState | null => {
    if (path.has(id)) return 'unresolved';
    const rule = ruleMap.get(id);
    if (rule) return rule.importance === 'preference' ? null : rule.state;
    const group = groupMap.get(id);
    if (!group) return 'unresolved';
    const next = new Set([...path, id]);
    const children = group.children.map((child) => ({ id: child, state: visit(child, next) }));
    const states = children.map((c) => c.state).filter((s): s is RuleState => s !== null);
    if (!states.length) return null;
    const state =
      group.operator === 'all'
        ? states.includes('not_satisfied')
          ? 'not_satisfied'
          : states.includes('unresolved')
            ? 'unresolved'
            : 'satisfied'
        : states.includes('satisfied')
          ? 'satisfied'
          : states.every((s) => s === 'not_satisfied')
            ? 'not_satisfied'
            : 'unresolved';
    groups.push({
      id,
      state,
      children: group.children,
      ignoredPreferences: children.filter((c) => c.state === null).map((c) => c.id),
    });
    return state;
  };
  const aggregate = document.root ? visit(document.root, new Set()) : 'satisfied';
  const scopeReviewed =
    document.coverage === 'reviewed' &&
    document.coverageEvidence.status === 'reviewed' &&
    !!document.coverageEvidence.verifiedAt &&
    document.coverageEvidence.verifiedAt <= context.today;
  const eligibility: Eligibility =
    aggregate === 'not_satisfied'
      ? 'known_ineligible'
      : aggregate === 'unresolved' || !scopeReviewed
        ? 'worth_checking'
        : 'meets_checked_requirements';
  const blocking = new Set<string>();
  const collect = (id: string): void => {
    const rule = ruleMap.get(id);
    if (rule) {
      if (rule.importance !== 'preference' && rule.state === 'unresolved') blocking.add(id);
      return;
    }
    const group = groups.find((g) => g.id === id);
    if (group?.state === 'unresolved') group.children.forEach(collect);
  };
  if (document.root && aggregate === 'unresolved') collect(document.root);
  return {
    eligibility,
    rules,
    groups,
    scopeReviewed,
    unresolvedRequirements: [...blocking],
    preferenceMatches: rules
      .filter((r) => r.importance === 'preference' && r.state === 'satisfied')
      .map((r) => r.id),
  };
}
