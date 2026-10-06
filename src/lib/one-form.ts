/**
 * Applications that one form or one process covers for a whole set of awards.
 *
 * Until 2026-10-05 each listing carried the form's rules in its own notes, so
 * the same 60-word EducationMatters paragraph sat in 115 notes and 311
 * listings shared one of 17 identical notes. A student reading two listings
 * met a mail merge, and fixing a date meant editing every copy. The paragraph
 * now lives here once; a listing names its form with `oneForm`, set by hand
 * on exactly the listings whose own notes said they use it (a URL on the same
 * site is not enough: 46 Red Deer Polytechnic awards are coach-nominated or
 * separate). Notes keep only what is true of that one award.
 *
 * `prefix` marks the forms a combo can name when every award in it is on that
 * site (lib/combos.ts).
 */
export interface OneForm {
  /** Noun phrase, read after "One" or "How the". */
  form: string;
  /** What the form asks and when, from the listings' own notes. */
  text: string;
  /** Provider URL prefix, without the scheme, for combos. */
  prefix?: string;
}

export const ONE_FORMS = {
  educationmatters: {
    form: 'EducationMatters application',
    prefix: 'www.educationmatters.ca/',
    text: 'One EducationMatters application covers every CBE and Calgary Catholic award. It opens March 1, and most awards close May 30, a few May 1. Every one has three rules: you must be 20 or younger on September 1, not yet in post-secondary, and applying in your Grade 12 year. Once you leave high school you can no longer apply, so a gap year is fine only if you applied before you graduated.',
  },
  lpsd: {
    form: 'LPSD awards form',
    prefix: 'sites.google.com/lpsd.ca/',
    text: 'One General LPSD Scholarship Application covers every LPSD award. You complete it in the Google Classroom, code an2eroz, by May 1, and tick each award you want on the LCHS organizer sheet instead of writing to the sponsors.',
  },
  ecchs: {
    form: 'ECCHS Awards Application',
    text: "One ECCHS Awards Application decides every award in the school's handbook, and you may submit only one. The 2026 round closed Monday, June 22. Ask student services for this year's date.",
  },
  wetaskiwin: {
    form: 'Wetaskiwin Composite awards form',
    text: "One Google Form covers every in-house award at Wetaskiwin Composite. You tick the awards you want, write one paragraph on why, and that paragraph is judged against all of them. The 2026 form closed June 6 and winners were told by email or text in September. Watch the school's post-secondary page for the next one in the spring.",
  },
  ffa: {
    form: 'Fondation franco-albertaine application',
    text: 'All Fondation franco-albertaine bursaries use one online process that needs a Google account. Forms open every year on March 15 at 9 a.m. Edmonton time and close May 15 at 11:59 p.m. You can apply to several, and the foundation asks that each application be written for that bursary. Proof of enrolment for the coming year is required before payment, and only successful applicants are contacted, by July 31.',
  },
  rdp: {
    form: 'Red Deer Polytechnic General Application',
    prefix: 'rdpolytech.academicworks.ca/',
    text: "Red Deer Polytechnic's General Application closes May 31 and puts you in the running for every award you qualify for.",
  },
  naf: {
    form: 'Northwestern Alberta Foundation form',
    prefix: 'nafgives.com/',
    text: "One universal application covers every fund the Northwestern Alberta Foundation holds, so there is nothing separate to file. The foundation publishes the fund names but keeps each fund's value and criteria inside the portal, which shows what you qualify for once you submit.",
  },
  bevfacey: {
    form: 'Bev Facey awards form',
    prefix: 'www.bevfacey.ca/',
    text: 'Bev Facey runs one online form for every in-house award: you tick the ones you qualify for and attach a written or video submission saying why. A staff committee decides. The 2026 form opened March 16 and closed April 7, so watch for it in mid-March.',
  },
  forthigh: {
    form: 'Fort High awards form',
    text: "All of Fort High's internal awards use one checklist form filed with Student Services. You tick every award you want on the same sheet and write how you meet each one. The date on the form is a bare June 1 with no year, so it repeats.",
  },
  sprucegrove: {
    form: 'Spruce Grove Composite awards form',
    text: "Spruce Grove Composite uses one Awards Application Form for all of its grade 12 awards, plus a Teacher Endorsement Form, both filed with Student Services. The 2026 cycle closed April 17 at 4pm, and the school sets a new mid-April date each year, so ask Student Services for this year's.",
  },
  brooks: {
    form: 'Brooks Composite awards form',
    text: 'Brooks Composite High School collects these applications, not the sponsors, on a Google Doc only Grasslands students can open. The handbook publishes no closing dates, so ask the BCHS office in the fall.',
  },
} as const satisfies Record<string, OneForm>;

export type OneFormKey = keyof typeof ONE_FORMS;
export const ONE_FORM_KEYS = Object.keys(ONE_FORMS) as OneFormKey[];

/** The block a listing page shows, or null. `count` is how many listings name the same form. */
export function oneFormBlock(
  key: OneFormKey | null | undefined,
  all: { oneForm?: OneFormKey | null; concluded?: boolean }[],
): { heading: string; text: string; count: number } | null {
  if (!key) return null;
  const f: OneForm = ONE_FORMS[key];
  const count = all.filter(s => s.oneForm === key && !s.concluded).length;
  return { heading: `How the ${f.form} works`, text: f.text, count };
}
