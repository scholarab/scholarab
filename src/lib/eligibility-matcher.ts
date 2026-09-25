import type {
  EligibilityCriteria,
  StudentProfile,
  MatchResult,
  ConfidenceTier,
} from './eligibility-types'
import type { QuizProgram as Program } from './quiz-payload'
import { programMatchesGrade } from './list-core'
import { parseAmount } from './utils'
import { RESULT_LIMIT } from './quiz'

/** The five field values the quiz can emit. Anything a listing carries beyond
 *  these cannot be compared against a student's answer; see the field branch
 *  in matchScholarship. */
const QUIZ_FIELDS = new Set(['STEM', 'health', 'business', 'arts', 'trades'])

/**
 * A listing's field tag, read as one of the quiz's five, or null when it has
 * no quiz equivalent (education, agriculture). The tags were compared as
 * written, so "Business", "Nursing" and "Commerce" never met a Business or
 * Health answer: 26% of tags are capitalised or a synonym.
 */
const FIELD_SYNONYMS: Record<string, string> = {
  stem: 'STEM', science: 'STEM', engineering: 'STEM', mathematics: 'STEM', technology: 'STEM',
  biosciences: 'STEM', 'environmental science': 'STEM', 'environmental technology': 'STEM',
  'environmental studies': 'STEM', environment: 'STEM', telecommunications: 'STEM', aviation: 'STEM', forestry: 'STEM',
  health: 'health', nursing: 'health', 'practical nursing': 'health', medicine: 'health', pharmacy: 'health',
  paramedicine: 'health', kinesiology: 'health', 'health sciences': 'health', veterinary: 'health',
  'veterinary medicine': 'health', 'veterinary technology': 'health',
  business: 'business', commerce: 'business', accounting: 'business', 'office administration': 'business',
  arts: 'arts', art: 'arts', 'fine arts': 'arts', 'visual arts': 'arts', 'performing arts': 'arts', music: 'arts',
  journalism: 'arts', communications: 'arts', broadcasting: 'arts', history: 'arts', 'social studies': 'arts',
  french: 'arts', language: 'arts', law: 'arts', 'social work': 'arts',
  trades: 'trades', welding: 'trades', automotive: 'trades', culinary: 'trades', 'power engineering': 'trades', 'fire service': 'trades',
}
export function quizField(tag: string): string | null {
  return FIELD_SYNONYMS[tag.trim().toLowerCase()] ?? null
}
const FIELD_WORDS: Record<string, string> = { STEM: 'STEM', health: 'health', business: 'business', arts: 'arts', trades: 'trades' }

/**
 * Gates the quiz never asks about, read from the listing's own "who can apply"
 * line: a parent or grandparent in a union, co-op or legion, or the student's
 * own membership in a club or nation. These took "Strong match" #1 for
 * students who could not apply (critique 2026-09-24: Local 38 Heritage, for
 * children of Calgary public teachers, topped a Business student's list).
 */
const FAMILY_TIE = /\b(child(ren)?|sons?|daughters?|dependants?|dependents?|grand(child(ren)?|sons?|daughters?)|family members?|spouses?|relatives?|descendants?)\s+of\b|\bwhose (parents?|mother|father|guardians?)\b(?! (live|reside))|\bparents?(\/guardians?)? (is|are|who work|employed)|\bparents? or (legal )?guardians? (at|with|who)\b/i
const MEMBERSHIP = /\b(members?|employees?|staff|policy ?holders?|shareholders?) of\b|\bmembers?\b(?! (schools?|municipalit|welcome))/i
const AUDIENCE_GATES: Array<[RegExp, string]> = [
  [/\bidentif(y|ies) as (male|a man|men)\b|\bmale students\b|\byoung men\b|\bboys\b(?! (and|&) girls)/i, 'Male students only'],
  [/\bnew to canada\b|\bnewcomers?\b|\bimmigrants?\b|\brefugees?\b/i, 'Newcomers to Canada only'],
  // 56 audiences name a team, league or sport; the quiz never asks about one.
  [/\b(hockey|soccer|football|basketball|volleyball|baseball|ringette|curling|golf|athletes?)\b/i, 'Athletes only'],
]
export function audienceChecks(audience: string | null | undefined): string[] {
  if (!audience) return []
  const out: string[] = []
  if (FAMILY_TIE.test(audience)) out.push('Needs a family link to a group')
  else if (MEMBERSHIP.test(audience) && !/\bmembers? welcome\b/i.test(audience)) out.push('Needs a membership')
  for (const [re, label] of AUDIENCE_GATES) if (re.test(audience)) out.push(label)
  return out
}

/** The field a listing's audience line names, for listings with no field tag. */
const AUDIENCE_FIELDS: Array<[RegExp, string]> = [
  [/\b(teaching|teachers? education|bachelor of education|education degree)\b/i, 'education'],
  [/\b(nursing|medicine|health care|healthcare|pharmacy|paramedic)\b/i, 'health'],
  [/\b(engineering|computer science|science|stem)\b/i, 'STEM'],
  [/\b(business|commerce|accounting|finance)\b/i, 'business'],
  [/\b(music|fine arts|visual arts|drama|theatre|art|journalism)\b/i, 'arts'],
  [/\b(trades?|apprentice\w*|welding|carpentry|electrician|automotive)\b/i, 'trades'],
  [/\b(agricultur\w*|agri-\w+|farming|ranching)\b/i, 'agriculture'],
]
export function audienceFields(audience: string | null | undefined): string[] {
  if (!audience) return []
  return AUDIENCE_FIELDS.filter(([re]) => re.test(audience)).map(([, f]) => f)
}

// Alberta cities recognised for region matching
const ALBERTA_CITIES = new Set([
  'Airdrie', 'Beaumont', 'Brooks', 'Calgary', 'Camrose', 'Chestermere', 'Cochrane', 'Cold Lake', 'Edmonton', 'Fort McMurray', 'Fort Saskatchewan', 'Grande Prairie', 'Lacombe', 'Leduc', 'Lethbridge', 'Lloydminster', 'Medicine Hat', 'Okotoks', 'Red Deer', 'Sherwood Park', 'Spruce Grove', 'St. Albert', 'Wetaskiwin',
  'Other Alberta',
])

export function regionMatches(city: string, scholarshipRegion: string | null, alsoOpenTo?: string[] | null): boolean {
  if (alsoOpenTo?.includes(city)) return true
  if (!scholarshipRegion || scholarshipRegion === 'National' || scholarshipRegion === 'International') return true
  if (scholarshipRegion === 'Alberta' || scholarshipRegion === 'Alberta-wide') return ALBERTA_CITIES.has(city)
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
  scholarship: { region: string | null; alsoOpenTo?: string[] | null; eligibility: EligibilityCriteria | null; audience?: string | null },
): MatchResult {
  const { eligibility, region } = scholarship
  const tieChecks = audienceChecks(scholarship.audience)

  const reasons: string[] = []
  if (!regionMatches(profile.city, region, scholarship.alsoOpenTo)) {
    reasons.push(`Only for students in ${region}`)
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }
  // Missing criteria do not erase the geography that we do know.
  if (!eligibility) return { match: true, confidence: 0.20, reasons: [], signals: [], checks: tieChecks }

  // ── Grade ─────────────────────────────────────────────────────────────────
  if (eligibility.grades.length > 0 && !eligibility.grades.includes(profile.grade)) {
    reasons.push(`Requires Grade ${eligibility.grades.join(' or ')}`)
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Age, read from the grade ──────────────────────────────────────────────
  // The quiz never asks an age, but a grade bounds it. Without this a Grade 10
  // student got the Advancing Futures Bursary (ages 18 to 24) at #2 of "best
  // fit first" (critique 2026-09-23). The bands are generous on purpose:
  // excluded only when no student in that grade could be that age.
  const band = GRADE_AGE_BAND[profile.grade]
  if (band && ((eligibility.minAge != null && eligibility.minAge > band[1]) || (eligibility.maxAge != null && eligibility.maxAge < band[0]))) {
    reasons.push(`Ages ${eligibility.minAge ?? ''}${eligibility.maxAge != null ? ` to ${eligibility.maxAge}` : '+'}`)
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── School board (hard filter only if student answered the question) ──────
  // '' is "None of these": the student is at none of the boards the question
  // offered, so a board-only award is not theirs either (critique 2026-09-24).
  if (eligibility.schoolBoards.length > 0 && profile.schoolBoard !== null) {
    if (!eligibility.schoolBoards.includes(profile.schoolBoard)) {
      reasons.push(`Requires ${eligibility.schoolBoards.join(' or ')} student`)
      return { match: false, confidence: 0, reasons, signals: [], checks: [] }
    }
  }

  // ── Specific school (hard filter only if student answered the question) ───
  // '' is "Another school", which rules out every school-only award the same
  // way; an empty needle would otherwise match every name below.
  if (eligibility.specificSchools.length > 0 && profile.specificSchool !== null) {
    const needle = profile.specificSchool.toLowerCase()
    const schoolMatch = needle !== '' && eligibility.specificSchools.some(
      s => s.toLowerCase().includes(needle) || needle.includes(s.toLowerCase()),
    )
    if (!schoolMatch) {
      reasons.push(`Only for students at ${eligibility.specificSchools.join(' or ')}`)
      return { match: false, confidence: 0, reasons, signals: [], checks: [] }
    }
  }

  // ── Minimum average (hard filter only if student provided their average) ──
  if (eligibility.minAverage !== null && profile.averagePercent !== null) {
    if (profile.averagePercent < eligibility.minAverage) {
      reasons.push(`Requires ${eligibility.minAverage}%+ average`)
      return { match: false, confidence: 0, reasons, signals: [], checks: [] }
    }
  }

  // ── Gender (hard filter only if student answered) ─────────────────────────
  if (eligibility.genderRequired === 'female' && profile.identifiesAsFemale === false) {
    reasons.push('Open to female-identifying students only')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Indigenous (hard filter only if student answered) ─────────────────────
  if (eligibility.indigenousRequired && profile.identifiesAsIndigenous === false) {
    reasons.push('Requires Indigenous identity (First Nations, Métis, or Inuit)')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── BIPOC (hard filter only if student answered) ──────────────────────────
  if (eligibility.bipocRequired && profile.identifiesAsBIPOC === false) {
    reasons.push('Requires BIPOC identity')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Foster care (hard filter only if student answered) ────────────────────
  if (eligibility.fosterCare && profile.inFosterCare === false) {
    reasons.push('Requires history of government care (foster care)')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Apprenticeship (hard filter only if student answered) ─────────────────
  if (eligibility.apprenticeship && profile.inApprenticeship === false) {
    reasons.push('Requires RAP or CTS apprenticeship enrollment')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Financial need (hard filter only if student explicitly said no) ────────
  if (eligibility.financialNeed && profile.hasFinancialNeed === false) {
    reasons.push('Requires demonstrated financial need')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Citizenship ───────────────────────────────────────────────────────────
  if (eligibility.citizenship === 'canadian' && profile.citizenship !== null && profile.citizenship !== 'canadian_citizen') {
    reasons.push('Requires Canadian citizenship')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }
  if (eligibility.citizenship === 'permanent_resident' && profile.citizenship === 'other') {
    reasons.push('Requires Canadian citizenship or permanent residency')
    return { match: false, confidence: 0, reasons, signals: [], checks: [] }
  }

  // ── Family income cap (hard filter only if student answered) ──────────────
  if (eligibility.maxFamilyIncome !== null && profile.familyIncome !== null) {
    if (profile.familyIncome > eligibility.maxFamilyIncome) {
      reasons.push(
        `Family income must be under $${eligibility.maxFamilyIncome.toLocaleString('en-CA')}`,
      )
      return { match: false, confidence: 0, reasons, signals: [], checks: [] }
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
  // A different field is not scored down (see FIELD_MISMATCH_PENALTY above),
  // but it is said: the row gets a Check and cannot be called Strong.
  const tagged = eligibility.fields.length > 0 ? eligibility.fields : audienceFields(scholarship.audience)
  const comparableFields = [...new Set(tagged.map(quizField).filter((f): f is string => f !== null && QUIZ_FIELDS.has(f)))]
  const fieldChecks: string[] = []
  if (comparableFields.length > 0 && profile.fields.length > 0) {
    const hit = profile.fields.find(f => comparableFields.includes(f))
    if (hit) { confidence += FIELD_MATCH_BOOST; signals.push(`Matches your ${hit} focus`) }
    else fieldChecks.push(`For ${comparableFields.map(f => FIELD_WORDS[f]).join(' or ')} students`)
  } else if (tagged.length > 0 && profile.fields.length > 0) {
    fieldChecks.push(`For ${tagged[0]!.toLowerCase()} students`)
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
  return { match: true, confidence, reasons, signals, checks: [...fieldChecks, ...tieChecks, ...uncheckedRequirements(profile, eligibility)] }
}

/** The youngest and oldest a student in each grade could plausibly be. */
const GRADE_AGE_BAND: Record<string, [number, number]> = {
  '10': [14, 17],
  '11': [15, 18],
  '12': [16, 19],
  'post-secondary': [17, 99],
}

/**
 * Checks that name a group the award is limited to, as opposed to financial
 * need, which nearly every student can meet or explain. The results page ranks
 * awards carrying one below those that do not, inside the same fit tier.
 */
export function isRestrictedCheck(check: string): boolean {
  return check !== 'Based on financial need'
}

/**
 * Restrictions the listing has that the student was never asked about. The
 * hard filters above skip a null answer so these listings still show, which
 * is right, but the results page used to call every one of them a match the
 * student "qualifies for". Citizenship is left out: nearly half the corpus
 * requires it and almost every reader meets it, so flagging it would bury the
 * restrictions that actually exclude people.
 */
export function uncheckedRequirements(profile: StudentProfile, e: EligibilityCriteria): string[] {
  const checks: string[] = []
  if (e.genderRequired === 'female' && profile.identifiesAsFemale === null) checks.push('Female students only')
  if (e.indigenousRequired && profile.identifiesAsIndigenous === null) checks.push('Indigenous students only')
  if (e.bipocRequired && profile.identifiesAsBIPOC === null) checks.push('BIPOC students only')
  if (e.fosterCare && profile.inFosterCare === null) checks.push('Youth in care only')
  if (e.apprenticeship && profile.inApprenticeship === null) checks.push('Needs RAP or CTS enrollment')
  if (e.financialNeed && profile.hasFinancialNeed === null) checks.push('Based on financial need')
  return checks
}

/**
 * Thresholds are 0.15 below where they started, exactly the weight of the
 * grade boost that used to be added to 94% of matches. Dropping the boost
 * without dropping the bar would have re-labelled most of the corpus a tier
 * lower for no reason the student could see. Lowering both by the same 0.15
 * keeps every listing that was getting the boost at the tier it already had,
 * and only moves the handful that never earned it.
 */
export function capTier(tier: ConfidenceTier, checks: string[]): ConfidenceTier {
  return tier === 'strong' && checks.some(isRestrictedCheck) ? 'good' : tier
}

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
export function matchPrograms(programs: Program[], answers: Record<string, string>, limit = RESULT_LIMIT): Program[] {
  const grade = answers.grade ?? '12'
  let filtered = programs.filter(p => p.active && matchProgram(grade, p))
  const field = answers.field
  if (field && FIELD_KEYWORDS[field]) {
    const byField = filtered.filter(p => programFields(p).includes(field))
    if (byField.length > 0) filtered = byField
  }
  return filtered.slice(0, limit)
}

/**
 * Run matchScholarship against every scholarship and return matches sorted by confidence.
 */
/** One scholarship, as much of it as the matcher and the ranking need. */
export type MatchInput = {
  id: number
  region: string | null
  /** The "who can apply" line, read for gates the quiz never asks. */
  audience?: string | null
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
): Array<{ id: number; confidence: number; tier: ConfidenceTier; signals: string[]; checks: string[] }> {
  const byId = new Map(scholarships.map(s => [s.id, s]))
  return scholarships
    .map(s => {
      const result = matchScholarship(profile, s)
      return result.match
        // "Strong" is a promise the student can act on; a row with a group
        // it may not belong to is at most Good, whatever it scored.
        ? { id: s.id, confidence: result.confidence, tier: capTier(getConfidenceTier(result.confidence), result.checks), signals: result.signals, checks: result.checks }
        : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) =>
      b.confidence - a.confidence || breakTie(byId.get(a.id)!, byId.get(b.id)!))
}
