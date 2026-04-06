import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ── JSON fallback (no DATABASE_URL) ──────────────────────────────────────────

describe('loadScholarships — JSON fallback', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('returns a non-empty array', async () => {
    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every item has required fields with correct types', async () => {
    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    for (const s of result) {
      expect(typeof s.id).toBe('number')
      expect(typeof s.title).toBe('string')
      expect(typeof s.url).toBe('string')
      expect(typeof s.amount).toBe('string')
    }
  })

  it('sets eligibility to null for all JSON items', async () => {
    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(result.every(s => s.eligibility === null)).toBe(true)
  })

  it('openDate is null or string for all items', async () => {
    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    for (const s of result) {
      expect(s.openDate === null || typeof s.openDate === 'string').toBe(true)
    }
  })
})

describe('loadPrograms — JSON fallback', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('returns a non-empty array', async () => {
    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every item has required fields with correct types', async () => {
    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    for (const p of result) {
      expect(typeof p.id).toBe('number')
      expect(typeof p.name).toBe('string')
      expect(typeof p.url).toBe('string')
      expect(typeof p.paid).toBe('boolean')
    }
  })
})

describe('loadPrograms — DB path', () => {
  function programRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 1, name: 'Test Program', emoji: '🔬', category: 'Science',
      provider: 'U of A', grades: '10-12', duration: '6 weeks',
      paid: true, stipend: '$500/week', location: 'Edmonton',
      eligibility: 'Grade 10-12 students', deadline: '2026-06-01',
      url: 'https://test.com', description: 'A cool program',
      lastVerified: '2026-03-01', active: true,
      ...overrides,
    }
  }

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://mock'
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('returns programs from DB when DATABASE_URL is set', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [programRow()] }) },
    }))
    vi.doMock('./db/schema', () => ({ researchPrograms: 'research_programs_table' }))

    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    expect(result.length).toBe(1)
    expect(result[0]?.name).toBe('Test Program')
    expect(result[0]?.paid).toBe(true)
  })

  it('excludes inactive programs (active === false)', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [
        programRow({ id: 1, active: true }),
        programRow({ id: 2, active: false }),
      ] }) },
    }))
    vi.doMock('./db/schema', () => ({ researchPrograms: 'research_programs_table' }))

    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    expect(result.map(p => p.id)).toContain(1)
    expect(result.map(p => p.id)).not.toContain(2)
  })

  it('normalises nullable fields to null', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [programRow({
        emoji: undefined, category: undefined, provider: undefined,
        stipend: undefined, location: undefined, description: undefined,
        lastVerified: undefined,
      })] }) },
    }))
    vi.doMock('./db/schema', () => ({ researchPrograms: 'research_programs_table' }))

    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    expect(result[0]?.emoji).toBeNull()
    expect(result[0]?.category).toBeNull()
  })

  it('falls back to JSON when DB throws', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => { throw new Error('db down') } }) },
    }))
    vi.doMock('./db/schema', () => ({ researchPrograms: 'research_programs_table' }))

    const { loadPrograms } = await import('./data-loader')
    const result = await loadPrograms()
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── parseEligibility (Zod schema) via DB path ─────────────────────────────────
//
// We use vi.doMock (not vi.mock) so mocks are not hoisted — each test
// can set up a different DB response before importing data-loader.

function dbRow(eligibility: unknown) {
  return {
    id: 1, title: 'Test', amount: '$1,000', deadline: null, openDate: null,
    audience: null, url: 'https://test.com', category: null, lastVerified: null,
    region: null, notes: null, applyViaGuidance: false, active: true,
    eligibility,
  }
}

describe('parseEligibility — Zod schema via DB path', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://mock'
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('parses a fully valid eligibility object', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [dbRow({
        grades: ['12'], schoolBoards: ['MHPSD'], specificSchools: [],
        targetInstitutions: ['University of Calgary'], fields: ['STEM'],
        minAverage: 80, minAge: null, maxAge: null, genderRequired: 'female',
        indigenousRequired: false, bipocRequired: false, financialNeed: false,
        maxFamilyIncome: 65000, fosterCare: false, citizenship: 'canadian',
        apprenticeship: false, extracurriculars: [],
      })] }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    const elig = result[0]?.eligibility
    expect(elig).not.toBeNull()
    expect(elig?.grades).toEqual(['12'])
    expect(elig?.minAverage).toBe(80)
    expect(elig?.citizenship).toBe('canadian')
    expect(elig?.genderRequired).toBe('female')
  })

  it('applies Zod defaults when eligibility fields are omitted', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [dbRow({})] }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    const elig = result[0]?.eligibility
    expect(elig?.grades).toEqual([])
    expect(elig?.minAverage).toBeNull()
    expect(elig?.citizenship).toBe('any')
    expect(elig?.indigenousRequired).toBe(false)
  })

  it('returns null for eligibility with invalid citizenship enum value', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [dbRow({ citizenship: 'martian' })] }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(result[0]?.eligibility).toBeNull()
  })

  it('returns null when eligibility field is null in DB row', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [dbRow(null)] }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(result[0]?.eligibility).toBeNull()
  })

  it('falls back to JSON when DB throws', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => { throw new Error('connection refused') } }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(s => s.eligibility === null)).toBe(true)
  })

  it('excludes inactive rows (active === false)', async () => {
    vi.doMock('./db/client', () => ({
      db: { select: () => ({ from: async () => [
        { ...dbRow(null), id: 1, active: true },
        { ...dbRow(null), id: 2, active: false },
      ] }) },
    }))
    vi.doMock('./db/schema', () => ({ scholarships: 'scholarships_table' }))

    const { loadScholarships } = await import('./data-loader')
    const result = await loadScholarships()
    expect(result.map(s => s.id)).toContain(1)
    expect(result.map(s => s.id)).not.toContain(2)
  })
})
