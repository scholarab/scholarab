import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ItemList from '../components/ItemList'
import type { ScholarshipWithMeta } from '../hooks/useScholarships'
import type { ProgramWithMeta } from '../hooks/usePrograms'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('vaul', () => ({
  Drawer: {
    Root:    ({ children }: any) => <>{children}</>,
    Portal:  ({ children }: any) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: any) => <div>{children}</div>,
  },
}))

vi.mock('../components/ScholarshipCard', () => ({
  default: ({ scholarship }: any) => (
    <div data-testid="scholarship-card">{scholarship.title}</div>
  ),
}))

vi.mock('../components/ProgramCard', () => ({
  default: ({ program }: any) => (
    <div data-testid="program-card">{program.name}</div>
  ),
}))

vi.mock('../components/Pagination', () => ({
  default: () => null,
}))

const mockUseScholarships = vi.fn()
const mockUsePrograms     = vi.fn()

vi.mock('../hooks/useScholarships.ts', () => ({
  useScholarships: (...args: any[]) => mockUseScholarships(...args),
}))

vi.mock('../hooks/usePrograms.ts', () => ({
  usePrograms: (...args: any[]) => mockUsePrograms(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeScholarship(id: number, title = `Scholarship ${id}`): ScholarshipWithMeta {
  return {
    id, title,
    amount: '$500', deadline: '2025-12-31', openDate: null,
    audience: null, url: 'https://example.com',
    category: 'Academic', lastVerified: null, region: null,
    notes: null, applyViaGuidance: false, active: true, eligibility: null,
  }
}

function makeProgram(id: number, name = `Program ${id}`): ProgramWithMeta {
  return {
    id, name,
    emoji: null, category: 'STEM', provider: 'Test Org',
    grades: null, duration: null, paid: false, stipend: null,
    location: null, eligibility: null, deadline: '2025-12-31',
    url: 'https://example.com', description: null,
    lastVerified: null, active: true,
  }
}

function makeSchHookReturn(items: ScholarshipWithMeta[], extra: Partial<ReturnType<typeof mockUseScholarships>> = {}) {
  return {
    filtered: items,
    visibleItems: items,
    page: 1,
    totalPages: 1,
    handlePageChange: vi.fn(),
    sortBy: 'closest_due',
    setSort: vi.fn(),
    selectedRegion: null,
    setRegion: vi.fn(),
    sheetOpen: false,
    setSheetOpen: vi.fn(),
    selectedCategory: 'all',
    setCategory: vi.fn(),
    hasActiveFilters: false,
    regionKey: '',
    categoryKey: 'all',
    savedIds: [],
    handleToggleSave: vi.fn(),
    isFiltered: false,
    ...extra,
  }
}

function makePrgHookReturn(items: ProgramWithMeta[], extra: Partial<ReturnType<typeof mockUsePrograms>> = {}) {
  return {
    filtered: items,
    visibleItems: items,
    page: 1,
    totalPages: 1,
    handlePageChange: vi.fn(),
    sortBy: 'closest_due',
    setSort: vi.fn(),
    selectedCategory: 'all',
    setCategory: vi.fn(),
    sheetOpen: false,
    setSheetOpen: vi.fn(),
    hasActiveFilters: false,
    categoryKey: 'all',
    savedIds: [],
    handleToggleSave: vi.fn(),
    isFiltered: false,
    ...extra,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

afterEach(() => cleanup())
beforeEach(() => {
  vi.clearAllMocks()
  mockUseScholarships.mockReturnValue(makeSchHookReturn([]))
  mockUsePrograms.mockReturnValue(makePrgHookReturn([]))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ItemList — scholarship mode', () => {
  it('renders a ScholarshipCard for each item', () => {
    const items = [makeScholarship(1), makeScholarship(2), makeScholarship(3)]
    mockUseScholarships.mockReturnValue(makeSchHookReturn(items))
    render(<ItemList mode="scholarship" items={items} />)
    expect(screen.getAllByTestId('scholarship-card')).toHaveLength(3)
  })

  it('shows scholarship titles inside cards', () => {
    const items = [makeScholarship(1, 'Alpha Award')]
    mockUseScholarships.mockReturnValue(makeSchHookReturn(items))
    render(<ItemList mode="scholarship" items={items} />)
    expect(screen.getByText('Alpha Award')).toBeTruthy()
  })

  it('shows the filtered count in the live region', () => {
    const items = [makeScholarship(1), makeScholarship(2)]
    mockUseScholarships.mockReturnValue(makeSchHookReturn(items))
    render(<ItemList mode="scholarship" items={items} />)
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain('2 scholarships shown')
  })

  it('shows empty state when filtered list is empty', () => {
    mockUseScholarships.mockReturnValue(makeSchHookReturn([]))
    render(<ItemList mode="scholarship" items={[]} />)
    expect(screen.getByText('No scholarships match your filters.')).toBeTruthy()
  })

  it('does not render program cards in scholarship mode', () => {
    const items = [makeScholarship(1)]
    mockUseScholarships.mockReturnValue(makeSchHookReturn(items))
    render(<ItemList mode="scholarship" items={items} />)
    expect(screen.queryAllByTestId('program-card')).toHaveLength(0)
  })
})

describe('ItemList — program mode', () => {
  it('renders a ProgramCard for each item', () => {
    const items = [makeProgram(1), makeProgram(2)]
    mockUsePrograms.mockReturnValue(makePrgHookReturn(items))
    render(<ItemList mode="program" items={items} />)
    expect(screen.getAllByTestId('program-card')).toHaveLength(2)
  })

  it('shows program names inside cards', () => {
    const items = [makeProgram(1, 'Beta Lab')]
    mockUsePrograms.mockReturnValue(makePrgHookReturn(items))
    render(<ItemList mode="program" items={items} />)
    expect(screen.getByText('Beta Lab')).toBeTruthy()
  })

  it('shows the filtered count in the live region', () => {
    const items = [makeProgram(1)]
    mockUsePrograms.mockReturnValue(makePrgHookReturn(items))
    render(<ItemList mode="program" items={items} />)
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain('1 program shown')
  })

  it('shows empty state when filtered list is empty', () => {
    mockUsePrograms.mockReturnValue(makePrgHookReturn([]))
    render(<ItemList mode="program" items={[]} />)
    expect(screen.getByText('No programs match your filters.')).toBeTruthy()
  })

  it('does not render scholarship cards in program mode', () => {
    const items = [makeProgram(1)]
    mockUsePrograms.mockReturnValue(makePrgHookReturn(items))
    render(<ItemList mode="program" items={items} />)
    expect(screen.queryAllByTestId('scholarship-card')).toHaveLength(0)
  })
})

describe('ItemList — filter button', () => {
  it('mobile filter button has accessible label', () => {
    mockUseScholarships.mockReturnValue(makeSchHookReturn([]))
    render(<ItemList mode="scholarship" items={[]} />)
    expect(screen.getByRole('button', { name: 'Open filters' })).toBeTruthy()
  })

  it('mobile filter button calls setSheetOpen when clicked', () => {
    const setSheetOpen = vi.fn()
    mockUseScholarships.mockReturnValue(makeSchHookReturn([], { setSheetOpen }))
    render(<ItemList mode="scholarship" items={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(setSheetOpen).toHaveBeenCalledWith(true)
  })
})
