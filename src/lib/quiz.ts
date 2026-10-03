// The eligibility quiz definition; the questions /match asks and the key the
// answers are stored under.
//
// Lived in app-core.ts while /app existed, because the site quiz and the
// in-app quiz had to write byte-identical answers. /app is gone; this is now
// the only quiz, and it keeps its own file rather than moving into
// EligibilityQuiz.tsx so the matcher's inputs stay readable next to
// eligibility-matcher.ts rather than buried in a React component.

import { AUDIENCE_SCHOOLS } from './combo-pick';

export const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

/** Quiz progress lives in sessionStorage, not localStorage: closing the tab
 *  ends the attempt. The TTL below then covers the tab left open for hours. */

/** How long saved quiz progress stays valid. A student who comes back the
 *  next day is starting over anyway, and stale answers silently deciding
 *  their matches is worse than one extra minute of tapping. */
export const QUIZ_TTL_MS = 60 * 60 * 1000

export interface StoredQuiz { version?: number; step: number; answers: Record<string, string>; savedAt?: number }

export interface QuizOption {
  label: string
  value: string
  /** What the option covers, when that is not obvious from the label. */
  hint?: string
}
export interface QuizQuestion { key: string; q: string; opts: QuizOption[] }

/** Three answers plus Other while more remain; at most four on the last page.
 * Other is navigation, so it never becomes a matcher value or a quiz step. */
export function quizOptionBatch(opts: QuizOption[], requestedPage = 0) {
  const lastPage = Math.max(0, Math.ceil((opts.length - 4) / 3));
  const page = Math.min(lastPage, Number.isFinite(requestedPage) ? Math.max(0, Math.floor(requestedPage)) : 0);
  const start = page * 3;
  const hasMore = opts.length - start > 4;
  return { options: opts.slice(start, start + (hasMore ? 3 : 4)), page, start, hasMore };
}

/** Reopening a question shows the page containing its existing answer. */
export function quizOptionPage(opts: QuizOption[], value: string | undefined): number {
  const index = value === undefined ? -1 : opts.findIndex(o => o.value === value);
  return quizOptionBatch(opts, Math.floor(Math.max(0, index) / 3)).page;
}

/** The key the institution question stores under. */
export const INSTITUTION_QUESTION_KEY = 'institution'

/**
 * The institution question takes several answers: a Grade 12 student applies
 * to more than one school and does not know yet which will take them (Ilia,
 * 2026-10-03). Stored as one string, joined by this, so the saved answers keep
 * their Record<string, string> shape and a single answer reads as before.
 */
const INSTITUTION_SEP = '|'
export function institutionsOf(answer: string | undefined): string[] {
  return answer ? answer.split(INSTITUTION_SEP).filter(Boolean) : []
}
export function joinInstitutions(values: string[]): string {
  return values.join(INSTITUTION_SEP)
}

/**
 * Hints only where they tell the student something: what an option covers
 * ("Science, tech, math"). The reassurance lines
 * ("Prime prep time", "Totally fine", "Grades aren't everything") were filler
 * and are gone (critique 2026-09-23). No emoji either: 🔬 once carried
 * "Programs" and "STEM & Engineering" at once.
 *
 * Keys, values and labels are the real matching-engine inputs and must not
 * change without updating the matcher.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: 'What are you looking for?',
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'Awards, including bursaries for financial need' },
      { label: 'Programs', value: 'programs', hint: 'Summer, trades, contests' },
      { label: 'Both', value: 'both' },
    ],
  },
  {
    key: 'city',
    q: 'Where are you based?',
    // Descending 2021 census populations, using named places rather than
    // metro areas. Sherwood Park excludes rural Strathcona County;
    // Fort McMurray excludes the rest of Wood Buffalo; Lloydminster is AB.
    // Sources and boundary notes: docs/simplification.md, 2026-09-30 quiz.
    // Search always includes the real Other Alberta answer. The separate
    // fourth tile labelled Other only opens another batch of choices.
    opts: [
      { label: 'Calgary', value: 'Calgary' },
      { label: 'Edmonton', value: 'Edmonton' },
      { label: 'Red Deer', value: 'Red Deer' },
      { label: 'Lethbridge', value: 'Lethbridge' },
      { label: 'Airdrie', value: 'Airdrie' },
      { label: 'Sherwood Park', value: 'Sherwood Park' },
      { label: 'St. Albert', value: 'St. Albert' },
      { label: 'Fort McMurray', value: 'Fort McMurray' },
      { label: 'Grande Prairie', value: 'Grande Prairie' },
      { label: 'Medicine Hat', value: 'Medicine Hat' },
      { label: 'Spruce Grove', value: 'Spruce Grove' },
      { label: 'Leduc', value: 'Leduc' },
      { label: 'Cochrane', value: 'Cochrane' },
      { label: 'Okotoks', value: 'Okotoks' },
      { label: 'Fort Saskatchewan', value: 'Fort Saskatchewan' },
      { label: 'Chestermere', value: 'Chestermere' },
      { label: 'Beaumont', value: 'Beaumont' },
      { label: 'Lloydminster', value: 'Lloydminster' },
      { label: 'Camrose', value: 'Camrose' },
      { label: 'Cold Lake', value: 'Cold Lake' },
      { label: 'Brooks', value: 'Brooks' },
      { label: 'Lacombe', value: 'Lacombe' },
      { label: 'Wetaskiwin', value: 'Wetaskiwin' },
      { label: 'Other Alberta', value: 'Other Alberta', hint: 'Another town or county' },
    ],
  },
  {
    key: 'field',
    q: 'What are you interested in?',
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', hint: 'Science, tech, math' },
      { label: 'Health & Medicine', value: 'health', hint: 'Medicine, nursing, kinesiology' },
      { label: 'Business & Commerce', value: 'business', hint: 'Finance, management' },
      { label: 'Arts & Humanities', value: 'arts', hint: 'Fine arts, social science' },
      { label: 'Trades', value: 'trades', hint: 'Apprenticeships and skilled trades' },
      { label: 'Still figuring it out', value: '' },
    ],
  },
  {
    key: 'average',
    q: "What's your academic average?",
    opts: [
      { label: '90% or higher', value: '93' },
      { label: '80 – 89%', value: '85' },
      { label: 'Below 80%', value: '79' },
      { label: "I'd rather not say", value: '' },
    ],
  },
  {
    key: INSTITUTION_QUESTION_KEY,
    q: 'Where are you planning to study?',
    // Every school here is one the listings name as a requirement, so picking
    // it changes the results. Lethbridge, Northwestern Polytechnic, Keyano and
    // Medicine Hat College left on 2026-09-30 with the colleges' own awards and
    // came back on 2026-10-01 with their entrance awards; Burman, The King's,
    // Lethbridge Polytechnic and CBTS joined then, since a school's own
    // entrance awards are only reached through this answer.
    opts: [
      { label: 'University of Alberta', value: 'University of Alberta', hint: 'Edmonton' },
      { label: 'University of Calgary', value: 'University of Calgary', hint: 'Calgary' },
      { label: 'University of Lethbridge', value: 'University of Lethbridge', hint: 'Lethbridge' },
      { label: 'MacEwan University', value: 'MacEwan University', hint: 'Edmonton' },
      { label: 'Mount Royal University', value: 'Mount Royal University', hint: 'Calgary' },
      { label: 'NAIT', value: 'Northern Alberta Institute of Technology', hint: 'Edmonton' },
      { label: 'SAIT', value: 'SAIT', hint: 'Calgary' },
      { label: 'Red Deer Polytechnic', value: 'Red Deer Polytechnic', hint: 'Red Deer' },
      { label: 'Northwestern Polytechnic', value: 'Northwestern Polytechnic', hint: 'Grande Prairie' },
      { label: 'Keyano College', value: 'Keyano College', hint: 'Fort McMurray' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College', hint: 'Medicine Hat' },
      { label: 'Burman University', value: 'Burman University', hint: 'Lacombe' },
      { label: "The King's University", value: "The King's University", hint: 'Edmonton' },
      { label: 'Lethbridge Polytechnic', value: 'Lethbridge Polytechnic', hint: 'Lethbridge' },
      { label: 'Canadian Baptist Theological Seminary and College', value: 'Canadian Baptist Theological Seminary and College', hint: 'Cochrane' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', hint: 'Any apprenticeship' },
      { label: 'Somewhere else, or not sure', value: '' },
    ],
  },
]

/**
 * Scholarship searches no longer ask the grade: since 2026-09-30 the catalogue
 * is Grade 12 awards only, and the matcher reads an unanswered grade as '12'.
 * Programs still ask it, because program ages run below and above Grade 12.
 */
const GRADE_QUESTION: QuizQuestion = {
  key: 'grade',
  q: 'What grade are you in?',
  opts: [
    { label: 'Grade 10', value: '10' },
    { label: 'Grade 11', value: '11' },
    { label: 'Grade 12', value: '12' },
    { label: 'Already in post-secondary', value: 'post-secondary', hint: 'Awards for enrolled students' },
  ],
};

/** Programs use grade and field only; the other questions cannot change them. */
export const QUIZ_PROGRAM_QUESTIONS: QuizQuestion[] = [
  QUIZ_QUESTIONS.find(q => q.key === 'searchType')!,
  GRADE_QUESTION,
  QUIZ_QUESTIONS.find(q => q.key === 'field')!,
];

/** The key the school question stores under, and the matcher reads. */
/** The top of each average band, keyed by the option value (a band's
 *  middle). An award whose minimum falls inside the band stays in the
 *  results with a check instead of dropping out. */
export const AVERAGE_BAND_TOP: Record<string, number> = { '93': 100, '85': 89, '79': 79 };

export const SCHOOL_QUESTION_KEY = 'school';

/**
 * The optional last question: which school the student attends.
 *
 * It exists because 67 Calgary awards are restricted to one named school, and
 * the matcher's school filter at eligibility-matcher.ts only engages when the
 * profile carries a school. Without this the quiz cannot fill that field, so
 * every school-only award showed to every student in the city.
 *
 * Asked only where the city actually has school-restricted awards: Other
 * Alberta has none, and a question whose answer changes
 * nothing is a tax on the 30-second promise. `schools` is derived from the
 * listings themselves, so a new school-restricted award adds its school here
 * without anyone remembering to.
 */
export function schoolQuestion(schools: string[]): QuizQuestion {
  return {
    key: SCHOOL_QUESTION_KEY,
    q: 'Which school do you go to?',
    opts: [
      // No hint on these: the same "Has school-only awards" under each of up
      // to 67 tiles said nothing that told one from another (critique
      // 2026-09-23). Being on this list is what it meant.
      ...schools.map(name => ({ label: name, value: name })),
      // Always present: a student at a school with no awards of its own must
      // be able to pass without claiming one that isn't theirs. It was the
      // first tile, and "Another school" ahead of the list read as the way
      // past it, so students took it before paging to their own school
      // (Ilia, 2026-10-03). Last here; on a long list the quiz draws it under
      // every page of tiles, as the quieter way out (EligibilityQuiz.tsx).
      { label: "My school isn't listed", value: '' },
    ],
  };
}

/** The key the school-board question stores under, and the matcher reads. */
export const BOARD_QUESTION_KEY = 'board';

/**
 * Full names for the board codes the listings use, so the quiz can ask the
 * question in the words a student would recognise. A student knows they go to
 * a Calgary Board of Education school; nobody picks "CBE" off a list.
 *
 * Every name here was read off the `audience` text of a listing carrying that
 * code, not inferred from the initials.
 */
export const SCHOOL_BOARD_NAMES: Record<string, string> = {
  CBE: 'Calgary Board of Education',
  CCSD: 'Calgary Catholic School District',
  EPS: 'Edmonton Public Schools',
  ECSD: 'Edmonton Catholic Schools',
  MHCBE: 'Medicine Hat Catholic Board of Education',
  RDPSD: 'Red Deer Public Schools',
  RDCSD: 'Red Deer Catholic Regional Schools',
  CESD: "Chinook's Edge School Division",
  RVS: 'Rocky View Schools',
  GPPSD: 'Grande Prairie Public School Division',
  LSD: 'Lethbridge School Division',
};

/**
 * Whether a listing's region can put its board or school in `city`'s question.
 *
 * An exact city match, plus province-wide listings for "Other Alberta" only.
 *
 * The looser rule was tempting: two school-restricted awards carry region
 * "Alberta" because they span several communities (Strathmore, Innisfail and
 * the Cochrane schools), and an exact match alone left their 12 schools out of
 * every dropdown, so their filter could never engage. But feeding them to all
 * twenty-three cities put a 24-option question in front of Medicine Hat, Lethbridge
 * and Airdrie students, who had no school question at all, to filter two
 * listings out of 1,011. A student at one of those schools is in a town that is
 * not one of the twenty-three named cities, so "Other Alberta" is the answer they give,
 * and that is where the question is worth asking.
 */
function inCityScope(region: string | null | undefined, city: string): boolean {
  if (!region) return true;
  if (region === 'National' || region === 'Alberta') return city === 'Other Alberta';
  return region === city;
}

/** School boards with awards restricted to them, for one city. */
export function boardsForCity(
  listings: Array<{ region?: string | null; eligibility?: { schoolBoards?: string[] } | null }>,
  city: string,
): string[] {
  const seen = new Set<string>();
  for (const l of listings) {
    if (!inCityScope(l.region, city)) continue;
    for (const b of l.eligibility?.schoolBoards ?? []) seen.add(b);
  }
  return [...seen].sort((a, b) =>
    (SCHOOL_BOARD_NAMES[a] ?? a).localeCompare(SCHOOL_BOARD_NAMES[b] ?? b));
}

/**
 * The optional school-board question.
 *
 * 95 awards are restricted to a board without naming a school, and the quiz
 * had no way to fill the field, so the board filter in eligibility-matcher.ts
 * never engaged and a Calgary Catholic student was shown 58 awards open only
 * to Calgary Board of Education students. Built from the listings the same way
 * the school question is, so a new board-restricted award adds its board here
 * without anyone remembering to.
 */
export function boardQuestion(boards: string[]): QuizQuestion {
  return {
    key: BOARD_QUESTION_KEY,
    q: 'Which school board are you with?',
    opts: [
      ...boards.map(code => ({
        label: SCHOOL_BOARD_NAMES[code] ?? code,
        value: code,
      })),
      // Always last, and always present. A student at an independent, charter,
      // francophone or home-education school belongs to none of these, and
      // must be able to pass without claiming a board that is not theirs.
      { label: 'None of these', value: '' },
    ],
  };
}

/**
 * Schools with awards restricted to them, for one city, sorted by name.
 *
 * With a board chosen, a school the data places in a different board is left
 * out: a Catholic-board student was offered Medicine Hat High School (MHPSD).
 * There is no school-to-board table, so the only evidence is an award naming
 * both; a school with no such award stays in, since hiding a student's own
 * school is worse than offering one that is not theirs.
 */
export function schoolsForCity(
  listings: Array<{ region?: string | null; audience?: string | null; eligibility?: { specificSchools?: string[]; schoolBoards?: string[] } | null }>,
  city: string,
  board?: string | null,
): string[] {
  const seen = new Set<string>();
  const boardsOf = new Map<string, Set<string>>();
  // Schools a listing names only in its audience line join the list too, so
  // the student can reach that school's combo (combo-pick.ts). Those awards
  // carry no specificSchools, so picking one filters no award out.
  const named = AUDIENCE_SCHOOLS.filter(a => a.quizCity === city);
  for (const l of listings) {
    if (!inCityScope(l.region, city)) continue;
    for (const a of named) if (a.pattern.test(l.audience ?? '')) seen.add(a.name);
    for (const s of l.eligibility?.specificSchools ?? []) {
      seen.add(s);
      const known = boardsOf.get(s) ?? new Set<string>();
      for (const b of l.eligibility?.schoolBoards ?? []) known.add(b);
      boardsOf.set(s, known);
    }
  }
  return [...seen]
    // The quiz starts at Grade 10; a middle school on the list is one no
    // student taking it attends.
    .filter(s => !/\b(middle|elementary|junior high) school\b/i.test(s))
    // '' is "None of these": a school the data ties to any offered board is
    // not the student's (critique 2026-09-24: it still listed CBE schools).
    .filter(s => board == null || !boardsOf.get(s)?.size || (board !== '' && boardsOf.get(s)!.has(board)))
    .sort((a, b) => a.localeCompare(b));
}

// ── How the quiz describes itself ─────────────────────────────────────────────
// Shared descriptions follow the three-question program and five-to-seven
// question scholarship paths.

export const QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length;
export const QUIZ_MIN_QUESTION_COUNT = QUIZ_PROGRAM_QUESTIONS.length;
export const QUIZ_MIN_QUESTION_WORD = 'Three';

/**
 * The most questions any city can get, for the step label before the city is
 * answered. "of 5" that turns into "of 7" at question three reads as the quiz
 * growing; "of up to 7" that lands on 5 is good news.
 */
export function quizQuestionCeiling(
  listings: Array<{ region?: string | null; audience?: string | null; eligibility?: { schoolBoards?: string[]; specificSchools?: string[] } | null }>,
): number {
  const cities = QUIZ_QUESTIONS.find(q => q.key === 'city')?.opts ?? [];
  return QUIZ_QUESTION_COUNT + Math.max(0, ...cities.map(o =>
    (boardsForCity(listings, o.value).length > 0 ? 1 : 0) +
    (schoolsForCity(listings, o.value).length > 0 ? 1 : 0)));
}

/** The step label's denominator: "5", or "up to 7" while the city is open. */
export function quizTotalLabel(ceiling: number, current: number, cityAnswered: boolean): string {
  return !cityAnswered && ceiling > current ? `up to ${ceiling}` : String(current);
}

/** Spelled form for prose. Pinned to QUIZ_QUESTION_COUNT by a test. */
export const QUIZ_QUESTION_WORD = 'Five';

/**
 * The board and school questions are asked only where they can change the
 * answer. Scholarship searches use five to seven questions; programs use
 * three. Keep public descriptions tied to these shared counts.
 */
export const QUIZ_OPTIONAL_QUESTION_COUNT = 2;
export const QUIZ_MAX_QUESTION_COUNT = QUIZ_QUESTION_COUNT + QUIZ_OPTIONAL_QUESTION_COUNT;
export const QUIZ_MAX_QUESTION_WORD = 'seven';

/**
 * How many matches the results screen shows, per list.
 *
 * Both lists cap at the same number, and both used to hard-code 10 in
 * different files. The corpus has more than tripled since that number was
 * chosen, so 10 was cutting real matches off a list the student had already
 * answered eight questions to narrow. It went to 20, and is back at 10 now
 * that "Show all" sits under the list (critique 2026-09-24: 20 rows read as a
 * second directory, not a shortlist). Nothing is cut; the rest is one tap.
 */
export const RESULT_LIMIT = 10;

// Existing shared estimate, not a measured completion-time guarantee.
export const QUIZ_DURATION = 'about a minute';

/** One sentence, for anywhere that needs the whole claim at once. */
export const QUIZ_PROMISE = `${QUIZ_MIN_QUESTION_WORD} to ${QUIZ_MAX_QUESTION_WORD} questions, ${QUIZ_DURATION}. No account, no email.`;
