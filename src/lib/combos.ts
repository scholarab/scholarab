// Scholarship combos: /scholarships/medicine-hat/combos/.
//
// A combo is a set of awards in one city that are open to the same students,
// so a reader who matches its one-line rule can apply to every award in it
// (Ilia, 2026-09-30: "pre-built combos, like fast food"). The city alone is
// not the rule: a Medicine Hat High student cannot apply to the Catholic
// board's awards, so one "Medicine Hat combo" would break its own promise.
// Each combo adds the one fact that decides eligibility: the school board, the
// town, or where the student is going next.
//
// The rules are written by hand; the members never are. Membership is
// computed from the published JSON on every build, so an award that closes
// or is retired leaves its combo without anyone editing this file, and a
// combo that falls below the floor stops being built.
//
// What a combo does NOT claim: that the reader will win, or that every
// condition is met. Averages, essays and need still apply per award, which is
// why the page says "open to" and each row keeps its own audience line.
import { facetItems, SCHOLARSHIP_FACETS, type FacetTarget } from './facets.ts';
import { scholarshipStatusOf, type StatusInput } from './status.ts';
import { AUDIENCE_SCHOOLS, MIN_COMBO_CORE, type ComboEntry, type ComboKey } from './combo-pick.ts';
import { QUIZ_QUESTIONS } from './quiz.ts';
import { generateSlug } from './utils.ts';

export interface ComboTarget extends FacetTarget, StatusInput {
  id: number;
  title: string;
  audience?: string | null;
  url?: string | null;
  applyViaGuidance?: boolean;
  eligibility?: {
    grades?: string[];
    schoolBoards?: string[];
    specificSchools?: string[];
    targetInstitutions?: string[];
    fields?: string[];
    genderRequired?: string | null;
    indigenousRequired?: boolean;
    bipocRequired?: boolean;
    fosterCare?: boolean;
    apprenticeship?: boolean;
    extracurriculars?: string[];
  } | null;
}

export interface Combo {
  /** The section anchor on the city's combo page. */
  slug: string;
  /** Facet slug of the city this combo belongs to. */
  city: string;
  name: string;
  /** Completes "For you if ...". One clause, no full stop. */
  who: string;
  includes: (s: ComboTarget) => boolean;
  /**
   * Members with a condition narrower than the combo's own rule: a nursing
   * bursary inside the college combo. They are listed apart as add-ons, so the
   * core list stays one everyone matching `who` can apply to. Defaults to
   * `narrower`.
   */
  addOn?: (s: ComboTarget) => boolean;
  /** The quiz answer that puts a student in it, so /match can name the combo.
   *  Absent where no answer can (Redcliff residency, Cypress County). */
  matchOn?: ComboKey;
}

export interface CityCombos {
  city: string;
  h1: string;
  /** Page <title>, brand suffix appended by the page. */
  title: string;
  /** Meta description, 130-155 characters. */
  description: string;
  intro: string;
}

/** A combo needs two awards everyone in it can apply to, and three in all. */
export { MIN_COMBO_CORE };
export const MIN_COMBO_ITEMS = 3;

const has = (list: string[] | undefined, value: string) => list?.includes(value) ?? false;
/** Volunteering and leadership are asked of nearly everyone; any other
 *  activity (a sport, 4-H, cadets, music) is a gate of its own. */
const SOFT_ACTIVITIES = new Set(['volunteer', 'volunteering', 'leadership']);
/** Gates the data only states in the audience line: whose child you are, what
 *  you belong to, what team you are on. */
const AUDIENCE_GATE = /\b(male|female|women|men|girls|boys)\b|\bchild(ren)? of\b|\bdependants?\b|\bdependents?\b|\bmembers? of\b|\bmembers\b|\bathlet|\bteam\b|disabilit|special needs|\bparents? works?\b|affected by|diagnos|cancer|refugee|newcomer|immigrant|\bdeaf\b|hard of hearing|\bblind\b|\bin care\b|single parent|pregnan|parenting|veteran|military|\bplayers?\b|hockey|volleyball|basketball|football|soccer|curling|rodeo|immersion|student council/i;

/**
 * An award with a condition narrower than its combo's own rule: a field of
 * study, an identity, a named activity, a family tie. Listed as a side, so the
 * core stays a list everyone matching the combo can apply to. Over-flagging
 * only moves an award into the sides; under-flagging would break the promise.
 */
function narrower(s: ComboTarget): boolean {
  const e = s.eligibility ?? {};
  // Combos speak to the Grade 12 year ("graduating from", "starting at ...
  // after Grade 12"). A Grade 10 or 11 award in the core meant no one student
  // could apply to all of it (St. Oscar Romero, found by the /match drift
  // test, 2026-09-30).
  return (e.grades?.length ? !e.grades.includes('12') : false)
    || (e.fields?.length ?? 0) > 0
    || !!e.genderRequired || !!e.indigenousRequired || !!e.bipocRequired || !!e.fosterCare || !!e.apprenticeship
    || (e.extracurriculars ?? []).some(x => !SOFT_ACTIVITIES.has(x.toLowerCase()))
    || AUDIENCE_GATE.test(s.audience ?? '');
}

export const CITY_COMBOS: CityCombos[] = [
  {
    city: 'medicine-hat',
    h1: 'Medicine Hat scholarship combos',
    title: 'Medicine Hat Scholarship Combos',
    description:
      'Medicine Hat scholarships grouped by who can apply: Catholic school graduates, Redcliff students and Medicine Hat College entrants. Apply to the whole set.',
    intro:
      'Each combo is a set of local awards open to the same students, so if its first line describes you, you can apply to every award in it. The conditions on each award still apply.',
  },
  {
    city: 'edmonton',
    h1: 'Edmonton scholarship combos',
    title: 'Edmonton Scholarship Combos',
    description:
      "Edmonton scholarships grouped by who can apply: Edmonton Public and Edmonton Catholic students, and students starting at The King's University.",
    intro:
      "Edmonton's awards split by school board and by the university they pay into. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'calgary',
    h1: 'Calgary scholarship combos',
    title: 'Calgary Scholarship Combos',
    description:
      "Calgary scholarships grouped by who can apply: Calgary Board of Education students and Calgary Catholic students, each set with its own add-ons.",
    intro:
      "Most Calgary awards here are open to one school board, so the combo you are in says more than the whole city list does. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'red-deer',
    h1: 'Red Deer scholarship combos',
    title: 'Red Deer Scholarship Combos',
    description:
      'Red Deer scholarships grouped by who can apply: Red Deer Catholic graduates and students going to Red Deer Polytechnic, whose awards share one form.',
    intro:
      "Red Deer Polytechnic's entrance awards are the biggest set here, and the Catholic division runs a smaller one of its own. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'lethbridge',
    h1: 'Lethbridge scholarship combos',
    title: 'Lethbridge Scholarship Combos',
    description:
      "Lethbridge scholarships grouped by who can apply: the University of Lethbridge's awards for students starting there right after Grade 12.",
    intro:
      'The University of Lethbridge ties several of its awards to students arriving straight from high school. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'brooks',
    h1: 'Brooks scholarship combos',
    title: 'Brooks Scholarship Combos',
    description:
      "Brooks-area scholarships grouped by who can apply: Bassano School's own graduation awards, with the ones for a named field listed as add-ons.",
    intro:
      'Bassano School runs its own list of graduation awards, several of them for students going into one field. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'lacombe',
    h1: 'Lacombe scholarship combos',
    title: 'Lacombe Scholarship Combos',
    description:
      "Lacombe-area scholarships grouped by who can apply: students starting at Burman University, whose entrance awards make up a set of their own.",
    intro:
      "Lacombe's awards cluster around Burman University, the university in town. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'cochrane',
    h1: 'Cochrane scholarship combos',
    title: 'Cochrane Scholarship Combos',
    description:
      'Cochrane scholarships grouped by who can apply: Cochrane High, Bow Valley High and St. Timothy students, plus the Calgary Catholic awards open here.',
    intro:
      'Almost every Cochrane award belongs to one school, so the right combo is simply the school you go to. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'okotoks',
    h1: 'Okotoks scholarship combos',
    title: 'Okotoks Scholarship Combos',
    description:
      "Okotoks-area scholarships grouped by who can apply: Foothills Composite's long award list, Holy Trinity Academy and the Alberta High School of Fine Arts.",
    intro:
      'Foothills Composite publishes a long list of school awards, and two smaller schools here run their own. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'sherwood-park',
    h1: 'Sherwood Park scholarship combos',
    title: 'Sherwood Park Scholarship Combos',
    description:
      "Sherwood Park scholarships grouped by who can apply: Bev Facey Community High School's own awards, with field-specific ones listed as add-ons.",
    intro:
      'Bev Facey Community High School runs its own award list, and much of it is for students heading into one field. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'grande-prairie',
    h1: 'Grande Prairie scholarship combos',
    title: 'Grande Prairie Scholarship Combos',
    description:
      'Grande Prairie scholarships grouped by who can apply: one Northwestern Alberta Foundation form, Grande Prairie Public grads and Northwestern Polytechnic.',
    intro:
      'One Northwestern Alberta Foundation form reaches dozens of Peace Country funds, and the college and the public division each run their own set. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'fort-mcmurray',
    h1: 'Fort McMurray scholarship combos',
    title: 'Fort McMurray Scholarship Combos',
    description:
      "Fort McMurray scholarships grouped by who can apply: Keyano College's awards for local students starting there right after Grade 12, in one set.",
    intro:
      'Keyano College ties several of its awards to local students arriving straight from high school. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'wetaskiwin',
    h1: 'Wetaskiwin scholarship combos',
    title: 'Wetaskiwin Scholarship Combos',
    description:
      "Wetaskiwin scholarships grouped by who can apply: Wetaskiwin Composite High School's award list, with the field-specific ones listed as add-ons.",
    intro:
      'Wetaskiwin Composite publishes a long list of its own awards, many of them for students going into one field. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'camrose',
    h1: 'Camrose scholarship combos',
    title: 'Camrose Scholarship Combos',
    description:
      "Camrose-area scholarships grouped by who can apply: students starting at the University of Alberta's Augustana campus, which sits in Camrose.",
    intro:
      "Camrose awards gather around the University of Alberta, whose Augustana campus is here. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'alberta',
    h1: 'Small-town Alberta scholarship combos',
    title: 'Small-Town Alberta Scholarship Combos',
    description:
      "Scholarship combos for Alberta's small towns: the award lists of County Central, Boyle, Willow Creek, Bonnyville and other rural high schools.",
    intro:
      'Rural schools often run their own award lists, and the students who can apply to them are the ones in the building. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'st-albert',
    h1: 'St. Albert scholarship combos',
    title: 'St. Albert Scholarship Combos',
    description:
      'St. Albert scholarships grouped by who can apply: the award lists Paul Kane High School and Bellerose Composite run for their own students.',
    intro:
      "St. Albert's awards mostly belong to one high school, so the combo you are in is the school you go to. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'spruce-grove',
    h1: 'Spruce Grove scholarship combos',
    title: 'Spruce Grove Scholarship Combos',
    description:
      "Spruce Grove-area scholarships grouped by who can apply: Memorial Composite and Spruce Grove Composite High School's own award lists.",
    intro:
      "Memorial Composite and Spruce Grove Composite each publish their own awards, and each list is open only to that school's students. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'fort-saskatchewan',
    h1: 'Fort Saskatchewan scholarship combos',
    title: 'Fort Saskatchewan Scholarship Combos',
    description:
      "Fort Saskatchewan scholarships grouped by who can apply: Fort Saskatchewan High School's own award list, with the narrower ones as add-ons.",
    intro:
      'Fort High runs its own list of awards for its students, a few of them for one field or one kind of student. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'lloydminster',
    h1: 'Lloydminster scholarship combos',
    title: 'Lloydminster Scholarship Combos',
    description:
      'Lloydminster scholarships grouped by who can apply: the award list for LCHS graduates, all of it reached through one Lloydminster Public form.',
    intro:
      "Lloydminster Comprehensive's awards come through one division awards form, so one sitting covers the whole combo. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.",
  },
  {
    city: 'cold-lake',
    h1: 'Cold Lake scholarship combos',
    title: 'Cold Lake Scholarship Combos',
    description:
      "Cold Lake scholarships grouped by who can apply: Cold Lake High School's own graduation awards, open to the school's own students.",
    intro:
      'Cold Lake High School hands out its own graduation awards, and the students who can apply are the ones in the building. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
  {
    city: 'chestermere',
    h1: 'Chestermere scholarship combos',
    title: 'Chestermere Scholarship Combos',
    description:
      "Chestermere scholarships grouped by who can apply: Chestermere High School's own awards, with the ones for athletes listed as add-ons.",
    intro:
      'Chestermere High School runs a short list of its own awards for its graduates. If the first line of a combo describes you, every award in it is open to you; the conditions on each award still apply.',
  },
];

const slugify = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// A second structural gate is narrower than a combo's own: an award for
// Edmonton Public students going to the U of A is a side in both combos.
const college = (s: ComboTarget) => (s.eligibility?.targetInstitutions ?? []).some(t => t !== 'any');
const schooled = (s: ComboTarget) => !!(s.eligibility?.schoolBoards?.length || s.eligibility?.specificSchools?.length);

/**
 * Rules the data cannot express on its own: a town inside a hub (Redcliff is
 * filed under Medicine Hat), or a college whose side awards are gated by a
 * need the data does not flag. Everything else is generated below.
 */
/**
 * A high school the data names only in the audience line, not in
 * specificSchools. Each pattern was checked against that city's listings on
 * 2026-09-30; an award that also lists the school structurally counts too.
 */
const audienceSchool = (city: string, name: string, pattern: RegExp): Combo => ({
  slug: `school-${slugify(name)}`, city, name, who: `you go to ${name}`,
  includes: s => has(s.eligibility?.specificSchools, name) || pattern.test(s.audience ?? ''),
  addOn: s => narrower(s) || college(s),
  matchOn: { school: name },
});

export const COMBOS: Combo[] = [
  {
    slug: 'redcliff',
    city: 'medicine-hat',
    name: 'Redcliff students',
    who: 'you have lived in Redcliff for most of your school years',
    // The residency rule lives only in the audience line; eligibility has no
    // town field.
    includes: s => /\bRedcliff\b/.test(s.audience ?? ''),
  },
  {
    slug: 'medicine-hat-college',
    city: 'medicine-hat',
    name: 'Staying for Medicine Hat College',
    who: 'you are starting at Medicine Hat College after Grade 12',
    includes: s => has(s.eligibility?.targetInstitutions, 'Medicine Hat College'),
    addOn: s => narrower(s) || schooled(s),
    matchOn: { institution: 'Medicine Hat College' },
  },
  {
    slug: 'cypress-county',
    city: 'medicine-hat',
    name: 'Cypress County residents',
    who: 'you live in Cypress County',
    includes: s => /\bCypress County\b/.test(s.audience ?? ''),
  },
  {
    slug: 'northwestern-alberta-foundation',
    city: 'grande-prairie',
    name: 'Peace Country students',
    who: 'you live in Grande Prairie or the wider Peace Country',
    // The listings' notes: "one universal form puts you in front of every one
    // you qualify for". Funds for one hamlet, team or nation are sides.
    includes: s => /^(https?:\/\/)?(www\.)?nafgives\.com\//.test(s.url ?? ''),
    addOn: s => narrower(s) || !/\b(northwestern Alberta|Peace Country|Grande Prairie)\b/.test(s.audience ?? ''),
    matchOn: { city: true },
  },
  ...AUDIENCE_SCHOOLS.map(a => audienceSchool(a.page, a.name, a.pattern)),
];

/**
 * School boards by the code the data files them under. Only boards whose
 * audience lines name them are here; a code nobody has checked gets no combo
 * rather than a guessed name.
 */
export const BOARDS: Record<string, { name: string; who: string }> = {
  CBE: { name: 'Calgary Board of Education', who: 'you go to a Calgary Board of Education high school' },
  CCSD: { name: 'Calgary Catholic', who: 'you go to a Calgary Catholic high school' },
  EPS: { name: 'Edmonton Public Schools', who: 'you go to an Edmonton Public high school' },
  ECSD: { name: 'Edmonton Catholic Schools', who: 'you go to an Edmonton Catholic high school' },
  MHCBE: { name: 'Medicine Hat Catholic schools', who: 'you are graduating from a Medicine Hat Catholic school' },
  RDCSD: { name: 'Red Deer Catholic', who: 'you go to a Red Deer Catholic high school' },
  RDPSD: { name: 'Red Deer Public', who: 'you go to a Red Deer Public high school' },
  GPPSD: { name: 'Grande Prairie Public', who: 'you go to a Grande Prairie Public high school' },
  RVS: { name: 'Rocky View Schools', who: 'you go to a Rocky View high school' },
  CESD: { name: "Chinook's Edge", who: "you go to a Chinook's Edge high school" },
};

/**
 * The combos the data writes itself, for any city: one per school board (its
 * board-wide awards), per college or university the awards are tied to, and
 * per high school that runs its own list. Each is one fact a student knows
 * about themselves, which is the whole test for a combo.
 */
function generatedCombos(city: string, pool: ComboTarget[]): Combo[] {
  const count = (keys: (s: ComboTarget) => string[]) => {
    const n = new Map<string, number>();
    for (const s of pool) for (const k of keys(s)) n.set(k, (n.get(k) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  };
  const boardWide = (s: ComboTarget) => (s.eligibility?.specificSchools?.length ? [] : s.eligibility?.schoolBoards ?? []);
  const boards: Combo[] = count(boardWide).filter(code => BOARDS[code]).map(code => ({
    slug: `board-${slugify(code)}`, city, name: BOARDS[code]!.name, who: BOARDS[code]!.who,
    includes: s => boardWide(s).includes(code),
    addOn: s => narrower(s) || college(s),
    matchOn: { board: code },
  }));
  const colleges: Combo[] = count(s => (s.eligibility?.targetInstitutions ?? []).filter(t => t !== 'any')).map(inst => ({
    slug: `going-to-${slugify(inst)}`, city, name: `Going to ${inst}`, who: `you are starting at ${inst} after Grade 12`,
    includes: s => has(s.eligibility?.targetInstitutions, inst),
    addOn: s => narrower(s) || schooled(s),
    matchOn: { institution: inst },
  }));
  // A school's combo needs one award that is that school's alone. Without it
  // the set is awards several schools share, and naming it after whichever
  // school sorted first told the others' students it was not for them.
  const ownAward = (school: string) => pool.some(s => s.eligibility?.specificSchools?.length === 1 && s.eligibility.specificSchools[0] === school);
  const schools: Combo[] = count(s => s.eligibility?.specificSchools ?? []).filter(ownAward).map(school => ({
    slug: `school-${slugify(school)}`, city, name: school, who: `you go to ${school}`,
    includes: s => has(s.eligibility?.specificSchools, school),
    addOn: s => narrower(s) || college(s),
    matchOn: { school },
  }));
  return [...boards, ...colleges, ...schools];
}

/**
 * Application routes where one form covers a whole set, each quoted from the
 * listings' own notes: EducationMatters ("one application for all CBE and
 * Calgary Catholic awards"), Red Deer Polytechnic's General Application, the
 * Northwestern Alberta Foundation's universal form, Bev Facey's one in-house
 * form and LPSD's ("one form covers every LPSD award").
 */
const ONE_FORMS: { prefix: string; text: string }[] = [
  { prefix: 'www.educationmatters.ca/', text: 'One EducationMatters application covers these' },
  { prefix: 'rdpolytech.academicworks.ca/', text: 'One Red Deer Polytechnic General Application covers these' },
  { prefix: 'nafgives.com/', text: 'One Northwestern Alberta Foundation form covers these' },
  { prefix: 'www.bevfacey.ca/', text: 'One Bev Facey awards form covers these' },
  { prefix: 'sites.google.com/lpsd.ca/', text: 'One LPSD awards form covers these' },
];

/** The one form every core award goes through, or null when they differ. */
export function oneForm(core: { url?: string | null }[]): string | null {
  const bare = (u: string | null | undefined) => (u ?? '').replace(/^https?:\/\//, '');
  const route = ONE_FORMS.find(f => bare(core[0]?.url).startsWith(f.prefix));
  return route && core.every(s => bare(s.url).startsWith(route.prefix)) ? route.text : null;
}

export interface BuiltCombo<T> {
  combo: Combo;
  core: T[];
  addOns: T[];
}

function forHighSchool(s: ComboTarget): boolean {
  const grades = s.eligibility?.grades ?? [];
  return grades.length === 0 || grades.some(g => g !== 'post-secondary');
}

/**
 * The combos a city's page shows, in COMBOS order, each with its members.
 * Closed awards and awards only for students already past high school are
 * left out; a combo under the floor is dropped rather than shown thin.
 */
export function combosForCity<T extends ComboTarget>(city: string, items: T[], today: Date): BuiltCombo<T>[] {
  const facet = SCHOLARSHIP_FACETS.find(f => f.slug === city);
  if (!facet) return [];
  const pool = facetItems(facet, items).filter(s => forHighSchool(s) && scholarshipStatusOf(s, today) !== 'closed');
  const seen = new Set<string>();
  return [...COMBOS.filter(c => c.city === city), ...generatedCombos(city, pool)]
    .map(combo => {
      const members = pool.filter(combo.includes);
      const isAddOn = combo.addOn ?? narrower;
      return { combo, core: members.filter(s => !isAddOn(s)), addOns: members.filter(isAddOn) };
    })
    .filter(b => b.core.length >= MIN_COMBO_CORE && b.core.length + b.addOns.length >= MIN_COMBO_ITEMS)
    // A generated combo that repeats one already on the page (the college a
    // hand rule covers) is dropped, first one wins.
    .filter(b => {
      const key = [...b.core, ...b.addOns].map(s => s.id).sort((x, y) => x - y).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Cities with at least one combo, which are the combo pages the build emits. */
export function comboCities<T extends ComboTarget>(items: T[], today: Date): CityCombos[] {
  return CITY_COMBOS.filter(c => combosForCity(c.city, items, today).length > 0);
}

/**
 * Every combo /match can name, for quiz-payload.json: its quiz key and core
 * ids. The results screen intersects the ids with the student's own matches
 * (combo-pick.ts), so an award that closed after the build drops out there.
 */
export function comboIndex<T extends ComboTarget>(items: T[], today: Date): ComboEntry[] {
  const cities = QUIZ_QUESTIONS.find(q => q.key === 'city')?.opts.map(o => o.value) ?? [];
  return CITY_COMBOS.flatMap(({ city }) => {
    const quizCity = city === 'alberta' ? 'Other Alberta' : cities.find(c => generateSlug(c) === city);
    if (!quizCity) return [];
    return combosForCity(city, items, today).flatMap(({ combo, core }) => combo.matchOn
      ? [{ quizCity, page: city, slug: combo.slug, name: combo.name, who: combo.who, on: combo.matchOn, core: core.map(s => s.id) }]
      : []);
  });
}
