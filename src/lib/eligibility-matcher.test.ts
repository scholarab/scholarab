import { describe, it, expect } from 'vitest'
import { matchScholarship, getConfidenceTier, matchAll } from './eligibility-matcher'
import { EMPTY_ELIGIBILITY } from './eligibility-types'
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
    it('returns match:true, confidence:0.4, empty reasons', () => {
      expect(matchScholarship(baseProfile, { region: null, eligibility: null }))
        .toEqual({ match: true, confidence: 0.4, reasons: [] })
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
    it('base score 0.50 + no-field-restriction +0.10 + no-institution +0.10 = 0.70', () => {
      const result = matchScholarship(baseProfile, sch({
        fields: [],
        targetInstitutions: [],
        grades: [],
        schoolBoards: [],
      }))
      expect(result.confidence).toBeCloseTo(0.70)
    })

    it('+0.20 for field match', () => {
      const p = { ...baseProfile, fields: ['STEM'] }
      const result = matchScholarship(p, sch({ fields: ['STEM'], targetInstitutions: [] }))
      // 0.50 + 0.20 (field match) + 0.10 (no institution) = 0.80
      expect(result.confidence).toBeCloseTo(0.80)
    })

    it('-0.10 for field mismatch (profile has field, none match)', () => {
      const p = { ...baseProfile, fields: ['arts'] }
      const result = matchScholarship(p, sch({ fields: ['STEM'], targetInstitutions: [] }))
      // 0.50 - 0.10 (field mismatch) + 0.10 (no institution) = 0.50
      expect(result.confidence).toBeCloseTo(0.50)
    })

    it('no field adjustment when profile has no fields and eligibility has restrictions', () => {
      // profile.fields = [] → neither branch applies for field scoring
      const result = matchScholarship(baseProfile, sch({ fields: ['STEM'], targetInstitutions: [] }))
      // 0.50 + 0 (no profile fields to match) + 0.10 (no institution) = 0.60
      expect(result.confidence).toBeCloseTo(0.60)
    })

    it('+0.20 for institution match', () => {
      const p = { ...baseProfile, targetInstitution: 'University of Calgary' }
      const result = matchScholarship(p, sch({ fields: [], targetInstitutions: ['University of Calgary'] }))
      // 0.50 + 0.10 (no field restriction) + 0.20 (institution match) = 0.80
      expect(result.confidence).toBeCloseTo(0.80)
    })

    it('-0.10 for institution mismatch', () => {
      const p = { ...baseProfile, targetInstitution: 'University of Alberta' }
      const result = matchScholarship(p, sch({ fields: [], targetInstitutions: ['University of Calgary'] }))
      // 0.50 + 0.10 (no field) + -0.10 (institution mismatch) = 0.50
      expect(result.confidence).toBeCloseTo(0.50)
    })

    it('+0.05 for grade specificity bonus', () => {
      const result = matchScholarship(baseProfile, sch({
        grades: ['12'],
        fields: [],
        targetInstitutions: [],
      }))
      // 0.50 + 0.10 + 0.10 + 0.05 = 0.75
      expect(result.confidence).toBeCloseTo(0.75)
    })

    it('+0.05 for confirmed school board match', () => {
      const p = { ...baseProfile, schoolBoard: 'MHPSD' }
      const result = matchScholarship(p, sch({
        grades: [],
        fields: [],
        targetInstitutions: [],
        schoolBoards: ['MHPSD'],
      }))
      // 0.50 + 0.10 + 0.10 + 0.05 = 0.75
      expect(result.confidence).toBeCloseTo(0.75)
    })


    it('confidence clamped to max 1.0', () => {
      const p = { ...baseProfile, schoolBoard: 'MHPSD', fields: ['STEM'], targetInstitution: 'U of C' }
      const result = matchScholarship(p, sch({
        grades: ['12'],
        fields: ['STEM'],
        targetInstitutions: ['U of C'],
        schoolBoards: ['MHPSD'],
      }))
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

describe('getConfidenceTier', () => {
  it('1.0 → strong', () => expect(getConfidenceTier(1.0)).toBe('strong'))
  it('0.85 → strong (boundary)', () => expect(getConfidenceTier(0.85)).toBe('strong'))
  it('0.90 → strong', () => expect(getConfidenceTier(0.90)).toBe('strong'))
  it('0.84 → good', () => expect(getConfidenceTier(0.84)).toBe('good'))
  it('0.75 → good', () => expect(getConfidenceTier(0.75)).toBe('good'))
  it('0.60 → good (boundary)', () => expect(getConfidenceTier(0.60)).toBe('good'))
  it('0.59 → possible', () => expect(getConfidenceTier(0.59)).toBe('possible'))
  it('0.4 → possible', () => expect(getConfidenceTier(0.4)).toBe('possible'))
  it('0.1 → possible', () => expect(getConfidenceTier(0.1)).toBe('possible'))
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
      if (r.confidence >= 0.85) expect(r.tier).toBe('strong')
      else if (r.confidence >= 0.60) expect(r.tier).toBe('good')
      else expect(r.tier).toBe('possible')
    }
  })

  it('returns empty array when all scholarships fail region', () => {
    expect(matchAll(baseProfile, [calgaryOnly])).toEqual([])
  })

  it('null eligibility scholarship has confidence 0.4 (possible tier)', () => {
    const results = matchAll(baseProfile, [nullElig])
    expect(results[0]?.confidence).toBe(0.4)
    expect(results[0]?.tier).toBe('possible')
  })

  it('includes the id in each result', () => {
    const results = matchAll(baseProfile, [mhOpen])
    expect(results[0]?.id).toBe(3)
  })
})
