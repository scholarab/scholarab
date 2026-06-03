import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ScholarshipCard } from '../components/ItemCard'
import type { ScholarshipWithMeta } from '../hooks/useItems'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/useCardEntrance.ts', () => ({ useCardEntrance: vi.fn() }))

const { mockShowToast, mockShowConfetti } = vi.hoisted(() => ({
  mockShowToast:    vi.fn(),
  mockShowConfetti: vi.fn(),
}))

vi.mock('../lib/utils.ts', () => ({
  getToday:       () => new Date('2025-06-15T00:00:00'),
  generateSlug:   (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
  formatDeadline: (s: string | null | undefined) => s ?? '',
  showToast:      mockShowToast,
  showConfetti:   mockShowConfetti,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScholarship(overrides: Partial<ScholarshipWithMeta> & { id: number }): ScholarshipWithMeta {
  return {
    title: 'Test Scholarship',
    amount: '$1,000',
    deadline: '2025-12-31',
    openDate: null,
    audience: 'Grade 12 students',
    url: 'https://example.com',
    category: 'Academic',
    lastVerified: null,
    region: null,
    notes: null,
    applyViaGuidance: false,
    active: true,
    eligibility: null,
    ...overrides,
  }
}

function renderCard(
  scholarshipOverrides: Partial<ScholarshipWithMeta> & { id: number },
  propOverrides: { isSaved?: boolean; onToggleSave?: () => void } = {}
) {
  const scholarship = makeScholarship(scholarshipOverrides)
  return render(
    <ScholarshipCard
      scholarship={scholarship}
      index={0}
      isSaved={propOverrides.isSaved ?? false}
      onToggleSave={propOverrides.onToggleSave ?? vi.fn()}
      isFiltered={false}
      isInitial={true}
    />
  )
}

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScholarshipCard — rendering', () => {
  it('renders the scholarship title', () => {
    renderCard({ id: 1 })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Test Scholarship')
  })

  it('renders the amount', () => {
    renderCard({ id: 1 })
    expect(screen.getByText('$1,000')).toBeTruthy()
  })

  it('renders the audience', () => {
    renderCard({ id: 1 })
    expect(screen.getAllByText('Grade 12 students').length).toBeGreaterThan(0)
  })

  it('renders the category badge', () => {
    renderCard({ id: 1, category: 'Academic' })
    expect(screen.getByText('Academic')).toBeTruthy()
  })

  it('View Details link points to generated slug', () => {
    renderCard({ id: 1, title: 'My Award' })
    const link = screen.getByRole('link', { name: /view details/i }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/scholarships/my-award')
  })

  it('View Details link uses _slug when provided', () => {
    renderCard({ id: 1, _slug: 'custom-slug' })
    const link = screen.getByRole('link', { name: /view details/i }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/scholarships/custom-slug')
  })
})

describe('ScholarshipCard — status', () => {
  it('card links to detail page for active scholarship', () => {
    // deadline in future, openDate null → active
    renderCard({ id: 1, deadline: '2025-12-31', openDate: null })
    const link = screen.getByRole('link', { name: /view details/i }) as HTMLAnchorElement
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toContain('/scholarships/')
  })

  it('shows Opens label for future scholarship', () => {
    // openDate in future → future
    renderCard({ id: 1, openDate: '2025-09-01' })
    expect(screen.getByText('Opens')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /apply/i })).toBeNull()
  })

  it('hides Apply Now for closed scholarship', () => {
    // deadline in past → closed
    renderCard({ id: 1, deadline: '2025-01-01', openDate: null })
    expect(screen.queryByRole('link', { name: /apply/i })).toBeNull()
    expect(screen.queryByText('Opening Soon')).toBeNull()
  })

  it('detail link navigates to scholarship page (not external)', () => {
    renderCard({ id: 1, deadline: '2025-12-31', url: 'https://apply.example.com' })
    const link = screen.getByRole('link', { name: /view details/i }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toMatch(/^\/scholarships\//)
    expect(link.getAttribute('target')).not.toBe('_blank')
  })
})

describe('ScholarshipCard — save button', () => {
  it('shows "Save scholarship" aria-label when unsaved', () => {
    renderCard({ id: 1 }, { isSaved: false })
    expect(screen.getByRole('button', { name: 'Save scholarship' })).toBeTruthy()
  })

  it('shows "Remove from saved" aria-label when saved', () => {
    renderCard({ id: 1 }, { isSaved: true })
    expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeTruthy()
  })

  it('calls onToggleSave when save button is clicked', () => {
    const onToggleSave = vi.fn()
    renderCard({ id: 1 }, { onToggleSave })
    fireEvent.click(screen.getByRole('button', { name: 'Save scholarship' }))
    expect(onToggleSave).toHaveBeenCalledTimes(1)
  })

  it('shows "Saved ✓" toast when saving', () => {
    renderCard({ id: 1 }, { isSaved: false })
    fireEvent.click(screen.getByRole('button', { name: 'Save scholarship' }))
    expect(mockShowToast).toHaveBeenCalledWith('Saved ✓')
  })

  it('shows "Removed from saved" toast when unsaving', () => {
    renderCard({ id: 1 }, { isSaved: true })
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))
    expect(mockShowToast).toHaveBeenCalledWith('Removed from saved')
  })

  it('calls showConfetti when saving (not already saved)', () => {
    renderCard({ id: 1 }, { isSaved: false })
    fireEvent.click(screen.getByRole('button', { name: 'Save scholarship' }))
    expect(mockShowConfetti).toHaveBeenCalledTimes(1)
  })

  it('does not call showConfetti when removing a save', () => {
    renderCard({ id: 1 }, { isSaved: true })
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))
    expect(mockShowConfetti).not.toHaveBeenCalled()
  })
})
