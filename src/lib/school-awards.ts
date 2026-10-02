// Awards a college or university gives its own entering students. Since
// 2026-10-01 they are filed under this region instead of the city the school
// sits in (Ilia: where you live does not matter, applying to the school does).
// A Calgary student going to Burman never saw Burman's eleven awards on the
// Lacombe page, and the quiz hid Red Deer Polytechnic's from them outright.
//
// The few that also want a local graduate keep their city as `region` and
// carry this value in `alsoOpenTo`, so they sit on both pages and the quiz
// still applies the city rule.

export const SCHOOL_AWARDS_REGION = 'University & college';

interface SchoolAwardInput {
  region?: string | null;
  alsoOpenTo?: string[] | null;
  eligibility?: { targetInstitutions?: string[] } | null;
}

export function isSchoolAward(s: SchoolAwardInput): boolean {
  return s.region === SCHOOL_AWARDS_REGION || (s.alsoOpenTo?.includes(SCHOOL_AWARDS_REGION) ?? false);
}

/** The school a school award is for: the first institution the listing names. */
export function schoolOf(s: SchoolAwardInput): string | null {
  return (s.eligibility?.targetInstitutions ?? []).find(t => t !== 'any') ?? null;
}

/**
 * Where a listing is, in the words a row or a card prints: the school for a
 * school award, the region otherwise. "University & college" names a page,
 * not a place.
 */
export function placeOf(s: SchoolAwardInput): string | null {
  return s.region === SCHOOL_AWARDS_REGION ? schoolOf(s) : s.region ?? null;
}
