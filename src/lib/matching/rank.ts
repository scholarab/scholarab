import type { Opportunity } from './normalize';
import type { evaluateEligibility } from './evaluate';
import type { Availability } from './availability';
import type { Eligibility } from './types';
export interface Assessment extends Omit<ReturnType<typeof evaluateEligibility>, 'eligibility'> {
  eligibility: Eligibility;
  key: string;
  kind: Opportunity['kind'];
  publicId: number;
  title: string;
  detailPath: string;
  availability: Availability;
  rankingReasons: string[];
  discoveryMatches?: number;
  communityListed?: boolean;
}
export type SortMode = 'best_fit' | 'closing_soon' | 'local';
const availabilityOrder = {
  open: 0,
  rolling: 1,
  opens_later: 2,
  deadline_unpublished: 3,
  unknown: 4,
  closed: 5,
};
const localHit = (r: Assessment) => r.communityListed || r.rules.some((rule) => rule.local);
const date = (r: Assessment) =>
  r.availability.status !== 'closed' &&
  !!r.availability.closesOn &&
  r.availability.closesOn >= r.availability.today
    ? (r.availability.closesOn ?? '9999-99-99')
    : '9999-99-99';
export function rankAssessments(results: Assessment[], mode: SortMode = 'best_fit'): Assessment[] {
  return [...results].sort((a, b) => {
    const excluded =
      Number(a.eligibility === 'known_ineligible') - Number(b.eligibility === 'known_ineligible');
    if (excluded) return excluded;
    const available =
      availabilityOrder[a.availability.status] - availabilityOrder[b.availability.status];
    if (mode === 'closing_soon')
      return (
        Number(a.availability.status === 'closed') - Number(b.availability.status === 'closed') ||
        date(a).localeCompare(date(b)) ||
        available ||
        a.key.localeCompare(b.key)
      );
    if (mode === 'local') {
      const locality = Number(localHit(b)) - Number(localHit(a));
      if (locality) return locality;
    }
    // Unverified scope never wins merely because it has fewer recorded rules.
    return (
      available ||
      Number(b.scopeReviewed) - Number(a.scopeReviewed) ||
      Number(b.eligibility === 'meets_checked_requirements') -
        Number(a.eligibility === 'meets_checked_requirements') ||
      (a.scopeReviewed && b.scopeReviewed
        ? a.unresolvedRequirements.length - b.unresolvedRequirements.length
        : 0) ||
      b.preferenceMatches.length - a.preferenceMatches.length ||
      (b.discoveryMatches ?? 0) - (a.discoveryMatches ?? 0) ||
      date(a).localeCompare(date(b)) ||
      a.publicId - b.publicId ||
      a.key.localeCompare(b.key)
    );
  });
}
