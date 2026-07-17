import { describe, it, expect, vi } from 'vitest'
import {
  getScholarshipStatus, getProgramStatus, programMatchesGrade,
  filterSortScholarships, filterSortPrograms, scholarshipDayChip,
} from './list-core'
import type { ScholarshipWithMeta, ProgramWithMeta, ScholarshipFilterState, ProgramFilterState } from './list-core'

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

// ── filterSortScholarships ────────────────────────────────────────────────────

describe('filterSortScholarships', () => {
  // getToday is mocked to 2026-04-05
  const FUTURE_MS  = new Date('2026-12-01T00:00:00').getTime()
  const FUTURE2_MS = new Date('2026-06-01T00:00:00').getTime()
  const PAST_MS    = new Date('2026-01-01T00:00:00').getTime()
  const PAST2_MS   = new Date('2026-03-01T00:00:00').getTime()
  const OPEN_SOON  = new Date('2026-09-01T00:00:00').getTime()
  const OPEN_LATER = new Date('2026-10-01T00:00:00').getTime()

  const state = (over: Partial<ScholarshipFilterState> = {}): ScholarshipFilterState => ({
    statusFilter: 'all', selectedCategory: 'all', selectedRegion: null, searchQuery: '', sortBy: 'closest_due', ...over,
  })
  const ids = (r: ScholarshipWithMeta[]) => r.map(s => s.id)

  it('includes all statuses by default, active first then future then closed', () => {
    const items = [
      makeScholarship({ id: 1, _deadline_ms: PAST_MS, deadline: '2026-01-01' }),
      makeScholarship({ id: 2, _deadline_ms: FUTURE_MS, deadline: '2026-12-01' }),
      makeScholarship({ id: 3, _open_ms: OPEN_SOON, _deadline_ms: FUTURE_MS, openDate: '2026-09-01' }),
    ]
    expect(ids(filterSortScholarships(items, state()))).toEqual([2, 3, 1])
  })

  it('status pools: active / opening / closed', () => {
    const items = [
      makeScholarship({ id: 1, _deadline_ms: PAST_MS, deadline: '2026-01-01' }),
      makeScholarship({ id: 2, _deadline_ms: FUTURE_MS, deadline: '2026-12-01' }),
      makeScholarship({ id: 3, _open_ms: OPEN_SOON, _deadline_ms: FUTURE_MS, openDate: '2026-09-01' }),
    ]
    expect(ids(filterSortScholarships(items, state({ statusFilter: 'active' })))).toEqual([2])
    expect(ids(filterSortScholarships(items, state({ statusFilter: 'opening' })))).toEqual([3])
    expect(ids(filterSortScholarships(items, state({ statusFilter: 'closed' })))).toEqual([1])
  })

  it('region filters: Medicine Hat exact, Alberta-wide includes provincial cities, National exact', () => {
    const items = [
      makeScholarship({ id: 1, region: 'Medicine Hat', _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 2, region: 'Red Deer', _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 3, region: 'National', _deadline_ms: FUTURE_MS }),
    ]
    expect(ids(filterSortScholarships(items, state({ selectedRegion: 'Medicine Hat' })))).toEqual([1])
    expect(ids(filterSortScholarships(items, state({ selectedRegion: 'Alberta-wide' })))).toEqual([1, 2])
    expect(ids(filterSortScholarships(items, state({ selectedRegion: 'National' })))).toEqual([3])
  })

  it('search matches title, audience, and category', () => {
    const items = [
      makeScholarship({ id: 1, title: 'Quantum Award', _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 2, audience: 'future quantum engineers', _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 3, category: 'Quantum Studies', _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 4, _deadline_ms: FUTURE_MS }),
    ]
    expect(ids(filterSortScholarships(items, state({ searchQuery: 'quantum' })))).toEqual([1, 2, 3])
  })

  it('highest_pay sorts descending; unparseable ("Varies" → 0) amounts go last', () => {
    const items = [
      makeScholarship({ id: 1, _amount: 500, _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 2, _amount: 0, _deadline_ms: FUTURE_MS }),
      makeScholarship({ id: 3, _amount: 2000, _deadline_ms: FUTURE_MS }),
    ]
    expect(ids(filterSortScholarships(items, state({ sortBy: 'highest_pay' })))).toEqual([3, 1, 2])
    expect(ids(filterSortScholarships(items, state({ sortBy: 'lowest_pay' })))).toEqual([1, 3, 2])
  })

  it('closest_due: active by deadline asc, future by open date asc, closed most-recent first', () => {
    const items = [
      makeScholarship({ id: 1, _deadline_ms: FUTURE_MS, deadline: '2026-12-01' }),
      makeScholarship({ id: 2, _deadline_ms: FUTURE2_MS, deadline: '2026-06-01' }),
      makeScholarship({ id: 3, _open_ms: OPEN_LATER, _deadline_ms: FUTURE_MS, openDate: '2026-10-01' }),
      makeScholarship({ id: 4, _open_ms: OPEN_SOON, _deadline_ms: FUTURE_MS, openDate: '2026-09-01' }),
      makeScholarship({ id: 5, _deadline_ms: PAST_MS, deadline: '2026-01-01' }),
      makeScholarship({ id: 6, _deadline_ms: PAST2_MS, deadline: '2026-03-01' }),
    ]
    expect(ids(filterSortScholarships(items, state()))).toEqual([2, 1, 4, 3, 6, 5])
  })

  it('a _deadline_ms of 0 with no deadline string stays active and sorts last among active', () => {
    const items = [
      makeScholarship({ id: 1, deadline: null, _deadline_ms: 0 }),
      makeScholarship({ id: 2, _deadline_ms: FUTURE_MS, deadline: '2026-12-01' }),
    ]
    expect(ids(filterSortScholarships(items, state()))).toEqual([2, 1])
  })
})

// ── scholarshipDayChip ────────────────────────────────────────────────────────

describe('scholarshipDayChip', () => {
  it('returns CLOSED for expired listings', () => {
    const s = makeScholarship({ id: 1, deadline: '2026-01-01', _deadline_ms: new Date('2026-01-01T00:00:00').getTime() })
    expect(scholarshipDayChip(s)).toEqual({ label: 'CLOSED', cls: 'sabl-days neutral' })
  })

  it('returns OPENS date for future listings', () => {
    const s = makeScholarship({
      id: 1, openDate: '2026-09-01', deadline: '2026-12-01',
      _open_ms: new Date('2026-09-01T00:00:00').getTime(),
      _deadline_ms: new Date('2026-12-01T00:00:00').getTime(),
    })
    expect(scholarshipDayChip(s)).toEqual({ label: 'OPENS SEP 1', cls: 'sabl-days neutral' })
  })

  it('returns days-left with urgent class inside 7 days', () => {
    // getToday mock = 2026-04-05; deadline 2026-04-08 → 3 days
    const s = makeScholarship({ id: 1, deadline: '2026-04-08', _deadline_ms: new Date('2026-04-08T00:00:00').getTime() })
    expect(scholarshipDayChip(s)).toEqual({ label: '3 DAYS LEFT', cls: 'sabl-days urgent' })
  })

  it('returns DUE TODAY on the deadline day and null with no deadline', () => {
    const today = makeScholarship({ id: 1, deadline: '2026-04-05', _deadline_ms: new Date('2026-04-05T00:00:00').getTime() })
    expect(scholarshipDayChip(today)).toEqual({ label: 'DUE TODAY', cls: 'sabl-days urgent' })
    expect(scholarshipDayChip(makeScholarship({ id: 2, deadline: null, _deadline_ms: 0 }))).toBeNull()
  })
})

// ── filterSortPrograms ────────────────────────────────────────────────────────

describe('filterSortPrograms', () => {
  const FUTURE_MS  = new Date('2026-12-01T00:00:00').getTime()
  const FUTURE2_MS = new Date('2026-06-01T00:00:00').getTime()
  const PAST_MS    = new Date('2026-01-01T00:00:00').getTime()

  const state = (over: Partial<ProgramFilterState> = {}): ProgramFilterState => ({
    selectedCategory: 'all', gradeFilter: null, searchQuery: '', sortBy: 'closest_due', ...over,
  })
  const ids = (r: ProgramWithMeta[]) => r.map(p => p.id)

  it('always excludes closed programs', () => {
    const items = [
      makeProgram({ id: 1, deadline: '2026-01-01', _deadline_ms: PAST_MS }),
      makeProgram({ id: 2, deadline: '2026-12-01', _deadline_ms: FUTURE_MS }),
      makeProgram({ id: 3, deadline: 'TBA' }),
    ]
    expect(ids(filterSortPrograms(items, state()))).toEqual([2, 3])
  })

  it('closest_due orders dated asc, then Ongoing, then TBA', () => {
    const items = [
      makeProgram({ id: 1, deadline: 'TBA' }),
      makeProgram({ id: 2, deadline: '2026-12-01', _deadline_ms: FUTURE_MS }),
      makeProgram({ id: 3, deadline: 'Ongoing' }),
      makeProgram({ id: 4, deadline: '2026-06-01', _deadline_ms: FUTURE2_MS }),
    ]
    expect(ids(filterSortPrograms(items, state()))).toEqual([4, 2, 3, 1])
  })

  it('paid_first puts paid programs first, then by deadline', () => {
    const items = [
      makeProgram({ id: 1, deadline: '2026-06-01', _deadline_ms: FUTURE2_MS }),
      makeProgram({ id: 2, paid: true, deadline: '2026-12-01', _deadline_ms: FUTURE_MS }),
      makeProgram({ id: 3, paid: true, deadline: '2026-06-01', _deadline_ms: FUTURE2_MS }),
    ]
    expect(ids(filterSortPrograms(items, state({ sortBy: 'paid_first' })))).toEqual([3, 2, 1])
  })

  it('name sort is alphabetical', () => {
    const items = [
      makeProgram({ id: 1, name: 'Zebra Lab' }),
      makeProgram({ id: 2, name: 'Alpha Camp' }),
    ]
    expect(ids(filterSortPrograms(items, state({ sortBy: 'name' })))).toEqual([2, 1])
  })

  it('category and grade filters combine; search matches name/provider/description/category', () => {
    const items = [
      makeProgram({ id: 1, category: 'Science', grades: 'Grades 9–10' }),
      makeProgram({ id: 2, category: 'Science', grades: 'Grades 11–12' }),
      makeProgram({ id: 3, category: 'Arts', grades: null }),
      makeProgram({ id: 4, category: 'Arts', provider: 'Quantum University' }),
    ]
    expect(ids(filterSortPrograms(items, state({ selectedCategory: 'Science', gradeFilter: 12 })))).toEqual([2])
    expect(ids(filterSortPrograms(items, state({ searchQuery: 'quantum' })))).toEqual([4])
  })
})
