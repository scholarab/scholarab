import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import EligibilityQuiz from '../components/EligibilityQuiz'
import type { ConfidenceTier } from '../lib/eligibility-types'
// Type-only: erased at runtime, so it does not fight the vi.mock below. The
// mock's row shape is derived from the real one so the two cannot drift —
// `signals` was added to matchAll and this stub kept compiling without it.
import type { matchAll } from '../lib/eligibility-matcher'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  mockMatchAll, mockGetSaved, mockToggleSaved, mockShowConfetti,
  mockGetSavedPrograms, mockToggleSavedProgram, mockMatchPrograms,
} = vi.hoisted(() => ({
  mockMatchAll:     vi.fn(() => [] as ReturnType<typeof matchAll>),
  mockGetSaved:     vi.fn(() => [] as number[]),
  mockToggleSaved:  vi.fn(),
  mockShowConfetti: vi.fn(),
  mockGetSavedPrograms:   vi.fn(() => [] as number[]),
  mockToggleSavedProgram: vi.fn(),
  mockMatchPrograms:      vi.fn(() => [] as Array<Record<string, unknown>>),
}))

// matchPrograms (plural) is what the component actually imports — a mock named
// matchProgram would leave it undefined and crash any program-results path.
vi.mock('../lib/eligibility-matcher', () => ({ matchAll: mockMatchAll, matchPrograms: mockMatchPrograms }))
// Programs use the separate saved-programs key — mock both pairs or the
// component's useState initialiser calls undefined and every render crashes.
vi.mock('../lib/tracker.ts',          () => ({
  getSaved: mockGetSaved,
  toggleSaved: mockToggleSaved,
  getSavedPrograms: mockGetSavedPrograms,
  toggleSavedProgram: mockToggleSavedProgram,
}))
vi.mock('../lib/utils.ts',            async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/utils')>()),
  showConfetti: mockShowConfetti,
  generateSlug: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScholarship(overrides: { id: number; title?: string; amount?: string; url?: string } & Record<string, any>) {
  return {
    title: `Scholarship ${overrides.id}`,
    amount: '$1,000',
    url: 'https://example.com',
    region: null, eligibility: null, deadline: null, openDate: null,
    audience: null, category: null, lastVerified: null, notes: null,
    applyViaGuidance: false, active: true,
    ...overrides,
  }
}

/** Click a tile and flush the 240 ms setTimeout so the step advances. */
function clickTile(label: string) {
  fireEvent.click(screen.getByText(label))
  act(() => { vi.runAllTimers() })
}

/** Go through all 6 questions and reach the results screen. */
function advanceToResults(searchType: 'Scholarships' | 'Research Programs' | 'Both' = 'Scholarships') {
  clickTile(searchType)                // Q1 searchType
  clickTile('Grade 12')                // Q2 grade
  clickTile('Medicine Hat')            // Q3 city
  clickTile('Still figuring it out')   // Q4 field
  clickTile("I'd rather not say")      // Q5 average
  clickTile('Not sure yet')            // Q6 institution
}

afterEach(() => cleanup())

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockGetSaved.mockReturnValue([])
  mockGetSavedPrograms.mockReturnValue([])
  mockMatchAll.mockReturnValue([])
  mockMatchPrograms.mockReturnValue([])
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

// ── Question 1 — Search type ──────────────────────────────────────────────────

describe('Question 1 — Search type', () => {
  it('renders first question heading', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText('What are you looking for?')).toBeTruthy()
  })

  it('renders search type options', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText('Scholarships')).toBeTruthy()
    expect(screen.getByText('Research Programs')).toBeTruthy()
    expect(screen.getByText('Both')).toBeTruthy()
  })

  it('shows Question 1 of 6', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 6/i)).toBeTruthy()
  })

  it('clicking Scholarships advances to grade question', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    expect(screen.getByText('What grade are you in?')).toBeTruthy()
  })
})

// ── Question 2 — Grade ────────────────────────────────────────────────────────

describe('Question 2 — Grade', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
  })

  it('renders grade options', () => {
    expect(screen.getByText('Grade 10')).toBeTruthy()
    expect(screen.getByText('Grade 11')).toBeTruthy()
    expect(screen.getByText('Grade 12')).toBeTruthy()
    expect(screen.getByText('Already in post-secondary')).toBeTruthy()
  })

  it('shows Question 2 of 6', () => {
    expect(screen.getByText(/question 2 of 6/i)).toBeTruthy()
  })

  it('clicking a grade advances to city question', () => {
    clickTile('Grade 12')
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })
})

// ── Question 3 — City ─────────────────────────────────────────────────────────

describe('Question 3 — City', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
  })

  it('renders city options', () => {
    expect(screen.getByText('Medicine Hat')).toBeTruthy()
    expect(screen.getByText('Calgary')).toBeTruthy()
    expect(screen.getByText('Edmonton')).toBeTruthy()
  })

  it('shows Question 3 of 6', () => {
    expect(screen.getByText(/question 3 of 6/i)).toBeTruthy()
  })

  it('clicking a city advances to question 4', () => {
    clickTile('Medicine Hat')
    expect(screen.getByText("What's your academic focus?")).toBeTruthy()
  })
})

// ── Question 4 — Field ────────────────────────────────────────────────────────

describe('Question 4 — Field', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
    clickTile('Medicine Hat')
  })

  it('renders field options', () => {
    expect(screen.getByText('STEM & Engineering')).toBeTruthy()
    expect(screen.getByText('Health & Medicine')).toBeTruthy()
    expect(screen.getByText('Trades')).toBeTruthy()
    expect(screen.getByText('Still figuring it out')).toBeTruthy()
  })

  it('shows Question 4 of 6', () => {
    expect(screen.getByText(/question 4 of 6/i)).toBeTruthy()
  })

  it('Previous button returns to city question', () => {
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('clicking a field advances to question 5', () => {
    clickTile('Still figuring it out')
    expect(screen.getByText("What's your academic average?")).toBeTruthy()
  })
})

// ── Question 5 — Average ──────────────────────────────────────────────────────

describe('Question 5 — Average', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
  })

  it('renders average options', () => {
    expect(screen.getByText('90% or higher')).toBeTruthy()
    expect(screen.getByText('80 – 89%')).toBeTruthy()
    expect(screen.getByText('Below 80%')).toBeTruthy()
    expect(screen.getByText("I'd rather not say")).toBeTruthy()
  })

  it('shows Question 5 of 6', () => {
    expect(screen.getByText(/question 5 of 6/i)).toBeTruthy()
  })

  it('clicking an average advances to question 6', () => {
    clickTile("I'd rather not say")
    expect(screen.getByText("Where are you planning to study?")).toBeTruthy()
  })
})

// ── Question 6 — Institution ──────────────────────────────────────────────────

describe('Question 6 — Institution', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
  })

  it('renders institution options', () => {
    expect(screen.getByText('University of Calgary')).toBeTruthy()
    expect(screen.getByText('University of Alberta')).toBeTruthy()
    expect(screen.getByText('Not sure yet')).toBeTruthy()
  })

  it('shows Question 6 of 6', () => {
    expect(screen.getByText(/question 6 of 6/i)).toBeTruthy()
  })

  it('clicking an institution advances to results', () => {
    clickTile('Not sure yet')
    expect(screen.getByText(/we found/i)).toBeTruthy()
  })
})

// ── Results ───────────────────────────────────────────────────────────────────

describe('Results', () => {
  it('shows "0 scholarships found" when matchAll returns empty', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/we found 0 scholarships/i)).toBeTruthy()
  })

  it('shows why each row ranked where it did, at most two reasons', () => {
    const s1 = makeScholarship({ id: 1, title: 'Explained Award' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9,
        signals: ['Local to Medicine Hat', 'Open to Grade 12', 'Matches your STEM focus'] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Local to Medicine Hat')).toBeTruthy()
    expect(screen.getByText('Open to Grade 12')).toBeTruthy()
    // The third is dropped: the row justifies its rank, it does not reprint
    // the eligibility criteria.
    expect(screen.queryByText('Matches your STEM focus')).toBeNull()
  })

  it('labels the ranking so the 01..10 column means something', () => {
    const s1 = makeScholarship({ id: 1, title: 'Ranked Award' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/RANKED BY FIT/)).toBeTruthy()
  })

  it('shows scholarship count from matchAll results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Test Scholarship 1' })
    const s2 = makeScholarship({ id: 2, title: 'Test Scholarship 2' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7, signals: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/we found 2 scholarships/i)).toBeTruthy()
  })

  it('shows "1 scholarship found" with singular form', () => {
    const s1 = makeScholarship({ id: 1, title: 'Lone Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/we found 1 scholarship/i)).toBeTruthy()
  })

  it('renders scholarship titles in results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Amazing Bursary' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Amazing Bursary')).toBeTruthy()
  })

  it('renders "Strong match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Strong match')).toBeTruthy()
  })

  it('renders "Good match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'good' as ConfidenceTier, confidence: 0.7, signals: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Good match')).toBeTruthy()
  })

  it('renders "Possible match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'possible' as ConfidenceTier, confidence: 0.5, signals: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Possible match')).toBeTruthy()
  })

  it('"Retake quiz" button resets to question 1', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /retake quiz/i }))
    expect(screen.getByText('What are you looking for?')).toBeTruthy()
  })

  it('shows empty state message when no scholarships matched', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/no matches found for your profile/i)).toBeTruthy()
  })

  it('"Try again" button in empty state resets to question 1', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('What are you looking for?')).toBeTruthy()
  })

  it('save button calls toggleSaved', () => {
    const s1 = makeScholarship({ id: 1, title: 'Save Test Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /save scholarship/i }))
    expect(mockToggleSaved).toHaveBeenCalledWith(1)
  })

  it('program save button calls toggleSavedProgram, not toggleSaved', () => {
    mockMatchPrograms.mockReturnValue([{
      id: 42, name: 'Save Test Program', provider: 'U of A', url: 'https://example.com',
      paid: true, stipend: '$3,000 stipend', category: 'STEM research', deadline: null,
    }])
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Research Programs')
    fireEvent.click(screen.getByRole('button', { name: /save program/i }))
    expect(mockToggleSavedProgram).toHaveBeenCalledWith(42)
    expect(mockToggleSaved).not.toHaveBeenCalled()
  })

  it('shows a paid chip and stipend note for paid programs', () => {
    mockMatchPrograms.mockReturnValue([{
      id: 43, name: 'Paid Program', provider: 'U of C', url: 'https://example.com',
      paid: true, stipend: '$3,000 stipend', category: null, deadline: null,
    }])
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Research Programs')
    expect(screen.getByText('$ PAID')).toBeTruthy()
    expect(screen.getByText('$3,000 stipend')).toBeTruthy()
  })

  it('showConfetti is called when saving a scholarship', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /save scholarship/i }))
    expect(mockShowConfetti).toHaveBeenCalledTimes(1)
  })

  it('shows summary tier badges (strong matches / good matches)', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [] },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7, signals: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('1 strong match')).toBeTruthy()
    expect(screen.getByText('1 good match')).toBeTruthy()
  })

  it('shows "Browse all scholarships" link in results', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/browse all scholarships/i)).toBeTruthy()
  })
})
