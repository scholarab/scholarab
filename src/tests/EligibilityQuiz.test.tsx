/** @jsxImportSource preact */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent as dispatch } from '@testing-library/dom'
import { render as mount, type VNode } from 'preact'
import { act } from 'preact/test-utils'

const host = document.createElement('div')
document.body.append(host)
function render(node: VNode) { act(() => mount(node, host)) }
function cleanup() { act(() => mount(null, host)) }
const fireEvent = { click: (element: Element) => act(() => { dispatch.click(element) }) }
import EligibilityQuiz from '../components/EligibilityQuiz'
import type { ConfidenceTier } from '../lib/eligibility-types'
// Type-only: erased at runtime, so it does not fight the vi.mock below. The
// mock's row shape is derived from the real one so the two cannot drift;
// `signals` was added to matchAll and this stub kept compiling without it.
import type { matchAll } from '../lib/eligibility-matcher'
import { QUIZ_STORAGE_KEY, QUIZ_TTL_MS } from '../lib/quiz'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  mockMatchAll, mockGetSaved, mockToggleSaved, mockShowConfetti,
  mockGetSavedPrograms, mockToggleSavedProgram, mockMatchPrograms, mockSendEvent,
} = vi.hoisted(() => ({
  mockSendEvent: vi.fn(),
  mockMatchAll:     vi.fn(() => [] as ReturnType<typeof matchAll>),
  mockGetSaved:     vi.fn(() => [] as number[]),
  mockToggleSaved:  vi.fn(),
  mockShowConfetti: vi.fn(),
  mockGetSavedPrograms:   vi.fn(() => [] as number[]),
  mockToggleSavedProgram: vi.fn(),
  mockMatchPrograms:      vi.fn(() => [] as Array<Record<string, unknown>>),
}))

vi.mock('../lib/events.ts', () => ({ sendEvent: mockSendEvent }))

// matchPrograms (plural) is what the component actually imports; a mock named
// matchProgram would leave it undefined and crash any program-results path.
vi.mock('../lib/eligibility-matcher', () => ({ matchAll: mockMatchAll, matchPrograms: mockMatchPrograms, isRestrictedCheck: (c: string) => c !== 'Based on financial need' }))
// Programs use the separate saved-programs key; mock both pairs or the
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

const EMPTY_ELIGIBILITY = {
  grades: [], schoolBoards: [], specificSchools: [], targetInstitutions: [], fields: [],
  minAverage: null, minAge: null, maxAge: null, genderRequired: null,
  indigenousRequired: false, bipocRequired: false, financialNeed: false,
  maxFamilyIncome: null, fosterCare: false, citizenship: null,
  apprenticeship: false, extracurriculars: [],
}

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

/** A Calgary listing restricted to one school, which turns on question 7. */
function schoolRestricted(id: number, school: string) {
  return makeScholarship({
    id, region: 'Calgary',
    eligibility: { ...EMPTY_ELIGIBILITY, specificSchools: [school] },
  })
}

/** Go through all 6 questions and reach the results screen. */
function advanceToResults(searchType: 'Scholarships' | 'Research programs' | 'Both' = 'Scholarships') {
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
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

// ── Question 1; Search type ──────────────────────────────────────────────────

describe('Question 1; Search type', () => {
  it('renders first question heading', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText('What are you looking for?')).toBeTruthy()
  })

  it('renders search type options', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText('Scholarships')).toBeTruthy()
    expect(screen.getByText('Research programs')).toBeTruthy()
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

// ── Question 2; Grade ────────────────────────────────────────────────────────

describe('Question 2; Grade', () => {
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

// ── Question 3; City ─────────────────────────────────────────────────────────

describe('Question 3; City', () => {
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

// ── Question 4; Field ────────────────────────────────────────────────────────

describe('Question 4; Field', () => {
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

// ── Question 5; Average ──────────────────────────────────────────────────────

describe('Question 5; Average', () => {
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

// ── Question 6; Institution ──────────────────────────────────────────────────

describe('Question 6; Institution', () => {
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
    expect(screen.getByText(/worth a look/i)).toBeTruthy()
  })
})

// ── Results ───────────────────────────────────────────────────────────────────

describe('Results', () => {
  it('shows "0 scholarships found" when matchAll returns empty', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^0 scholarships worth a look/i)).toBeTruthy()
  })

  it('shows why each row ranked where it did, at most two reasons', () => {
    const s1 = makeScholarship({ id: 1, title: 'Explained Award' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9,
        signals: ['Local to Medicine Hat', 'Open to Grade 12', 'Matches your STEM focus'], checks: [] },
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
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/Best fit first/)).toBeTruthy()
  })

  it('saves every strong match in one tap', () => {
    const s1 = makeScholarship({ id: 1, title: 'Strong One' })
    const s2 = makeScholarship({ id: 2, title: 'Strong Two' })
    const s3 = makeScholarship({ id: 3, title: 'Good Three' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'strong' as ConfidenceTier, confidence: 0.8, signals: [], checks: [] },
      { id: 3, tier: 'good' as ConfidenceTier, confidence: 0.6, signals: [], checks: [] },
    ])
    // A stateful stand-in for the tracker, so the button can see its own saves.
    const saved = new Set<number>()
    mockGetSaved.mockImplementation(() => [...saved])
    mockToggleSaved.mockImplementation((id: number) => { if (saved.has(id)) saved.delete(id); else saved.add(id); return [...saved] })
    render(<EligibilityQuiz scholarships={[s1, s2, s3] as any} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByText('Save the 2 strong matches'))
    expect([...saved].sort()).toEqual([1, 2])
    expect(screen.getByText('Saved to your list')).toBeTruthy()
    mockGetSaved.mockImplementation(() => [])
    mockToggleSaved.mockImplementation(() => undefined as unknown as number[])
  })

  it('puts an open, dated award ahead of an undated one in the same tier', () => {
    const undated = makeScholarship({ id: 1, title: 'Undated Strong' })
    const dated = makeScholarship({ id: 2, title: 'Dated Strong', deadline: '2099-06-01' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.95, signals: [], checks: [] },
      { id: 2, tier: 'strong' as ConfidenceTier, confidence: 0.8, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[undated, dated] as any} programs={[]} />)
    advanceToResults()
    const titles = screen.getAllByText(/Strong$/).map(el => el.textContent)
    expect(titles).toEqual(['Dated Strong', 'Undated Strong'])
  })

  it('shows scholarship count from matchAll results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Test Scholarship 1' })
    const s2 = makeScholarship({ id: 2, title: 'Test Scholarship 2' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^2 scholarships worth a look/i)).toBeTruthy()
  })

  it('shows "1 scholarship found" with singular form', () => {
    const s1 = makeScholarship({ id: 1, title: 'Lone Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^1 scholarship worth a look/i)).toBeTruthy()
  })

  it('says "your top 10 of N" when the list is cut, and shows the rest on request', () => {
    // "We found 10" would be the cap talking; 25 matched.
    const many = Array.from({ length: 25 }, (_, i) => makeScholarship({ id: i + 1, title: `Award ${i + 1}` }))
    mockMatchAll.mockReturnValue(many.map(s => ({ id: s.id, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] })))
    render(<EligibilityQuiz scholarships={many as any} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^Your top 10 of 25 scholarships worth a look/)).toBeTruthy()
    expect(screen.queryByText('Award 25')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /show all 25 scholarships/i }))
    expect(screen.getByText('Award 25')).toBeTruthy()
  })

  it('renders scholarship titles in results', () => {
    const s1 = makeScholarship({ id: 1, title: 'Amazing Bursary' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Amazing Bursary')).toBeTruthy()
  })

  it('hides tier badges when every row has the same tier', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'strong' as ConfidenceTier, confidence: 0.8, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.queryByText('Strong match')).toBeNull()
    expect(screen.queryByText('2 strong matches')).toBeNull()
  })

  it('renders each tier badge when tiers differ', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    const s3 = makeScholarship({ id: 3 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: [] },
      { id: 3, tier: 'possible' as ConfidenceTier, confidence: 0.3, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any, s3 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Strong match')).toBeTruthy()
    expect(screen.getByText('Good match')).toBeTruthy()
    expect(screen.getByText('Possible match')).toBeTruthy()
  })

  it('shows an unasked requirement instead of a match label', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: ['Indigenous students only'] },
      { id: 2, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Check: Indigenous students only')).toBeTruthy()
    expect(screen.queryByText('Strong match')).toBeNull()
    expect(screen.getByText('Good match')).toBeTruthy()
  })

  it('never says the student qualifies', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.queryByText(/qualify/i)).toBeNull()
    expect(screen.getByText(/worth a look/i)).toBeTruthy()
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
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /^save: save test scholarship$/i }))
    expect(mockToggleSaved).toHaveBeenCalledWith(1)
  })

  it('program save button calls toggleSavedProgram, not toggleSaved', () => {
    mockMatchPrograms.mockReturnValue([{
      id: 42, name: 'Save Test Program', provider: 'U of A', url: 'https://example.com',
      paid: true, stipend: '$3,000 stipend', category: 'STEM research', deadline: null,
    }])
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Research programs')
    fireEvent.click(screen.getByRole('button', { name: /^save: save test program$/i }))
    expect(mockToggleSavedProgram).toHaveBeenCalledWith(42)
    expect(mockToggleSaved).not.toHaveBeenCalled()
  })

  it('shows a paid chip and stipend note for paid programs', () => {
    mockMatchPrograms.mockReturnValue([{
      id: 43, name: 'Paid Program', provider: 'U of C', url: 'https://example.com',
      paid: true, stipend: '$3,000 stipend', category: null, deadline: null,
    }])
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Research programs')
    expect(screen.getByText('Paid')).toBeTruthy()
    expect(screen.getByText('$3,000 stipend')).toBeTruthy()
  })

  it('showConfetti is called when saving a scholarship', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /^save: scholarship 1$/i }))
    expect(mockShowConfetti).toHaveBeenCalledTimes(1)
  })

  it('shows summary tier badges (strong matches / good matches)', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('1 strong match')).toBeTruthy()
    expect(screen.getByText('1 good match')).toBeTruthy()
  })

  it("links the results to the student's own city hub", () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    const link = screen.getByText(/all medicine hat scholarships/i).closest('a')
    expect(link?.getAttribute('href')).toBe('/scholarships/medicine-hat/')
  })
})

// ── Saved progress expiry ────────────────────────────────────────────────────

describe('Saved progress expiry', () => {
  it('resumes progress saved within the hour', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' }, savedAt: Date.now() - 60_000,
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 2 of 6/i)).toBeTruthy()
  })

  it('starts over when the saved progress is older than the TTL', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' }, savedAt: Date.now() - QUIZ_TTL_MS - 1,
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 6/i)).toBeTruthy()
  })

  it('starts over on progress written before timestamps existed', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' },
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 6/i)).toBeTruthy()
  })
})

// ── Progress does not outlive the tab ────────────────────────────────────────

describe('Progress does not outlive the tab', () => {
  it('ignores and clears progress left in localStorage by an older build', () => {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' }, savedAt: Date.now(),
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 6/i)).toBeTruthy()
    expect(localStorage.getItem(QUIZ_STORAGE_KEY)).toBeNull()
  })

  it('writes progress to sessionStorage, not localStorage', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    expect(sessionStorage.getItem(QUIZ_STORAGE_KEY)).toBeTruthy()
    expect(localStorage.getItem(QUIZ_STORAGE_KEY)).toBeNull()
  })
})

// ── The optional school question ─────────────────────────────────────────────

describe('School question', () => {
  const calgarySchools = [
    schoolRestricted(1, 'Western Canada High School'),
    schoolRestricted(2, 'Bowness High School'),
  ]

  /** Answer the first six, choosing `city`. */
  function answerSix(city: string) {
    clickTile('Scholarships')
    clickTile('Grade 12')
    clickTile(city)
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
    clickTile('Not sure yet')
  }

  it('asks a seventh question when the city has school-restricted awards', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerSix('Calgary')
    expect(screen.getByText('Which school do you go to?')).toBeTruthy()
    expect(screen.getByText(/question 7 of 7/i)).toBeTruthy()
  })

  it('stays at six questions for a city with no school-restricted awards', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerSix('Edmonton')
    expect(screen.queryByText('Which school do you go to?')).toBeNull()
  })

  it('offers each school once and an escape hatch', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerSix('Calgary')
    expect(screen.getByText('Western Canada High School')).toBeTruthy()
    expect(screen.getByText('Bowness High School')).toBeTruthy()
    expect(screen.getByText('Another school')).toBeTruthy()
  })

  it('passes the chosen school to the matcher', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerSix('Calgary')
    clickTile('Bowness High School')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.specificSchool).toBe('Bowness High School')
  })

  it('drops a stored school when the city is changed on the way back', () => {
    // Seeded rather than clicked: the school question is the last step, so the
    // only way to reach a set school and then change city is a restored run.
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 6,
      answers: {
        searchType: 'scholarships', grade: '12', city: 'Calgary', field: '',
        average: '', institution: '', school: 'Bowness High School',
      },
      savedAt: Date.now(),
    }))
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    expect(screen.getByText('Which school do you go to?')).toBeTruthy()
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('← Previous'))
      act(() => { vi.runAllTimers() })
    }
    expect(screen.getByText('Where are you based?')).toBeTruthy()
    clickTile('Edmonton')
    // Forward again through the three that follow the city question. Edmonton
    // has no school-restricted awards, so those three finish the quiz.
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
    clickTile('Not sure yet')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.city).toBe('Edmonton')
    expect(profile.specificSchool).toBeNull()
  })

  it('leaves the school null when the escape hatch is taken', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerSix('Calgary')
    clickTile('Another school')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.specificSchool).toBeNull()
  })
})


describe('Operator completion events', () => {
  it('counts the first and last committed answers at their original transition points', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(mockSendEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Both'))
    act(() => { vi.advanceTimersByTime(259) })
    expect(mockSendEvent).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start']])
    for (const text of ['Grade 12', 'Medicine Hat', 'Still figuring it out', "I'd rather not say"]) clickTile(text)
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start']])
    fireEvent.click(screen.getByText('Not sure yet'))
    act(() => { vi.advanceTimersByTime(259) })
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start']])
    act(() => { vi.advanceTimersByTime(1) })
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start'], ['quiz_complete']])
  })

  it('does not count restored results or an answer cancelled by navigation', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step: 6, answers: { city: 'Medicine Hat' }, savedAt: Date.now() }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(mockSendEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Retake quiz'))
    fireEvent.click(screen.getByText('Both'))
    cleanup()
    act(() => { vi.runAllTimers() })
    expect(mockSendEvent).not.toHaveBeenCalled()
  })
})

// ── Phase 3 of the 35 plan (critique 2026-09-23) ──────────────────────────────

describe('Answer summary on the results', () => {
  it('lists the answers, and changing one returns straight to the results', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('You answered')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Grade 12\. Change your answer/ }))
    expect(screen.getByText('What grade are you in?')).toBeTruthy()
    clickTile('Grade 11')
    expect(screen.getByText('You answered')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Grade 11\. Change your answer/ })).toBeTruthy()
  })
})

describe('Town filter on the city question', () => {
  it('narrows the tiles as you type and always keeps Other Alberta', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
    const input = screen.getByRole('searchbox', { name: /filter the list of towns/i }) as HTMLInputElement
    act(() => { input.value = 'leth'; dispatch.input(input) })
    expect(screen.queryByText('Lethbridge')).toBeTruthy()
    expect(screen.queryByText('Calgary')).toBeNull()
    expect(screen.queryByText('Other Alberta')).toBeTruthy()
  })

  it('lists the six biggest cities first', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Grade 12')
    const labels = [...document.querySelectorAll('.sabm-opt-label')].map(e => e.textContent)
    expect(labels.slice(0, 6)).toEqual(['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'St. Albert', 'Medicine Hat'])
    expect(labels.at(-1)).toBe('Other Alberta')
  })
})
