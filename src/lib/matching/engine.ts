import { matchingSchema } from './schema';
import type { Opportunity } from './normalize';
import { profileSchema, type Profile } from './types';
import { evaluateEligibility, type EvaluationContext } from './evaluate';
import { evaluateAvailability, dateInZone } from './availability';
import { rankAssessments, type Assessment, type SortMode } from './rank';
/** Compile once at the asset boundary. Repeated answers never require network
 * access or catalogue truncation. Evidence is not upgraded by compilation. */
export function createMatchingEngine(input: Opportunity[]) {
  const seen = new Set<string>();
  const opportunities = input.map((o) => {
    if (
      !Number.isSafeInteger(o.publicId) ||
      o.publicId < 1 ||
      !['scholarship', 'program'].includes(o.kind) ||
      o.key !== `${o.kind}:${o.publicId}` ||
      seen.has(o.key)
    )
      throw new Error('Invalid or duplicate matching identity');
    seen.add(o.key);
    return { ...o, matching: matchingSchema.parse(o.matching) };
  });
  return {
    size: opportunities.length,
    assess(
      rawProfile: Profile,
      options: { now: Date; sort?: SortMode; entities?: EvaluationContext['entities'] }
    ): { all: Assessment[]; recommendations: Assessment[]; excluded: Assessment[] } {
      if (!Number.isFinite(options.now.getTime()))
        throw new Error('A valid evaluation clock is required');
      const profile = profileSchema.parse(rawProfile);
      const context = { today: dateInZone(options.now), entities: options.entities };
      const results: Assessment[] = opportunities.map((o) => {
        const eligibility = evaluateEligibility(o.matching, profile, context);
        const availability = evaluateAvailability(o, options.now);
        return {
          ...eligibility,
          key: o.key,
          kind: o.kind,
          publicId: o.publicId,
          title: o.title,
          detailPath: o.detailPath,
          availability,
          rankingReasons: [
            availability.status.replaceAll('_', ' '),
            eligibility.scopeReviewed
              ? 'Requirement scope reviewed'
              : 'Requirement scope needs review',
            `${eligibility.unresolvedRequirements.length} unresolved requirement checks`,
            `${eligibility.preferenceMatches.length} expressed preferences matched`,
          ],
        };
      });
      const all = rankAssessments(results, options.sort);
      return {
        all,
        recommendations: all.filter((r) => r.eligibility !== 'known_ineligible'),
        excluded: all.filter((r) => r.eligibility === 'known_ineligible'),
      };
    },
  };
}
