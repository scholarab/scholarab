import { z } from 'zod';
import { canonicalEvidence, hasQuotedEvidence } from './evidence';

const date = z.iso.date();
const validTimezones = new Set<string>();
const url = z
  .url()
  .refine(
    (value) => ['http:', 'https:'].includes(new URL(value).protocol),
    'Use an HTTP(S) source'
  );
export const evidenceInputSchema = z
  .object({
    status: z.enum(['legacy-unreviewed', 'partial', 'reviewed', 'ambiguous', 'stale']),
    sourceUrl: url.nullable(),
    summary: z.string().max(4000).optional(),
    quote: z.string().max(4000).optional(),
    // Compatibility input only: a historic excerpt may be an AI paraphrase.
    excerpt: z.string().max(4000).optional(),
    verifiedAt: date.nullable(),
    expiresOn: date.nullable().optional(),
  })
  .strict();
export const evidenceSchema = evidenceInputSchema.transform(canonicalEvidence);
export const ruleFields = [
  'educationStage',
  'residence',
  'school',
  'schoolBoard',
  'institution',
  'field',
  'average',
  'age',
  'citizenship',
  'membership',
  'nomination',
  'apprenticeship',
  'activity',
  'identity',
  'financialNeed',
  'familyIncome',
  'manual',
] as const;
const runtimeRequirementSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    field: z.enum(ruleFields),
    importance: z.enum(['mandatory', 'preference', 'unknown']),
    condition: z.discriminatedUnion('operator', [
      z
        .object({
          operator: z.literal('oneOf'),
          values: z.array(z.string().min(1).max(300)).min(1).max(200),
        })
        .strict(),
      z.object({ operator: z.enum(['minimum', 'maximum']), value: z.number() }).strict(),
      z.object({ operator: z.literal('equals'), value: z.boolean() }).strict(),
      z.object({ operator: z.literal('manual'), text: z.string().min(1).max(10000) }).strict(),
    ]),
    answerKey: z
      .string()
      .regex(/^[a-zA-Z0-9_.:-]{1,150}$/)
      .optional(),
    basis: z.string().min(1).max(200).optional(),
    explanation: z.string().min(1).max(4000),
    referenceDate: date.nullable(),
    evidence: evidenceSchema,
  })
  .strict()
  .superRefine((r, ctx) => {
    const op = r.condition.operator;
    if (
      ['average', 'age', 'familyIncome'].includes(r.field) &&
      !['minimum', 'maximum', 'manual'].includes(op)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Numeric requirements need a threshold or manual check',
      });
    if (
      [
        'educationStage',
        'residence',
        'school',
        'schoolBoard',
        'institution',
        'field',
        'citizenship',
      ].includes(r.field) &&
      !['oneOf', 'manual'].includes(op)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Categorical requirements need explicit accepted values or a manual check',
      });
    if (
      ['apprenticeship', 'financialNeed', 'nomination'].includes(r.field) &&
      !['equals', 'manual'].includes(op)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'This requirement needs a boolean or manual condition',
      });
    if (r.condition.operator === 'minimum' || r.condition.operator === 'maximum') {
      const value = r.condition.value;
      if (['average', 'age', 'familyIncome'].includes(r.field) && value < 0)
        ctx.addIssue({ code: 'custom', message: 'Thresholds cannot be negative' });
      if (r.field === 'average' && value > 100)
        ctx.addIssue({ code: 'custom', message: 'Percentage thresholds cannot exceed 100' });
    }
    if (r.field === 'manual' && op !== 'manual')
      ctx.addIssue({ code: 'custom', message: 'Manual requirements need source text' });
  });
export const requirementSchema = runtimeRequirementSchema.superRefine((r, ctx) => {
  if (
    r.importance === 'mandatory' && r.condition.operator !== 'manual' &&
    r.evidence.status === 'reviewed' && !hasQuotedEvidence(r.evidence)
  )
    ctx.addIssue({
      code: 'custom',
      message: 'No quote, no gate: reviewed mandatory rules need a verbatim quote, source URL, and verification date',
    });
  if (r.field === 'age' && r.evidence.status === 'reviewed' && !r.referenceDate)
    ctx.addIssue({ code: 'custom', message: 'Reviewed age requirements need the provider reference date' });
});
// A flat group graph avoids recursive payloads. IDs refer to rules or groups;
// validation requires one parent, full coverage, and an acyclic root.
const matchingDocumentSchema = (ruleSchema: typeof runtimeRequirementSchema) => z
  .object({
    version: z.literal(1),
    coverage: z.enum(['partial', 'reviewed']),
    coverageEvidence: evidenceSchema,
    requirements: z.array(ruleSchema).max(200),
    groups: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
            operator: z.enum(['all', 'any']),
            children: z.array(z.string()).min(1).max(200),
          })
          .strict()
      )
      .max(100),
    root: z.string().nullable(),
    availability: z
      .object({
        method: z.enum(['application', 'nomination', 'automatic', 'unknown']),
        timing: z.enum(['dated', 'rolling', 'unpublished', 'unknown']),
        opensOn: date.nullable(),
        closesOn: date.nullable(),
        cycle: z.string().max(100).nullable(),
        timezone: z.string().max(100).nullable(),
        evidence: evidenceSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((m, ctx) => {
    const errors = (message: string) => ctx.addIssue({ code: 'custom', message });
    const nodes = [...m.requirements, ...m.groups];
    const ids = nodes.map((n) => n.id);
    if (new Set(ids).size !== ids.length) errors('Rule/group IDs must be unique');
    const groups = new Map(m.groups.map((g) => [g.id, g]));
    const visited = new Set<string>();
    const walk = (id: string, path: Set<string>) => {
      if (!ids.includes(id)) {
        errors('Unknown requirement reference: ' + id);
        return;
      }
      if (path.has(id)) {
        errors('Cyclic requirement group');
        return;
      }
      if (visited.has(id)) {
        errors('Requirement has multiple parents');
        return;
      }
      visited.add(id);
      const next = new Set([...path, id]);
      groups.get(id)?.children.forEach((child) => walk(child, next));
    };
    if (m.root) walk(m.root, new Set());
    if (visited.size !== nodes.length)
      errors('Every requirement/group must be reachable from root');
    if (
      m.coverage === 'reviewed' &&
      (m.coverageEvidence.status !== 'reviewed' ||
        m.requirements.some((r) => r.evidence.status !== 'reviewed' || r.importance === 'unknown'))
    )
      errors('Reviewed coverage needs reviewed scope and requirement evidence');
    const a = m.availability;
    if (a.timing === 'dated' && !a.closesOn) errors('Dated availability requires a closing date');
    if (a.opensOn && a.closesOn && a.opensOn > a.closesOn)
      errors('Opening date must precede closing date');
    if (a.timezone) {
      try {
        if (!validTimezones.has(a.timezone)) {
          new Intl.DateTimeFormat('en', { timeZone: a.timezone });
          validTimezones.add(a.timezone);
        }
      } catch {
        errors('Invalid availability timezone');
      }
    }
  });
export const matchingSchema = matchingDocumentSchema(requirementSchema);
// Historic assets can contain prose under excerpt with no provider quote. They
// must load as uncertain, not acquire permission to gate or break the whole quiz.
export const runtimeMatchingSchema = matchingDocumentSchema(runtimeRequirementSchema);
export type MatchingDocument = z.infer<typeof matchingSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
