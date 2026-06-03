import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ProgramCard } from '../components/ItemCard'
import type { ProgramWithMeta } from '../hooks/useItems'

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

function makeProgram(overrides: Partial<ProgramWithMeta> & { id: number }): ProgramWithMeta {
  return {
    name: 'Test Program',
    emoji: null,
    category: 'STEM',
    provider: 'University of AB',
    grades: 'Grade 11-12',
    duration: '8 weeks',
    paid: false,
    stipend: null,
    location: 'Medicine Hat',
    eligibility: 'Open to all',
    deadline: '2025-12-31',
    url: 'https://example.com',
    description: 'A great program for students.',
    lastVerified: null,
    active: true,
    ...overrides,
  }
}

function renderCard(
  programOverrides: Partial<ProgramWithMeta> & { id: number },
  propOverrides: { isSaved?: boolean; onToggleSave?: () => void } = {}
) {
  const program = makeProgram(programOverrides)
  return render(
    <ProgramCard
      program={program}
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

describe('ProgramCard — rendering', () => {
  it('renders the program name', () => {
    renderCard({ id: 1 })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Test Program')
  })

  it('renders the provider', () => {
    renderCard({ id: 1 })
    expect(screen.getByText('University of AB')).toBeTruthy()
  })

  it('renders the description', () => {
    renderCard({ id: 1 })
    expect(screen.getByText('A great program for students.')).toBeTruthy()
  })

  it('renders the category badge', () => {
    renderCard({ id: 1, category: 'STEM' })
    expect(screen.getByText('STEM')).toBeTruthy()
  })

  it('View Details link points to slug of program name', () => {
    renderCard({ id: 1, name: 'My Program' })
    const link = screen.getByRole('link', { name: /view details/i }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/programs/my-program')
  })

  it('renders stipend when paid and stipend are set', () => {
    renderCard({ id: 1, paid: true, stipend: '$2,500' })
    expect(screen.getByText('$2,500')).toBeTruthy()
  })

  it('does not render stipend when paid is false', () => {
    renderCard({ id: 1, paid: false, stipend: '$2,500' })
    expect(screen.queryByText('$2,500')).toBeNull()
  })
})

describe('ProgramCard — status', () => {
  it('shows Learn More for non-closed program', () => {
    renderCard({ id: 1, deadline: '2025-12-31' })
    expect(screen.getByRole('link', { name: /learn more/i })).toBeTruthy()
  })

  it('hides Learn More for closed program', () => {
    renderCard({ id: 1, deadline: '2025-01-01' })
    expect(screen.queryByRole('link', { name: /learn more/i })).toBeNull()
  })

  it('Learn More link opens in a new tab', () => {
    renderCard({ id: 1, deadline: '2025-12-31', url: 'https://apply.example.com' })
    const link = screen.getByRole('link', { name: /learn more/i }) as HTMLAnchorElement
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('href')).toBe('https://apply.example.com')
  })

  it('shows Ongoing as deadline text when deadline is Ongoing', () => {
    renderCard({ id: 1, deadline: 'Ongoing' })
    expect(screen.getByText('Ongoing')).toBeTruthy()
  })
})

describe('ProgramCard — save button', () => {
  it('shows "Save program" aria-label when unsaved', () => {
    renderCard({ id: 1 }, { isSaved: false })
    expect(screen.getByRole('button', { name: 'Save program' })).toBeTruthy()
  })

  it('shows "Remove from saved" aria-label when saved', () => {
    renderCard({ id: 1 }, { isSaved: true })
    expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeTruthy()
  })

  it('calls onToggleSave when save button is clicked', () => {
    const onToggleSave = vi.fn()
    renderCard({ id: 1 }, { onToggleSave })
    fireEvent.click(screen.getByRole('button', { name: 'Save program' }))
    expect(onToggleSave).toHaveBeenCalledTimes(1)
  })

  it('shows "Saved ✓" toast when saving', () => {
    renderCard({ id: 1 }, { isSaved: false })
    fireEvent.click(screen.getByRole('button', { name: 'Save program' }))
    expect(mockShowToast).toHaveBeenCalledWith('Saved ✓')
  })

  it('shows "Removed from saved" toast when unsaving', () => {
    renderCard({ id: 1 }, { isSaved: true })
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))
    expect(mockShowToast).toHaveBeenCalledWith('Removed from saved')
  })
})
