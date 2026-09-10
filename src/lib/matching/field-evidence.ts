import { z } from 'zod';
import { strictEligibilitySchema } from '../eligibility-types';
import { evidenceInputSchema, matchingSchema, type MatchingDocument, type Requirement } from './schema';
import { canonicalEvidence, hasQuotedEvidence } from './evidence';

const answerKey = z.string().regex(/^[a-zA-Z0-9_.:-]{1,150}$/);
const fieldEvidence = <T extends z.ZodType>(value: T) => evidenceInputSchema.extend({
  value,
  tier: z.enum(['gate', 'signal']),
  basis: z.string().min(1).max(200).optional(),
  referenceDate: z.iso.date().nullable().optional(),
  answerKey: answerKey.optional(),
}).strict().transform(canonicalEvidence);

// Use the existing eligibility field shapes without their defaults: an evidence
// record must name the value that was actually reviewed, never an invented one.
const shape = strictEligibilitySchema.shape;
export const eligibilityEvidenceSchema = z.object({
  grades: fieldEvidence(shape.grades.unwrap()).optional(),
  schoolBoards: fieldEvidence(shape.schoolBoards.unwrap()).optional(),
  specificSchools: fieldEvidence(shape.specificSchools.unwrap()).optional(),
  targetInstitutions: fieldEvidence(shape.targetInstitutions.unwrap()).optional(),
  fields: fieldEvidence(shape.fields.unwrap()).optional(),
  minAverage: fieldEvidence(shape.minAverage.unwrap()).optional(),
  minAge: fieldEvidence(shape.minAge.unwrap()).optional(),
  maxAge: fieldEvidence(shape.maxAge.unwrap()).optional(),
  genderRequired: fieldEvidence(shape.genderRequired.unwrap()).optional(),
  indigenousRequired: fieldEvidence(shape.indigenousRequired.unwrap()).optional(),
  bipocRequired: fieldEvidence(shape.bipocRequired.unwrap()).optional(),
  financialNeed: fieldEvidence(shape.financialNeed.unwrap()).optional(),
  maxFamilyIncome: fieldEvidence(shape.maxFamilyIncome.unwrap()).optional(),
  fosterCare: fieldEvidence(shape.fosterCare.unwrap()).optional(),
  citizenship: fieldEvidence(shape.citizenship.unwrap()).optional(),
  apprenticeship: fieldEvidence(shape.apprenticeship.unwrap()).optional(),
  extracurriculars: fieldEvidence(shape.extracurriculars.unwrap()).optional(),
}).strict().superRefine((fields, ctx) => {
  for (const [key, evidence] of Object.entries(fields)) {
    if (!evidence || evidence.tier !== 'gate') continue;
    const reject = (message: string) => ctx.addIssue({ code: 'custom', path: [key], message });
    // A partial gate is an inactive proposal awaiting human approval. Requiring
    // its quote now makes that eventual approval an explicit, reviewable step.
    if (!hasQuotedEvidence(evidence))
      reject('No quote, no gate: supply a verbatim quote, source URL, and verification date');
    const value = evidence.value;
    if (value === null || value === false || value === 'any' ||
      (Array.isArray(value) && (!value.length || value.some((v) => !v.trim()))))
      reject('A gate needs an explicit restriction, not an empty/default value');
    if (['grades', 'targetInstitutions', 'minAverage', 'maxFamilyIncome', 'financialNeed'].includes(key) && !evidence.basis)
      reject('This gate needs the provider-specific qualification basis');
    if (['minAge', 'maxAge'].includes(key) && !evidence.referenceDate)
      reject('An age gate needs the provider reference date');
    if (key === 'citizenship' && evidence.basis !== 'legal-status')
      reject('A citizenship gate must explicitly use the legal-status basis');
    if (['genderRequired', 'indigenousRequired', 'bipocRequired', 'fosterCare', 'financialNeed', 'extracurriculars'].includes(key) && !evidence.answerKey)
      reject('This gate needs an explicit question key for the particular criterion');
    if (typeof value === 'number' && (value < 0 || (key === 'minAverage' && value > 100)))
      reject('The gate threshold is outside the field range');
  }
});

export type EligibilityEvidence = z.infer<typeof eligibilityEvidenceSchema>;
export type EligibilityEvidenceKey = keyof EligibilityEvidence;

const fieldMapping: Record<EligibilityEvidenceKey, Requirement['field']> = {
  grades: 'educationStage', schoolBoards: 'schoolBoard', specificSchools: 'school',
  targetInstitutions: 'institution', fields: 'field', minAverage: 'average',
  minAge: 'age', maxAge: 'age', genderRequired: 'identity', indigenousRequired: 'identity',
  bipocRequired: 'identity', financialNeed: 'financialNeed', maxFamilyIncome: 'familyIncome',
  fosterCare: 'identity', citizenship: 'citizenship', apprenticeship: 'apprenticeship',
  extracurriculars: 'activity',
};

export function applyFieldEvidence(document: MatchingDocument, fields: EligibilityEvidence): MatchingDocument {
  const gates = Object.entries(fields).filter(([, evidence]) => evidence?.tier === 'gate');
  if (!gates.length) return document;
  const result = structuredClone(document);
  const ids = new Set([...result.requirements, ...result.groups].map((node) => node.id));
  const reserveId = (id: string) => {
    if (ids.has(id)) throw new Error(`Field evidence rule/group ID is reserved: ${id}`);
    ids.add(id);
    return id;
  };
  const children = result.root ? [result.root] : [];
  for (const [rawKey, entry] of gates) {
    if (!entry) continue;
    const key = rawKey as EligibilityEvidenceKey;
    const { value, tier: _tier, basis, referenceDate, answerKey, ...evidence } = entry;
    let condition: Requirement['condition'];
    if (typeof value === 'number')
      condition = { operator: key === 'maxAge' || key === 'maxFamilyIncome' ? 'maximum' : 'minimum', value };
    else if (typeof value === 'boolean' || key === 'genderRequired')
      condition = { operator: 'equals', value: value === true || value === 'female' };
    else if (key === 'citizenship')
      // Existing field codes: canadian means citizen; permanent_resident means
      // citizen OR permanent resident. Never narrow that second legacy meaning.
      condition = { operator: 'oneOf', values: value === 'canadian'
        ? ['canadian_citizen'] : ['canadian_citizen', 'permanent_resident'] };
    else
      // Array fields retain the existing oneOf representation. Reviewers must
      // approve that ANY listed value qualifies; an ALL condition belongs in an
      // explicitly authored matching graph, not an inferred field conversion.
      condition = { operator: 'oneOf', values: (Array.isArray(value) ? value : [value]).map(String) };
    const id = reserveId(`eligibility-evidence-${key}`);
    result.requirements.push({
      id, field: fieldMapping[key], importance: 'mandatory', condition,
      explanation: evidence.summary.trim() || `Check the provider's ${key} requirement.`,
      referenceDate: referenceDate ?? null,
      ...(basis ? { basis } : {}),
      ...(answerKey ? { answerKey } : {}),
      evidence,
    });
    children.push(id);
  }
  const root = reserveId('eligibility-evidence-root');
  result.groups.push({ id: root, operator: 'all', children });
  result.root = root;
  // Adding individually reviewed criteria does not certify the full provider
  // scope. A later whole-document review must explicitly restore that claim.
  result.coverage = 'partial';
  return matchingSchema.parse(result);
}
