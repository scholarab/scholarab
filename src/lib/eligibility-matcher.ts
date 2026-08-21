import type {
  EligibilityCriteria,
  StudentProfile,
  MatchResult,
  ConfidenceTier,
} from './eligibility-types'
import type { Program } from './data-loader'
import { programMatchesGrade } from './list-core'

// Alberta cities recognised for region matching
const ALBERTA_CITIES = new Set([
  'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Other Alberta',
])

function regionMatches(city: string, scholarshipRegion: string | null): boolean {
  if (!scholarshipRegion || scholarshipRegion === 'National') return true
  if (scholarshipRegion === 'Alberta') return ALBERTA_CITIES.has(city)
  return scholarshipRegion === city
}

// Confidence scoring weights (specificity signals)
const BASE_CONFIDENCE              = 0.35
const CITY_SPECIFIC_BOOST          = 0.25
const GRADE_MATCH_BOOST            = 0.15
const BOARD_MATCH_BOOST            = 0.15
const FIELD_MATCH_BOOST            = 0.20
const FIELD_MISMATCH_PENALTY       = 0.15
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
 * the filter is skipped — showing the scholarship as a possible match.
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

  // City-specific match — scholarship is for this exact city (not national/provincial)
  if (region && region !== 'National' && region !== 'Alberta' && region !== 'Alberta-wide') {
    confidence += CITY_SPECIFIC_BOOST
    signals.push(`Local to ${region}`)
  }

  // Grade restriction confirmed match
  if (eligibility.grades.length > 0) {
    confidence += GRADE_MATCH_BOOST
    // Guarded even though the filter above rejects a null grade: the signal
    // must never read "Open to Grade null" if that filter ever loosens.
    if (profile.grade) signals.push(`Open to Grade ${profile.grade}`)
  }

  // School board confirmed match
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard &&
      eligibility.schoolBoards.includes(profile.schoolBoard)) {
    confidence += BOARD_MATCH_BOOST
    signals.push(`For ${profile.schoolBoard} students`)
  }

  // Field of study
  if (eligibility.fields.length > 0 && profile.fields.length > 0) {
    const hit = profile.fields.find(f => eligibility.fields.includes(f))
    if (hit) { confidence += FIELD_MATCH_BOOST; signals.push(`Matches your ${hit} focus`) }
    else confidence -= FIELD_MISMATCH_PENALTY
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

  // Average confirmed — student provided their average and it clears the bar
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

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.80) return 'strong'
  if (confidence >= 0.55) return 'good'
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
  // text as inclusive — a bare min/max over every number in the string would
  // read ages as grades and exclude the program for all real grades.
  return programMatchesGrade(program.grades, grade)
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  STEM:     ['stem', 'science', 'engineering', 'technology', 'math', 'research', 'computer', 'physics', 'chemistry'],
  health:   ['health', 'medicine', 'medical', 'biology', 'nursing', 'life science', 'biomedical'],
  business: ['business', 'commerce', 'economics', 'finance', 'entrepreneurship', 'management'],
  arts:     ['arts', 'humanities', 'english', 'social', 'history', 'music', 'fine art', 'writing'],
  trades:   ['trades', 'apprenticeship', 'technical', 'vocational', 'skilled'],
}

/**
 * Filter active programs by the student's grade, narrow by field keywords when
 * that doesn't empty the list, and return the top 10.
 */
export function matchPrograms(programs: Program[], answers: Record<string, string>): Program[] {
  const grade = answers.grade ?? '12'
  let filtered = programs.filter(p => p.active && matchProgram(grade, p))
  const field = answers.field
  if (field && FIELD_KEYWORDS[field]) {
    const keywords = FIELD_KEYWORDS[field]
    const byField = filtered.filter(p => {
      const text = ((p.category ?? '') + ' ' + (p.description ?? '')).toLowerCase()
      return keywords.some(kw => text.includes(kw))
    })
    if (byField.length > 0) filtered = byField
  }
  return filtered.slice(0, 10)
}

/**
 * Run matchScholarship against every scholarship and return matches sorted by confidence.
 */
export function matchAll(
  profile: StudentProfile,
  scholarships: Array<{ id: number; region: string | null; eligibility: EligibilityCriteria | null }>,
): Array<{ id: number; confidence: number; tier: ConfidenceTier; signals: string[] }> {
  return scholarships
    .map(s => {
      const result = matchScholarship(profile, s)
      return result.match
        ? { id: s.id, confidence: result.confidence, tier: getConfidenceTier(result.confidence), signals: result.signals }
        : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.confidence - a.confidence)
}
