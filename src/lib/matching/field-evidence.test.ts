// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { strictEligibilitySchema } from '../eligibility-types';
import { buildMatchingCatalogue } from './catalogue';
import { eligibilityEvidenceSchema, type EligibilityEvidenceKey } from './field-evidence';
import { evaluateEligibility, evaluateRequirement } from './evaluate';
import { normalizeOpportunity } from './normalize';
import type { MatchingDocument, Requirement } from './schema';
import type { Fact, Profile } from './types';

const today = '2026-09-10';
const choices = (value: string, basis?: string): Fact => ({
  kind: 'choices', values: [value], mode: 'actual', complete: true, ...(basis ? { basis } : {}),
});
const number = (value: number, qualifier: { basis?: string; asOf?: string } = {}): Fact => ({
  kind: 'number', min: value, max: value, minInclusive: true, maxInclusive: true, ...qualifier,
});
const boolean = (value: boolean, basis?: string): Fact => ({
  kind: 'boolean', value, ...(basis ? { basis } : {}),
});
type FieldCase = {
  key: EligibilityEvidenceKey;
  value: string | string[] | number | boolean;
  field: Requirement['field'];
  pass: Fact;
  fail: Fact;
  basis?: string;
  referenceDate?: string;
  answerKey?: string;
};

// These are labelled synthetic policies, not provider quotations or source
// certifications. Expected facts are declared independently of rule conversion.
const cases: FieldCase[] = [
  { key: 'grades', value: ['12'], field: 'educationStage', basis: 'synthetic-current-grade',
    pass: choices('12', 'synthetic-current-grade'), fail: choices('11', 'synthetic-current-grade') },
  { key: 'schoolBoards', value: ['MHPSD'], field: 'schoolBoard', pass: choices('MHPSD'), fail: choices('CBE') },
  { key: 'specificSchools', value: ['Synthetic School A'], field: 'school',
    pass: choices('Synthetic School A'), fail: choices('Synthetic School B') },
  { key: 'targetInstitutions', value: ['Synthetic College A'], field: 'institution', basis: 'synthetic-enrollment',
    pass: choices('Synthetic College A', 'synthetic-enrollment'), fail: choices('Synthetic College B', 'synthetic-enrollment') },
  { key: 'fields', value: ['STEM'], field: 'field', pass: choices('STEM'), fail: choices('arts') },
  { key: 'minAverage', value: 85, field: 'average', basis: 'synthetic-five-course-average',
    pass: number(85, { basis: 'synthetic-five-course-average' }), fail: number(84, { basis: 'synthetic-five-course-average' }) },
  { key: 'minAge', value: 18, field: 'age', referenceDate: today,
    pass: number(18, { asOf: today }), fail: number(17, { asOf: today }) },
  { key: 'maxAge', value: 20, field: 'age', referenceDate: today,
    pass: number(20, { asOf: today }), fail: number(21, { asOf: today }) },
  { key: 'genderRequired', value: 'female', field: 'identity', answerKey: 'synthetic.gender',
    pass: boolean(true), fail: boolean(false) },
  { key: 'indigenousRequired', value: true, field: 'identity', answerKey: 'synthetic.indigenous',
    pass: boolean(true), fail: boolean(false) },
  { key: 'bipocRequired', value: true, field: 'identity', answerKey: 'synthetic.bipoc',
    pass: boolean(true), fail: boolean(false) },
  { key: 'financialNeed', value: true, field: 'financialNeed', basis: 'synthetic-need-standard', answerKey: 'synthetic.need',
    pass: boolean(true, 'synthetic-need-standard'), fail: boolean(false, 'synthetic-need-standard') },
  { key: 'maxFamilyIncome', value: 65_000, field: 'familyIncome', basis: 'synthetic-previous-tax-year-household',
    pass: number(65_000, { basis: 'synthetic-previous-tax-year-household' }), fail: number(65_001, { basis: 'synthetic-previous-tax-year-household' }) },
  { key: 'fosterCare', value: true, field: 'identity', answerKey: 'synthetic.foster-care',
    pass: boolean(true), fail: boolean(false) },
  { key: 'citizenship', value: 'permanent_resident', field: 'citizenship', basis: 'legal-status',
    pass: choices('permanent_resident', 'legal-status'), fail: choices('other', 'legal-status') },
  { key: 'apprenticeship', value: true, field: 'apprenticeship', pass: boolean(true), fail: boolean(false) },
  { key: 'extracurriculars', value: ['volunteer', 'music'], field: 'activity', answerKey: 'synthetic.activity',
    pass: choices('volunteer'), fail: choices('sports') },
];
const evidenceFor = (testCase: FieldCase) => ({
  value: testCase.value,
  tier: 'gate' as const,
  status: 'reviewed' as const,
  summary: `Synthetic policy test for ${testCase.key}.`,
  quote: `Synthetic test policy only: the declared ${testCase.key} restriction is ${JSON.stringify(testCase.value)}.`,
  sourceUrl: `https://example.test/synthetic-policies/${testCase.key}`,
  verifiedAt: today,
  ...(testCase.basis ? { basis: testCase.basis } : {}),
  ...(testCase.referenceDate ? { referenceDate: testCase.referenceDate } : {}),
  ...(testCase.answerKey ? { answerKey: testCase.answerKey } : {}),
});
const rowFor = (testCase: FieldCase, evidence: unknown = evidenceFor(testCase)) => ({
  id: 1,
  title: 'Synthetic field evidence safety fixture',
  url: 'https://example.test/synthetic-policies/',
  // A separate, unreviewed provider condition must remain unresolved even when
  // the one labelled field is satisfied or fails a verified requirement.
  eligibility: { minAverage: 99 },
  description: 'Synthetic legacy condition whose source has not been reviewed.',
  eligibilityEvidence: { [testCase.key]: evidence },
});
const documentFor = (testCase: FieldCase) => normalizeOpportunity(rowFor(testCase), 'scholarship').matching;
const gateFor = (document: MatchingDocument, testCase: FieldCase) =>
  document.requirements.find((rule) => rule.id === `eligibility-evidence-${testCase.key}`)!;
const profileFor = (testCase: FieldCase, fact: Fact): Profile => ({
  answers: { [testCase.answerKey ?? testCase.field]: { state: 'answered', fact } },
});

describe('field-level evidence exclusion safety', () => {
  it('covers every one of the 17 eligibility fields without duplicate cases', () => {
    expect(cases).toHaveLength(17);
    expect(new Set(cases.map((testCase) => testCase.key)).size).toBe(17);
    expect(cases.map((testCase) => testCase.key).sort()).toEqual(Object.keys(strictEligibilitySchema.shape).sort());
  });

  it.each(cases)('$key: a verified qualifying fact resolves only that field', (testCase) => {
    const document = documentFor(testCase);
    const result = evaluateEligibility(document, profileFor(testCase, testCase.pass), { today });
    expect(result.eligibility).toBe('worth_checking');
    expect(result.scopeReviewed).toBe(false);
    expect(document.coverage).toBe('partial');
    expect(result.rules.find((rule) => rule.id === gateFor(document, testCase).id)?.state).toBe('satisfied');
    expect(result.rules.filter((rule) => rule.id.startsWith('legacy-')).every((rule) => rule.state === 'unresolved')).toBe(true);
  });

  it.each(cases)('$key: one verified negative can exclude while other fields remain uncertified', (testCase) => {
    const document = documentFor(testCase);
    const result = evaluateEligibility(document, profileFor(testCase, testCase.fail), { today });
    expect(result.eligibility).toBe('known_ineligible');
    expect(result.scopeReviewed).toBe(false);
    expect(document.coverage).toBe('partial');
    expect(result.rules.filter((rule) => rule.id.startsWith('legacy-')).every((rule) => rule.state === 'unresolved')).toBe(true);
    expect(result.rules.filter((rule) => rule.state === 'not_satisfied').map((rule) => rule.id))
      .toEqual([gateFor(document, testCase).id]);
  });

  it.each(cases)('$key: no quote, source, or review date fails schema and catalogue build boundaries', async (testCase) => {
    for (const patch of [{ quote: '' }, { quote: '  ' }, { sourceUrl: null }, { verifiedAt: null }]) {
      const invalid = { ...evidenceFor(testCase), ...patch };
      expect(eligibilityEvidenceSchema.safeParse({ [testCase.key]: invalid }).success).toBe(false);
      await expect(buildMatchingCatalogue({
        scholarship: [rowFor(testCase, invalid)],
        program: [{ id: 1, name: 'Synthetic program', url: 'https://example.test/program' }],
      })).rejects.toThrow(/No quote, no gate/);
    }
  });

  it('false-exclusion rate is zero across labelled 17-field uncertainty variants', () => {
    let evaluated = 0;
    let falseExclusions = 0;
    const perVariant = new Map<string, number>();
    for (const testCase of cases) {
      const freshDocument = documentFor(testCase);
      const negative = profileFor(testCase, testCase.fail);
      const answerKey = testCase.answerKey ?? testCase.field;
      const variants: { label: string; profile: Profile; evidence?: Partial<Requirement['evidence']> }[] = [
        { label: 'qualifying answer', profile: profileFor(testCase, testCase.pass) },
        { label: 'missing answer', profile: { answers: {} } },
        ...(['unanswered', 'declined', 'not-sure', 'not-applicable'] as const).map((state) => ({
          label: state, profile: { answers: { [answerKey]: { state } } },
        })),
        { label: 'partial evidence', profile: negative, evidence: { status: 'partial' } },
        { label: 'stale over 365 days', profile: negative, evidence: { verifiedAt: '2025-09-09' } },
        { label: 'future review', profile: negative, evidence: { verifiedAt: '2026-09-11' } },
        { label: 'missing quote in old asset', profile: negative, evidence: { quote: '' } },
        { label: 'expired evidence', profile: negative, evidence: { expiresOn: '2026-09-09' } },
      ];
      for (const variant of variants) {
        const document = structuredClone(freshDocument);
        const gate = gateFor(document, testCase);
        if (variant.evidence) Object.assign(gate.evidence, variant.evidence);
        const result = evaluateEligibility(document, variant.profile, { today });
        evaluated++;
        perVariant.set(variant.label, (perVariant.get(variant.label) ?? 0) + 1);
        if (result.eligibility === 'known_ineligible') falseExclusions++;
        expect(result.eligibility, `${testCase.key}: ${variant.label}`).toBe('worth_checking');
      }
    }
    expect(perVariant.size).toBe(11);
    expect([...perVariant.values()].every((count) => count === 17)).toBe(true);
    expect(evaluated).toBe(187);
    expect(falseExclusions).toBe(0);
    expect(falseExclusions / evaluated).toBe(0);
  });

  it.each(cases)('$key: a legacy excerpt without a quote cannot exclude at runtime', (testCase) => {
    const document = documentFor(testCase);
    const gate = gateFor(document, testCase);
    const { quote: _quote, ...withoutQuote } = gate.evidence;
    // Simulate a cached asset authored under the old evidence contract.
    const oldAssetRule = {
      ...gate,
      evidence: { ...withoutQuote, excerpt: 'Synthetic legacy paraphrase; not a provider quote.' },
    } as unknown as Requirement;
    expect(evaluateRequirement(oldAssetRule, profileFor(testCase, testCase.fail), { today }))
      .toMatchObject({ state: 'unresolved', code: 'evidence-unreviewed', quote: null });
  });

  it('permanent_resident eligibility accepts both a citizen and a permanent resident', () => {
    const testCase = cases.find((entry) => entry.key === 'citizenship')!;
    const document = documentFor(testCase);
    const gate = gateFor(document, testCase);
    for (const status of ['canadian_citizen', 'permanent_resident'])
      expect(evaluateRequirement(gate, profileFor(testCase, choices(status, 'legal-status')), { today }).state)
        .toBe('satisfied');
    expect(evaluateRequirement(gate, profileFor(testCase, choices('other', 'legal-status')), { today }).state)
      .toBe('not_satisfied');
  });

  it('a signal never becomes a mandatory gate even with a reviewed quote', () => {
    for (const testCase of cases) {
      const row = rowFor(testCase, { ...evidenceFor(testCase), tier: 'signal' });
      const document = normalizeOpportunity(row, 'scholarship').matching;
      expect(document.requirements.some((rule) => rule.id.startsWith('eligibility-evidence-'))).toBe(false);
      expect(evaluateEligibility(document, profileFor(testCase, testCase.fail), { today }).eligibility)
        .toBe('worth_checking');
    }
  });

  it('measures the 365-day freshness boundary across a leap day by elapsed days', () => {
    const testCase = cases.find((entry) => entry.key === 'apprenticeship')!;
    const gate = gateFor(documentFor(testCase), testCase);
    gate.evidence.verifiedAt = '2024-02-29';
    const profile = profileFor(testCase, testCase.fail);
    expect(evaluateRequirement(gate, profile, { today: '2025-02-28' }).state).toBe('not_satisfied');
    expect(evaluateRequirement(gate, profile, { today: '2025-03-01' }).state).toBe('unresolved');
  });

  it('honours an explicit leap-day expiry inclusively and rejects impossible dates', () => {
    const testCase = cases.find((entry) => entry.key === 'apprenticeship')!;
    const gate = gateFor(documentFor(testCase), testCase);
    gate.evidence.verifiedAt = '2024-02-28';
    gate.evidence.expiresOn = '2024-02-29';
    const profile = profileFor(testCase, testCase.fail);
    expect(evaluateRequirement(gate, profile, { today: '2024-02-29' }).state).toBe('not_satisfied');
    expect(evaluateRequirement(gate, profile, { today: '2024-03-01' }).state).toBe('unresolved');
    expect(eligibilityEvidenceSchema.safeParse({
      apprenticeship: { ...evidenceFor(testCase), expiresOn: '2025-02-29' },
    }).success).toBe(false);
    gate.evidence.expiresOn = '2025-02-29';
    expect(evaluateRequirement(gate, profile, { today: '2024-02-29' }).state).toBe('unresolved');
  });
});
