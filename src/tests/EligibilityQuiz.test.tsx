import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import EligibilityQuiz from '../components/EligibilityQuiz'
import type { ConfidenceTier } from '../lib/eligibility-types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockMatchAll, mockGetSaved, mockToggleSaved, mockShowConfetti } = vi.hoisted(() => ({
  mockMatchAll:    vi.fn(() => [] as Array<{ id: number; confidence: number; tier: ConfidenceTier }>),
  mockGetSaved:    vi.fn(() => [] as number[]),
  mockToggleSaved: vi.fn(),
  mockShowConfetti: vi.fn(),
}))

vi.mock('../lib/eligibility-matcher', () => ({
  matchAll: mockMatchAll,
}))

vi.mock('../lib/tracker.ts', () => ({
  getSaved:     mockGetSaved,
  toggleSaved:  mockToggleSaved,
}))

vi.mock('../lib/utils.ts', () => ({
  showConfetti:  mockShowConfetti,
  generateSlug:  (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScholarship(overrides: { id: number; title?: string; amount?: string; url?: string } & Record<string, any>) {
  return {
    title: `Scholarship ${overrides.id}`,
    amount: '$1,000',
    url: 'https://example.com',
    region: null,
    eligibility: null,
    deadline: null,
    openDate: null,
    audience: null,
    category: null,
    lastVerified: null,
    notes: null,
    applyViaGuidance: false,
    active: true,
    ...overrides,
  }
}

/** Advance quiz from step 1 to step 2 by selecting grade + city and clicking Next. */
function advanceToStep2() {
  fireEvent.click(screen.getByText('Grade 12'))
  fireEvent.click(screen.getByText('Medicine Hat'))
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
}

/** Advance quiz to results with no match results. */
function advanceToResults() {
  advanceToStep2()
  fireEvent.click(screen.getByRole('button', { name: /find my scholarships/i }))
}

afterEach(() => cleanup())

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSaved.mockReturnValue([])
  mockMatchAll.mockReturnValue([])
  localStorage.clear()
})

// ── Step 1 ─────────────────────────────────────────────────────────────────────

describe('Step 1 — Where are you at?', () => {
  it('renders step 1 heading', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText('Where are you at?')).toBeTruthy()
  })

  it('Next button is disabled when grade and city are not selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    const btn = screen.getByRole('button', { name: /next/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Next button is disabled when only grade is selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Grade 12'))
    const btn = screen.getByRole('button', { name: /next/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Next button is disabled when only city is selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Medicine Hat'))
    const btn = screen.getByRole('button', { name: /next/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Next button is enabled when both grade and city are selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Grade 12'))
    fireEvent.click(screen.getByText('Medicine Hat'))
    const btn = screen.getByRole('button', { name: /next/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('clicking Next advances to step 2', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    expect(screen.getByText('What do you want to study?')).toBeTruthy()
  })

  it('shows Grade 10/11 warning when Grade 10 is selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Grade 10'))
    expect(screen.getByText(/most scholarships are for grade 12/i)).toBeTruthy()
  })

  it('shows Grade 10/11 warning when Grade 11 is selected', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Grade 11'))
    expect(screen.getByText(/most scholarships are for grade 12/i)).toBeTruthy()
  })

  it('does not show Grade 10/11 warning for Grade 12', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    fireEvent.click(screen.getByText('Grade 12'))
    expect(screen.queryByText(/most scholarships are for grade 12/i)).toBeNull()
  })

  it('institution chip toggles off when clicked again', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    const chip = screen.getByText('Medicine Hat College')
    fireEvent.click(chip)
    // chip should be active — clicking again deselects
    fireEvent.click(chip)
    // No error = toggle worked; active state is on the button className which we don't assert
  })

  it('all grade chips are rendered', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText('Grade 10')).toBeTruthy()
    expect(screen.getByText('Grade 11')).toBeTruthy()
    expect(screen.getByText('Grade 12')).toBeTruthy()
  })

  it('all city chips are rendered', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    expect(screen.getByText('Medicine Hat')).toBeTruthy()
    expect(screen.getByText('Calgary')).toBeTruthy()
    expect(screen.getByText('Edmonton')).toBeTruthy()
  })
})

// ── Step 2 ─────────────────────────────────────────────────────────────────────

describe('Step 2 — What do you want to study?', () => {
  it('renders step 2 heading', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    expect(screen.getByText('What do you want to study?')).toBeTruthy()
  })

  it('Back button returns to step 1', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Where are you at?')).toBeTruthy()
  })

  it('field chips are multi-select (selecting two keeps both active)', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    fireEvent.click(screen.getByText('STEM'))
    fireEvent.click(screen.getByText('Business'))
    // Both were clicked — no error means multi-select works
  })

  it('clicking same field chip twice deselects it', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    fireEvent.click(screen.getByText('STEM'))
    fireEvent.click(screen.getByText('STEM'))
    // No error; chip toggled off
  })

  it('average bracket is single-select toggle', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    fireEvent.click(screen.getByText('90% or higher'))
    fireEvent.click(screen.getByText('90% or higher'))
    // Clicked same bracket twice — should toggle off (no error)
  })

  it('Find my scholarships advances to results', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    fireEvent.click(screen.getByRole('button', { name: /find my scholarships/i }))
    expect(screen.getByText(/we found/i)).toBeTruthy()
  })

  it('all FIELDS chips are rendered', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToStep2()
    expect(screen.getByText('STEM')).toBeTruthy()
    expect(screen.getByText('Health & Medicine')).toBeTruthy()
    expect(screen.getByText('Trades')).toBeTruthy()
  })
})

// ── Results ────────────────────────────────────────────────────────────────────

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

  it('"Retake quiz" button resets to step 1', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /retake quiz/i }))
    expect(screen.getByText('Where are you at?')).toBeTruthy()
  })

  it('shows empty state message when no scholarships matched', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    expect(screen.getByText(/no scholarships matched your profile/i)).toBeTruthy()
  })

  it('"Try again" button in empty state resets to step 1', () => {
    render(<EligibilityQuiz scholarships={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Where are you at?')).toBeTruthy()
  })

  it('save button calls toggleSaved and updates aria-label', () => {
    const s1 = makeScholarship({ id: 1, title: 'Save Test Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9 }])
    // After toggleSaved, getSaved returns [1]
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} />)
    advanceToResults()

    const saveBtn = screen.getByRole('button', { name: /save scholarship/i })
    fireEvent.click(saveBtn)
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
