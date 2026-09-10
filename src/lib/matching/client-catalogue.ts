import type { Opportunity } from './normalize';
import { matchingSchema } from './schema';

/** Evaluation projection only. Full quotations and manual prose live in the
 * content-addressed evidence asset. Keep a real non-whitespace character to
 * preserve the evaluator's evidence-presence check, never display it as a quote.
 * No condition, rule identity, evidence status, date or source is upgraded. */
export function evaluationProjection(opportunity: Opportunity): Opportunity {
  const result = structuredClone(opportunity);
  const trimEvidence = (e: { excerpt: string }) => {
    e.excerpt = e.excerpt.trim().slice(0, 1);
  };
  trimEvidence(result.matching.coverageEvidence);
  trimEvidence(result.matching.availability.evidence);
  for (const rule of result.matching.requirements) {
    trimEvidence(rule.evidence);
    if (rule.condition.operator === 'manual') rule.condition.text = rule.condition.text.slice(0, 1);
  }
  result.issues = [];
  return result;
}
export interface ClientCatalogue {
  version: 1;
  catalogueHash: string;
  opportunities: Opportunity[];
  evidence: Record<string, string>;
}
export function parseClientCatalogue(raw: unknown, expected: string): ClientCatalogue {
  const data = raw as ClientCatalogue;
  if (
    !data ||
    data.version !== 1 ||
    data.catalogueHash !== expected ||
    !Array.isArray(data.opportunities) ||
    !data.evidence
  )
    throw new Error('Catalogue version changed. Reload this page.');
  const keys = new Set<string>();
  for (const o of data.opportunities) {
    if (
      !o ||
      keys.has(o.key) ||
      o.key !== `${o.kind}:${o.publicId}` ||
      !['scholarship', 'program'].includes(o.kind) ||
      !Number.isSafeInteger(o.publicId) ||
      o.publicId < 1 ||
      typeof o.title !== 'string' ||
      !/^\/(scholarships|programs)\/[a-z0-9-]+\/$/.test(o.detailPath) ||
      !/^[a-f0-9]{64}$/.test(data.evidence[o.key] ?? '')
    )
      throw new Error('Incomplete matching catalogue. Reload this page.');
    keys.add(o.key);
    matchingSchema.parse(o.matching);
  }
  if (keys.size !== Object.keys(data.evidence).length)
    throw new Error('Evidence connection mismatch');
  return data;
}
export async function verifiedJSON(response: Response, expectedHash: string): Promise<unknown> {
  if (!response.ok) throw new Error('The catalogue could not be loaded. Please retry.');
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== expectedHash) throw new Error('Catalogue version changed. Reload this page.');
  return JSON.parse(new TextDecoder().decode(bytes));
}
