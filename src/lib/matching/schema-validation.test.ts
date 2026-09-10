// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { eligibilityEvidenceSchema } from './field-evidence';
import { evidenceInputSchema, matchingSchema, runtimeMatchingSchema } from './schema';
import { legacyMatching } from './normalize';
import { evaluateRequirement } from './evaluate';
import { scholarshipUpdateSchema, programUpdateSchema } from '../admin-schemas';

beforeEach(() => {
  vi.useFakeTimers();
  // September 10 in Alberta, even though UTC has reached September 11.
  vi.setSystemTime(new Date('2026-09-11T00:30:00Z'));
});
afterEach(() => vi.useRealTimers());

const evidence = {
  status: 'partial', sourceUrl: 'https://example.test/rules',
  quote: 'Synthetic provider criterion.', summary: '', verifiedAt: '2026-09-10',
};
const field = (patch: Record<string, unknown> = {}) => ({
  minAge: { ...evidence, value: 18, tier: 'gate', referenceDate: '2027-01-01', ...patch },
});

it.each(['', ' ', 'not a URL', 'https://', 'https://[broken', '/rules', 'ftp://example.test/rules'])(
  'rejects sourceUrl %j with structured issues instead of throwing', (sourceUrl) => {
    const result = eligibilityEvidenceSchema.safeParse(field({ sourceUrl }));
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'minAge.sourceUrl')).toBe(true);
    for (const schema of [scholarshipUpdateSchema, programUpdateSchema])
      expect(schema.safeParse({ eligibilityEvidence: field({ sourceUrl }) }).success).toBe(false);
  }
);

it.each(['http://example.test/rules', 'https://example.test/rules'])(
  'accepts supported sourceUrl %s', (sourceUrl) => {
    expect(eligibilityEvidenceSchema.safeParse(field({ sourceUrl })).success).toBe(true);
  }
);

it('keeps a quoteless, undated signal valid and a quoteless gate invalid', () => {
  const partial = { quote: '', sourceUrl: null, verifiedAt: null };
  expect(eligibilityEvidenceSchema.safeParse(field({ ...partial, tier: 'signal' })).success).toBe(true);
  expect(eligibilityEvidenceSchema.safeParse(field(partial)).success).toBe(false);
});

it.each(['2026-09-11', '2027-01-01'])('rejects future verifiedAt %s at authoring boundaries', (verifiedAt) => {
  const result = eligibilityEvidenceSchema.safeParse(field({ verifiedAt }));
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ['minAge', 'verifiedAt'], message: expect.stringContaining('future'),
    }));
  for (const schema of [scholarshipUpdateSchema, programUpdateSchema])
    expect(schema.safeParse({ eligibilityEvidence: field({ verifiedAt }) }).success).toBe(false);
});

it('checks Alberta midnight at parse time, while allowing future provider reference and expiry dates', () => {
  expect(evidenceInputSchema.safeParse({ ...evidence, verifiedAt: '2026-09-09' }).success).toBe(true);
  expect(eligibilityEvidenceSchema.safeParse(field({ expiresOn: '2027-01-01' })).success).toBe(true);
  expect(evidenceInputSchema.safeParse({ ...evidence, verifiedAt: '2026-09-11' }).success).toBe(false);
  vi.setSystemTime(new Date('2026-09-11T06:00:00Z'));
  expect(evidenceInputSchema.safeParse({ ...evidence, verifiedAt: '2026-09-11' }).success).toBe(true);
});

it.each(['coverage', 'availability', 'requirement'])('rejects future %s review dates in authored documents but loads cached assets as uncertain', (location) => {
  const document = legacyMatching({ id: 1, title: 'Synthetic award', eligibility: { minAverage: 85 } }, 'scholarship');
  document.requirements = [{
    id: 'synthetic-age', field: 'age', importance: 'mandatory',
    condition: { operator: 'minimum', value: 18 }, referenceDate: '2027-01-01',
    explanation: 'Synthetic age requirement.', evidence: { ...evidence, status: 'reviewed' },
  }];
  document.groups = [];
  document.root = 'synthetic-age';
  const target = location === 'coverage' ? document.coverageEvidence
    : location === 'availability' ? document.availability.evidence : document.requirements[0]!.evidence;
  target.verifiedAt = '2027-01-01';
  expect(matchingSchema.safeParse(document).success).toBe(false);
  const cached = runtimeMatchingSchema.parse(document);
  if (location === 'requirement')
    expect(evaluateRequirement(cached.requirements[0]!, { answers: {
      age: { state: 'answered', fact: { kind: 'number', min: 16, max: 16,
        minInclusive: true, maxInclusive: true, asOf: '2027-01-01' } },
    } }, { today: '2026-09-10' }).state).toBe('unresolved');
});
