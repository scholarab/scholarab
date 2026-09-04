import type {
  EligibilityCriteria,
  StudentProfile,
  MatchResult,
  ConfidenceTier,
} from './eligibility-types'
import type { Program } from './data-loader'
import { programMatchesGrade } from './list-core'
import { parseAmount } from './utils'
import { RESULT_LIMIT } from './quiz'

/** The five field values the quiz can emit. Anything a listing carries beyond
 *  these cannot be compared against a student's answer; see the field branch
 *  in matchScholarship. */
const QUIZ_FIELDS = new Set(['STEM', 'health', 'business', 'arts', 'trades'])

// Alberta cities recognised for region matching
const ALBERTA_CITIES = new Set([
  'Airdrie', 'Brooks', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'St. Albert',
  'Other Alberta',
])

function regionMatches(city: string, scholarshipRegion: string | null): boolean {
  if (!scholarshipRegion || scholarshipRegion === 'National') return true
  if (scholarshipRegion === 'Alberta') return ALBERTA_CITIES.has(city)
  return scholarshipRegion === city
}

// Confidence scoring weights (specificity signals)
//
// Three of these were measured against the real corpus and changed. The
// numbers below are from a Calgary grade 12 profile with every question
// answered, across its 238 matches:
//
//   grade boost fired on 94% of them   <- an offset, not a signal
//   field boost fired on 9%, the field PENALTY on 21%
//
// GRADE_MATCH_BOOST is gone. It fired for all but a handful of listings
// because the hard filter above has already rejected anyone whose grade does
// not fit, so by the time scoring runs the branch is nearly always true. A
// term that fires 94% of the time shifts every score equally and separates
// nothing, and this one pinned 125 listings at exactly 0.75 for a student who
// answered only the required questions: three distinct scores across 242
// matches, with the 20 shown picked out of a 125-way tie by array order.
//
// FIELD_MISMATCH_PENALTY is gone for the same reason in reverse. 234 of 345
// listings carry no field at all, so the tag is a statement about our data
// rather than about the award, and demoting the 21% that happen to be tagged
// with a different field punished the listings we know most about. The match
// boost stays: a confirmed field hit is real information.
const BASE_CONFIDENCE              = 0.35
const CITY_SPECIFIC_BOOST          = 0.25
const BOARD_MATCH_BOOST            = 0.15
const FIELD_MATCH_BOOST            = 0.20
const INSTITUTION_MATCH_BOOST      = 0.15
const INSTITUTION_MISMATCH_PENALTY = 0.10
const AVERAGE_CLEARED_BOOST        = 0.10
const FINANCIAL_NEED_BOOST         = 0.10

/**
 * Determine whether a student profile matches a scholarship.
 *
 * Hard filters: any single failure immediately returns match: false.
 * Soft signals: adjust confidence score (0–1) without disqualifying.
 *
 * Identity fields (gender, Indigenous, BIPOC) are only used as hard
 * filters when the student explicitly answered. null means "not answered" and
 * the filter is skipped; showing the scholarship as a possible match.
 */
export function matchScholarship(
  profile: StudentProfile,
  scholarship: { region: string | null; eligibility: EligibilityCriteria | null },
): MatchResult {
  const { eligibility, region } = scholarship

  // No eligibility data yet → show as possible match, but with low confidence
  if (!eligibility) {
    return { match: true, confidence: 0.20, reasons: [], signals: [] }
  }

  const reasons: string[] = []

  // ── Region ────────────────────────────────────────────────────────────────
  if (!regionMatches(profile.city, region)) {
    reasons.push(`Only for students in ${region}`)
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Grade ─────────────────────────────────────────────────────────────────
  if (eligibility.grades.length > 0 && !eligibility.grades.includes(profile.grade)) {
    reasons.push(`Requires Grade ${eligibility.grades.join(' or ')}`)
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── School board (hard filter only if student provided their board) ───────
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard) {
    if (!eligibility.schoolBoards.includes(profile.schoolBoard)) {
      reasons.push(`Requires ${eligibility.schoolBoards.join(' or ')} student`)
      return { match: false, confidence: 0, reasons, signals: [] }
    }
  }

  // ── Specific school (hard filter only if student provided their school) ───
  if (eligibility.specificSchools.length > 0 && profile.specificSchool) {
    const needle = profile.specificSchool.toLowerCase()
    const schoolMatch = eligibility.specificSchools.some(
      s => s.toLowerCase().includes(needle) || needle.includes(s.toLowerCase()),
    )
    if (!schoolMatch) {
      reasons.push(`Only for students at ${eligibility.specificSchools.join(' or ')}`)
      return { match: false, confidence: 0, reasons, signals: [] }
    }
  }

  // ── Minimum average (hard filter only if student provided their average) ──
  if (eligibility.minAverage !== null && profile.averagePercent !== null) {
    if (profile.averagePercent < eligibility.minAverage) {
      reasons.push(`Requires ${eligibility.minAverage}%+ average`)
      return { match: false, confidence: 0, reasons, signals: [] }
    }
  }

  // ── Gender (hard filter only if student answered) ─────────────────────────
  if (eligibility.genderRequired === 'female' && profile.identifiesAsFemale === false) {
    reasons.push('Open to female-identifying students only')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Indigenous (hard filter only if student answered) ─────────────────────
  if (eligibility.indigenousRequired && profile.identifiesAsIndigenous === false) {
    reasons.push('Requires Indigenous identity (First Nations, Métis, or Inuit)')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── BIPOC (hard filter only if student answered) ──────────────────────────
  if (eligibility.bipocRequired && profile.identifiesAsBIPOC === false) {
    reasons.push('Requires BIPOC identity')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Foster care (hard filter only if student answered) ────────────────────
  if (eligibility.fosterCare && profile.inFosterCare === false) {
    reasons.push('Requires history of government care (foster care)')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Apprenticeship (hard filter only if student answered) ─────────────────
  if (eligibility.apprenticeship && profile.inApprenticeship === false) {
    reasons.push('Requires RAP or CTS apprenticeship enrollment')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Financial need (hard filter only if student explicitly said no) ────────
  if (eligibility.financialNeed && profile.hasFinancialNeed === false) {
    reasons.push('Requires demonstrated financial need')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Citizenship ───────────────────────────────────────────────────────────
  if (eligibility.citizenship === 'canadian' && profile.citizenship !== null && profile.citizenship !== 'canadian_citizen') {
    reasons.push('Requires Canadian citizenship')
    return { match: false, confidence: 0, reasons, signals: [] }
  }
  if (eligibility.citizenship === 'permanent_resident' && profile.citizenship === 'other') {
    reasons.push('Requires Canadian citizenship or permanent residency')
    return { match: false, confidence: 0, reasons, signals: [] }
  }

  // ── Family income cap (hard filter only if student answered) ──────────────
  if (eligibility.maxFamilyIncome !== null && profile.familyIncome !== null) {
    if (profile.familyIncome > eligibility.maxFamilyIncome) {
      reasons.push(
        `Family income must be under $${eligibility.maxFamilyIncome.toLocaleString('en-CA')}`,
      )
      return { match: false, confidence: 0, reasons, signals: [] }
    }
  }

  // ── Confidence scoring (specificity signals) ──────────────────────────────
  // Each boost also records why, in the student's words. The results list used
  // to rank rows 01..10 and label them "Good match" without ever saying what
  // the ranking was made of; these are that answer, and they come from the
  // same branches that move the score so the two can never disagree.
  let confidence = BASE_CONFIDENCE // passed all hard filters
  const signals: string[] = []

  // City-specific match; scholarship is for this exact city (not national/provincial)
  if (region && region !== 'National' && region !== 'Alberta' && region !== 'Alberta-wide') {
    confidence += CITY_SPECIFIC_BOOST
    signals.push(`Local to ${region}`)
  }

  // Grade restriction confirmed match. Scores nothing (see the weights above),
  // but it is still worth saying: the student asked to be filtered by grade and
  // this is the row telling them the filter held.
  if (eligibility.grades.length > 0 && profile.grade) {
    signals.push(`Open to Grade ${profile.grade}`)
  }

  // School board confirmed match
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard &&
      eligibility.schoolBoards.includes(profile.schoolBoard)) {
    confidence += BOARD_MATCH_BOOST
    signals.push(`For ${profile.schoolBoard} students`)
  }

  // Field of study. Only the five values the quiz can emit are comparable; 14
  // listings are tagged solely with something outside it ("agriculture",
  // "education", "language", "sports", "fire service"). Those say nothing
  // about the student's answer either way, so they are treated like a listing
  // with no field data at all rather than scored as a mismatch, which is what
  // a bare `includes` did to them for every student who answered the question.
  const comparableFields = eligibility.fields.filter(f => QUIZ_FIELDS.has(f))
  if (comparableFields.length > 0 && profile.fields.length > 0) {
    const hit = profile.fields.find(f => comparableFields.includes(f))
    if (hit) { confidence += FIELD_MATCH_BOOST; signals.push(`Matches your ${hit} focus`) }
  }

  // Target institution
  if (eligibility.targetInstitutions.length > 0 && !eligibility.targetInstitutions.includes('any')) {
    if (profile.targetInstitution) {
      if (eligibility.targetInstitutions.includes(profile.targetInstitution)) {
        confidence += INSTITUTION_MATCH_BOOST
        signals.push(`Tied to ${profile.targetInstitution}`)
      } else confidence -= INSTITUTION_MISMATCH_PENALTY
    }
  }

  // Average confirmed; student provided their average and it clears the bar
  if (eligibility.minAverage !== null && profile.averagePercent !== null) {
    confidence += AVERAGE_CLEARED_BOOST
    signals.push(`Your average clears its ${eligibility.minAverage}% minimum`)
  }

  // Financial need confirmed match
  if (eligibility.financialNeed && profile.hasFinancialNeed === true) {
    confidence += FINANCIAL_NEED_BOOST
    signals.push('Considers financial need')
  }

  confidence = Math.max(0.1, Math.min(1, confidence))
  return { match: true, confidence, reasons, signals }
}

/**
 * Thresholds are 0.15 below where they started, exactly the weight of the
 * grade boost that used to be added to 94% of matches. Dropping the boost
 * without dropping the bar would have re-labelled most of the corpus a tier
 * lower for no reason the student could see. Lowering both by the same 0.15
 * keeps every listing that was getting the boost at the tier it already had,
 * and only moves the handful that never earned it.
 */
export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.65) return 'strong'
  if (confidence >= 0.40) return 'good'
  return 'possible'
}

/**
 * Match a student's grade against a program's grades string (e.g. "Grade 11", "Grades 10–12").
 * Returns true if the grade is in range, or if the program has no grade restriction.
 */
function matchProgram(
  studentGrade: string,
  program: { grades: string | null },
): boolean {
  const grade = Number(studentGrade)
  if (isNaN(grade)) return true
  // programMatchesGrade ignores age ranges ("Ages 13–18") and unparseable
  // text as inclusive; a bare min/max over every number in the string would
  // read ages as grades and exclude the program for all real grades.
  return programMatchesGrade(program.grades, grade)
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  STEM:     ['stem', 'science', 'engineering', 'technology', 'math', 'research', 'computer', 'computing', 'coding', 'robotics', 'cyber', 'software', 'data', 'physics', 'chemistry'],
  health:   ['health', 'medicine', 'medical', 'biology', 'nursing', 'life science', 'biomedical'],
  business: ['business', 'commerce', 'economics', 'finance', 'entrepreneurship', 'management'],
  arts:     ['arts', 'humanities', 'english', 'social', 'history', 'music', 'fine art', 'writing', 'design', 'language'],
  trades:   ['trades', 'apprenticeship', 'technical', 'vocational', 'skilled'],
}

/**
 * The category a program is filed under, mapped to the quiz's fields.
 *
 * Keyword matching over category + description alone left 13 of 123 programs
 * matching no field at all, and because the field filter below replaces the
 * list whenever it finds anything, those programs were unreachable for every
 * student who answered the field question. Eight of the thirteen were the
 * whole Computing category: the STEM keyword list had "computer", and the
 * category is spelled "Computing".
 *
 * Keyed on the eight categories the data actually uses. The keyword pass still
 * runs on top, so a program whose description reaches wider than its category
 * keeps the extra fields.
 */
const CATEGORY_FIELDS: Record<string, string[]> = {
  'Health': ['health'],
  'Research': ['STEM'],
  'Engineering': ['STEM'],
  'Computing': ['STEM'],
  'Math & Physics': ['STEM'],
  'Social Sciences': ['arts'],
  'Trades & Tech': ['trades'],
  // Enrichment is the catch-all for programs with no field of their own
  // (leadership, exchanges, award schemes). It maps to every field rather
  // than none: they are open to any student, and the alternative is that
  // answering the field question hides them from everyone.
  'Enrichment': ['STEM', 'health', 'business', 'arts', 'trades'],
}

/** Every field a program belongs to, from its category and its text. */
export function programFields(p: { category?: string | null; description?: string | null }): string[] {
  const fields = new Set(CATEGORY_FIELDS[p.category ?? ''] ?? [])
  const text = ((p.category ?? '') + ' ' + (p.description ?? '')).toLowerCase()
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) fields.add(field)
  }
  return [...fields]
}

/**
 * Filter active programs by the student's grade, narrow by field keywords when
 * that doesn't empty the list, and return the top RESULT_LIMIT.
 */
export function matchPrograms(programs: Program[], answers: Record<string, string>): Program[] {
  const grade = answers.grade ?? '12'
  let filtered = programs.filter(p => p.active && matchProgram(grade, p))
  const field = answers.field
  if (field && FIELD_KEYWORDS[field]) {
    const byField = filtered.filter(p => programFields(p).includes(field))
    if (byField.length > 0) filtered = byField
  }
  return filtered.slice(0, RESULT_LIMIT)
}

/**
 * Run matchScholarship against every scholarship and return matches sorted by confidence.
 */
/** One scholarship, as much of it as the matcher and the ranking need. */
export type MatchInput = {
  id: number
  region: string | null
  eligibility: EligibilityCriteria | null
  /** ISO date, for the tie-break. Null means no announced deadline. */
  deadline?: string | null
  /** Raw amount text ("$1,000", "Varies"), for the tie-break. */
  amount?: string | null
}

/**
 * Order two listings that scored identically.
 *
 * Confidence is a sum of a handful of fixed constants, so it takes very few
 * distinct values and ties are the normal case, not the exception: a Calgary
 * grade 12 student who answers only the required questions matches 242
 * listings across three distinct scores, and the 20 we show are drawn from a
 * block of 125 that all scored 0.75. Before this, that block was ordered by
 * however the JSON happened to be written, and we printed it as ranks 01 to 20
 * with confidence tiers beside it.
 *
 * Soonest real deadline first, because it is the only thing on the card that
 * expires, then larger award, then id so the order is total and stable rather
 * than dependent on the sort implementation. A listing with no announced
 * deadline sorts after every dated one: it cannot be missed, so it is not
 * urgent, and it is the weaker thing to put at the top of a results page.
 */
function breakTie(a: MatchInput, b: MatchInput): number {
  const at = a.deadline ? Date.parse(a.deadline + 'T00:00:00Z') : NaN
  const bt = b.deadline ? Date.parse(b.deadline + 'T00:00:00Z') : NaN
  const aHas = !Number.isNaN(at), bHas = !Number.isNaN(bt)
  if (aHas !== bHas) return aHas ? -1 : 1
  if (aHas && bHas && at !== bt) return at - bt
  const amount = parseAmount(b.amount) - parseAmount(a.amount)
  if (amount !== 0) return amount
  return a.id - b.id
}

export function matchAll(
  profile: StudentProfile,
  scholarships: MatchInput[],
): Array<{ id: number; confidence: number; tier: ConfidenceTier; signals: string[] }> {
  const byId = new Map(scholarships.map(s => [s.id, s]))
  return scholarships
    .map(s => {
      const result = matchScholarship(profile, s)
      return result.match
        ? { id: s.id, confidence: result.confidence, tier: getConfidenceTier(result.confidence), signals: result.signals }
        : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) =>
      b.confidence - a.confidence || breakTie(byId.get(a.id)!, byId.get(b.id)!))
}
