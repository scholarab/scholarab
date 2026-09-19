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
