import type { Opportunity } from './normalize';
import { runtimeMatchingSchema } from './schema';

/** Unreviewed evidence cannot affect eligibility, regardless of its prose or
 * condition. Preserve every rule and its uncertainty; load original conditions
 * and evidence for display on demand. Reviewed rules retain their full content. */
export function evaluationProjection(opportunity: Opportunity): Opportunity {
  const result = structuredClone(opportunity);
  const omitUnreviewedBody = (e: { status: string; summary: string; quote: string }) => {
    if (e.status !== 'reviewed') {
      e.summary = '';
      e.quote = '';
    }
  };
  omitUnreviewedBody(result.matching.coverageEvidence);
  omitUnreviewedBody(result.matching.availability.evidence);
  for (const rule of result.matching.requirements) {
    omitUnreviewedBody(rule.evidence);
    if (rule.evidence.status !== 'reviewed')
      rule.condition = { operator: 'manual', text: 'Source review required' };
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
  const data = decodeClientCatalogue(raw) as ClientCatalogue;
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
    o.matching = runtimeMatchingSchema.parse(o.matching);
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

/** Wire-only template sharing. A template is cloned before expanding provider
 * references, so no record can mutate another record's requirements. */
export function encodeClientCatalogue(data: ClientCatalogue) {
  const templates: unknown[] = [];
  const indices = new Map<string, number>();
  const opportunities = data.opportunities.map((original) => {
    const o = structuredClone(original);
    for (const e of [
      o.matching.coverageEvidence,
      o.matching.availability.evidence,
      ...o.matching.requirements.map((r) => r.evidence),
    ])
      if (e.sourceUrl === o.url) e.sourceUrl = '@opportunity';
    const { availability, ...template } = o.matching;
    const signature = JSON.stringify(template);
    let index = indices.get(signature);
    if (index === undefined) {
      index = templates.length;
      indices.set(signature, index);
      templates.push(template);
    }
    // The public identity is losslessly derived from kind + publicId. Avoid
    // repeating it on the wire; evidence remains indexed by the full identity.
    const { key: _key, ...fields } = o;
    return { ...fields, matching: index, availability };
  });
  return { ...data, version: 2, opportunities, templates };
}
function decodeClientCatalogue(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 2) return raw;
  const wire = raw as ReturnType<typeof encodeClientCatalogue>;
  if (!Array.isArray(wire.templates) || !Array.isArray(wire.opportunities))
    throw new Error('Invalid matching templates');
  return {
    version: 1,
    catalogueHash: wire.catalogueHash,
    evidence: wire.evidence,
    opportunities: wire.opportunities.map(({ availability, matching: index, ...fields }) => {
      if (!Number.isSafeInteger(index) || index < 0 || index >= wire.templates.length)
        throw new Error('Missing matching template');
      const matching = {
        ...structuredClone(wire.templates[index] as Omit<Opportunity['matching'], 'availability'>),
        availability: structuredClone(availability),
      };
      if (
        !matching.coverageEvidence ||
        !matching.availability?.evidence ||
        !Array.isArray(matching.requirements)
      )
        throw new Error('Invalid matching template');
      for (const e of [
        matching.coverageEvidence,
        matching.availability.evidence,
        ...matching.requirements.map((r) => r.evidence),
      ])
        if (e.sourceUrl === '@opportunity') e.sourceUrl = fields.url;
      return {
        ...fields,
        // Old version-2 assets carried the key explicitly. Preserve it when
        // supplied so identity validation still rejects a conflicting key.
        key: (fields as { key?: string }).key ?? `${fields.kind}:${fields.publicId}`,
        matching,
      };
    }),
  };
}

/** Accept old individual assets during rollback as well as bounded evidence
 * packs. Digest verification happens before this version/identity boundary. */
export function evidenceOpportunity(raw: unknown, catalogueHash: string, key: string): Opportunity {
  const data = raw as {
    version?: number;
    catalogueHash?: string;
    opportunity?: Opportunity;
    opportunities?: Opportunity[];
  } | null;
  if (!data || data.catalogueHash !== catalogueHash)
    throw new Error('Evidence version changed. Reload the page.');
  const candidates =
    data.version === 1
      ? [data.opportunity]
      : data.version === 2 && Array.isArray(data.opportunities) && data.opportunities.length <= 16
        ? data.opportunities
        : [];
  const matches = candidates.filter((o) => o?.key === key);
  if (matches.length !== 1) throw new Error('Evidence identity mismatch. Reload the page.');
  return matches[0]!;
}
