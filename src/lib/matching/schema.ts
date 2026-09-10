import { z } from 'zod';

const date = z.iso.date();
const url = z
  .url()
  .refine(
    (value) => ['http:', 'https:'].includes(new URL(value).protocol),
    'Use an HTTP(S) source'
  );
export const evidenceSchema = z
  .object({
    status: z.enum(['legacy-unreviewed', 'reviewed', 'ambiguous', 'stale']),
    sourceUrl: url.nullable(),
    excerpt: z.string().max(4000),
    verifiedAt: date.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === 'reviewed' &&
      (!value.sourceUrl || !value.excerpt.trim() || !value.verifiedAt)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Reviewed evidence requires a source, excerpt, and exact verification date',
      });
  });
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
export const requirementSchema = z
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
    explanation: z.string().min(1).max(4000),
    referenceDate: date.nullable(),
    evidence: evidenceSchema,
  })
  .strict()
  .superRefine((r, ctx) => {
    const op = r.condition.operator;
    if (r.field === 'age' && r.evidence.status === 'reviewed' && !r.referenceDate)
      ctx.addIssue({
        code: 'custom',
        message: 'Reviewed age requirements need the provider reference date',
      });
    if (
      ['average', 'age', 'familyIncome'].includes(r.field) &&
      !['minimum', 'maximum', 'manual'].includes(op)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Numeric requirements need a threshold or manual check',
      });
    if (r.field === 'manual' && op !== 'manual')
      ctx.addIssue({ code: 'custom', message: 'Manual requirements need source text' });
  });
// A flat group graph avoids recursive payloads. IDs refer to rules or groups;
// validation requires one parent, full coverage, and an acyclic root.
export const matchingSchema = z
  .object({
    version: z.literal(1),
    coverage: z.enum(['partial', 'reviewed']),
    coverageEvidence: evidenceSchema,
    requirements: z.array(requirementSchema).max(200),
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
        new Intl.DateTimeFormat('en', { timeZone: a.timezone });
      } catch {
        errors('Invalid availability timezone');
      }
    }
  });
export type MatchingDocument = z.infer<typeof matchingSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
