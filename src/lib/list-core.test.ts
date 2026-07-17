import { describe, it, expect, vi } from 'vitest'
import { getScholarshipStatus, getProgramStatus, programMatchesGrade } from './list-core'
import type { ScholarshipWithMeta, ProgramWithMeta } from './list-core'

vi.mock('./utils.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('./utils')>()
  return {
    ...real,
    getToday: () => {
      const d = new Date('2026-04-05T00:00:00')
      d.setHours(0, 0, 0, 0)
      return d
    },
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScholarship(
  overrides: Partial<ScholarshipWithMeta> & { id: number },
): ScholarshipWithMeta {
  return {
    title: `Scholarship ${overrides.id}`,
    amount: '$1,000',
    deadline: null,
    openDate: null,
    audience: null,
    url: 'https://example.com',
    category: null,
    lastVerified: null,
    region: null,
    notes: null,
    applyViaGuidance: false,
    active: true,
    eligibility: null,
    _deadline_ms: 0,
    _amount: 1000,
    ...overrides,
  }
}

function makeProgram(
  overrides: Partial<ProgramWithMeta> & { id: number },
): ProgramWithMeta {
  return {
    name: `Program ${overrides.id}`,
    emoji: null,
    category: 'Science',
    provider: null,
    grades: null,
    duration: null,
    paid: false,
    stipend: null,
    location: null,
    eligibility: null,
    deadline: null,
    url: 'https://example.com',
    description: null,
    lastVerified: null,
    active: true,
    ...overrides,
  }
}

// ── getScholarshipStatus ──────────────────────────────────────────────────────

describe('getScholarshipStatus', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2026-03-01T00:00:00').getTime()

  it('returns active when deadline is in the future', () => {
    const s = makeScholarship({ id: 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    expect(getScholarshipStatus(s)).toBe('active')
  })

  it('returns closed when deadline has passed', () => {
    const s = makeScholarship({ id: 1, deadline: '2026-03-01', _deadline_ms: PAST_MS })
    expect(getScholarshipStatus(s)).toBe('closed')
  })

  it('returns future when openDate is in the future', () => {
    const FUTURE_OPEN = new Date('2026-09-01T00:00:00').getTime()
    const s = makeScholarship({
      id: 1,
      openDate: '2026-09-01',
      deadline: '2026-12-31',
      _open_ms: FUTURE_OPEN,
      _deadline_ms: FUTURE_MS,
    })
    expect(getScholarshipStatus(s)).toBe('future')
  })

  it('returns active when openDate is null and deadline is future', () => {
    const s = makeScholarship({ id: 1, openDate: null, _open_ms: undefined, _deadline_ms: FUTURE_MS })
    expect(getScholarshipStatus(s)).toBe('active')
  })

  it('prefers _deadline_ms over parsing deadline string', () => {
    const s = makeScholarship({ id: 1, deadline: '2025-01-01', _deadline_ms: FUTURE_MS })
    expect(getScholarshipStatus(s)).toBe('active')
  })

  it('prefers _open_ms over parsing openDate string', () => {
    const FUTURE_OPEN = new Date('2026-12-01T00:00:00').getTime()
    const FUTURE_DEAD = new Date('2027-01-01T00:00:00').getTime()
    const s = makeScholarship({
      id: 1,
      openDate: '2020-01-01',
      _open_ms: FUTURE_OPEN,
      _deadline_ms: FUTURE_DEAD,
    })
    expect(getScholarshipStatus(s)).toBe('future')
  })

  it('treats _deadline_ms of 0 with no deadline string as "no deadline" (active, not closed)', () => {
    const s = makeScholarship({ id: 1, deadline: null, _deadline_ms: 0 })
    expect(getScholarshipStatus(s)).toBe('active')
  })
})

// ── getProgramStatus ──────────────────────────────────────────────────────────

describe('getProgramStatus', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2026-03-01T00:00:00').getTime()

  it('returns tba when deadline is null', () => {
    expect(getProgramStatus(makeProgram({ id: 1, deadline: null }))).toBe('tba')
  })

  it('returns tba when deadline is "TBA"', () => {
    expect(getProgramStatus(makeProgram({ id: 1, deadline: 'TBA' }))).toBe('tba')
  })

  it('returns tba when deadline is "Ongoing"', () => {
    expect(getProgramStatus(makeProgram({ id: 1, deadline: 'Ongoing' }))).toBe('tba')
  })

  it('returns active when deadline is in the future', () => {
    const p = makeProgram({ id: 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    expect(getProgramStatus(p)).toBe('active')
  })

  it('returns closed when deadline has passed', () => {
    const p = makeProgram({ id: 1, deadline: '2026-03-01', _deadline_ms: PAST_MS })
    expect(getProgramStatus(p)).toBe('closed')
  })

  it('uses _deadline_ms when provided (prefers over string parsing)', () => {
    const p = makeProgram({ id: 1, deadline: '2025-01-01', _deadline_ms: FUTURE_MS })
    expect(getProgramStatus(p)).toBe('active')
  })

  it('parses deadline string when _deadline_ms is undefined', () => {
    const p = makeProgram({ id: 1, deadline: '2026-12-01', _deadline_ms: undefined })
    expect(getProgramStatus(p)).toBe('active')
  })
})

// ── programMatchesGrade ───────────────────────────────────────────────────────

describe('programMatchesGrade', () => {
  it('matches en-dash and hyphen ranges', () => {
    expect(programMatchesGrade('Grades 9–12', 10)).toBe(true)
    expect(programMatchesGrade('9-12', 9)).toBe(true)
    expect(programMatchesGrade('Grades 10–12', 9)).toBe(false)
  })

  it('matches single grades', () => {
    expect(programMatchesGrade('Grade 11', 11)).toBe(true)
    expect(programMatchesGrade('Grade 11', 12)).toBe(false)
    expect(programMatchesGrade('Grade 12 (graduating)', 12)).toBe(true)
  })

  it('treats non-grade text as inclusive', () => {
    expect(programMatchesGrade('High school', 9)).toBe(true)
    expect(programMatchesGrade('Ages 15–22', 10)).toBe(true)
    expect(programMatchesGrade(null, 12)).toBe(true)
  })

  it('prefers the grade range over a trailing age range', () => {
    expect(programMatchesGrade('Grades 9–12 (ages 13–18)', 9)).toBe(true)
    expect(programMatchesGrade('Grades 10–11 (ages 15–17)', 12)).toBe(false)
  })
})
