/** Maximum age of a human source review. This is a review policy, not a claim
 * that every provider operates on an annual application cycle. */
export const MAX_EVIDENCE_AGE_DAYS = 365;

type EvidenceInput = {
  status?: string;
  sourceUrl?: string | null;
  quote?: string;
  verifiedAt?: string | null;
  expiresOn?: string | null;
};

const dayMillis = (value: string | null | undefined): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const millis = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 10) === value
    ? millis
    : null;
};

export function hasQuotedEvidence(evidence: EvidenceInput): boolean {
  if (!evidence.quote?.trim() || dayMillis(evidence.verifiedAt) === null) return false;
  try {
    return ['http:', 'https:'].includes(new URL(evidence.sourceUrl ?? '').protocol);
  } catch {
    return false;
  }
}

/** Fail closed to uncertainty for stale assets as well as newly authored data.
 * Legacy excerpt text is deliberately never accepted as a provider quote. */
export function evidenceIsUsable(evidence: EvidenceInput, today: string): boolean {
  if (evidence.status !== 'reviewed' || !hasQuotedEvidence(evidence)) return false;
  const reviewed = dayMillis(evidence.verifiedAt);
  const current = dayMillis(today);
  if (reviewed === null || current === null) return false;
  const age = (current - reviewed) / 86_400_000;
  if (age < 0 || age > MAX_EVIDENCE_AGE_DAYS) return false;
  if (evidence.expiresOn != null) {
    const expires = dayMillis(evidence.expiresOn);
    if (expires === null || current > expires) return false;
  }
  return true;
}

export function canonicalEvidence<T extends { summary?: string; quote?: string; excerpt?: string }>(
  input: T
) {
  const { excerpt, summary, quote, ...rest } = input;
  return { ...rest, summary: summary ?? excerpt ?? '', quote: quote ?? '' };
}
