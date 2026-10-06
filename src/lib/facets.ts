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
  /**
   * Which data field the `value` is matched against: `region` and `category`
   * live on the listing's own fields of those names, `format` on `format`.
   *
   * Programs carry two axes since 2026-09-15 (Ilia): the FIELD is the subject
   * (Research, Computing), the FORMAT is the shape (a two-week summer camp, a
   * 75-minute contest, a four-year apprenticeship). Filing everything from
   * the Euclid contest to RAP under "Research" is what made /programs read as
   * a dump, and neither axis alone separates them.
   */
  kind: 'region' | 'category' | 'format';
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
   * The towns an area page rolls up (Ilia, 2026-10-04: "8/10 visitors are
   * from Calgary or Edmonton areas"). Pages go by population; eligibility
   * does not: a listing keeps its own `region`, the quiz still asks for the
   * town, and the area page labels each row with the towns it is open to.
   * This is the rollup `extraValues` is not for.
   */
  members?: string[];
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
  /**
   * A full-page photo background for the hub, fixed behind everything while
   * the page scrolls. Needs five files in public/photos/backdrops/:
   * <name>-wide-{1672,3344}.webp, <name>-tall-{1000,2000}.webp and
   * <name>-tile.webp (the header menu tile). Placement is in the hub page's CSS;
   * credits in public/photos/CREDITS.md and src/lib/photo-credits.ts.
   *
   * A program FORMAT hub's photo shows in the header's Programs menu and the
   * home page's program carousel (Ilia, 2026-09-23); its hub page has none.
   */
  backdrop?: string;
  /**
   * The University & college awards hub: a region value that names who gives
   * the award, not where the student lives. Its page filters by school, and
   * the surfaces that list places leave it out.
   */
  bySchool?: boolean;
}

/**
 * The scopes the header's Scholarships menu shows as photo tiles, and the home
 * page's scope carousel shows as cards: the two broad scopes and eight cities
 * chosen for population and reach, not listing count (Lacombe and Okotoks
 * out-list Lethbridge, but far fewer students live there). Both surfaces sort
 * these by count. A slug missing from SCHOLARSHIP_FACETS is dropped, not faked.
 */
export const MENU_SCOPES = [
  'alberta', 'national',
  'calgary', 'edmonton', 'red-deer', 'lethbridge',
  'medicine-hat', 'grande-prairie', 'fort-mcmurray',
];

export const SCHOLARSHIP_FACETS: Facet[] = [
  {
    slug: 'medicine-hat',
    kind: 'region',
    value: 'Medicine Hat',
    label: 'Medicine Hat',
    h1: 'Medicine Hat scholarships',
    backdrop: 'medicine-hat',
    title: 'Medicine Hat High School Scholarships',
    description:
      "Every scholarship a Medicine Hat high school student can apply for: Catholic board awards, Redcliff scholarships, county bursaries, service clubs and employers.",
    intro:
      "The three Redcliff scholarships, at up to $6,000 each, are the largest Medicine Hat awards, and the smallest are the $500 Chuck Love Memorial and Bow Island health foundation awards.",
    guide: 'scholarships-for-medicine-hat-students',
  },
  {
    slug: 'edmonton',
    kind: 'region',
    value: 'Edmonton',
    members: ['St. Albert', 'Sherwood Park', 'Spruce Grove', 'Leduc', 'Fort Saskatchewan', 'Beaumont'],
    label: 'Edmonton area',
    h1: 'Edmonton area scholarships',
    backdrop: 'edmonton',
    title: 'Edmonton Area High School Scholarships',
    description:
      'Scholarships for Edmonton, St. Albert, Sherwood Park, Spruce Grove, Leduc, Fort Saskatchewan and Beaumont students, with each award marked by town.',
    intro:
      "The Edmonton Public Schools awards here share one April deadline, and they run from a $250 French award to the LeRoy Warden scholarship of up to $10,000 for students with financial need.",
  },
  {
    slug: 'calgary',
    kind: 'region',
    value: 'Calgary',
    members: ['Airdrie', 'Cochrane', 'Okotoks', 'Chestermere'],
    label: 'Calgary area',
    h1: 'Calgary area scholarships',
    backdrop: 'calgary',
    title: 'Calgary Area High School Scholarships',
    description:
      "Scholarships for Calgary, Airdrie, Cochrane, Okotoks and Chestermere students: EducationMatters, Calgary Foundation, service club and school awards.",
    intro:
      'Half of these close in May, most through the one EducationMatters application, and the largest is the $100,000 Investing in the Future Award, which closes March 31.',
  },
  {
    slug: 'red-deer',
    guide: 'scholarships-for-red-deer-students',
    kind: 'region',
    value: 'Red Deer',
    label: 'Red Deer',
    h1: 'Red Deer scholarships',
    backdrop: 'red-deer',
    title: 'Red Deer Scholarships for High School Students',
    description:
      "Scholarships for Red Deer and central Alberta high school students: public and Catholic division awards, memorial funds, arts and community scholarships.",
    intro:
      "Two in three of these close in May, among them the $10,000 Rising Futures Scholarship and the $5,000 William Arthur Bower Memorial.",
  },
  {
    slug: 'lethbridge',
    guide: 'scholarships-for-lethbridge-students',
    kind: 'region',
    value: 'Lethbridge',
    label: 'Lethbridge',
    h1: 'Lethbridge scholarships',
    backdrop: 'lethbridge',
    title: 'Lethbridge High School Scholarships',
    description:
      "Scholarships for Lethbridge and southern Alberta students: school division awards, county scholarships, Coaldale community money and arts awards.",
    intro:
      "The largest is the Lethbridge East Rotary agricultural scholarship at $10,000, closing December 1, and the Chinook Regional Hospital volunteer award pays up to $4,000 toward health care study.",
  },
  {
    slug: 'grande-prairie',
    kind: 'region',
    value: 'Grande Prairie',
    label: 'Grande Prairie',
    h1: 'Grande Prairie scholarships',
    backdrop: 'grande-prairie',
    title: 'Grande Prairie Scholarships',
    description:
      "Scholarships for Grande Prairie and the Peace Region: Northwestern Alberta Foundation funds, Grande Prairie Public awards and the city and county money.",
    intro:
      "One Northwestern Alberta Foundation form reaches most of the community funds here, and they stay open until August 9, well after most Alberta awards have closed.",
  },
  {
    slug: 'fort-mcmurray',
    kind: 'region',
    value: 'Fort McMurray',
    label: 'Fort McMurray',
    h1: 'Fort McMurray scholarships',
    backdrop: 'fort-mcmurray',
    title: 'Fort McMurray Scholarships',
    description:
      "Scholarships for Fort McMurray and Wood Buffalo students: public district awards, First Nation education funding, local clubs and the municipality.",
    intro:
      "The largest fixed award is $3,000 for a Fort McMurray Public graduate in financial need, and three First Nations here fund their own members' post-secondary study.",
  },
  {
    slug: 'northern-alberta',
    kind: 'region',
    backdrop: 'cold-lake',
    value: 'Northern Alberta',
    members: ['Cold Lake', 'Lloydminster'],
    label: 'Northern Alberta',
    h1: 'Northern Alberta scholarships',
    title: 'Northern Alberta Scholarships',
    description:
      'Scholarships for Cold Lake and Lloydminster students: the 4 Wing military award, Lakeland credit union money, division bursaries and service clubs.',
    intro:
      'The largest local award here, the Billion Barrel scholarship in Cold Lake at $5,000, stays open until July 31, and two Lloydminster awards stay open until August 31.',
  },
  {
    slug: 'central-alberta',
    kind: 'region',
    backdrop: 'lacombe',
    value: 'Central Alberta',
    members: ['Lacombe', 'Camrose', 'Wetaskiwin'],
    label: 'Central Alberta',
    h1: 'Central Alberta scholarships',
    title: 'Central Alberta Scholarships',
    description:
      'Scholarships for Lacombe, Camrose and Wetaskiwin students: Wolf Creek and Battle River division awards, Legion and service club money, and county bursaries.',
    intro:
      'Most of these belong to one town, so read the town on each row first; Camrose and Lacombe have the most, from the Augustana campus awards to the Wolf Creek division scholarships.',
  },
  {
    slug: 'southern-alberta',
    kind: 'region',
    backdrop: 'brooks',
    value: 'Southern Alberta',
    members: ['Brooks'],
    label: 'Southern Alberta',
    h1: 'Southern Alberta scholarships',
    title: 'Southern Alberta Scholarships',
    description:
      'Scholarships for Brooks and County of Newell students: Grasslands division awards, service club money, trades scholarships and health bursaries.',
    intro:
      'Most of these print no closing date, so ask your school office which date applies before you count on one, and note that the Bassano School awards are for its own graduates.',
  },
  {
    slug: 'alberta',
    kind: 'region',
    value: 'Alberta',
    label: 'Province-wide',
    broad: true,
    h1: 'Province-wide scholarships',
    backdrop: 'alberta',
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
    backdrop: 'national',
    title: 'National Scholarships for Canadian Students',
    description:
      'The Canada-wide scholarships an Alberta student can enter, from the $150,000 Loran and $100,000 Schulich awards to essay contests that take an evening.',
    intro:
      'The largest awards in Canada are here: Loran is worth about $150,000, and Schulich Leader and Ted Rogers each pay $100,000 or more.',
  },
  {
    // A school's own entrance awards, by school rather than city (Ilia,
    // 2026-10-01). Not a place: it stays out of "Where you live", the
    // deadlines town filter and the city pages' "also open to you" line.
    slug: 'university-college-awards',
    kind: 'region',
    value: 'University & college',
    label: 'University & college awards',
    bySchool: true,
    h1: 'University & college awards',
    title: 'University and College Entrance Scholarships',
    description:
      'Entrance scholarships Alberta colleges and universities give new students, from Red Deer Polytechnic to Burman. Wherever you live, apply to the school.',
    intro:
      "Red Deer Polytechnic's awards here share one General Application, and Burman's run from $1,000 for applying by February 1 to full tuition for a 95 per cent admission average.",
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
      'Several of these are for apprentices, including RAP students who start one in high school, and the largest is the Skills Canada Alberta Terry Cooke scholarship at up to $20,000.',
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
      'Schulich Leader and Ted Rogers each pay $100,000 or more and close December 1 and January 27, months before the local STEM awards that are due in May.',
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
      'These are judged on volunteering and leadership, and they include the $28,000 Terry Fox Humanitarian Award and dozens of local service club grants.',
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
      "The largest is the Edmonton Oilers Alumni's Al Hamilton award at up to $8,000, most pay $5,000 or less, and coaching and officiating count on several of them.",
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
      'Contests, hackathons, summer camps and year-long clubs, from the Beaver Computing Challenge to the Canadian Computing Competition.',
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
      'Most of these are written at school, from the Euclid contest to the CAP physics exam, so ask a teacher whether yours is registered for the one you want.',
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
      'Debate, model parliament, youth councils and civic programs, from Model UN at the U of A and U of C to the Alberta Youth Parliament in the Legislature.',
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
      'Hospital volunteering, Discovery Days on a medical campus and health science competitions, for students thinking about medicine, nursing or health sciences.',
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
      'Faculty-run camps and design competitions, most of them at Alberta universities, where you can try a discipline before you apply to one.',
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

/**
 * The program FORMAT hubs: /programs/summer-programs/, /programs/olympiads/.
 *
 * The second axis, added 2026-09-15. Every live program carries exactly one
 * `format`, so these eight counts sum to the directory and a program appears
 * on exactly one of them. The vocabulary is the shape of the commitment, which
 * is the thing a reader is actually choosing between: a student who wants a
 * contest to write in an afternoon and a student who wants six weeks in a lab
 * are not served by the same page, and before this they had the same page.
 *
 * `value` is the slug itself rather than a prose label: unlike category, the
 * format vocabulary exists nowhere but here, so there is no display string in
 * the data for it to track.
 */
export const PROGRAM_FORMATS: Facet[] = [
  {
    slug: 'summer-programs',
    kind: 'format',
    backdrop: 'summer-programs',
    value: 'summer',
    label: 'Summer',
    h1: 'Summer programs',
    title: 'Summer Programs for Alberta Students',
    description:
      'Summer camps, institutes and paid research placements open to Alberta high school students, from one-week campus camps to six-week labs.',
    intro:
      'These run in July and August, from one-week campus camps to six-week paid labs, and most of the ones with a posted deadline close between November and March.',
  },
  {
    slug: 'competitions',
    kind: 'format',
    backdrop: 'competitions',
    value: 'competitions',
    label: 'Competitions',
    h1: 'Competitions and challenges',
    title: 'Competitions for Alberta High School Students',
    description:
      'Team competitions for Alberta high school students: robotics, hackathons, cyber defence, innovation challenges and the Skills Canada trades events.',
    intro:
      'Robotics, hackathons and cyber defence, most of them entered as a school team that a teacher registers months before the event, and most run over a season.',
  },
  {
    slug: 'olympiads',
    guide: 'chemistry-competitions-canada',
    kind: 'format',
    backdrop: 'olympiads',
    value: 'olympiads',
    label: 'Olympiads',
    h1: 'Olympiads and contests',
    title: 'Olympiads and Contests for Alberta Students',
    description:
      'Written contests and olympiad qualifiers Alberta students sit at their own school: Euclid, the CAP physics exam, and the biology and chemistry olympiads.',
    intro:
      'Almost every one of these is written at your own school on a fixed date, and your teacher has to register the school weeks before it.',
  },
  {
    slug: 'science-fairs',
    kind: 'format',
    backdrop: 'science-fairs',
    value: 'science-fairs',
    label: 'Science fairs',
    h1: 'Science fairs',
    title: 'Science Fairs in Alberta',
    description:
      'Every regional science fair in Alberta and what lies past them: winning your own region is the only route to the Canada-Wide Science Fair.',
    intro:
      'The regional fairs run February to April on a project you start in the fall, and each one is the only door to the national fair for the students in its area.',
  },
  {
    slug: 'research-placements',
    kind: 'format',
    backdrop: 'research-placements',
    value: 'research',
    label: 'Research',
    h1: 'Research and mentorship',
    title: 'Research Programs for Alberta Students',
    description:
      'Year-round research and mentorship programs for Alberta high school students: one-to-one mentors, virtual cohorts and university placements.',
    intro:
      "Mentorships, team experiments and student journals, from Youreka's ten-week teams to one-to-one work with a PhD mentor, and most end in a project or paper with your name on it.",
  },
  {
    slug: 'dual-credit',
    kind: 'format',
    backdrop: 'dual-credit',
    value: 'dual-credit',
    label: 'Dual credit',
    h1: 'Dual credit and work experience',
    title: 'Dual Credit and RAP in Alberta',
    description:
      'Dual credit courses, apprenticeships and paid internships for Alberta students: RAP, SAIT and Olds College credentials, and CAREERS placements.',
    intro:
      'These pay you, credit you, or both, and nearly all of them are arranged through your own school rather than by applying to the provider directly.',
  },
  {
    slug: 'clubs',
    kind: 'format',
    backdrop: 'clubs',
    value: 'clubs',
    label: 'Clubs',
    h1: 'Clubs and year-round programs',
    title: 'Year-Round Programs for Alberta Students',
    description:
      'Clubs, councils, volunteering and self-paced programs Alberta students can join at any point in the year, from 4-H to youth councils and hospital shifts.',
    intro:
      '4-H, youth councils, science centre and hospital volunteering, and self-paced programs, and none of them has a single application date, so you can join in any month.',
  },
  {
    slug: 'conferences',
    kind: 'format',
    backdrop: 'conferences',
    value: 'conferences',
    label: 'Conferences',
    h1: 'Conferences and workshops',
    title: 'Conferences and Workshops for Students',
    description:
      'Short conferences, campus days and workshops for Alberta high school students: Forum for Young Canadians, Discovery Days and the regional summits.',
    intro:
      'A few days each, on a campus, in Ottawa or overseas, and Youth Parliament of Canada and the Vimy Pilgrimage cover your travel and accommodation.',
  },
];

/**
 * Both program axes, in the order the routes build them. The hub route, the
 * sitemap and the reserved-slug check all read this, so a format hub can never
 * exist in one of the three and not the others.
 */
export const ALL_PROGRAM_FACETS: Facet[] = [...PROGRAM_FACETS, ...PROGRAM_FORMATS];

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
export const RESERVED_PROGRAM_SLUGS = new Set(ALL_PROGRAM_FACETS.map(f => f.slug));

/** What a facet is matched against. `alsoOpenTo` is scholarships-only and optional. */
export interface FacetTarget {
  region?: string | null;
  category?: string | null;
  /** Programs only: the slug of the format facet this program belongs to. */
  format?: string | null;
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
  if (facet.kind === 'format') return item.format === facet.value;
  if (facet.kind !== 'region') return item.category === facet.value;
  if (item.region === facet.value) return true;
  if (facet.extraValues?.includes(item.region ?? '')) return true;
  if (facet.members?.includes(item.region ?? '')) return true;
  return !primaryOnly && (item.alsoOpenTo?.some(t => t === facet.value || facet.members?.includes(t)) ?? false);
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
