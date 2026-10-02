/**
 * Whether a listing's own text says the student files nothing.
 *
 * The data has no structured field for this, and about 45 listings are
 * school-selected, nominated, or bundled with another application (the
 * Rutherford Scholar Award, most subject prizes). Their detail pages used to
 * say "Apply now" beside notes reading "There is no application". The phrases
 * are narrow on purpose: "no application essay", "no application page of its
 * own", "if no application fits", "you do not apply to them individually"
 * (one form covers them all) and a sibling prize that "need[s] no
 * application" all describe awards you do apply for, and
 * a false positive here would talk a student out of applying.
 */
const NO_APPLICATION =
  /\b(?:there is no application(?! (?:essay|page))|(?<!need )no application(?: is necessary)?[.;:,]|no separate application|no application form|nothing to fill in|you do not apply(?! to them| yourself)|automatically considered)/i

export function saysNoApplication(...texts: Array<string | null | undefined>): boolean {
  return texts.some(t => !!t && NO_APPLICATION.test(t))
}

/**
 * How an application reaches the people who decide, for the 175 listings
 * marked `applyViaGuidance`. Classified by hand from each listing's notes
 * (2026-10-02): "through your school" was true of about half of them; the
 * rest are a division-wide form, a nomination, a club or foundation taking
 * applications itself, a contest, or a campus awards office. JSON-only.
 * Listings without it say nothing here rather than guess.
 */
export const APPLY_ROUTES = ['school', 'board', 'nominated', 'sponsor', 'contest', 'campus'] as const
export type ApplyRoute = typeof APPLY_ROUTES[number]

const ROUTE_LINE: Record<ApplyRoute, string> = {
  school: 'Through your school. It collects the form, often before the date shown here.',
  board: "Through your school division's own application. Ask your counsellor where to find it.",
  nominated: "You can't apply yourself. Someone nominates you, so tell them you want to be considered.",
  sponsor: 'Straight to the sponsor, not through your school.',
  contest: 'You enter a contest. Placing in it is the application.',
  campus: "Through your university or college's awards office, once you have accepted an offer.",
}

/** The "How you apply" line, or null when the listing doesn't say. A route outranks the text test. */
export function howYouApply(route: ApplyRoute | null | undefined, noApplication: boolean): string | null {
  if (route) return ROUTE_LINE[route]
  return noApplication ? 'Nothing to file. The notes say how it is awarded.' : null
}
