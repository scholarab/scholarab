import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getScholarshipStatus, getProgramStatus, PAGE_SIZE } from './useItems'
import type { ScholarshipWithMeta, ProgramWithMeta } from './useItems'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/tracker.ts', () => ({
  getSaved: vi.fn(() => []),
  toggleSaved: vi.fn((id: number) => [id]),
  getSavedPrograms: vi.fn(() => []),
  toggleSavedProgram: vi.fn((id: number) => [id]),
}))
vi.mock('../lib/utils.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/utils')>()
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
    _amount_cents: 1000,
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
})

// ── useScholarships hook ──────────────────────────────────────────────────────

describe('useScholarships', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2025-01-01T00:00:00').getTime()

  const active1 = makeScholarship({ id: 1, region: 'Medicine Hat', _deadline_ms: FUTURE_MS, _amount_cents: 2000 })
  const active2 = makeScholarship({ id: 2, region: 'Alberta',      _deadline_ms: FUTURE_MS + 86400000, _amount_cents: 500 })
  const national = makeScholarship({ id: 3, region: 'National',    _deadline_ms: FUTURE_MS + 172800000, _amount_cents: 5000 })
  const closed   = makeScholarship({ id: 4, region: null,           _deadline_ms: PAST_MS, _amount_cents: 1000 })
  const allItems = [active1, active2, national, closed]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes all scholarships (including closed) by default', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('includes all scholarships with no region filter', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('filters to Medicine Hat region', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).not.toContain(3)
  })

  it('filters to Alberta-wide region (includes provincial cities)', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Alberta-wide'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).not.toContain(3)
  })

  it('filters to National region', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('National'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(3)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
  })

  it('toggles region off when same region selected twice', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    act(() => result.current.setRegion('Medicine Hat'))
    expect(result.current.selectedRegion).toBeNull()
  })

  it('sorts by highest_pay descending within open scholarships, closed last', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    const items = result.current.filtered
    // closed items rank after all open ones regardless of amount
    expect(items[items.length - 1]!.id).toBe(4)
    const openAmounts = items.filter(s => s.id !== 4).map(s => s._amount_cents ?? 0)
    for (let i = 0; i < openAmounts.length - 1; i++) {
      expect(openAmounts[i]!).toBeGreaterThanOrEqual(openAmounts[i + 1]!)
    }
  })

  it('sorts by lowest_pay ascending within open scholarships, closed last', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('lowest_pay'))
    const items = result.current.filtered
    expect(items[items.length - 1]!.id).toBe(4)
    const openAmounts = items.filter(s => s.id !== 4).map(s => s._amount_cents ?? 0)
    for (let i = 0; i < openAmounts.length - 1; i++) {
      expect(openAmounts[i]!).toBeLessThanOrEqual(openAmounts[i + 1]!)
    }
  })

  it('amount sorts put unparseable amounts ("Varies" → 0) last within their group', async () => {
    const { useScholarships } = await import('./useItems')
    const varies = makeScholarship({ id: 20, amount: 'Varies', _amount_cents: 0, _deadline_ms: FUTURE_MS })
    const { result } = renderHook(() => useScholarships([varies, active1, active2]))
    act(() => result.current.setSort('lowest_pay'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids[ids.length - 1]).toBe(20)
  })

  it('filters Alberta-wide includes Red Deer', async () => {
    const { useScholarships } = await import('./useItems')
    const redDeer = makeScholarship({ id: 30, region: 'Red Deer', _deadline_ms: FUTURE_MS })
    const { result } = renderHook(() => useScholarships([redDeer, national]))
    act(() => result.current.setRegion('Alberta-wide'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(30)
    expect(ids).not.toContain(3)
  })

  it('clearFilters resets sort to default', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    act(() => result.current.clearFilters())
    expect(result.current.sortBy).toBe('closest_due')
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('category toggles off when selected twice', async () => {
    const { useScholarships } = await import('./useItems')
    const stem = makeScholarship({ id: 40, category: 'STEM', _deadline_ms: FUTURE_MS })
    const { result } = renderHook(() => useScholarships([stem, active1]))
    act(() => result.current.setCategory('STEM'))
    expect(result.current.selectedCategory).toBe('STEM')
    act(() => result.current.setCategory('STEM'))
    expect(result.current.selectedCategory).toBe('all')
  })

  it('closest_due sorts future scholarships by open date, not deadline', async () => {
    const { useScholarships } = await import('./useItems')
    const opensLater = makeScholarship({
      id: 50, openDate: '2026-10-01',
      _open_ms: new Date('2026-10-01T00:00:00').getTime(),
      _deadline_ms: new Date('2026-11-01T00:00:00').getTime(),
    })
    const opensSooner = makeScholarship({
      id: 51, openDate: '2026-08-01',
      _open_ms: new Date('2026-08-01T00:00:00').getTime(),
      _deadline_ms: new Date('2026-12-31T00:00:00').getTime(), // later deadline
    })
    const { result } = renderHook(() => useScholarships([opensLater, opensSooner]))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids.indexOf(51)).toBeLessThan(ids.indexOf(50))
  })

  it('sorts by closest_due: active before closed, active group ascending by deadline', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('closest_due'))
    const items = result.current.filtered
    const activeItems = items.filter(s => (s._deadline_ms ?? 0) > Date.now())
    const closedItems = items.filter(s => (s._deadline_ms ?? Infinity) < Date.now())
    // all active items appear before all closed items
    const lastActiveIdx = Math.max(...activeItems.map(s => items.indexOf(s)))
    const firstClosedIdx = Math.min(...closedItems.map(s => items.indexOf(s)))
    expect(lastActiveIdx).toBeLessThan(firstClosedIdx)
    // active group is ascending by deadline
    const activeDl = activeItems.map(s => s._deadline_ms ?? 0)
    for (let i = 0; i < activeDl.length - 1; i++) expect(activeDl[i]!).toBeLessThanOrEqual(activeDl[i + 1]!)
  })

  it('resets to page 1 when region changes', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('National'))
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 when sort changes', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    expect(result.current.page).toBe(1)
  })

  it('hasActiveFilters is false by default', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when region is set', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('hasActiveFilters is true when sort is not default', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('totalPages is at least 1 even with 0 results', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships([]))
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('paginates: visibleItems length does not exceed PAGE_SIZE', async () => {
    const { useScholarships } = await import('./useItems')
    const many = Array.from({ length: 40 }, (_, i) =>
      makeScholarship({ id: i + 1, _deadline_ms: FUTURE_MS + i * 1000 })
    )
    const { result } = renderHook(() => useScholarships(many))
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(PAGE_SIZE)
  })

  it('page advances visibleItems window', async () => {
    const { useScholarships } = await import('./useItems')
    const many = Array.from({ length: 40 }, (_, i) =>
      makeScholarship({ id: i + 1, _deadline_ms: FUTURE_MS + i * 1000 })
    )
    const { result } = renderHook(() => useScholarships(many))
    const page1Ids = result.current.visibleItems.map(s => s.id)
    act(() => result.current.handlePageChange(2))
    const page2Ids = result.current.visibleItems.map(s => s.id)
    expect(page1Ids).not.toEqual(page2Ids)
  })

  it('handleToggleSave updates savedIds', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.savedIds).toEqual([])
    act(() => result.current.handleToggleSave(1))
    expect(result.current.savedIds).toContain(1)
  })

  it('regionKey is empty string when no region selected', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.regionKey).toBe('')
  })

  it('regionKey reflects selected region', async () => {
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('National'))
    expect(result.current.regionKey).toBe('National')
  })

  it('default sort puts active scholarships before future ones', async () => {
    const futureOpen = makeScholarship({
      id: 10,
      openDate: '2027-01-01',
      _open_ms: new Date('2027-01-01T00:00:00').getTime(),
      _deadline_ms: FUTURE_MS + 9999999,
    })
    const { useScholarships } = await import('./useItems')
    const { result } = renderHook(() => useScholarships([futureOpen, active1]))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(10))
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

// ── usePrograms hook ──────────────────────────────────────────────────────────

describe('usePrograms', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2025-01-01T00:00:00').getTime()

  const scienceActive = makeProgram({ id: 1, category: 'Science',     deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
  const healthActive  = makeProgram({ id: 2, category: 'Health',      deadline: '2026-12-02', _deadline_ms: FUTURE_MS + 86400000 })
  const stemActive    = makeProgram({ id: 3, category: 'Engineering',  deadline: '2026-12-03', _deadline_ms: FUTURE_MS + 172800000 })
  const closedProg    = makeProgram({ id: 4, category: 'Science',      deadline: '2025-01-01', _deadline_ms: PAST_MS })
  const tbaProg       = makeProgram({ id: 5, category: 'Arts',         deadline: null })
  const allItems = [scienceActive, healthActive, stemActive, closedProg, tbaProg]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes closed programs by default', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    expect(result.current.filtered.map(p => p.id)).not.toContain(4)
  })

  it('includes active and tba programs by default', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(5)
  })

  it('filters by category', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).not.toContain(3)
  })

  it('toggles category off when same category selected twice', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    act(() => result.current.setCategory('Science'))
    expect(result.current.selectedCategory).toBe('all')
  })

  it('shows all when category is "all"', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    act(() => result.current.setCategory('all'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  it('active programs sort before tba programs by default', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    const filtered = result.current.filtered
    const firstTbaIndex = filtered.findIndex(p => p.deadline === null)
    const lastActiveIndex = filtered.findLastIndex(p =>
      p.deadline !== null && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' &&
      new Date(p.deadline + 'T00:00:00').getTime() > new Date('2026-04-05T00:00:00').getTime()
    )
    if (firstTbaIndex !== -1 && lastActiveIndex !== -1) {
      expect(lastActiveIndex).toBeLessThan(firstTbaIndex)
    }
  })

  it('resets to page 1 when category changes', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Health'))
    expect(result.current.page).toBe(1)
  })

  it('hasActiveFilters is false by default', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when category is set', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('totalPages is at least 1 with 0 results', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms([]))
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('visibleItems does not exceed PAGE_SIZE', async () => {
    const { usePrograms } = await import('./useItems')
    const many = Array.from({ length: 40 }, (_, i) =>
      makeProgram({ id: i + 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS + i * 1000 })
    )
    const { result } = renderHook(() => usePrograms(many))
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(PAGE_SIZE)
  })

  it('handleToggleSave updates savedIds', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    expect(result.current.savedIds).toEqual([])
    act(() => result.current.handleToggleSave(1))
    expect(result.current.savedIds).toContain(1)
  })

  it('sorts active programs by closest deadline', async () => {
    const { usePrograms } = await import('./useItems')
    const earlier = makeProgram({ id: 10, deadline: '2026-11-01', _deadline_ms: FUTURE_MS - 2592000000 })
    const later   = makeProgram({ id: 11, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    const { result } = renderHook(() => usePrograms([later, earlier]))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids.indexOf(10)).toBeLessThan(ids.indexOf(11))
  })

  it('categoryKey reflects current selected category', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Health'))
    expect(result.current.categoryKey).toBe('Health')
  })

  it('closest_due sort orders programs by ascending deadline regardless of status', async () => {
    const { usePrograms } = await import('./useItems')
    const early  = makeProgram({ id: 10, deadline: '2026-05-01', _deadline_ms: new Date('2026-05-01T00:00:00').getTime() })
    const mid    = makeProgram({ id: 11, deadline: '2026-08-01', _deadline_ms: new Date('2026-08-01T00:00:00').getTime() })
    const late   = makeProgram({ id: 12, deadline: '2026-12-01', _deadline_ms: new Date('2026-12-01T00:00:00').getTime() })
    const { result } = renderHook(() => usePrograms([late, early, mid]))
    act(() => result.current.setSort('closest_due'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids.indexOf(10)).toBeLessThan(ids.indexOf(11))
    expect(ids.indexOf(11)).toBeLessThan(ids.indexOf(12))
  })

  it('tba programs sort last (Infinity deadline)', async () => {
    const { usePrograms } = await import('./useItems')
    const withDeadline = makeProgram({ id: 20, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    const tba          = makeProgram({ id: 21, deadline: null })
    const { result } = renderHook(() => usePrograms([tba, withDeadline]))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids.indexOf(20)).toBeLessThan(ids.indexOf(21))
  })

  it('ongoing programs sort before tba but after dated deadlines', async () => {
    const { usePrograms } = await import('./useItems')
    const dated   = makeProgram({ id: 30, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    const ongoing = makeProgram({ id: 31, deadline: 'Ongoing' })
    const tba     = makeProgram({ id: 32, deadline: 'TBA' })
    const { result } = renderHook(() => usePrograms([tba, ongoing, dated]))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toEqual([30, 31, 32])
  })

  it('paid_first sort puts paid programs first, then by deadline', async () => {
    const { usePrograms } = await import('./useItems')
    const unpaidEarly = makeProgram({ id: 40, paid: false, deadline: '2026-08-01', _deadline_ms: new Date('2026-08-01T00:00:00').getTime() })
    const paidLate    = makeProgram({ id: 41, paid: true,  deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    const paidEarly   = makeProgram({ id: 42, paid: true,  deadline: '2026-09-01', _deadline_ms: new Date('2026-09-01T00:00:00').getTime() })
    const { result } = renderHook(() => usePrograms([unpaidEarly, paidLate, paidEarly]))
    act(() => result.current.setSort('paid_first'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toEqual([42, 41, 40])
  })

  it('name sort orders programs alphabetically', async () => {
    const { usePrograms } = await import('./useItems')
    const b = makeProgram({ id: 50, name: 'Beta Program' })
    const a = makeProgram({ id: 51, name: 'Alpha Program' })
    const { result } = renderHook(() => usePrograms([b, a]))
    act(() => result.current.setSort('name'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toEqual([51, 50])
  })

  it('clearFilters resets program sort to default', async () => {
    const { usePrograms } = await import('./useItems')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setSort('name'))
    expect(result.current.hasActiveFilters).toBe(true)
    act(() => result.current.clearFilters())
    expect(result.current.sortBy).toBe('closest_due')
    expect(result.current.hasActiveFilters).toBe(false)
  })
})
