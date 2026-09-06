import { describe, it, expect } from 'vitest'
import { matchScholarship, getConfidenceTier, matchAll, matchPrograms, programFields } from './eligibility-matcher'
import { RESULT_LIMIT } from './quiz'
import scholarshipsJson from '../data/scholarships.json'
import { EMPTY_ELIGIBILITY, eligibilitySchema } from './eligibility-types'
import type { StudentProfile, EligibilityCriteria } from './eligibility-types'

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseProfile: StudentProfile = {
  grade: '12',
  city: 'Medicine Hat',
  schoolBoard: null,
  specificSchool: null,
  targetInstitution: null,
  fields: [],
  averagePercent: null,
  identifiesAsFemale: null,
  identifiesAsIndigenous: null,
  identifiesAsBIPOC: null,
  hasFinancialNeed: null,
  familyIncome: null,
  inFosterCare: null,
  inApprenticeship: null,
  extracurriculars: [],
  citizenship: null,
}

function sch(
  overrides: Partial<EligibilityCriteria> = {},
  region: string | null = null,
) {
  return { region, eligibility: { ...EMPTY_ELIGIBILITY, ...overrides } }
}

// ── matchScholarship ─────────────────────────────────────────────────────────

describe('matchScholarship', () => {

  describe('null eligibility', () => {
    it('returns match:true, confidence:0.20, and nothing to say either way', () => {
      expect(matchScholarship(baseProfile, { region: null, eligibility: null }))
        .toEqual({ match: true, confidence: 0.20, reasons: [], signals: [] })
    })
  })

  // ── Region ────────────────────────────────────────────────────────────────
  describe('region', () => {
    it('null region matches any city', () => {
      expect(matchScholarship(baseProfile, sch({}, null)).match).toBe(true)
    })

    it('National matches any city', () => {
      expect(matchScholarship(baseProfile, sch({}, 'National')).match).toBe(true)
    })

    it('Alberta matches Medicine Hat', () => {
      expect(matchScholarship(baseProfile, sch({}, 'Alberta')).match).toBe(true)
    })

    it('Alberta matches Calgary', () => {
      expect(matchScholarship({ ...baseProfile, city: 'Calgary' }, sch({}, 'Alberta')).match).toBe(true)
    })

    it('Alberta matches Edmonton', () => {
      expect(matchScholarship({ ...baseProfile, city: 'Edmonton' }, sch({}, 'Alberta')).match).toBe(true)
    })

    it('Alberta matches Lethbridge', () => {
      expect(matchScholarship({ ...baseProfile, city: 'Lethbridge' }, sch({}, 'Alberta')).match).toBe(true)
    })

    it('Alberta matches Red Deer', () => {
      expect(matchScholarship({ ...baseProfile, city: 'Red Deer' }, sch({}, 'Alberta')).match).toBe(true)
    })

    it('Alberta does not match unknown city', () => {
      const result = matchScholarship({ ...baseProfile, city: 'Taber' }, sch({}, 'Alberta'))
      expect(result.match).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.reasons[0]).toContain('Alberta')
    })

    it('specific city matches exactly', () => {
      expect(matchScholarship(baseProfile, sch({}, 'Medicine Hat')).match).toBe(true)
    })

    it('specific city fails for different city', () => {
      const result = matchScholarship({ ...baseProfile, city: 'Calgary' }, sch({}, 'Medicine Hat'))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('Medicine Hat')
    })
  })

  // ── Grade ─────────────────────────────────────────────────────────────────
  describe('grade', () => {
    it('empty grades array allows any grade', () => {
      expect(matchScholarship(baseProfile, sch({ grades: [] })).match).toBe(true)
    })

    it('matching grade passes', () => {
      expect(matchScholarship(baseProfile, sch({ grades: ['12'] })).match).toBe(true)
    })

    it('matching grade in multi-grade list passes', () => {
      expect(matchScholarship(baseProfile, sch({ grades: ['11', '12'] })).match).toBe(true)
    })

    it('non-matching grade fails', () => {
      const result = matchScholarship(baseProfile, sch({ grades: ['10', '11'] }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('Grade')
    })

    it('post-secondary student matches post-secondary grade', () => {
      const p = { ...baseProfile, grade: 'post-secondary' as const }
      expect(matchScholarship(p, sch({ grades: ['post-secondary'] })).match).toBe(true)
    })
  })

  // ── School board ──────────────────────────────────────────────────────────
  describe('schoolBoard', () => {
    it('matching board passes', () => {
      const p = { ...baseProfile, schoolBoard: 'MHPSD' }
      expect(matchScholarship(p, sch({ schoolBoards: ['MHPSD'] })).match).toBe(true)
    })

    it('different board fails', () => {
      const p = { ...baseProfile, schoolBoard: 'CBE' }
      const result = matchScholarship(p, sch({ schoolBoards: ['MHPSD'] }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('MHPSD')
    })

    it('null profile board skips filter', () => {
      expect(matchScholarship(baseProfile, sch({ schoolBoards: ['MHPSD'] })).match).toBe(true)
    })

    it('empty eligibility boards skips filter', () => {
      const p = { ...baseProfile, schoolBoard: 'CBE' }
      expect(matchScholarship(p, sch({ schoolBoards: [] })).match).toBe(true)
    })
  })

  // ── Specific school ───────────────────────────────────────────────────────
  describe('specificSchool', () => {
    it('substring match in eligibility list passes', () => {
      const p = { ...baseProfile, specificSchool: 'Hat High' }
      expect(matchScholarship(p, sch({ specificSchools: ['Medicine Hat High School'] })).match).toBe(true)
    })

    it('reverse substring match passes', () => {
      const p = { ...baseProfile, specificSchool: 'Medicine Hat High School' }
      expect(matchScholarship(p, sch({ specificSchools: ['Hat High'] })).match).toBe(true)
    })

    it('case-insensitive match passes', () => {
      const p = { ...baseProfile, specificSchool: 'medicine hat high school' }
      expect(matchScholarship(p, sch({ specificSchools: ['Medicine Hat High School'] })).match).toBe(true)
    })

    it('unrelated school fails', () => {
      const p = { ...baseProfile, specificSchool: 'Central High' }
      const result = matchScholarship(p, sch({ specificSchools: ['Medicine Hat High School'] }))
      expect(result.match).toBe(false)
    })

    it('null profile school skips filter', () => {
      expect(matchScholarship(baseProfile, sch({ specificSchools: ['Any School'] })).match).toBe(true)
    })
  })

  // ── Minimum average ───────────────────────────────────────────────────────
  describe('minAverage', () => {
    it('average above minimum passes', () => {
      const p = { ...baseProfile, averagePercent: 85 }
      expect(matchScholarship(p, sch({ minAverage: 75 })).match).toBe(true)
    })

    it('average exactly at minimum passes', () => {
      const p = { ...baseProfile, averagePercent: 75 }
      expect(matchScholarship(p, sch({ minAverage: 75 })).match).toBe(true)
    })

    it('average below minimum fails', () => {
      const p = { ...baseProfile, averagePercent: 74 }
      const result = matchScholarship(p, sch({ minAverage: 75 }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('75%')
    })

    it('null profile average skips filter', () => {
      expect(matchScholarship(baseProfile, sch({ minAverage: 95 })).match).toBe(true)
    })

    it('null eligibility minAverage skips filter', () => {
      const p = { ...baseProfile, averagePercent: 40 }
      expect(matchScholarship(p, sch({ minAverage: null })).match).toBe(true)
    })
  })

  // ── Gender ────────────────────────────────────────────────────────────────
  describe('gender', () => {
    it('female-required fails when student is explicitly not female', () => {
      const p = { ...baseProfile, identifiesAsFemale: false }
      const result = matchScholarship(p, sch({ genderRequired: 'female' }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('female')
    })

    it('female-required passes when student identifies as female', () => {
      const p = { ...baseProfile, identifiesAsFemale: true }
      expect(matchScholarship(p, sch({ genderRequired: 'female' })).match).toBe(true)
    })

    it('female-required skips when student did not answer (null)', () => {
      expect(matchScholarship(baseProfile, sch({ genderRequired: 'female' })).match).toBe(true)
    })

    it('no gender requirement passes for non-female student', () => {
      const p = { ...baseProfile, identifiesAsFemale: false }
      expect(matchScholarship(p, sch({ genderRequired: null })).match).toBe(true)
    })

    it('male-required fails when student identifies as female', () => {
      const p = { ...baseProfile, identifiesAsFemale: true }
      const result = matchScholarship(p, sch({ genderRequired: 'male' }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('male')
    })

    it('male-required passes when student is explicitly not female', () => {
      const p = { ...baseProfile, identifiesAsFemale: false }
      expect(matchScholarship(p, sch({ genderRequired: 'male' })).match).toBe(true)
    })

    // Regression: the schema was z.literal('female'), so the one male-only
    // listing in the corpus failed safeParse and had ALL of its criteria
    // dropped, not just its gender. It then matched every student.
    it('accepts male through the schema without discarding the other criteria', () => {
      const parsed = eligibilitySchema.safeParse({
        ...EMPTY_ELIGIBILITY,
        grades: ['12'],
        genderRequired: 'male',
      })
      expect(parsed.success).toBe(true)
      expect(parsed.success && parsed.data.grades).toEqual(['12'])
    })
  })

  // ── Indigenous ────────────────────────────────────────────────────────────
  describe('indigenousRequired', () => {
    it('fails when student explicitly not Indigenous', () => {
      const p = { ...baseProfile, identifiesAsIndigenous: false }
      const result = matchScholarship(p, sch({ indigenousRequired: true }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('Indigenous')
    })

    it('passes when student identifies as Indigenous', () => {
      const p = { ...baseProfile, identifiesAsIndigenous: true }
      expect(matchScholarship(p, sch({ indigenousRequired: true })).match).toBe(true)
    })

    it('skips when student did not answer (null)', () => {
      expect(matchScholarship(baseProfile, sch({ indigenousRequired: true })).match).toBe(true)
    })

    it('passes for anyone when not required', () => {
      const p = { ...baseProfile, identifiesAsIndigenous: false }
      expect(matchScholarship(p, sch({ indigenousRequired: false })).match).toBe(true)
    })
  })

  // ── BIPOC ─────────────────────────────────────────────────────────────────
  describe('bipocRequired', () => {
    it('fails when student explicitly not BIPOC', () => {
      const p = { ...baseProfile, identifiesAsBIPOC: false }
      const result = matchScholarship(p, sch({ bipocRequired: true }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('BIPOC')
    })

    it('passes when student identifies as BIPOC', () => {
      const p = { ...baseProfile, identifiesAsBIPOC: true }
      expect(matchScholarship(p, sch({ bipocRequired: true })).match).toBe(true)
    })

    it('skips when student did not answer (null)', () => {
      expect(matchScholarship(baseProfile, sch({ bipocRequired: true })).match).toBe(true)
    })
  })

  // ── Foster care ───────────────────────────────────────────────────────────
  describe('fosterCare', () => {
    it('fails when student is explicitly not in foster care', () => {
      const p = { ...baseProfile, inFosterCare: false }
      const result = matchScholarship(p, sch({ fosterCare: true }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('foster care')
    })

    it('passes when student is in foster care', () => {
      const p = { ...baseProfile, inFosterCare: true }
      expect(matchScholarship(p, sch({ fosterCare: true })).match).toBe(true)
    })

    it('skips when student did not answer (null)', () => {
      expect(matchScholarship(baseProfile, sch({ fosterCare: true })).match).toBe(true)
    })
  })

  // ── Apprenticeship ────────────────────────────────────────────────────────
  describe('apprenticeship', () => {
    it('fails when student is explicitly not in apprenticeship', () => {
      const p = { ...baseProfile, inApprenticeship: false }
      const result = matchScholarship(p, sch({ apprenticeship: true }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('apprenticeship')
    })

    it('passes when student is in apprenticeship', () => {
      const p = { ...baseProfile, inApprenticeship: true }
      expect(matchScholarship(p, sch({ apprenticeship: true })).match).toBe(true)
    })

    it('skips when student did not answer (null)', () => {
      expect(matchScholarship(baseProfile, sch({ apprenticeship: true })).match).toBe(true)
    })
  })

  // ── Citizenship ───────────────────────────────────────────────────────────
  describe('citizenship', () => {
    it('any citizenship accepts profile.citizenship=other', () => {
      const p = { ...baseProfile, citizenship: 'other' as const }
      expect(matchScholarship(p, sch({ citizenship: 'any' })).match).toBe(true)
    })

    it('canadian required fails for other', () => {
      const p = { ...baseProfile, citizenship: 'other' as const }
      const result = matchScholarship(p, sch({ citizenship: 'canadian' }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('citizenship')
    })

    it('permanent_resident required fails for other', () => {
      const p = { ...baseProfile, citizenship: 'other' as const }
      const result = matchScholarship(p, sch({ citizenship: 'permanent_resident' }))
      expect(result.match).toBe(false)
    })

    it('canadian required passes for canadian_citizen', () => {
      const p = { ...baseProfile, citizenship: 'canadian_citizen' as const }
      expect(matchScholarship(p, sch({ citizenship: 'canadian' })).match).toBe(true)
    })

    it('canadian required fails for permanent_resident', () => {
      const p = { ...baseProfile, citizenship: 'permanent_resident' as const }
      const result = matchScholarship(p, sch({ citizenship: 'canadian' }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('citizenship')
    })

    it('skips when profile.citizenship is null', () => {
      expect(matchScholarship(baseProfile, sch({ citizenship: 'canadian' })).match).toBe(true)
    })
  })

  // ── Family income cap ─────────────────────────────────────────────────────
  describe('maxFamilyIncome', () => {
    it('fails when income exceeds cap', () => {
      const p = { ...baseProfile, familyIncome: 70000 }
      const result = matchScholarship(p, sch({ maxFamilyIncome: 65000 }))
      expect(result.match).toBe(false)
      expect(result.reasons[0]).toContain('65,000')
    })

    it('passes when income is exactly at cap', () => {
      const p = { ...baseProfile, familyIncome: 65000 }
      expect(matchScholarship(p, sch({ maxFamilyIncome: 65000 })).match).toBe(true)
    })

    it('passes when income is below cap', () => {
      const p = { ...baseProfile, familyIncome: 40000 }
      expect(matchScholarship(p, sch({ maxFamilyIncome: 65000 })).match).toBe(true)
    })

    it('skips when profile.familyIncome is null', () => {
      expect(matchScholarship(baseProfile, sch({ maxFamilyIncome: 65000 })).match).toBe(true)
    })

    it('skips when eligibility.maxFamilyIncome is null', () => {
      const p = { ...baseProfile, familyIncome: 999999 }
      expect(matchScholarship(p, sch({ maxFamilyIncome: null })).match).toBe(true)
    })
  })

  // ── Confidence scoring ────────────────────────────────────────────────────
  describe('confidence scoring', () => {
    it('base score 0.35 with no restrictions and null region', () => {
      const result = matchScholarship(baseProfile, sch({
        fields: [],
        targetInstitutions: [],
        grades: [],
        schoolBoards: [],
      }))
      expect(result.confidence).toBeCloseTo(0.35)
    })

    it('+0.25 for city-specific region match', () => {
      // scholarship region === student city → city-specific bonus
      const result = matchScholarship(baseProfile, sch({ fields: [], targetInstitutions: [] }, 'Medicine Hat'))
      // 0.35 + 0.25 = 0.60
      expect(result.confidence).toBeCloseTo(0.60)
    })

    it('no city bonus for National region', () => {
      const result = matchScholarship(baseProfile, sch({ fields: [], targetInstitutions: [] }, 'National'))
      expect(result.confidence).toBeCloseTo(0.35)
    })

    it('no city bonus for Alberta-wide region', () => {
      const result = matchScholarship(baseProfile, sch({ fields: [], targetInstitutions: [] }, 'Alberta'))
      expect(result.confidence).toBeCloseTo(0.35)
    })

    it('+0.20 for field match', () => {
      const p = { ...baseProfile, fields: ['STEM'] }
      const result = matchScholarship(p, sch({ fields: ['STEM'], targetInstitutions: [] }))
      // 0.35 + 0.20 (field match) = 0.55
      expect(result.confidence).toBeCloseTo(0.55)
    })

    it('does not demote a listing tagged with a different field', () => {
      // The penalty used to fire on 21% of a STEM student's matches while the
      // boost fired on 9%, so the field question mostly pushed listings down.
      // 234 of 345 listings carry no field at all, so the tag says more about
      // our data than about the award.
      const p = { ...baseProfile, fields: ['arts'] }
      const result = matchScholarship(p, sch({ fields: ['STEM'], targetInstitutions: [] }))
      expect(result.confidence).toBeCloseTo(0.35)
    })

    it('no field adjustment when profile has no fields and eligibility has restrictions', () => {
      // profile.fields = [] → neither branch applies for field scoring
      const result = matchScholarship(baseProfile, sch({ fields: ['STEM'], targetInstitutions: [] }))
      // 0.35 + 0 (no profile fields) = 0.35
      expect(result.confidence).toBeCloseTo(0.35)
    })

    it('+0.15 for institution match', () => {
      const p = { ...baseProfile, targetInstitution: 'University of Calgary' }
      const result = matchScholarship(p, sch({ fields: [], targetInstitutions: ['University of Calgary'] }))
      // 0.35 + 0.15 (institution match) = 0.50
      expect(result.confidence).toBeCloseTo(0.50)
    })

    it('-0.10 for institution mismatch', () => {
      const p = { ...baseProfile, targetInstitution: 'University of Alberta' }
      const result = matchScholarship(p, sch({ fields: [], targetInstitutions: ['University of Calgary'] }))
      // 0.35 - 0.10 (institution mismatch) = 0.25
      expect(result.confidence).toBeCloseTo(0.25)
    })

    it('scores nothing for a grade match, but still says so', () => {
      // The boost fired on 94% of matches, because the hard filter above has
      // already rejected every student whose grade does not fit. It shifted
      // every score equally and separated nothing.
      const result = matchScholarship(baseProfile, sch({
        grades: ['12'],
        fields: [],
        targetInstitutions: [],
      }))
      expect(result.confidence).toBeCloseTo(0.35)
      expect(result.signals).toContain('Open to Grade 12')
    })

    it('+0.15 for confirmed school board match', () => {
      const p = { ...baseProfile, schoolBoard: 'MHPSD' }
      const result = matchScholarship(p, sch({
        grades: [],
        fields: [],
        targetInstitutions: [],
        schoolBoards: ['MHPSD'],
      }))
      // 0.35 + 0.15 = 0.50
      expect(result.confidence).toBeCloseTo(0.50)
    })

    it('+0.10 for confirmed average meets requirement', () => {
      const p = { ...baseProfile, averagePercent: 85 }
      const result = matchScholarship(p, sch({ minAverage: 75, fields: [], targetInstitutions: [] }))
      // 0.35 + 0.10 = 0.45
      expect(result.confidence).toBeCloseTo(0.45)
    })

    it('city + field stacks to strong tier', () => {
      const p = { ...baseProfile, fields: ['STEM'] }
      const result = matchScholarship(p, sch({ grades: ['12'], fields: ['STEM'], targetInstitutions: [] }, 'Medicine Hat'))
      // 0.35 + 0.25 (city) + 0.20 (field) = 0.80
      expect(result.confidence).toBeCloseTo(0.80)
      expect(getConfidenceTier(result.confidence)).toBe('strong')
    })

    it('confidence clamped to max 1.0', () => {
      const p = { ...baseProfile, schoolBoard: 'MHPSD', fields: ['STEM'], targetInstitution: 'U of C', averagePercent: 90 }
      const result = matchScholarship(p, sch({
        grades: ['12'],
        fields: ['STEM'],
        targetInstitutions: ['U of C'],
        schoolBoards: ['MHPSD'],
        minAverage: 80,
      }, 'Medicine Hat'))
      expect(result.confidence).toBeLessThanOrEqual(1.0)
    })

    it('confidence clamped to min 0.1', () => {
      const p = { ...baseProfile, fields: ['arts'], targetInstitution: 'UBC' }
      const result = matchScholarship(p, sch({
        fields: ['STEM'],
        targetInstitutions: ['University of Calgary'],
      }))
      expect(result.confidence).toBeGreaterThanOrEqual(0.1)
    })
  })

  // ── Reason messages ───────────────────────────────────────────────────────
  describe('reason messages', () => {
    it('only the first failing hard filter reason is returned', () => {
      // Region fails first → only one reason
      const p = { ...baseProfile, city: 'Vancouver' }
      const result = matchScholarship(p, sch({ grades: ['11'] }, 'Medicine Hat'))
      expect(result.reasons).toHaveLength(1)
      expect(result.reasons[0]).toContain('Medicine Hat')
    })

    it('reasons array is empty on successful match', () => {
      const result = matchScholarship(baseProfile, sch())
      expect(result.reasons).toEqual([])
    })

    it('grade reason mentions specific grades', () => {
      const result = matchScholarship(baseProfile, sch({ grades: ['10', '11'] }))
      expect(result.reasons[0]).toContain('10')
      expect(result.reasons[0]).toContain('11')
    })

    it('income reason formats number with Canadian locale', () => {
      const p = { ...baseProfile, familyIncome: 100000 }
      const result = matchScholarship(p, sch({ maxFamilyIncome: 65000 }))
      expect(result.reasons[0]).toMatch(/65[,.]000/)
    })
  })
})

// ── getConfidenceTier ────────────────────────────────────────────────────────

// Both bars sit 0.15 below where they started, the weight of the grade boost
// that used to be added to 94% of matches.
describe('getConfidenceTier', () => {
  it('1.0 → strong', () => expect(getConfidenceTier(1.0)).toBe('strong'))
  it('0.80 → strong', () => expect(getConfidenceTier(0.80)).toBe('strong'))
  it('0.70 → strong', () => expect(getConfidenceTier(0.70)).toBe('strong'))
  it('0.65 → strong (boundary)', () => expect(getConfidenceTier(0.65)).toBe('strong'))
  it('0.64 → good', () => expect(getConfidenceTier(0.64)).toBe('good'))
  it('0.60 → good', () => expect(getConfidenceTier(0.60)).toBe('good'))
  it('0.45 → good', () => expect(getConfidenceTier(0.45)).toBe('good'))
  it('0.40 → good (boundary)', () => expect(getConfidenceTier(0.40)).toBe('good'))
  it('0.39 → possible', () => expect(getConfidenceTier(0.39)).toBe('possible'))
  it('0.35 → possible', () => expect(getConfidenceTier(0.35)).toBe('possible'))
  it('0.1 → possible', () => expect(getConfidenceTier(0.1)).toBe('possible'))

  // The base score alone must stay below "good": a listing we know nothing
  // about beyond the student clearing its hard filters has not earned a label
  // that says it fits them.
  it('leaves a listing scoring only the base confidence as possible', () => {
    expect(getConfidenceTier(0.35)).toBe('possible')
  })
})

// ── matchAll ─────────────────────────────────────────────────────────────────

describe('matchAll', () => {
  const nullElig    = { id: 1, region: null as null, eligibility: null }
  const calgaryOnly = { id: 2, region: 'Calgary', eligibility: EMPTY_ELIGIBILITY }
  const mhOpen      = { id: 3, region: 'Medicine Hat', eligibility: EMPTY_ELIGIBILITY }
  const national    = { id: 4, region: 'National', eligibility: EMPTY_ELIGIBILITY }
  const grade10Only = { id: 5, region: null, eligibility: { ...EMPTY_ELIGIBILITY, grades: ['10'] } }

  it('returns empty array for empty input', () => {
    expect(matchAll(baseProfile, [])).toEqual([])
  })

  it('excludes non-matching scholarships', () => {
    const results = matchAll(baseProfile, [calgaryOnly, grade10Only])
    expect(results.map(r => r.id)).not.toContain(2)
    expect(results.map(r => r.id)).not.toContain(5)
  })

  it('includes matching scholarships', () => {
    const results = matchAll(baseProfile, [nullElig, mhOpen, national])
    expect(results.map(r => r.id)).toContain(1)
    expect(results.map(r => r.id)).toContain(3)
    expect(results.map(r => r.id)).toContain(4)
  })

  it('sorts results by confidence descending', () => {
    const results = matchAll(baseProfile, [nullElig, mhOpen, national])
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i]!.confidence).toBeGreaterThanOrEqual(results[i + 1]!.confidence)
    }
  })

  it('assigns tier consistent with confidence', () => {
    const results = matchAll(baseProfile, [nullElig, mhOpen, national])
    for (const r of results) {
      if (r.confidence >= 0.80) expect(r.tier).toBe('strong')
      else if (r.confidence >= 0.55) expect(r.tier).toBe('good')
      else expect(r.tier).toBe('possible')
    }
  })

  it('returns empty array when all scholarships fail region', () => {
    expect(matchAll(baseProfile, [calgaryOnly])).toEqual([])
  })

  it('null eligibility scholarship has confidence 0.20 (possible tier)', () => {
    const results = matchAll(baseProfile, [nullElig])
    expect(results[0]?.confidence).toBe(0.20)
    expect(results[0]?.tier).toBe('possible')
  })

  it('includes the id in each result', () => {
    const results = matchAll(baseProfile, [mhOpen])
    expect(results[0]?.id).toBe(3)
  })
})

describe('matchPrograms', () => {
  function prog(overrides: Record<string, unknown> = {}) {
    return {
      id: 1, name: 'Test Program', emoji: null, category: null, provider: null,
      grades: null, duration: null, paid: false, stipend: null, location: null,
      eligibility: null, deadline: null, url: 'https://x.example',
      description: null, lastVerified: null, active: true,
      ...overrides,
    }
  }

  it('treats age ranges as inclusive, not as grade ranges', () => {
    // "Ages 13–18" once parsed as grades 13–18 and excluded every real student
    const programs = [
      prog({ id: 1, grades: 'Ages 13–18' }),
      prog({ id: 2, grades: 'High school (under 18 eligible)' }),
      prog({ id: 3, grades: 'High school (ages 14–17)' }),
    ]
    const result = matchPrograms(programs, { grade: '10' })
    expect(result.map(p => p.id)).toEqual([1, 2, 3])
  })

  it('still enforces real grade ranges and singles', () => {
    const programs = [
      prog({ id: 1, grades: 'Grades 11–12' }),
      prog({ id: 2, grades: 'Grade 12 (graduating)' }),
      prog({ id: 3, grades: 'Grades 9–12 (ages 13–18)' }),
    ]
    expect(matchPrograms(programs, { grade: '10' }).map(p => p.id)).toEqual([3])
    expect(matchPrograms(programs, { grade: '12' }).map(p => p.id)).toEqual([1, 2, 3])
  })

  it('excludes inactive programs and includes actives regardless of field filter', () => {
    const programs = [
      prog({ id: 1, active: false }),
      prog({ id: 2 }),
    ]
    expect(matchPrograms(programs, { grade: '11' }).map(p => p.id)).toEqual([2])
  })
})

// ── signals ──────────────────────────────────────────────────────────────────

describe('match signals', () => {
  // The results list shows these as the reason a row ranked where it did, so
  // each one has to come from the same branch that moved the confidence score.
  // A signal without its boost is a lie to the student; a boost without its
  // signal is an unexplained ranking.

  it('names the city for a city-specific award', () => {
    expect(matchScholarship(baseProfile, sch({}, 'Medicine Hat')).signals)
      .toContain('Local to Medicine Hat')
  })

  it('says nothing about locality for a province-wide or national award', () => {
    for (const region of [null, 'National', 'Alberta', 'Alberta-wide']) {
      expect(matchScholarship(baseProfile, sch({}, region)).signals.join(' '))
        .not.toContain('Local to')
    }
  })

  it('names the grade the award is open to', () => {
    expect(matchScholarship(baseProfile, sch({ grades: ['12'] })).signals)
      .toContain('Open to Grade 12')
    // A student who gave no grade is rejected by the grade filter upstream, so
    // this branch never has to invent a grade to name.
    // `grade: null` is the shape the quiz produces before that question is
    // answered; StudentProfile types it narrowly, hence the cast.
    const noGrade = { ...baseProfile, grade: null as unknown as StudentProfile['grade'] }
    expect(matchScholarship(noGrade, sch({ grades: ['12'] })).match).toBe(false)
  })

  it('names the field that actually hit, not the whole list', () => {
    const profile = { ...baseProfile, fields: ['arts', 'STEM'] }
    expect(matchScholarship(profile, sch({ fields: ['STEM'] })).signals)
      .toContain('Matches your STEM focus')
  })

  it('names the average bar it cleared', () => {
    const profile = { ...baseProfile, averagePercent: 93 }
    expect(matchScholarship(profile, sch({ minAverage: 85 })).signals)
      .toContain('Your average clears its 85% minimum')
  })

  it('reports nothing for a rejection', () => {
    const res = matchScholarship(baseProfile, sch({ grades: ['10'] }))
    expect(res.match).toBe(false)
    expect(res.signals).toEqual([])
  })

  it('carries them through matchAll', () => {
    const [top] = matchAll(baseProfile, [
      { id: 1, region: 'Medicine Hat', eligibility: { ...EMPTY_ELIGIBILITY, grades: ['12'] } },
    ])
    expect(top!.signals).toEqual(['Local to Medicine Hat', 'Open to Grade 12'])
  })

  it('only claims things the score agrees with', () => {
    // A plain national award with no criteria beyond the defaults earns no
    // boosts, so it must earn no signals either.
    const res = matchScholarship(baseProfile, sch({}, 'National'))
    expect(res.match).toBe(true)
    expect(res.signals).toEqual([])
  })
})

// ── Field tagging ────────────────────────────────────────────────────────────

describe('the field a program belongs to', () => {
  it('reaches the Computing category, which no STEM keyword spelled', () => {
    // "Computing" does not contain "computer", so the eight programs in that
    // category matched no field and the field filter dropped every one of them.
    expect(programFields({ category: 'Computing', description: 'A cybersecurity contest.' }))
      .toContain('STEM')
  })

  it('files an enrichment program under every field rather than none', () => {
    expect(programFields({ category: 'Enrichment', description: 'A leadership award.' }))
      .toEqual(expect.arrayContaining(['STEM', 'health', 'business', 'arts', 'trades']))
  })

  it('keeps the fields a description reaches beyond its category', () => {
    const fields = programFields({ category: 'Research', description: 'Paid health research placement.' })
    expect(fields).toContain('STEM')
    expect(fields).toContain('health')
  })

  it('leaves no program in the corpus unreachable by the field filter', async () => {
    const programs = (await import('../data/research-programs.json')).default
    const orphans = programs.filter(p => programFields(p).length === 0)
    expect(orphans.map(p => p.name)).toEqual([])
  })

  it('shows the whole Computing category to a student who answers STEM', async () => {
    const programs = (await import('../data/research-programs.json')).default as Parameters<typeof matchPrograms>[0]
    const computing = programs.filter(p => p.category === 'Computing').map(p => p.name)
    expect(computing.length).toBeGreaterThan(0)
    // matchPrograms caps at 10, so ask the filter directly rather than the cap.
    for (const name of computing) {
      const p = programs.find(x => x.name === name)!
      expect(programFields(p), name).toContain('STEM')
    }
  })
})

describe('a field the quiz cannot emit', () => {
  const scholarship = (fields: string[]) => ({
    region: 'Medicine Hat',
    eligibility: { ...EMPTY_ELIGIBILITY, fields },
  })

  it('scores as neutral, not as a mismatch', () => {
    // 14 listings are tagged only "agriculture", "education", "language",
    // "sports" or "fire service". None of those describe the student's answer
    // either way, and a bare includes() penalised all of them for everyone.
    const profile = { ...baseProfile, fields: ['STEM'] }
    const off = matchScholarship(profile, scholarship(['agriculture']))
    const none = matchScholarship(profile, scholarship([]))
    expect(off.confidence).toBe(none.confidence)
  })

  it('no longer penalises a field the quiz can emit and the student did not pick', () => {
    const profile = { ...baseProfile, fields: ['STEM'] }
    const wrong = matchScholarship(profile, scholarship(['arts']))
    const none = matchScholarship(profile, scholarship([]))
    expect(wrong.confidence).toBe(none.confidence)
  })

  it('scores the vocabulary half of a mixed tag', () => {
    const profile = { ...baseProfile, fields: ['trades'] }
    const mixed = matchScholarship(profile, scholarship(['agriculture', 'trades']))
    expect(mixed.signals).toContain('Matches your trades focus')
  })
})

// ── Nothing in the corpus is unreachable ─────────────────────────────────────

describe('the corpus the quiz matches against', () => {
  it('leaves no program hidden from every high-school grade', async () => {
    const { programMatchesGrade } = await import('./list-core')
    const programs = (await import('../data/research-programs.json')).default
    // Two listings spelled several grades in one string, and the parser takes
    // the first "grade N" it sees when there is no range: Pascal/Cayley/Fermat
    // read as grade 9 only, and AMC 10 and 12 read as grade 12 only.
    const dead = programs.filter(
      p => ![10, 11, 12].some(g => programMatchesGrade(p.grades, g)),
    )
    expect(dead.map(p => p.name)).toEqual([])
  })

  it('lets a grade 10 and a grade 11 student write the contests meant for them', async () => {
    const { programMatchesGrade } = await import('./list-core')
    const programs = (await import('../data/research-programs.json')).default
    const amc = programs.find(p => p.name.startsWith('AMC 10'))!
    const waterloo = programs.find(p => p.name.startsWith('Pascal'))!
    expect([10, 11, 12].every(g => programMatchesGrade(amc.grades, g))).toBe(true)
    expect([9, 10, 11].every(g => programMatchesGrade(waterloo.grades, g))).toBe(true)
    expect(programMatchesGrade(waterloo.grades, 12)).toBe(false)
  })

  it('leaves no scholarship that no profile can reach', async () => {
    const scholarships = (await import('../data/scholarships.json')).default
    const cities = ['Airdrie', 'Beaumont', 'Brooks', 'Calgary', 'Camrose', 'Chestermere', 'Cold Lake', 'Edmonton', 'Fort McMurray', 'Fort Saskatchewan', 'Grande Prairie', 'Lacombe', 'Leduc', 'Lethbridge', 'Lloydminster', 'Medicine Hat', 'Okotoks', 'Red Deer', 'Sherwood Park', 'Spruce Grove', 'St. Albert', 'Wetaskiwin', 'Other Alberta']
    const grades = ['10', '11', '12', 'post-secondary'] as const
    const dead = scholarships.filter(s => {
      for (const city of cities) {
        for (const grade of grades) {
          const profile = { ...baseProfile, city, grade }
          if (matchScholarship(profile, s as never).match) return false
        }
      }
      return true
    })
    expect(dead.map(s => s.title)).toEqual([])
  })
})

describe('the results cap', () => {
  it('returns at most RESULT_LIMIT programs, and honours a raise', () => {
    const many = Array.from({ length: RESULT_LIMIT + 15 }, (_, i) => ({
      id: i, name: 'P' + i, emoji: null, category: null, provider: null,
      grades: null, duration: null, paid: false, stipend: null, location: null,
      eligibility: null, deadline: null, url: 'https://x.example',
      description: null, lastVerified: null, active: true,
    }))
    expect(matchPrograms(many, { grade: '12' })).toHaveLength(RESULT_LIMIT)
  })

  // The rank badge is zero-padded to two digits, so a cap above 99 would
  // render "100" into a slot sized for two characters.
  it('stays inside the two-digit rank badge', () => {
    expect(RESULT_LIMIT).toBeLessThanOrEqual(99)
  })
})

// ── Ordering inside a tied score ─────────────────────────────────────────────

describe('the tie-break', () => {
  const open = { ...EMPTY_ELIGIBILITY }
  const row = (id: number, deadline: string | null, amount: string | null) =>
    ({ id, region: 'Alberta', eligibility: open, deadline, amount })

  const ids = (rows: Parameters<typeof matchAll>[1]) =>
    matchAll(baseProfile, rows).map(r => r.id)

  it('puts the soonest deadline first', () => {
    expect(ids([
      row(1, '2027-06-01', '$1,000'),
      row(2, '2026-11-01', '$1,000'),
      row(3, '2027-01-15', '$1,000'),
    ])).toEqual([2, 3, 1])
  })

  it('sorts an undated listing after every dated one', () => {
    // It cannot be missed, so it is not urgent, and it is the weaker thing to
    // put at the top of a results page.
    expect(ids([
      row(1, null, '$5,000'),
      row(2, '2027-06-01', '$500'),
    ])).toEqual([2, 1])
  })

  it('prefers the larger award when deadlines are equal', () => {
    expect(ids([
      row(1, '2027-01-01', '$500'),
      row(2, '2027-01-01', '$5,000'),
      row(3, '2027-01-01', 'Varies'),
    ])).toEqual([2, 1, 3])
  })

  it('falls back to id so the order is total and stable', () => {
    expect(ids([row(9, null, 'Varies'), row(4, null, 'Varies')])).toEqual([4, 9])
  })

  it('never reorders across different confidences', () => {
    // A far-off deadline on a better match still outranks an urgent weak one.
    const strong = { id: 1, region: 'Medicine Hat', eligibility: open, deadline: '2099-01-01', amount: '$1' }
    const weak = { id: 2, region: 'Alberta', eligibility: open, deadline: '2026-09-02', amount: '$99,000' }
    const [first] = matchAll(baseProfile, [weak, strong])
    expect(first!.id).toBe(1)
  })

  it('orders the real corpus deterministically regardless of input order', () => {
    const data = (scholarshipsJson as never as Array<Record<string, unknown>>).map(x => ({
      id: x.id as number, region: x.region as string | null,
      eligibility: x.eligibility as never, deadline: x.deadline as string | null,
      amount: x.amount as string | null,
    }))
    const forward = matchAll(baseProfile, data).map(r => r.id)
    const reversed = matchAll(baseProfile, [...data].reverse()).map(r => r.id)
    expect(reversed).toEqual(forward)
  })
})
