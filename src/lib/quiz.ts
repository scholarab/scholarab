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

export interface QuizOption { label: string; value: string; hint: string; emoji?: string }
export interface QuizQuestion { key: string; q: string; opts: QuizOption[] }

/**
 * Mono hints come from the "ScholarAB Match" design; keys, values and labels
 * are the real matching-engine inputs and must not change without updating
 * the matcher.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: 'What are you looking for?',
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'AWARDS AND BURSARIES', emoji: '🎓' },
      { label: 'Research Programs', value: 'programs', hint: 'SUMMER, TRADES, CONTESTS', emoji: '🔬' },
      { label: 'Both', value: 'both', hint: 'SHOW ME EVERYTHING', emoji: '✨' },
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
      { label: 'Calgary', value: 'Calgary', hint: 'AND AREA' },
      { label: 'Edmonton', value: 'Edmonton', hint: 'AND AREA' },
      { label: 'Lethbridge', value: 'Lethbridge', hint: 'AND AREA' },
      { label: 'Red Deer', value: 'Red Deer', hint: 'AND AREA' },
      { label: 'Other Alberta', value: 'Other Alberta', hint: 'EVERYWHERE ELSE' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', hint: 'SCIENCE, TECH, MATH', emoji: '🔬' },
      { label: 'Health & Medicine', value: 'health', hint: 'PRE-MED, NURSING, KIN', emoji: '🩺' },
      { label: 'Business & Commerce', value: 'business', hint: 'FINANCE, MANAGEMENT', emoji: '💼' },
      { label: 'Arts & Humanities', value: 'arts', hint: 'FINE ARTS, SOCIAL SCIENCE', emoji: '🎨' },
      { label: 'Trades', value: 'trades', hint: 'RAP AND APPRENTICESHIPS', emoji: '🔧' },
      { label: 'Still figuring it out', value: '', hint: 'TOTALLY FINE', emoji: '🤷' },
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
