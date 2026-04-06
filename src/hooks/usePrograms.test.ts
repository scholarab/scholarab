import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getStatus, PAGE_SIZE } from './usePrograms'
import type { ProgramWithMeta } from './usePrograms'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('../lib/tracker.ts', () => ({
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

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('getStatus', () => {
  const FUTURE_MS = new Date('2026-12-01T00:00:00').getTime()
  const PAST_MS   = new Date('2026-03-01T00:00:00').getTime()

  it('returns tba when deadline is null', () => {
    expect(getStatus(makeProgram({ id: 1, deadline: null }))).toBe('tba')
  })

  it('returns tba when deadline is "TBA"', () => {
    expect(getStatus(makeProgram({ id: 1, deadline: 'TBA' }))).toBe('tba')
  })

  it('returns tba when deadline is "Ongoing"', () => {
    expect(getStatus(makeProgram({ id: 1, deadline: 'Ongoing' }))).toBe('tba')
  })

  it('returns active when deadline is in the future', () => {
    const p = makeProgram({ id: 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS })
    expect(getStatus(p)).toBe('active')
  })

  it('returns closed when deadline has passed', () => {
    const p = makeProgram({ id: 1, deadline: '2026-03-01', _deadline_ms: PAST_MS })
    expect(getStatus(p)).toBe('closed')
  })

  it('uses _deadline_ms when provided (prefers over string parsing)', () => {
    // String says past, _deadline_ms says future
    const p = makeProgram({ id: 1, deadline: '2025-01-01', _deadline_ms: FUTURE_MS })
    expect(getStatus(p)).toBe('active')
  })

  it('parses deadline string when _deadline_ms is undefined', () => {
    const p = makeProgram({ id: 1, deadline: '2026-12-01', _deadline_ms: undefined })
    expect(getStatus(p)).toBe('active')
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
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    expect(result.current.filtered.map(p => p.id)).not.toContain(4)
  })

  it('includes active and tba programs by default', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(5)
  })

  it('filters by category', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).not.toContain(3)
  })

  it('toggles category off when same category selected twice', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    act(() => result.current.setCategory('Science'))
    expect(result.current.selectedCategory).toBe('all')
  })

  it('shows all when category is "all"', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    act(() => result.current.setCategory('all'))
    const ids = result.current.filtered.map(p => p.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  it('active programs sort before tba programs in featured sort', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    const active = result.current.filtered.filter(p => p.deadline !== null)
    const tba    = result.current.filtered.filter(p => p.deadline === null)
    // All active should appear before tba in the list
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
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Health'))
    expect(result.current.page).toBe(1)
  })

  it('hasActiveFilters is false by default', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when category is set', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms(allItems))
    act(() => result.current.setCategory('Science'))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('totalPages is at least 1 with 0 results', async () => {
    const { usePrograms } = await import('./usePrograms')
    const { result } = renderHook(() => usePrograms([]))
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('visibleItems does not exceed PAGE_SIZE', async () => {
    const { usePrograms } = await import('./usePrograms')
    const many = Array.from({ length: 40 }, (_, i) =>
      makeProgram({ id: i + 1, deadline: '2026-12-01', _deadline_ms: FUTURE_MS + i * 1000 })
    )
    const { result } = renderHook(() => usePrograms(many))
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(PAGE_SIZE)
  })
})
