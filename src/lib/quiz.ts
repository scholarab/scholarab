// The eligibility quiz definition; the questions /match asks and the key the
// answers are stored under.
//
// Lived in app-core.ts while /app existed, because the site quiz and the
// in-app quiz had to write byte-identical answers. /app is gone; this is now
// the only quiz, and it keeps its own file rather than moving into
// EligibilityQuiz.tsx so the matcher's inputs stay readable next to
// eligibility-matcher.ts rather than buried in a React component.

export const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

/** Quiz progress lives in sessionStorage, not localStorage: closing the tab
 *  ends the attempt. The TTL below then covers the tab left open for hours. */

/** How long saved quiz progress stays valid. A student who comes back the
 *  next day is starting over anyway, and stale answers silently deciding
 *  their matches is worse than one extra minute of tapping. */
export const QUIZ_TTL_MS = 60 * 60 * 1000

export interface StoredQuiz { step: number; answers: Record<string, string>; savedAt?: number }

export interface QuizOption {
  label: string
  value: string
  /** What the option covers, when that is not obvious from the label. */
  hint?: string
}
export interface QuizQuestion { key: string; q: string; opts: QuizOption[] }

/**
 * Hints only where they tell the student something: what an option covers
 * ("And County of Newell", "Science, tech, math"). The reassurance lines
 * ("Prime prep time", "Totally fine", "Grades aren't everything") were filler
 * and are gone (critique 2026-09-23). No emoji either: 🔬 once carried
 * "Research programs" and "STEM & Engineering" at once.
 *
 * Keys, values and labels are the real matching-engine inputs and must not
 * change without updating the matcher.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: 'What are you looking for?',
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'Awards and bursaries' },
      { label: 'Research programs', value: 'programs', hint: 'Summer, trades, contests' },
      { label: 'Both', value: 'both', hint: 'Scholarships and programs' },
    ],
  },
  {
    key: 'grade',
    q: 'What grade are you in?',
    opts: [
      { label: 'Grade 10', value: '10' },
      { label: 'Grade 11', value: '11' },
      { label: 'Grade 12', value: '12' },
      { label: 'Already in post-secondary', value: 'post-secondary', hint: 'Awards for enrolled students' },
    ],
  },
  {
    key: 'city',
    q: 'Where are you based?',
    // The six biggest cities first, then alphabetical, "Other Alberta" last
    // (critique 2026-09-23: 24 tiles in no order meant reading all of them).
    // The quiz also offers a type-to-filter box above this list.
    opts: [
      { label: 'Calgary', value: 'Calgary', hint: 'And the foothills' },
      { label: 'Edmonton', value: 'Edmonton', hint: 'And the capital region' },
      { label: 'Red Deer', value: 'Red Deer', hint: 'And central Alberta' },
      { label: 'Lethbridge', value: 'Lethbridge', hint: 'And the southwest' },
      { label: 'St. Albert', value: 'St. Albert', hint: 'And Sturgeon County' },
      { label: 'Medicine Hat', value: 'Medicine Hat' },
      { label: 'Airdrie', value: 'Airdrie', hint: 'And Rocky View' },
      { label: 'Beaumont', value: 'Beaumont', hint: 'South of Edmonton' },
      { label: 'Brooks', value: 'Brooks', hint: 'And the County of Newell' },
      { label: 'Camrose', value: 'Camrose', hint: 'And Camrose County' },
      { label: 'Chestermere', value: 'Chestermere', hint: 'East of Calgary' },
      { label: 'Cochrane', value: 'Cochrane', hint: 'And Rocky View County' },
      { label: 'Cold Lake', value: 'Cold Lake', hint: 'And the Lakeland' },
      { label: 'Fort McMurray', value: 'Fort McMurray', hint: 'And Wood Buffalo' },
      { label: 'Fort Saskatchewan', value: 'Fort Saskatchewan', hint: 'And Elk Island' },
      { label: 'Grande Prairie', value: 'Grande Prairie', hint: 'And the Peace Region' },
      { label: 'Lacombe', value: 'Lacombe', hint: 'And Lacombe County' },
      { label: 'Leduc', value: 'Leduc', hint: 'And Leduc County' },
      { label: 'Lloydminster', value: 'Lloydminster', hint: 'The Alberta side' },
      { label: 'Okotoks', value: 'Okotoks', hint: 'And the foothills' },
      { label: 'Sherwood Park', value: 'Sherwood Park', hint: 'And Strathcona County' },
      { label: 'Spruce Grove', value: 'Spruce Grove', hint: 'And Stony Plain' },
      { label: 'Wetaskiwin', value: 'Wetaskiwin', hint: 'And Wetaskiwin County' },
      { label: 'Other Alberta', value: 'Other Alberta', hint: 'Any other town' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', hint: 'Science, tech, math' },
      { label: 'Health & Medicine', value: 'health', hint: 'Pre-med, nursing, kinesiology' },
      { label: 'Business & Commerce', value: 'business', hint: 'Finance, management' },
      { label: 'Arts & Humanities', value: 'arts', hint: 'Fine arts, social science' },
      { label: 'Trades', value: 'trades', hint: 'RAP and apprenticeships' },
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
    key: 'institution',
    q: 'Where are you planning to study?',
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary', hint: 'Calgary' },
      { label: 'University of Alberta', value: 'University of Alberta', hint: 'Edmonton' },
      { label: 'Mount Royal University', value: 'Mount Royal University', hint: 'Calgary' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College', hint: 'Medicine Hat' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', hint: 'SAIT, NAIT and more' },
      { label: 'Not sure yet', value: '' },
    ],
  },
]

/** The key the school question stores under, and the matcher reads. */
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
      // Always last, and always present: a student at a school with no awards
      // of its own must be able to pass without claiming one that isn't theirs.
      { label: 'Another school', value: '', hint: 'Skip this filter' },
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
  MHPSD: 'Medicine Hat Public School Division',
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
        hint: 'Has board-only awards',
      })),
      // Always last, and always present. A student at an independent, charter,
      // francophone or home-education school belongs to none of these, and
      // must be able to pass without claiming a board that is not theirs.
      { label: 'None of these', value: '', hint: 'Skip this filter' },
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
  listings: Array<{ region?: string | null; eligibility?: { specificSchools?: string[]; schoolBoards?: string[] } | null }>,
  city: string,
  board?: string | null,
): string[] {
  const seen = new Set<string>();
  const boardsOf = new Map<string, Set<string>>();
  for (const l of listings) {
    if (!inCityScope(l.region, city)) continue;
    for (const s of l.eligibility?.specificSchools ?? []) {
      seen.add(s);
      const known = boardsOf.get(s) ?? new Set<string>();
      for (const b of l.eligibility?.schoolBoards ?? []) known.add(b);
      boardsOf.set(s, known);
    }
  }
  return [...seen]
    .filter(s => !board || !boardsOf.get(s)?.size || boardsOf.get(s)!.has(board))
    .sort((a, b) => a.localeCompare(b));
}

// ── How the quiz describes itself ─────────────────────────────────────────────
// The same six taps were sold as "under 30 seconds" on /match, "2 minutes" to
// counsellors, and "two minutes" in four guides; three numbers for one act,
// and the length was hard-coded next to a question list that can change. These
// are the only place any surface may get that copy from.
//
// 30 seconds is the honest one: six questions, one tap each, results on the
// same page. The two-minute figure was really "quiz plus read the results".

export const QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length;

/**
 * The most questions any city can get, for the step label before the city is
 * answered. "of 6" that turns into "of 8" at question four reads as the quiz
 * growing; "of up to 8" that lands on 6 is good news.
 */
export function quizQuestionCeiling(
  listings: Array<{ region?: string | null; eligibility?: { schoolBoards?: string[]; specificSchools?: string[] } | null }>,
): number {
  const cities = QUIZ_QUESTIONS.find(q => q.key === 'city')?.opts ?? [];
  return QUIZ_QUESTION_COUNT + Math.max(0, ...cities.map(o =>
    (boardsForCity(listings, o.value).length > 0 ? 1 : 0) +
    (schoolsForCity(listings, o.value).length > 0 ? 1 : 0)));
}

/** The step label's denominator: "6", or "up to 8" while the city is open. */
export function quizTotalLabel(ceiling: number, current: number, cityAnswered: boolean): string {
  return !cityAnswered && ceiling > current ? `up to ${ceiling}` : String(current);
}

/** Spelled form for prose. Pinned to QUIZ_QUESTION_COUNT by a test. */
export const QUIZ_QUESTION_WORD = 'Six';

/**
 * The board and school questions are asked only where they can change the
 * answer, so the quiz is six questions for most students and up to eight for
 * some. Prose that quotes a single number is wrong for one group or the
 * other; both numbers come from here.
 */
export const QUIZ_OPTIONAL_QUESTION_COUNT = 2;
export const QUIZ_MAX_QUESTION_COUNT = QUIZ_QUESTION_COUNT + QUIZ_OPTIONAL_QUESTION_COUNT;
export const QUIZ_MAX_QUESTION_WORD = 'eight';

/**
 * How many matches the results screen shows, per list.
 *
 * Both lists cap at the same number, and both used to hard-code 10 in
 * different files. The corpus has more than tripled since that number was
 * chosen, so 10 was cutting real matches off a list the student had already
 * answered eight questions to narrow.
 */
export const RESULT_LIMIT = 20;

// "30 seconds" was the claim for six questions; with the two optional ones
// the quiz runs to eight taps, so the honest figure is about a minute
// (critique 2026-09-23).
export const QUIZ_DURATION = 'about a minute';

/** One sentence, for anywhere that needs the whole claim at once. */
export const QUIZ_PROMISE = `${QUIZ_QUESTION_WORD} to ${QUIZ_MAX_QUESTION_WORD} questions, ${QUIZ_DURATION}. No account, no email.`;
