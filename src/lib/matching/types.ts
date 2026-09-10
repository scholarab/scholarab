import { z } from 'zod';
const qualifier = { basis: z.string().max(200).optional(), asOf: z.iso.date().optional() };
export const factSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('choices'),
      values: z.array(z.string().min(1).max(300)).max(200),
      mode: z.enum(['actual', 'possible']),
      complete: z.boolean(),
      ...qualifier,
    })
    .strict()
    .refine(
      (v) => v.values.length > 0 || (v.mode === 'actual' && v.complete),
      'Only an explicit complete actual set may be empty'
    ),
  z
    .object({
      kind: z.literal('number'),
      min: z.number().nullable(),
      max: z.number().nullable(),
      minInclusive: z.boolean(),
      maxInclusive: z.boolean(),
      ...qualifier,
    })
    .strict()
    .refine(
      (v) =>
        (v.min !== null || v.max !== null) &&
        (v.min === null ||
          v.max === null ||
          v.min < v.max ||
          (v.min === v.max && v.minInclusive && v.maxInclusive)),
      'Invalid numeric interval'
    ),
  z.object({ kind: z.literal('boolean'), value: z.boolean(), ...qualifier }).strict(),
]);
export const answerSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('answered'), fact: factSchema }).strict(),
  z.object({ state: z.enum(['unanswered', 'declined', 'not-sure', 'not-applicable']) }).strict(),
]);
export const profileSchema = z
  .object({ answers: z.record(z.string().regex(/^[a-zA-Z0-9_.:-]{1,150}$/), answerSchema) })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export type Fact = z.infer<typeof factSchema>;
export type RuleState = 'satisfied' | 'unresolved' | 'not_satisfied';
export interface RuleResult {
  id: string;
  field: string;
  importance: 'mandatory' | 'preference' | 'unknown';
  state: RuleState;
  code: string;
  explanation: string;
  sourceUrl: string | null;
  questionKey: string | null;
  local: boolean;
}
export interface GroupResult {
  id: string;
  state: RuleState;
  children: string[];
  ignoredPreferences: string[];
}
export type Eligibility = 'meets_checked_requirements' | 'worth_checking' | 'known_ineligible';
