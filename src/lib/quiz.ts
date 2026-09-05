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
  hint: string
  /** Chip-length label for the home teaser, which has ~360px to work with.
   *  Falls back to `label`; only set it where `label` is too long for a chip. */
  short?: string
}
export interface QuizQuestion { key: string; q: string; opts: QuizOption[] }

/** The teaser on the home page seeds these three questions before handing off
 *  to /match. Named here so the teaser and the quiz cannot drift apart. */
export const TEASER_KEYS = ['grade', 'city', 'field'] as const

/**
 * The chips the home teaser renders for one question: real answers only.
 * "Still figuring it out" and "Already in post-secondary" are escape hatches
 * that only make sense once the quiz is explaining itself; the teaser asks
 * for three definite picks, and an empty value would seed a non-answer.
 */
export function teaserOptions(key: string): Array<{ label: string; value: string }> {
  const q = QUIZ_QUESTIONS.find(qq => qq.key === key)
  if (!q) return []
  return q.opts
    .filter(o => o.value !== '' && o.value !== 'post-secondary')
    .map(o => ({ label: o.short ?? o.label, value: o.value }))
}

/**
 * Mono hints come from the "ScholarAB Match" design. No emoji: they only ever
 * reached two of the six questions, and 🔬 was carrying "Research Programs"
 * and "STEM & Engineering" at once; a symbol that means two things in one
 * quiz is decoration, and the mono hint already does the labelling work.
 *
 * Keys, values and labels are the real matching-engine inputs and must not
 * change without updating the matcher.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: 'What are you looking for?',
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'AWARDS AND BURSARIES' },
      { label: 'Research Programs', value: 'programs', hint: 'SUMMER, TRADES, CONTESTS' },
      { label: 'Both', value: 'both', hint: 'SHOW ME EVERYTHING' },
    ],
  },
  {
    key: 'grade',
    q: 'What grade are you in?',
    opts: [
      { label: 'Grade 10', value: '10', hint: 'TWO YEARS TO PLAN' },
      { label: 'Grade 11', value: '11', hint: 'PRIME PREP TIME' },
      { label: 'Grade 12', value: '12', hint: 'DEADLINES MATTER NOW' },
      { label: 'Already in post-secondary', value: 'post-secondary', hint: 'CONTINUING AWARDS' },
    ],
  },
  {
    key: 'city',
    q: 'Where are you based?',
    opts: [
      { label: 'Medicine Hat', value: 'Medicine Hat', hint: 'THE GAS CITY' },
      { label: 'Calgary', value: 'Calgary', hint: 'AND FOOTHILLS' },
      { label: 'Edmonton', value: 'Edmonton', hint: 'AND CAPITAL REGION' },
      { label: 'Lethbridge', value: 'Lethbridge', hint: 'AND THE SOUTHWEST' },
      { label: 'Red Deer', value: 'Red Deer', hint: 'AND CENTRAL ALBERTA' },
      { label: 'Airdrie', value: 'Airdrie', hint: 'AND ROCKY VIEW' },
      { label: 'Brooks', value: 'Brooks', hint: 'AND COUNTY OF NEWELL' },
      { label: 'Chestermere', value: 'Chestermere', hint: 'EAST OF CALGARY' },
      { label: 'Beaumont', value: 'Beaumont', hint: 'SOUTH OF EDMONTON' },
      { label: 'Lloydminster', value: 'Lloydminster', hint: 'THE ALBERTA SIDE' },
      { label: 'Camrose', value: 'Camrose', hint: 'AND CAMROSE COUNTY' },
      { label: 'Cold Lake', value: 'Cold Lake', hint: 'AND THE LAKELAND' },
      { label: 'Lacombe', value: 'Lacombe', hint: 'AND LACOMBE COUNTY' },
      { label: 'Fort McMurray', value: 'Fort McMurray', hint: 'AND WOOD BUFFALO', short: 'Fort Mac' },
      { label: 'Wetaskiwin', value: 'Wetaskiwin', hint: 'AND WETASKIWIN COUNTY' },
      { label: 'St. Albert', value: 'St. Albert', hint: 'AND STURGEON COUNTY' },
      { label: 'Spruce Grove', value: 'Spruce Grove', hint: 'AND STONY PLAIN' },
      { label: 'Leduc', value: 'Leduc', hint: 'AND LEDUC COUNTY' },
      { label: 'Fort Saskatchewan', value: 'Fort Saskatchewan', hint: 'AND ELK ISLAND', short: 'Fort Sask' },
      { label: 'Other Alberta', value: 'Other Alberta', hint: 'EVERYWHERE ELSE' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', hint: 'SCIENCE, TECH, MATH', short: 'STEM' },
      { label: 'Health & Medicine', value: 'health', hint: 'PRE-MED, NURSING, KIN', short: 'Health' },
      { label: 'Business & Commerce', value: 'business', hint: 'FINANCE, MANAGEMENT', short: 'Business' },
      { label: 'Arts & Humanities', value: 'arts', hint: 'FINE ARTS, SOCIAL SCIENCE', short: 'Arts' },
      { label: 'Trades', value: 'trades', hint: 'RAP AND APPRENTICESHIPS', short: 'Trades' },
      { label: 'Still figuring it out', value: '', hint: 'TOTALLY FINE' },
    ],
  },
  {
    key: 'average',
    q: "What's your academic average?",
    opts: [
      { label: '90% or higher', value: '93', hint: 'MERIT AWARDS OPEN UP' },
      { label: '80 – 89%', value: '85', hint: 'PLENTY QUALIFY' },
      { label: 'Below 80%', value: '79', hint: "GRADES AREN'T EVERYTHING" },
      { label: "I'd rather not say", value: '', hint: 'NO PROBLEM' },
    ],
  },
  {
    key: 'institution',
    q: 'Where are you planning to study?',
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary', hint: 'CALGARY' },
      { label: 'University of Alberta', value: 'University of Alberta', hint: 'EDMONTON' },
      { label: 'Mount Royal University', value: 'Mount Royal University', hint: 'CALGARY' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College', hint: 'MEDICINE HAT' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', hint: 'SAIT, NAIT AND MORE' },
      { label: 'Not sure yet', value: '', hint: 'KEEP OPTIONS OPEN' },
    ],
  },
]

/** The key the school question stores under, and the matcher reads. */
export const SCHOOL_QUESTION_KEY = 'school';

/**
 * The optional last question: which school the student attends.
 *
 * It exists because 65 Calgary awards are restricted to one named school, and
 * the matcher's school filter at eligibility-matcher.ts only engages when the
 * profile carries a school. Without this the quiz cannot fill that field, so
 * every school-only award showed to every student in the city.
 *
 * Asked only where the city actually has school-restricted awards: Edmonton,
 * Lethbridge and Other Alberta have none, and a question whose answer changes
 * nothing is a tax on the 30-second promise. `schools` is derived from the
 * listings themselves, so a new school-restricted award adds its school here
 * without anyone remembering to.
 */
export function schoolQuestion(schools: string[]): QuizQuestion {
  return {
    key: SCHOOL_QUESTION_KEY,
    q: 'Which school do you go to?',
    opts: [
      ...schools.map(name => ({
        label: name,
        value: name,
        hint: 'SCHOOL-ONLY AWARDS',
      })),
      // Always last, and always present: a student at a school with no awards
      // of its own must be able to pass without claiming one that isn't theirs.
      { label: 'Another school', value: '', hint: 'SKIP THIS FILTER' },
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
 * The looser rule was tempting: three school-restricted awards carry region
 * "Alberta" because they span several communities (Cochrane, Strathmore,
 * Okotoks, Innisfail), and an exact match alone left their 17 schools out of
 * every dropdown, so their filter could never engage. But feeding them to all
 * nineteen cities put a 20-option question in front of Medicine Hat, Lethbridge
 * and Airdrie students, who had no school question at all, to filter three
 * listings out of 777. A student at one of those schools is in a town that is
 * not one of the nineteen named cities, so "Other Alberta" is the answer they give,
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
        hint: 'BOARD-ONLY AWARDS',
      })),
      // Always last, and always present. A student at an independent, charter,
      // francophone or home-education school belongs to none of these, and
      // must be able to pass without claiming a board that is not theirs.
      { label: 'None of these', value: '', hint: 'SKIP THIS FILTER' },
    ],
  };
}

/** Schools with awards restricted to them, for one city, in listing order. */
export function schoolsForCity(
  listings: Array<{ region?: string | null; eligibility?: { specificSchools?: string[] } | null }>,
  city: string,
): string[] {
  const seen = new Set<string>();
  for (const l of listings) {
    if (!inCityScope(l.region, city)) continue;
    for (const s of l.eligibility?.specificSchools ?? []) seen.add(s);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
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

export const QUIZ_DURATION = '30 seconds';

/** One sentence, for anywhere that needs the whole claim at once. */
export const QUIZ_PROMISE = `${QUIZ_QUESTION_WORD} questions, ${QUIZ_DURATION}. No account, no email.`;
