// Relating a scholarship to a research program, and back.
//
// The two datasets do not share a category vocabulary. Scholarships are tagged
// Academic / Arts / Community / General / Indigenous / STEM / Sports / Trades;
// programs are Computing / Engineering / Enrichment / Health / Math & Physics /
// Research / Social Sciences / Trades & Tech. They share no label at all: the
// one that used to appear in both, "Environmental", is gone from each side, and
// the trades appear on both sides under different names. Matching the two
// vocabularies on equality would connect nothing whatsoever.
//
// The affinity below is therefore written out rather than derived. It is
// deliberately conservative: a student reading about a trades bursary is well
// served by a trades program, and poorly served by a link that exists only
// because both records had a category field.
//
// No imports, same reason as ld.ts and status.ts: the build scripts run under a
// plain tsc that must not pull in data-loader's import.meta.env.

/** Program categories worth showing beside each scholarship category. */
export const PROGRAMS_FOR_SCHOLARSHIP: Record<string, readonly string[]> = {
  Academic: ['Enrichment', 'Research', 'Math & Physics'],
  Arts: ['Enrichment'],
  Community: ['Social Sciences', 'Enrichment'],
  Indigenous: ['Research', 'Enrichment'],
  STEM: ['Research', 'Computing', 'Engineering', 'Math & Physics', 'Health'],
  Trades: ['Trades & Tech', 'Engineering'],
  // "General" and "Sports" have no honest counterpart. They fall through to the
  // unqualified filler, which is still a real page and still a link, but is not
  // dressed up as a topical match.
};

/** The inverse, built once so the program side does not restate the table. */
export const SCHOLARSHIPS_FOR_PROGRAM: Record<string, readonly string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [scholarshipCat, programCats] of Object.entries(PROGRAMS_FOR_SCHOLARSHIP)) {
    for (const p of programCats) (out[p] ??= []).push(scholarshipCat);
  }
  return out;
})();

/**
 * Whether a program's free-text location sits in a scholarship's region.
 *
 * Regions are a closed set of city names plus "Alberta" and "National";
 * `location` is prose ("Edmonton (in-person)", "Alberta-wide (mentor-based...)",
 * "Various Canadian campuses including Alberta"). A substring test is the
 * honest read of that: it says the city is mentioned, which is all the claim
 * needs to be for ordering a suggestion.
 */
export function locationMatchesRegion(
  location: string | null | undefined,
  region: string | null | undefined,
): boolean {
  if (!location || !region) return false;
  if (region === 'National' || region === 'Alberta') return false;
  return location.toLowerCase().includes(region.toLowerCase());
}

/** Relevance of `program` to a scholarship. Higher is better; 0 is a filler. */
export function scoreProgramForScholarship(
  scholarship: { category?: string | null; region?: string | null },
  program: { category?: string | null; location?: string | null },
): number {
  const wanted = PROGRAMS_FOR_SCHOLARSHIP[scholarship.category ?? ''] ?? [];
  const topical = program.category && wanted.includes(program.category) ? 2 : 0;
  const local = locationMatchesRegion(program.location, scholarship.region) ? 1 : 0;
  return topical + local;
}

/** Relevance of `scholarship` to a program. Mirror of the above. */
export function scoreScholarshipForProgram(
  program: { category?: string | null; location?: string | null },
  scholarship: { category?: string | null; region?: string | null },
): number {
  const wanted = SCHOLARSHIPS_FOR_PROGRAM[program.category ?? ''] ?? [];
  const topical = scholarship.category && wanted.includes(scholarship.category) ? 2 : 0;
  const local = locationMatchesRegion(program.location, scholarship.region) ? 1 : 0;
  return topical + local;
}
