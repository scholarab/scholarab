import { describe, it, expect } from 'vitest'
import { matchScholarship, getConfidenceTier, matchAll } from '../eligibility-matcher'
import type { EligibilityCriteria, StudentProfile } from '../eligibility-types'
import { EMPTY_ELIGIBILITY } from '../eligibility-types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const baseScholarship = (overrides: Partial<EligibilityCriteria> = {}) => ({
  region: null as string | null,
  eligibility: { ...EMPTY_ELIGIBILITY, ...overrides },
})

// ── No eligibility data ───────────────────────────────────────────────────────

describe('no eligibility data', () => {
  it('returns match: true with confidence 0.4 when eligibility is null', () => {
    const result = matchScholarship(baseProfile, { region: null, eligibility: null })
    expect(result.match).toBe(true)
    expect(result.confidence).toBe(0.4)
  })
})

// ── Region matching ───────────────────────────────────────────────────────────

describe('region matching', () => {
  it('null region matches any student', () => {
    const result = matchScholarship(baseProfile, baseScholarship())
    expect(result.match).toBe(true)
  })

  it('National matches any student', () => {
    const result = matchScholarship(baseProfile, { ...baseScholarship(), region: 'National' })
    expect(result.match).toBe(true)
  })

  it('Alberta matches a Medicine Hat student', () => {
    const result = matchScholarship(baseProfile, { ...baseScholarship(), region: 'Alberta' })
    expect(result.match).toBe(true)
  })

  it('Alberta matches a Calgary student', () => {
    const result = matchScholarship({ ...baseProfile, city: 'Calgary' }, { ...baseScholarship(), region: 'Alberta' })
    expect(result.match).toBe(true)
  })

  it('Medicine Hat region rejects a Calgary student', () => {
    const result = matchScholarship({ ...baseProfile, city: 'Calgary' }, { ...baseScholarship(), region: 'Medicine Hat' })
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('Medicine Hat')
  })

  it('Calgary region matches a Calgary student', () => {
    const result = matchScholarship({ ...baseProfile, city: 'Calgary' }, { ...baseScholarship(), region: 'Calgary' })
    expect(result.match).toBe(true)
  })
})

// ── Grade filtering ───────────────────────────────────────────────────────────

describe('grade filtering', () => {
  it('passes when grades list is empty', () => {
    const result = matchScholarship(baseProfile, baseScholarship({ grades: [] }))
    expect(result.match).toBe(true)
  })

  it('passes when student grade is in the list', () => {
    const result = matchScholarship(baseProfile, baseScholarship({ grades: ['11', '12'] }))
    expect(result.match).toBe(true)
  })

  it('fails when student grade is not in the list', () => {
    const result = matchScholarship(baseProfile, baseScholarship({ grades: ['10', '11'] }))
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('Grade')
  })

  it('post-secondary grade matches correctly', () => {
    const profile = { ...baseProfile, grade: 'post-secondary' as const }
    const result = matchScholarship(profile, baseScholarship({ grades: ['post-secondary'] }))
    expect(result.match).toBe(true)
  })
})

// ── School board filtering ────────────────────────────────────────────────────

describe('school board filtering', () => {
  it('skips school board check when student did not provide board', () => {
    const result = matchScholarship(
      { ...baseProfile, schoolBoard: null },
      baseScholarship({ schoolBoards: ['CBE'] }),
    )
    expect(result.match).toBe(true)
  })

  it('fails when student provided board does not match', () => {
    const result = matchScholarship(
      { ...baseProfile, schoolBoard: 'MHPSD' },
      baseScholarship({ schoolBoards: ['CBE'] }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('CBE')
  })

  it('passes when student provided board matches', () => {
    const result = matchScholarship(
      { ...baseProfile, schoolBoard: 'CBE' },
      baseScholarship({ schoolBoards: ['CBE', 'CCSD'] }),
    )
    expect(result.match).toBe(true)
  })
})

// ── GPA filtering ─────────────────────────────────────────────────────────────

describe('GPA filtering', () => {
  it('skips GPA check when student did not provide average', () => {
    const result = matchScholarship(
      { ...baseProfile, averagePercent: null },
      baseScholarship({ minAverage: 80 }),
    )
    expect(result.match).toBe(true)
  })

  it('fails when student average is below minimum', () => {
    const result = matchScholarship(
      { ...baseProfile, averagePercent: 74 },
      baseScholarship({ minAverage: 75 }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('75%')
  })

  it('passes when student average meets minimum exactly', () => {
    const result = matchScholarship(
      { ...baseProfile, averagePercent: 75 },
      baseScholarship({ minAverage: 75 }),
    )
    expect(result.match).toBe(true)
  })

  it('passes when student average exceeds minimum', () => {
    const result = matchScholarship(
      { ...baseProfile, averagePercent: 95 },
      baseScholarship({ minAverage: 80 }),
    )
    expect(result.match).toBe(true)
  })
})

// ── Gender filtering ──────────────────────────────────────────────────────────

describe('gender filtering', () => {
  it('shows female-only scholarship when student did not answer gender (null)', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsFemale: null },
      baseScholarship({ genderRequired: 'female' }),
    )
    expect(result.match).toBe(true) // uncertain — show as possible
  })

  it('shows female-only scholarship when student identifies as female', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsFemale: true },
      baseScholarship({ genderRequired: 'female' }),
    )
    expect(result.match).toBe(true)
  })

  it('hides female-only scholarship when student explicitly said not female', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsFemale: false },
      baseScholarship({ genderRequired: 'female' }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('female')
  })

  it('open-gender scholarship matches anyone', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsFemale: false },
      baseScholarship({ genderRequired: null }),
    )
    expect(result.match).toBe(true)
  })
})

// ── Indigenous filtering ──────────────────────────────────────────────────────

describe('Indigenous filtering', () => {
  it('shows Indigenous scholarship when student did not answer (null)', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsIndigenous: null },
      baseScholarship({ indigenousRequired: true }),
    )
    expect(result.match).toBe(true)
  })

  it('shows Indigenous scholarship when student is Indigenous', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsIndigenous: true },
      baseScholarship({ indigenousRequired: true }),
    )
    expect(result.match).toBe(true)
  })

  it('hides Indigenous scholarship when student said not Indigenous', () => {
    const result = matchScholarship(
      { ...baseProfile, identifiesAsIndigenous: false },
      baseScholarship({ indigenousRequired: true }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('Indigenous')
  })
})

// ── Citizenship filtering ─────────────────────────────────────────────────────

describe('citizenship filtering', () => {
  it('canadian citizenship requirement passes for canadian citizen', () => {
    const result = matchScholarship(
      { ...baseProfile, citizenship: 'canadian_citizen' },
      baseScholarship({ citizenship: 'canadian' }),
    )
    expect(result.match).toBe(true)
  })

  it('canadian citizenship requirement fails for other citizenship', () => {
    const result = matchScholarship(
      { ...baseProfile, citizenship: 'other' },
      baseScholarship({ citizenship: 'canadian' }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('Canadian')
  })

  it('any citizenship accepts everyone', () => {
    const result = matchScholarship(
      { ...baseProfile, citizenship: 'other' },
      baseScholarship({ citizenship: 'any' }),
    )
    expect(result.match).toBe(true)
  })

  it('skips citizenship check when student did not answer', () => {
    const result = matchScholarship(
      { ...baseProfile, citizenship: null },
      baseScholarship({ citizenship: 'canadian' }),
    )
    expect(result.match).toBe(true)
  })
})

// ── Financial need filtering ──────────────────────────────────────────────────

describe('financial need / family income', () => {
  it('skips income check when student did not provide income', () => {
    const result = matchScholarship(
      { ...baseProfile, familyIncome: null },
      baseScholarship({ maxFamilyIncome: 65000 }),
    )
    expect(result.match).toBe(true)
  })

  it('fails when family income exceeds cap', () => {
    const result = matchScholarship(
      { ...baseProfile, familyIncome: 80000 },
      baseScholarship({ maxFamilyIncome: 65000 }),
    )
    expect(result.match).toBe(false)
    expect(result.reasons[0]).toContain('65,000')
  })

  it('passes when family income is under cap', () => {
    const result = matchScholarship(
      { ...baseProfile, familyIncome: 50000 },
      baseScholarship({ maxFamilyIncome: 65000 }),
    )
    expect(result.match).toBe(true)
  })
})

// ── Foster care / apprenticeship filtering ────────────────────────────────────

describe('foster care filtering', () => {
  it('skips when student did not answer', () => {
    const result = matchScholarship(
      { ...baseProfile, inFosterCare: null },
      baseScholarship({ fosterCare: true }),
    )
    expect(result.match).toBe(true)
  })

  it('fails when student said not in foster care', () => {
    const result = matchScholarship(
      { ...baseProfile, inFosterCare: false },
      baseScholarship({ fosterCare: true }),
    )
    expect(result.match).toBe(false)
  })
})

describe('apprenticeship filtering', () => {
  it('skips when student did not answer', () => {
    const result = matchScholarship(
      { ...baseProfile, inApprenticeship: null },
      baseScholarship({ apprenticeship: true }),
    )
    expect(result.match).toBe(true)
  })

  it('fails when student said not in apprenticeship', () => {
    const result = matchScholarship(
      { ...baseProfile, inApprenticeship: false },
      baseScholarship({ apprenticeship: true }),
    )
    expect(result.match).toBe(false)
  })
})

// ── Confidence scoring ────────────────────────────────────────────────────────

describe('confidence scoring', () => {
  it('base confidence is 0.65 when passing all hard filters with no soft signals', () => {
    const result = matchScholarship(baseProfile, baseScholarship())
    expect(result.confidence).toBeGreaterThanOrEqual(0.65)
  })

  it('field of study match increases confidence', () => {
    const withFields = matchScholarship(
      { ...baseProfile, fields: ['STEM'] },
      baseScholarship({ fields: ['STEM'] }),
    )
    const noFields = matchScholarship(baseProfile, baseScholarship({ fields: ['STEM'] }))
    expect(withFields.confidence).toBeGreaterThan(noFields.confidence)
  })

  it('target institution match increases confidence', () => {
    const withInst = matchScholarship(
      { ...baseProfile, targetInstitution: 'University of Calgary' },
      baseScholarship({ targetInstitutions: ['University of Calgary'] }),
    )
    const withMismatch = matchScholarship(
      { ...baseProfile, targetInstitution: 'University of Lethbridge' },
      baseScholarship({ targetInstitutions: ['University of Calgary'] }),
    )
    expect(withInst.confidence).toBeGreaterThan(withMismatch.confidence)
  })

  it('confidence is clamped between 0.1 and 1', () => {
    const result = matchScholarship(baseProfile, baseScholarship())
    expect(result.confidence).toBeGreaterThanOrEqual(0.1)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})

// ── getConfidenceTier ─────────────────────────────────────────────────────────

describe('getConfidenceTier', () => {
  it('returns strong for confidence >= 0.85', () => {
    expect(getConfidenceTier(0.85)).toBe('strong')
    expect(getConfidenceTier(1.0)).toBe('strong')
  })

  it('returns good for confidence >= 0.60 and < 0.85', () => {
    expect(getConfidenceTier(0.60)).toBe('good')
    expect(getConfidenceTier(0.84)).toBe('good')
  })

  it('returns possible for confidence < 0.60', () => {
    expect(getConfidenceTier(0.40)).toBe('possible')
    expect(getConfidenceTier(0.1)).toBe('possible')
  })
})

// ── matchAll ──────────────────────────────────────────────────────────────────

describe('matchAll', () => {
  it('returns only matching scholarships sorted by confidence descending', () => {
    const scholarships = [
      { id: 1, region: 'Calgary', eligibility: EMPTY_ELIGIBILITY },     // fails - wrong region
      { id: 2, region: null, eligibility: EMPTY_ELIGIBILITY },           // passes
      { id: 3, region: null, eligibility: { ...EMPTY_ELIGIBILITY, grades: ['12'], targetInstitutions: ['University of Calgary'] } },
    ]
    const profile = {
      ...baseProfile,
      targetInstitution: 'University of Calgary',
    }
    const results = matchAll(profile, scholarships)
    expect(results.map(r => r.id)).not.toContain(1)
    expect(results.length).toBe(2)
    // Higher confidence first
    expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence)
  })

  it('handles empty scholarships array', () => {
    expect(matchAll(baseProfile, [])).toEqual([])
  })

  it('null eligibility scholarships included as possible matches', () => {
    const results = matchAll(baseProfile, [
      { id: 1, region: null, eligibility: null },
    ])
    expect(results.length).toBe(1)
    expect(results[0].tier).toBe('possible')
  })
})
