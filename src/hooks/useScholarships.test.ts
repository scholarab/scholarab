import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getStatus, PAGE_SIZE } from './useScholarships'
import type { ScholarshipWithMeta } from './useScholarships'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('../lib/tracker.ts', () => ({
  getSaved: vi.fn(() => []),
  toggleSaved: vi.fn((id: number) => [id]),
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

const TODAY_MS = new Date('2026-04-05T00:00:00').setHours(0, 0, 0, 0)

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

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('getStatus', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2026-03-01T00:00:00').getTime()

  it('returns active when deadline is in the future', () => {
    const s = makeScholarship({ id: 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    expect(getStatus(s)).toBe('active')
  })

  it('returns closed when deadline has passed', () => {
    const s = makeScholarship({ id: 1, deadline: '2026-03-01', _deadline_ms: PAST_MS })
    expect(getStatus(s)).toBe('closed')
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
    expect(getStatus(s)).toBe('future')
  })

  it('returns active when openDate is null and deadline is future', () => {
    const s = makeScholarship({ id: 1, openDate: null, _open_ms: undefined, _deadline_ms: FUTURE_MS })
    expect(getStatus(s)).toBe('active')
  })

  it('prefers _deadline_ms over parsing deadline string', () => {
    // deadline string is in the past, _deadline_ms is in the future
    const s = makeScholarship({ id: 1, deadline: '2025-01-01', _deadline_ms: FUTURE_MS })
    expect(getStatus(s)).toBe('active')
  })

  it('prefers _open_ms over parsing openDate string', () => {
    const FUTURE_OPEN = new Date('2026-12-01T00:00:00').getTime()
    const FUTURE_DEAD = new Date('2027-01-01T00:00:00').getTime()
    const s = makeScholarship({
      id: 1,
      openDate: '2020-01-01', // old string
      _open_ms: FUTURE_OPEN,  // _open_ms says future
      _deadline_ms: FUTURE_DEAD,
    })
    expect(getStatus(s)).toBe('future')
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

  it('excludes closed scholarships by default', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).not.toContain(4)
  })

  it('includes all non-closed scholarships with no region filter', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  it('filters to Medicine Hat region', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).not.toContain(3)
  })

  it('filters to Alberta-wide region (includes provincial cities)', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Alberta-wide'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(1) // Medicine Hat ∈ PROVINCIAL_REGIONS
    expect(ids).toContain(2) // Alberta ∈ PROVINCIAL_REGIONS
    expect(ids).not.toContain(3) // National excluded
  })

  it('filters to National region', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('National'))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids).toContain(3)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
  })

  it('toggles region off when same region selected twice', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    act(() => result.current.setRegion('Medicine Hat'))
    expect(result.current.selectedRegion).toBeNull()
  })

  it('sorts by highest_pay descending', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    const amounts = result.current.filtered.map(s => s._amount_cents ?? 0)
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]!).toBeGreaterThanOrEqual(amounts[i + 1]!)
    }
  })

  it('sorts by lowest_pay ascending', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('lowest_pay'))
    const amounts = result.current.filtered.map(s => s._amount_cents ?? 0)
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]!).toBeLessThanOrEqual(amounts[i + 1]!)
    }
  })

  it('sorts by closest_due ascending', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('closest_due'))
    const deadlines = result.current.filtered.map(s => s._deadline_ms ?? 0)
    for (let i = 0; i < deadlines.length - 1; i++) {
      expect(deadlines[i]!).toBeLessThanOrEqual(deadlines[i + 1]!)
    }
  })

  it('resets to page 1 when region changes', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('National'))
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 when sort changes', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    expect(result.current.page).toBe(1)
  })

  it('hasActiveFilters is false by default', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when region is set', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setRegion('Medicine Hat'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('hasActiveFilters is true when sort is not default', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    act(() => result.current.setSort('highest_pay'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('totalPages is at least 1 even with 0 results', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships([]))
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('paginates: visibleItems length does not exceed PAGE_SIZE', async () => {
    const { useScholarships } = await import('./useScholarships')
    const many = Array.from({ length: 40 }, (_, i) =>
      makeScholarship({ id: i + 1, _deadline_ms: FUTURE_MS + i * 1000 })
    )
    const { result } = renderHook(() => useScholarships(many))
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(PAGE_SIZE)
  })

  it('page advances visibleItems window', async () => {
    const { useScholarships } = await import('./useScholarships')
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
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.savedIds).toEqual([])
    act(() => result.current.handleToggleSave(1))
    expect(result.current.savedIds).toContain(1)
  })

  it('regionKey is empty string when no region selected', async () => {
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships(allItems))
    expect(result.current.regionKey).toBe('')
  })

  it('regionKey reflects selected region', async () => {
    const { useScholarships } = await import('./useScholarships')
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
    const { useScholarships } = await import('./useScholarships')
    const { result } = renderHook(() => useScholarships([futureOpen, active1]))
    const ids = result.current.filtered.map(s => s.id)
    expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(10))
  })
})
