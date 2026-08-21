// The eligibility quiz definition — the questions /match asks and the key the
// answers are stored under.
//
// Lived in app-core.ts while /app existed, because the site quiz and the
// in-app quiz had to write byte-identical answers. /app is gone; this is now
// the only quiz, and it keeps its own file rather than moving into
// EligibilityQuiz.tsx so the matcher's inputs stay readable next to
// eligibility-matcher.ts rather than buried in a React component.

export const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

export interface StoredQuiz { step: number; answers: Record<string, string> }

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
 * that only make sense once the quiz is explaining itself — the teaser asks
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
 * and "STEM & Engineering" at once — a symbol that means two things in one
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

// ── How the quiz describes itself ─────────────────────────────────────────────
// The same six taps were sold as "under 30 seconds" on /match, "2 minutes" to
// counsellors, and "two minutes" in four guides — three numbers for one act,
// and the length was hard-coded next to a question list that can change. These
// are the only place any surface may get that copy from.
//
// 30 seconds is the honest one: six questions, one tap each, results on the
// same page. The two-minute figure was really "quiz plus read the results".

export const QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length;

/** Spelled form for prose. Pinned to QUIZ_QUESTION_COUNT by a test. */
export const QUIZ_QUESTION_WORD = 'Six';

export const QUIZ_DURATION = '30 seconds';

/** One sentence, for anywhere that needs the whole claim at once. */
export const QUIZ_PROMISE = `${QUIZ_QUESTION_WORD} questions, ${QUIZ_DURATION}. No account, no email.`;
