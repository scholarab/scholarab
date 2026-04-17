import type {
  EligibilityCriteria,
  StudentProfile,
  MatchResult,
  ConfidenceTier,
} from './eligibility-types'

// Alberta cities recognised for region matching
const ALBERTA_CITIES = new Set([
  'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Other Alberta',
])

function regionMatches(city: string, scholarshipRegion: string | null): boolean {
  if (!scholarshipRegion || scholarshipRegion === 'National') return true
  if (scholarshipRegion === 'Alberta') return ALBERTA_CITIES.has(city)
  return scholarshipRegion === city
}

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
    return { match: true, confidence: 0.20, reasons: [] }
  }

  const reasons: string[] = []

  // ── Region ────────────────────────────────────────────────────────────────
  if (!regionMatches(profile.city, region)) {
    reasons.push(`Only for students in ${region}`)
    return { match: false, confidence: 0, reasons }
  }

  // ── Grade ─────────────────────────────────────────────────────────────────
  if (eligibility.grades.length > 0 && !eligibility.grades.includes(profile.grade)) {
    reasons.push(`Requires Grade ${eligibility.grades.join(' or ')}`)
    return { match: false, confidence: 0, reasons }
  }

  // ── School board (hard filter only if student provided their board) ───────
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard) {
    if (!eligibility.schoolBoards.includes(profile.schoolBoard)) {
      reasons.push(`Requires ${eligibility.schoolBoards.join(' or ')} student`)
      return { match: false, confidence: 0, reasons }
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
      return { match: false, confidence: 0, reasons }
    }
  }

  // ── Minimum average (hard filter only if student provided their average) ──
  if (eligibility.minAverage !== null && profile.averagePercent !== null) {
    if (profile.averagePercent < eligibility.minAverage) {
      reasons.push(`Requires ${eligibility.minAverage}%+ average`)
      return { match: false, confidence: 0, reasons }
    }
  }

  // ── Gender (hard filter only if student answered) ─────────────────────────
  if (eligibility.genderRequired === 'female' && profile.identifiesAsFemale === false) {
    reasons.push('Open to female-identifying students only')
    return { match: false, confidence: 0, reasons }
  }

  // ── Indigenous (hard filter only if student answered) ─────────────────────
  if (eligibility.indigenousRequired && profile.identifiesAsIndigenous === false) {
    reasons.push('Requires Indigenous identity (First Nations, Métis, or Inuit)')
    return { match: false, confidence: 0, reasons }
  }

  // ── BIPOC (hard filter only if student answered) ──────────────────────────
  if (eligibility.bipocRequired && profile.identifiesAsBIPOC === false) {
    reasons.push('Requires BIPOC identity')
    return { match: false, confidence: 0, reasons }
  }

  // ── Foster care (hard filter only if student answered) ────────────────────
  if (eligibility.fosterCare && profile.inFosterCare === false) {
    reasons.push('Requires history of government care (foster care)')
    return { match: false, confidence: 0, reasons }
  }

  // ── Apprenticeship (hard filter only if student answered) ─────────────────
  if (eligibility.apprenticeship && profile.inApprenticeship === false) {
    reasons.push('Requires RAP or CTS apprenticeship enrollment')
    return { match: false, confidence: 0, reasons }
  }

  // ── Financial need (hard filter only if student explicitly said no) ────────
  if (eligibility.financialNeed && profile.hasFinancialNeed === false) {
    reasons.push('Requires demonstrated financial need')
    return { match: false, confidence: 0, reasons }
  }

  // ── Citizenship ───────────────────────────────────────────────────────────
  if (eligibility.citizenship === 'canadian' && profile.citizenship !== null && profile.citizenship !== 'canadian_citizen') {
    reasons.push('Requires Canadian citizenship')
    return { match: false, confidence: 0, reasons }
  }
  if (eligibility.citizenship === 'permanent_resident' && profile.citizenship === 'other') {
    reasons.push('Requires Canadian citizenship or permanent residency')
    return { match: false, confidence: 0, reasons }
  }

  // ── Family income cap (hard filter only if student answered) ──────────────
  if (eligibility.maxFamilyIncome !== null && profile.familyIncome !== null) {
    if (profile.familyIncome > eligibility.maxFamilyIncome) {
      reasons.push(
        `Family income must be under $${eligibility.maxFamilyIncome.toLocaleString('en-CA')}`,
      )
      return { match: false, confidence: 0, reasons }
    }
  }

  // ── Confidence scoring (specificity signals) ──────────────────────────────
  let confidence = 0.35 // base: passed all hard filters

  // City-specific match — scholarship is for this exact city (not national/provincial)
  if (region && region !== 'National' && region !== 'Alberta' && region !== 'Alberta-wide') {
    confidence += 0.25
  }

  // Grade restriction confirmed match
  if (eligibility.grades.length > 0) confidence += 0.15

  // School board confirmed match
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard &&
      eligibility.schoolBoards.includes(profile.schoolBoard)) {
    confidence += 0.15
  }

  // Field of study
  if (eligibility.fields.length > 0 && profile.fields.length > 0) {
    if (profile.fields.some(f => eligibility.fields.includes(f))) confidence += 0.20
    else confidence -= 0.15
  }

  // Target institution
  if (eligibility.targetInstitutions.length > 0 && !eligibility.targetInstitutions.includes('any')) {
    if (profile.targetInstitution) {
      if (eligibility.targetInstitutions.includes(profile.targetInstitution)) confidence += 0.15
      else confidence -= 0.10
    }
  }

  // Average confirmed — student provided their average and it clears the bar
  if (eligibility.minAverage !== null && profile.averagePercent !== null) {
    confidence += 0.10
  }

  // Financial need confirmed match
  if (eligibility.financialNeed && profile.hasFinancialNeed === true) {
    confidence += 0.10
  }

  confidence = Math.max(0.1, Math.min(1, confidence))
  return { match: true, confidence, reasons }
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
export function matchProgram(
  studentGrade: string,
  program: { grades: string | null },
): boolean {
  if (!program.grades) return true
  const nums = program.grades.match(/\d+/g)?.map(Number) ?? []
  if (nums.length === 0) return true
  const grade = Number(studentGrade)
  if (isNaN(grade)) return true
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return grade >= min && grade <= max
}

/**
 * Run matchScholarship against every scholarship and return matches sorted by confidence.
 */
export function matchAll(
  profile: StudentProfile,
  scholarships: Array<{ id: number; region: string | null; eligibility: EligibilityCriteria | null }>,
): Array<{ id: number; confidence: number; tier: ConfidenceTier }> {
  return scholarships
    .map(s => {
      const result = matchScholarship(profile, s)
      return result.match
        ? { id: s.id, confidence: result.confidence, tier: getConfidenceTier(result.confidence) }
        : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.confidence - a.confidence)
}
