import { type CatalogueKind, type Document, validateCatalogue } from '../catalogue';
import { generateSlug } from '../utils';
import { matchingSchema, type MatchingDocument, type Requirement } from './schema';
import { eligibilityEvidenceSchema, applyFieldEvidence } from './field-evidence';
export const identity = (kind: CatalogueKind, id: number) => `${kind}:${id}`;
const text = (v: unknown) => (typeof v === 'string' ? v : null);
const date = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
/** Legacy clues are not verified eligibility. Never interpret false/defaults as
 * proof that a restriction was checked and absent. No LLM or inferred aliases. */
export function legacyMatching(row: Document, kind: CatalogueKind): MatchingDocument {
  const evidence = {
    status: 'legacy-unreviewed' as const,
    sourceUrl: text(row.url),
    summary: '',
    quote: '',
    verifiedAt: null,
  };
  const requirements: Requirement[] = [];
  const add = (
    field: Requirement['field'],
    value: unknown,
    operator: 'oneOf' | 'minimum' | 'maximum' | 'equals' | 'manual' = 'oneOf'
  ) => {
    if (value == null || value === false || (Array.isArray(value) && !value.length) || value === '')
      return;
    const condition: Requirement['condition'] =
      operator === 'manual'
        ? { operator, text: typeof value === 'string' ? value : JSON.stringify(value) }
        : operator === 'minimum' || operator === 'maximum'
          ? { operator, value: Number(value) }
          : operator === 'equals'
            ? { operator, value: true }
            : { operator: 'oneOf', values: (Array.isArray(value) ? value : [value]).map(String) };
    requirements.push({
      id: `legacy-${field}-${requirements.length}`,
      field,
      importance: 'unknown',
      condition,
      explanation: `Verify the provider's ${field} requirement.`,
      referenceDate: null,
      evidence: { ...evidence, summary: JSON.stringify(value).slice(0, 4000) },
    });
  };
  if (kind === 'scholarship') {
    const e =
      row.eligibility && typeof row.eligibility === 'object' && !Array.isArray(row.eligibility)
        ? (row.eligibility as Record<string, unknown>)
        : {};
    const fields: Record<string, Requirement['field']> = {
      grades: 'educationStage',
      specificSchools: 'school',
      schoolBoards: 'schoolBoard',
      targetInstitutions: 'institution',
      fields: 'field',
      extracurriculars: 'activity',
    };
    for (const [key, field] of Object.entries(fields)) add(field, e[key]);
    for (const [key, field, operator] of [
      ['minAge', 'age', 'minimum'],
      ['maxAge', 'age', 'maximum'],
      ['minAverage', 'average', 'minimum'],
      ['maxFamilyIncome', 'familyIncome', 'maximum'],
    ] as const)
      add(field, e[key], operator);
    for (const key of ['genderRequired', 'indigenousRequired', 'bipocRequired', 'fosterCare'])
      if (e[key]) add('identity', `${key}: ${String(e[key])}`, 'manual');
    if (e.financialNeed) add('financialNeed', true, 'equals');
    if (e.apprenticeship) add('apprenticeship', true, 'equals');
    if (e.citizenship && e.citizenship !== 'any') add('citizenship', e.citizenship);
    const known = new Set([
      ...Object.keys(fields),
      'minAge',
      'maxAge',
      'minAverage',
      'maxFamilyIncome',
      'genderRequired',
      'indigenousRequired',
      'bipocRequired',
      'fosterCare',
      'financialNeed',
      'apprenticeship',
      'citizenship',
    ]);
    for (const [key, value] of Object.entries(e))
      if (!known.has(key)) add('manual', `${key}: ${JSON.stringify(value)}`, 'manual');
    if (row.region)
      add('residence', [row.region, ...(Array.isArray(row.alsoOpenTo) ? row.alsoOpenTo : [])]);
    if (row.applyViaGuidance)
      add('nomination', 'Guidance involvement: verify whether nomination is required.', 'manual');
    if (row.audience) add('manual', row.audience, 'manual');
  } else {
    if (row.grades) add('educationStage', row.grades, 'manual');
    if (row.location)
      add(
        'manual',
        `Program location (not necessarily a residency requirement): ${String(row.location)}`,
        'manual'
      );
    if (row.eligibility) add('manual', row.eligibility, 'manual');
  }
  // These fields are already public listing copy and can contain conditions
  // absent from the old structured object. Preserve them as manual checks.
  if (row.notes) add('manual', row.notes, 'manual');
  if (row.description) add('manual', row.description, 'manual');
  // Preserve uncertainty even for an empty/default eligibility object.
  add(
    'manual',
    'Full provider eligibility and application method have not been reviewed in the new matching contract.',
    'manual'
  );
  const closesOn = date(row.deadline),
    opensOn = date(row.openDate);
  return matchingSchema.parse({
    version: 1,
    coverage: 'partial',
    coverageEvidence: evidence,
    requirements,
    groups: [{ id: 'legacy-root', operator: 'all', children: requirements.map((r) => r.id) }],
    root: 'legacy-root',
    availability: {
      method: 'unknown',
      timing: closesOn ? 'dated' : 'unknown',
      opensOn,
      closesOn,
      cycle: null,
      timezone: null,
      evidence: {
        ...evidence,
        summary: `Legacy deadline: ${String(row.deadline ?? 'unpublished')}; opening: ${String(row.openDate ?? 'unknown')}`,
      },
    },
  });
}
function programStages(label: string | null): string[] {
  if (!label) return [];
  if (/^high school$/i.test(label)) return ['10', '11', '12'];
  const range = /^Grades? (10|11|12)[–-](10|11|12)$/i.exec(label);
  if (range) return ['10', '11', '12'].filter((v) => +v >= +range[1]! && +v <= +range[2]!);
  const single = /^Grade (10|11|12)$/i.exec(label);
  return single ? [single[1]!] : [];
}
export function normalizeOpportunity(row: Document, kind: CatalogueKind) {
  validateCatalogue([row], kind);
  const eligibilityEvidence = eligibilityEvidenceSchema.parse(row.eligibilityEvidence ?? {});
  const matching = applyFieldEvidence(
    row.matching == null ? legacyMatching(row, kind) : matchingSchema.parse(row.matching),
    eligibilityEvidence
  );
  const title = String(kind === 'scholarship' ? row.title : row.name);
  return {
    key: identity(kind, row.id),
    kind,
    publicId: row.id,
    title,
    provider: text(row.provider),
    url: String(row.url),
    detailPath: `/${kind === 'scholarship' ? 'scholarships' : 'programs'}/${generateSlug(title)}/`,
    amount: text(row.amount),
    stipend: text(row.stipend),
    paid: row.paid === true,
    active: row.active !== false,
    applyViaGuidance: kind === 'scholarship' && row.applyViaGuidance === true,
    legacyDeadline: text(row.deadline),
    legacyOpenDate: text(row.openDate),
    // Discovery metadata influences ordering only, never eligibility. Preserve
    // explicit listing values without guessing residence from a program venue.
    discovery: {
      stages:
        kind === 'scholarship'
          ? (((row.eligibility as Record<string, unknown> | undefined)?.grades ?? []) as string[])
          : programStages(text(row.grades)),
      communities:
        kind === 'scholarship'
          ? [text(row.region), ...(Array.isArray(row.alsoOpenTo) ? row.alsoOpenTo : [])].filter(
              (v): v is string => typeof v === 'string'
            )
          : [],
    },
    matching,
    eligibilityEvidence,
    issues: [
      ...(matching.coverage !== 'reviewed' ? ['coverage-unreviewed'] : []),
      ...(matching.availability.evidence.status !== 'reviewed' ? ['availability-unreviewed'] : []),
      ...matching.requirements
        .filter(
          (r) =>
            r.evidence.status !== 'reviewed' ||
            r.condition.operator === 'manual' ||
            r.importance === 'unknown'
        )
        .map((r) => `unresolved:${r.id}`),
    ],
  };
}
export type Opportunity = ReturnType<typeof normalizeOpportunity>;
