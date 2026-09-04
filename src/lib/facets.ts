// The facet hubs: /scholarships/medicine-hat/, /programs/research/, and so on.
//
// Why these exist at all: the directory has always been able to filter by
// category and region, but only through `?category=STEM` query strings on one
// client-filtered page. A query string is not a landing page; it has no title,
// no description, and nothing for a search engine to rank. Nineteen hand-checked
// Medicine Hat awards sat behind a filter while a thinner aggregator held the
// first result for "scholarships for Medicine Hat students".
//
// Each hub is a real page with its own editorial copy, not a filtered view with
// a generated heading. That is the difference between a landing page and a
// doorway page, and it is why `intro` is written by hand per facet rather than
// templated from the label.
//
// ── Two rules this file enforces ────────────────────────────────────────────
//
// 1. Slugs here are RESERVED. src/pages/scholarships/[facet].astro sits at the
//    same URL shape as the detail route and wins route precedence over it, so a
//    listing that ever slugged to 'trades' would be silently shadowed by the
//    Trades hub; its page would simply stop existing. validate-data.ts fails
//    the build on that collision rather than letting it ship.
//
// 2. A facet below MIN_FACET_ITEMS does not get a page. A hub listing one award
//    is a doorway page, and Google treats it as one. The floor is enforced in
//    getStaticPaths, so a data change can never quietly emit one.

/** Below this, a hub is not a page worth having. See rule 2 above. */
export const MIN_FACET_ITEMS = 5;

export interface Facet {
  slug: string;
  /** Which data field the `value` is matched against. */
  kind: 'region' | 'category';
  /** Matched against the listing field exactly, so it must track the data. */
  value: string;
  /**
   * Extra `region` values this facet also claims. Only "International" uses
   * this: a handful of awards open to Canadians going abroad are filed that
   * way, and without it they would sit in the data reachable from no scope at
   * all. Keep it for genuine synonyms of the same scope, not for rollups.
   */
  extraValues?: string[];
  /**
   * A scope that covers the whole province or the whole country. It gets a hub,
   * because "province-wide" and "national" are things a reader searches for,
   * but it never becomes a listing's breadcrumb: telling someone the Rutherford
   * is a "province-wide" award says less than telling them it is Academic. See
   * facetForListing.
   */
  broad?: boolean;
  /** Chip label and breadcrumb text. */
  label: string;
  h1: string;
  /** Page <title>, brand suffix appended by the page. Keep under 48 here. */
  title: string;
  /** Meta description. House range is 130-155 characters. */
  description: string;
  /**
   * One sentence of real prose, shown under the h1. One is the cap, not a
   * target: the intro sits beside the stat block in .sabl-title-row, and a
   * paragraph there pushed the hubs into a visibly different shape from the
   * two directory indexes. Say the most concrete thing about the scope and
   * stop. Enforced in facets.test.ts, which counts sentence breaks.
   */
  intro: string;
  /** Guide slug that explains this facet, cross-linked both ways. */
  guide?: string;
}

export const SCHOLARSHIP_FACETS: Facet[] = [
  {
    slug: 'medicine-hat',
    kind: 'region',
    value: 'Medicine Hat',
    label: 'Medicine Hat',
    h1: 'Medicine Hat scholarships',
    title: 'Medicine Hat High School Scholarships',
    description:
      'Every scholarship a Medicine Hat high school student can apply for: Catholic board awards, county bursaries, the college, service clubs and local employers.',
    intro:
      'A local award here might see a dozen applications in a good year, and they run from $1,000 service club and college bursaries up to the three Redcliff scholarships worth $6,000 each.',
    guide: 'scholarships-for-medicine-hat-students',
  },
  {
    slug: 'edmonton',
    kind: 'region',
    value: 'Edmonton',
    label: 'Edmonton',
    h1: 'Edmonton scholarships',
    title: 'Edmonton High School Scholarships',
    description:
      'Scholarships open to Edmonton high school students: school division awards, city foundations, union and employer funds, and local bursaries.',
    intro:
      'These are restricted to students in and around Edmonton, which cuts the field to a fraction of a province-wide competition, and they run from a $250 award up to tuition coverage worth $10,000.',
  },
  {
    slug: 'calgary',
    kind: 'region',
    value: 'Calgary',
    label: 'Calgary',
    h1: 'Calgary scholarships',
    title: 'Calgary High School Scholarships',
    description:
      'Scholarships for Calgary high school students: EducationMatters awards for CBE and Calgary Catholic, memorial funds, and local employer scholarships.',
    intro:
      'Calgary-restricted awards run from a $100 band bursary up to renewable entrance awards worth $100,000 over four years, against a far smaller field than a national award.',
  },
  {
    slug: 'red-deer',
    kind: 'region',
    value: 'Red Deer',
    label: 'Red Deer',
    h1: 'Red Deer scholarships',
    title: 'Red Deer Scholarships for High School Students',
    description:
      'Scholarships for Red Deer and central Alberta high school students: polytechnic entrance awards, memorial funds, and community scholarships.',
    intro:
      'Central Alberta awards are consistently under-applied, and several are entrance scholarships assessed on the marks you already have, which means no essay and no competition beyond meeting the average.',
  },
  {
    slug: 'lethbridge',
    kind: 'region',
    value: 'Lethbridge',
    label: 'Lethbridge',
    h1: 'Lethbridge scholarships',
    title: 'Lethbridge High School Scholarships',
    description:
      'Scholarships for Lethbridge and southern Alberta students: school division awards, county scholarships, and university entrance bursaries.',
    intro:
      'Lethbridge awards include one of the few in Alberta open to Grade 11 students, and the county and division awards here have some of the thinnest applicant pools in the province.',
  },
  {
    slug: 'airdrie',
    kind: 'region',
    value: 'Airdrie',
    label: 'Airdrie',
    h1: 'Airdrie scholarships',
    title: 'Airdrie High School Scholarships',
    description:
      'Scholarships for Airdrie and Rocky View students: the Legion branch award, ag society and minor sport scholarships, and Rocky View teacher money.',
    intro:
      'Read the eligibility line before the amount: some are open to any Airdrie graduate, and others want a Rocky View County address, three years in a 4-H club, or a season spent refereeing minor basketball.',
  },
  {
    slug: 'brooks',
    kind: 'region',
    value: 'Brooks',
    label: 'Brooks',
    h1: 'Brooks scholarships',
    title: 'Brooks High School Scholarships',
    description:
      'Scholarships for Brooks and County of Newell students: the Brooks Composite handbook awards, service club money, trades scholarships and health bursaries.',
    intro:
      'Almost all of these are collected by the school rather than mailed to a sponsor, and the handbook prints no closing dates, so the date you need is the one your own office sets.',
  },
  {
    slug: 'st-albert',
    kind: 'region',
    value: 'St. Albert',
    label: 'St. Albert',
    h1: 'St. Albert scholarships',
    title: 'St. Albert High School Scholarships',
    description:
      'Scholarships for St. Albert and Sturgeon County students: community foundation awards, the Humboldt memorial funds, service club money and school bursaries.',
    intro:
      'One award reaches five schools and several run at two with different cutoffs, so the date you are held to is your own school\'s rather than the one the sponsor prints.',
  },
  {
    slug: 'spruce-grove',
    kind: 'region',
    value: 'Spruce Grove',
    label: 'Spruce Grove',
    h1: 'Spruce Grove scholarships',
    title: 'Spruce Grove High School Scholarships',
    description:
      'Scholarships for Spruce Grove, Stony Plain and Parkland County students: division citizenship awards, service club money, trades bursaries and employer funds.',
    intro:
      'The division citizenship scholarships here pay ten students whose average sits between 70 and 79.5 percent, so a strong transcript rules you out and the solid middle of the class is the whole field.',
  },
  {
    slug: 'leduc',
    kind: 'region',
    value: 'Leduc',
    label: 'Leduc',
    h1: 'Leduc scholarships',
    title: 'Leduc High School Scholarships',
    description:
      'Scholarships for Leduc, Leduc County, Beaumont and Devon students: county bursaries, Black Gold division awards, arts foundation and hospital money.',
    intro:
      'The largest of these pays $6,000 to three Black Gold graduates a year on financial need alone, and several close in September after graduation rather than in the spring.',
  },
  {
    slug: 'fort-saskatchewan',
    kind: 'region',
    value: 'Fort Saskatchewan',
    label: 'Fort Saskatchewan',
    h1: 'Fort Saskatchewan scholarships',
    title: 'Fort Saskatchewan Scholarships',
    description:
      'Scholarships for Fort Saskatchewan and Elk Island students: Fort High internal awards, division scholarships, industry money and service club bursaries.',
    intro:
      'The two largest are funded by a thrift store, at $5,000 each, and they score financial need three times as heavily as they score marks.',
  },
  {
    slug: 'chestermere',
    kind: 'region',
    value: 'Chestermere',
    label: 'Chestermere',
    h1: 'Chestermere scholarships',
    title: 'Chestermere Scholarships',
    description:
      'Scholarships for Chestermere students: the three Chestermere High awards, the Rocky View teachers\' scholarship and the Calgary-region awards that name the city.',
    intro:
      'The city award here is the unusual one, since it closes on September 1 rather than in the spring and lets the next year\'s graduates apply if nobody did.',
  },
  {
    slug: 'alberta',
    kind: 'region',
    value: 'Alberta',
    label: 'Province-wide',
    broad: true,
    h1: 'Province-wide scholarships',
    title: 'Province-Wide Scholarships in Alberta',
    description:
      'Alberta scholarships with no city requirement: the Rutherford, provincial arts and trades awards, credit union and energy money, open anywhere in the province.',
    intro:
      'These awards carry no city requirement, and this is where the large provincial money sits: three Alberta Foundation for the Arts awards at $7,000 each and the Advancing Futures Bursary at up to $40,000.',
  },
  {
    slug: 'national',
    kind: 'region',
    value: 'National',
    extraValues: ['International'],
    label: 'National',
    broad: true,
    h1: 'National scholarships',
    title: 'National Scholarships for Canadian Students',
    description:
      'The Canada-wide scholarships an Alberta student can enter, from the $100,000 Loran and Schulich awards down to essay contests that take an evening.',
    intro:
      'This is the smallest list on the site and the most valuable, because the six-figure money is here and the deadlines land first: Loran closes October 15, months before any local award opens.',
  },
  {
    slug: 'indigenous',
    kind: 'category',
    value: 'Indigenous',
    label: 'Indigenous',
    h1: 'Indigenous scholarships',
    title: 'Indigenous Scholarships in Alberta',
    description:
      'Scholarships and bursaries for First Nations, Métis, and Inuit high school students in Alberta, from national funds to provincial merit awards.',
    intro:
      'These are for self-identified First Nations, Métis, and Inuit students, and several are administered by bands or national organizations rather than schools, so check the application route on each listing.',
  },
  {
    slug: 'trades',
    kind: 'category',
    value: 'Trades',
    label: 'Trades',
    h1: 'Trades and RAP awards',
    title: 'Trades & Apprenticeship Scholarships in Alberta',
    description:
      'Scholarships for Alberta students heading into the trades: RAP apprenticeship awards, Skills Canada scholarships, and industry-funded money.',
    intro:
      'Scholarship advice in Alberta is written almost entirely for university-bound students, which is why trades money goes under-applied and why several of these exist for RAP and apprenticeship students.',
    guide: 'trades-scholarships-rap-alberta',
  },
  {
    slug: 'arts',
    kind: 'category',
    value: 'Arts',
    label: 'Arts',
    h1: 'Arts scholarships in Alberta',
    title: 'Arts Scholarships for Alberta Students',
    description:
      'Scholarships for Alberta high school students in music, visual art, film, writing, and performance, from festival awards to provincial funds.',
    intro:
      'Arts awards usually ask for a portfolio, an audition, or a submitted piece rather than an essay and a transcript, so read the requirements early: several want work you have to make first.',
  },
  {
    slug: 'stem',
    kind: 'category',
    value: 'STEM',
    label: 'STEM',
    h1: 'STEM scholarships in Alberta',
    title: 'STEM Scholarships for Alberta Students',
    description:
      'Science, technology, engineering, and math scholarships for Alberta high school students, including science fair and research-linked awards.',
    intro:
      'Several of these are tied to something you do rather than something you write: a science fair placement, a competition result, or a research placement you can point at.',
  },
  {
    slug: 'community',
    kind: 'category',
    value: 'Community',
    label: 'Community',
    h1: 'Community service awards',
    title: 'Community & Volunteer Scholarships in Alberta',
    description:
      'Alberta scholarships that reward volunteering, service, and community leadership, from local service club grants to national leadership awards.',
    intro:
      'These reward sustained involvement rather than marks, and two years in one role with growing responsibility reads far better here than eight one-off activities.',
    guide: 'local-scholarships-better-odds',
  },
  {
    slug: 'sports',
    kind: 'category',
    value: 'Sports',
    label: 'Sports',
    h1: 'Athletic scholarships in Alberta',
    title: 'Athletic Scholarships for Alberta Students',
    description:
      'Scholarships for Alberta high school athletes, including junior athletic awards and scholarships that reward coaching and officiating.',
    intro:
      'Canadian athletic awards are modest, merit-assessed, and open to athletes well outside the varsity tier, and coaching and officiating count on several of them.',
  },
];

export const PROGRAM_FACETS: Facet[] = [
  {
    slug: 'research',
    kind: 'category',
    value: 'Research',
    label: 'Research',
    guide: 'high-school-research-programs-alberta',
    h1: 'High school research programs',
    title: 'High School Research Programs in Alberta',
    description:
      'Research placements and summer institutes open to Alberta high school students, at universities across the province and beyond. Several are paid.',
    intro:
      'These place high school students in actual labs, usually over the summer and several with a stipend, but a program running in July often closes in February.',
  },
  {
    slug: 'computing',
    kind: 'category',
    value: 'Computing',
    label: 'Computing',
    guide: 'high-school-computing-programs-alberta',
    h1: 'Computing and CS programs',
    title: 'Computing & CS Programs for Alberta Students',
    description:
      'Computer science and computing programs, contests, and camps for Alberta high school students, from AI literacy to competitive programming.',
    intro:
      'A mix of contests, summer camps, and structured programs, several of which feed directly into scholarship eligibility and cost nothing at all to enter.',
  },
  {
    slug: 'math-physics',
    kind: 'category',
    value: 'Math & Physics',
    label: 'Math & Physics',
    h1: 'Math and physics competitions',
    title: 'Math & Physics Contests for Alberta Students',
    description:
      'Math and physics competitions open to Alberta high school students, including Waterloo contests, olympiad qualifiers, and provincial exams.',
    intro:
      'Most of these run through your school rather than around it, so the first step is asking a teacher whether yours is registered for the contest you want.',
  },
  {
    slug: 'social-sciences',
    kind: 'category',
    value: 'Social Sciences',
    label: 'Social Sciences',
    h1: 'Social science programs',
    title: 'Social Science & Leadership Programs in Alberta',
    description:
      'Model parliaments, debate, youth councils, and leadership programs for Alberta high school students. Several are free or fully funded.',
    intro:
      'Debate, model parliament, youth councils, and civic programs are the activities scholarship committees are asking about when they ask about leadership, and a surprising number cover their own costs.',
  },
  {
    slug: 'health',
    kind: 'category',
    value: 'Health',
    label: 'Health',
    guide: 'medical-experience-high-school-alberta',
    h1: 'Health and medicine programs',
    title: 'Health & Medicine Programs for Alberta Students',
    description:
      'Health sciences programs, hospital volunteering, and medical discovery days for Alberta high school students considering a career in health.',
    intro:
      'If you are considering medicine, nursing, or health sciences, these are the ways to find out before you commit a degree to it, and several involve real clinical settings rather than a classroom.',
  },
  {
    slug: 'engineering',
    kind: 'category',
    value: 'Engineering',
    label: 'Engineering',
    h1: 'Engineering programs and camps',
    title: 'Engineering Programs for Alberta Students',
    description:
      'Engineering summer programs, design competitions, and faculty-run camps for Alberta high school students at U of A, U of C, and beyond.',
    intro:
      'Faculty-run camps and design competitions, most of them at Alberta universities, and the simplest way to find out which discipline you actually like before applying to a five-year program.',
  },
  {
    slug: 'trades',
    kind: 'category',
    value: 'Trades & Tech',
    // "Trades", not the full "Trades & Tech": the chip is the ninth in the FIELD
    // row and the long form put it 36px past the measure, which is the scroller
    // this row was rebuilt to get rid of. The scholarships side already labels
    // its chip "Trades" over a hub called "Trades and RAP awards".
    label: 'Trades',
    h1: 'Trades and tech programs',
    title: 'Trades & Tech Programs for Alberta Students',
    description:
      'Apprenticeships, dual credit, and paid internships for Alberta high school students: RAP, SAIT and Olds College credentials, Skills Canada.',
    intro:
      'The routes that pay you while you train and hand you post-secondary credit before you graduate: RAP, dual credit at SAIT and Olds College, paid employer internships, and Skills Canada.',
  },
  {
    slug: 'enrichment',
    kind: 'category',
    value: 'Enrichment',
    label: 'Enrichment',
    h1: 'Enrichment programs',
    title: 'Enrichment Programs for Alberta Students',
    description:
      'Academic enrichment programs, pre-college courses, and summer academies open to Alberta high school students across every subject area.',
    intro:
      'Broad academic programs that do not sit inside one subject, for students who are strong across the board and not yet committed to a single field.',
  },
];

/** Facet lookups, by slug, for the two routes. */
/**
 * The complete category vocabulary of each dataset, and the only place it is
 * written down.
 *
 * Not derived from the facets: a category is allowed to exist without a hub
 * (Trades & Tech spent months under MIN_FACET_ITEMS, and General has never had
 * a page), so deriving this would reject the very listings that keep a thin
 * category alive until it clears the floor.
 *
 * It exists because the FIELD and TRACK rows are facet-driven, so a listing
 * filed under a category nobody declared is not merely untidy: it gets no chip,
 * no hub, no breadcrumb, and is reachable only by scrolling the directory or
 * guessing its name in the search box. validate-data.ts fails the build on one
 * rather than letting it ship, which is the check that was missing when the
 * admin panel's own dropdown was offering nine categories -- Biology, Medicine,
 * Multidisciplinary and friends -- that this project has never used.
 *
 * Adding a category means adding it here first, then deciding whether it earns
 * a facet.
 */
export const SCHOLARSHIP_CATEGORIES = [
  'Academic', 'Arts', 'Community', 'General', 'Indigenous', 'STEM', 'Sports', 'Trades',
] as const;
export const PROGRAM_CATEGORIES = [
  'Computing', 'Engineering', 'Enrichment', 'Health', 'Math & Physics',
  'Research', 'Social Sciences', 'Trades & Tech',
] as const;

export const SCHOLARSHIP_FACET_BY_SLUG = new Map(SCHOLARSHIP_FACETS.map(f => [f.slug, f]));
export const PROGRAM_FACET_BY_SLUG = new Map(PROGRAM_FACETS.map(f => [f.slug, f]));

/**
 * Every slug the hub routes occupy, which is exactly the set a listing slug may
 * not be. Kept as one export so validate-data has a single thing to check
 * against and cannot drift from what the routes actually build.
 */
export const RESERVED_SCHOLARSHIP_SLUGS = new Set(SCHOLARSHIP_FACETS.map(f => f.slug));
export const RESERVED_PROGRAM_SLUGS = new Set(PROGRAM_FACETS.map(f => f.slug));

/** What a facet is matched against. `alsoOpenTo` is scholarships-only and optional. */
export interface FacetTarget {
  region?: string | null;
  category?: string | null;
  alsoOpenTo?: string[] | null;
}

/**
 * The listing field a facet matches on. Regions live on `region`, everything
 * else on `category`.
 *
 * A region facet also matches `alsoOpenTo`, which is how an award written for a
 * list of communities reaches all of their hubs. The Calgary Black Chambers
 * awards name nine of them; `region` holds one, and the other eight would
 * otherwise have no way to show an award their students can win. Pass
 * `primaryOnly` to ignore that and ask only where the listing itself lives,
 * which is what breadcrumbs want: a Calgary award surfaced on the Airdrie hub
 * is still a Calgary award.
 */
export function facetMatches(
  facet: Facet,
  item: FacetTarget,
  { primaryOnly = false }: { primaryOnly?: boolean } = {},
): boolean {
  if (facet.kind !== 'region') return item.category === facet.value;
  if (item.region === facet.value) return true;
  if (facet.extraValues?.includes(item.region ?? '')) return true;
  return !primaryOnly && (item.alsoOpenTo?.includes(facet.value) ?? false);
}

export function facetItems<T extends FacetTarget>(facet: Facet, items: T[]): T[] {
  return items.filter(item => facetMatches(facet, item));
}

/**
 * The hub a given listing belongs under, for breadcrumbs and cross-links.
 *
 * Region wins over category for scholarships: "Medicine Hat" tells a reader
 * more about where an award sits than "Academic" does, and it is the crumb the
 * geo queries are looking for. The two broad scopes are the exception: awards
 * that are region "Alberta" or "National" do have hubs now, but "province-wide"
 * is a weaker crumb than "Trades" is, so `broad` facets are skipped here and
 * those listings fall through to their category exactly as before.
 * Returns null when neither has a hub; Academic has 56 listings and
 * deliberately no page, so this is a normal outcome, not a gap.
 */
export function facetForListing(
  item: FacetTarget,
  facets: Facet[],
): Facet | null {
  return (
    facets.find(f => f.kind === 'region' && !f.broad && facetMatches(f, item, { primaryOnly: true })) ??
    facets.find(f => f.kind === 'category' && facetMatches(f, item)) ??
    null
  );
}

/** Facet for a category name, or null where that category deliberately has no hub. */
export function facetForCategory(category: string | null | undefined, facets: Facet[]): Facet | null {
  return facets.find(f => f.kind === 'category' && f.value === category) ?? null;
}
