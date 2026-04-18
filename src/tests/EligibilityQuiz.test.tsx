import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import EligibilityQuiz from '../components/EligibilityQuiz'
import type { ConfidenceTier } from '../lib/eligibility-types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockMatchAll, mockGetSaved, mockToggleSaved, mockShowConfetti } = vi.hoisted(() => ({
  mockMatchAll:     vi.fn(() => [] as Array<{ id: number; confidence: number; tier: ConfidenceTier }>),
  mockGetSaved:     vi.fn(() => [] as number[]),
  mockToggleSaved:  vi.fn(),
  mockShowConfetti: vi.fn(),
}))

vi.mock('../lib/eligibility-matcher', () => ({ matchAll: mockMatchAll }))
vi.mock('../lib/tracker.ts',          () => ({ getSaved: mockGetSaved, toggleSaved: mockToggleSaved }))
vi.mock('../lib/utils.ts',            () => ({
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

/** Go through all 4 questions and reach the results screen. */
function advanceToResults() {
  clickTile('Medicine Hat')           // Q1 city
  clickTile('Still figuring it out')  // Q2 field
  clickTile("I'd rather not say")     // Q3 average
  clickTile('Not sure yet')           // Q4 institution
}

afterEach(() => cleanup())

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockGetSaved.mockReturnValue([])
  mockMatchAll.mockReturnValue([])
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

// ── Question 1 — City ─────────────────────────────────────────────────────────

describe('Question 1 — City', () => {
  it('renders first question heading', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('renders city options', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText('Medicine Hat')).toBeTruthy()
    expect(screen.getByText('Calgary')).toBeTruthy()
    expect(screen.getByText('Edmonton')).toBeTruthy()
  })

  it('shows Question 1 of 4', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText(/question 1 of 4/i)).toBeTruthy()
  })

  it('clicking a city advances to question 2', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    clickTile('Medicine Hat')
    expect(screen.getByText("What's your academic focus?")).toBeTruthy()
  })
})

// ── Question 2 — Field ────────────────────────────────────────────────────────

describe('Question 2 — Field', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} />)
    clickTile('Medicine Hat')
  })

  it('renders field options', () => {
    expect(screen.getByText('STEM & Engineering')).toBeTruthy()
    expect(screen.getByText('Health & Medicine')).toBeTruthy()
    expect(screen.getByText('Trades')).toBeTruthy()
    expect(screen.getByText('Still figuring it out')).toBeTruthy()
  })

  it('shows Question 2 of 4', () => {
    expect(screen.getByText(/question 2 of 4/i)).toBeTruthy()
  })

  it('Previous button returns to question 1', () => {
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('clicking a field advances to question 3', () => {
    clickTile('Still figuring it out')
    expect(screen.getByText("What's your academic average?")).toBeTruthy()
  })
})

// ── Question 3 — Average ──────────────────────────────────────────────────────

describe('Question 3 — Average', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} />)
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
  })

  it('renders average options', () => {
    expect(screen.getByText('90% or higher')).toBeTruthy()
    expect(screen.getByText('80 – 89%')).toBeTruthy()
    expect(screen.getByText('Below 80%')).toBeTruthy()
    expect(screen.getByText("I'd rather not say")).toBeTruthy()
  })

  it('shows Question 3 of 4', () => {
    expect(screen.getByText(/question 3 of 4/i)).toBeTruthy()
  })

  it('clicking an average advances to question 4', () => {
    clickTile("I'd rather not say")
    expect(screen.getByText("Where are you planning to study?")).toBeTruthy()
  })
})

// ── Question 4 — Institution ──────────────────────────────────────────────────

describe('Question 4 — Institution', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} />)
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
  })

  it('renders institution options', () => {
    expect(screen.getByText('University of Calgary')).toBeTruthy()
    expect(screen.getByText('University of Alberta')).toBeTruthy()
    expect(screen.getByText('Not sure yet')).toBeTruthy()
  })

  it('shows Question 4 of 4', () => {
    expect(screen.getByText(/question 4 of 4/i)).toBeTruthy()
  })

  it('clicking an institution advances to results', () => {
    clickTile('Not sure yet')
    expect(screen.getByText(/we found/i)).toBeTruthy()
  })
})

// ── Results ───────────────────────────────────────────────────────────────────

describe('Results', () => {
  it('shows "0 scholarships found" when matchAll returns empty', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    expect(screen.getByText(/we found 0 scholarships/i)).toBeTruthy()
  })

  it('shows scholarship count from matchAll results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Test Scholarship 1' })
    const s2 = makeScholarship({ id: 2, title: 'Test Scholarship 2' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7 },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} />)
    advanceToResults()
    expect(screen.getByText(/we found 2 scholarships/i)).toBeTruthy()
  })

  it('shows "1 scholarship found" with singular form', () => {
    const s1 = makeScholarship({ id: 1, title: 'Lone Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    expect(screen.getByText(/we found 1 scholarship/i)).toBeTruthy()
  })

  it('renders scholarship titles in results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Amazing Bursary' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    expect(screen.getByText('Amazing Bursary')).toBeTruthy()
  })

  it('renders "Strong match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    expect(screen.getByText('Strong match')).toBeTruthy()
  })

  it('renders "Good match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'good' as ConfidenceTier, confidence: 0.7 }])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    expect(screen.getByText('Good match')).toBeTruthy()
  })

  it('renders "Possible match" tier badge', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'possible' as ConfidenceTier, confidence: 0.5 }])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    expect(screen.getByText('Possible match')).toBeTruthy()
  })

  it('"Retake quiz" button resets to question 1', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /retake quiz/i }))
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('shows empty state message when no scholarships matched', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    expect(screen.getByText(/no scholarships matched your profile/i)).toBeTruthy()
  })

  it('"Try again" button in empty state resets to question 1', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('save button calls toggleSaved', () => {
    const s1 = makeScholarship({ id: 1, title: 'Save Test Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /save scholarship/i }))
    expect(mockToggleSaved).toHaveBeenCalledWith(1)
  })

  it('showConfetti is called when saving a scholarship', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /save scholarship/i }))
    expect(mockShowConfetti).toHaveBeenCalledTimes(1)
  })

  it('shows summary tier badges (strong matches / good matches)', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7 },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} />)
    advanceToResults()
    expect(screen.getByText('1 strong match')).toBeTruthy()
    expect(screen.getByText('1 good match')).toBeTruthy()
  })

  it('shows "Browse all scholarships" link in results', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    expect(screen.getByText(/browse all scholarships/i)).toBeTruthy()
  })
})
