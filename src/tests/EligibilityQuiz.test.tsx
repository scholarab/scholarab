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
import { QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, QUIZ_TTL_MS } from '../lib/quiz'
import { albertaDate } from '../lib/calendar'

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
// isRestrictedCheck is the real one, so the test cannot keep an old rule.
vi.mock('../lib/eligibility-matcher', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/eligibility-matcher')>()),
  matchAll: mockMatchAll, matchPrograms: mockMatchPrograms,
}))
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

const visibleAnswerTiles = () => [...document.querySelectorAll<HTMLElement>('[data-quiz-answer]')]
const visibleLabels = () => [...document.querySelectorAll('.sabm-opt-label')].map(e => e.textContent)
function revealTile(label: string): HTMLElement {
  const find = () => visibleAnswerTiles().find(tile => tile.querySelector('.sabm-opt-label')?.textContent === label)
  // Real UI navigation only: an already answered question may reopen on a
  // later batch. Return to the first batch before walking forward if needed.
  for (let i = 0; !find() && i < 100; i++) {
    const previous = screen.queryByRole('button', { name: /Previous options$/i })
    if (!previous) break
    fireEvent.click(previous)
  }
  for (let i = 0; !find() && i < 100; i++) {
    const more = document.querySelector('[data-quiz-more]')
    if (!more) break
    expect(document.querySelectorAll('.sabm-opt').length).toBeLessThanOrEqual(4)
    fireEvent.click(more)
  }
  const found = find()
  expect(found, `reachable answer: ${label}`).toBeTruthy()
  return found!
}

/** Navigate to a real tile and flush the 260 ms committed-answer delay. */
function clickTile(label: string) {
  fireEvent.click(revealTile(label))
  act(() => { vi.runAllTimers() })
}

/** A Calgary listing restricted to one school, which turns on question 7. */
function schoolRestricted(id: number, school: string) {
  return makeScholarship({
    id, region: 'Calgary',
    eligibility: { ...EMPTY_ELIGIBILITY, specificSchools: [school] },
  })
}

/** Go through all 5 questions and reach the results screen. */
function advanceToResults(searchType: 'Scholarships' | 'Programs' | 'Both' = 'Scholarships') {
  clickTile(searchType)                // Q1 searchType
  if (searchType === 'Programs') {
    clickTile('Grade 12')              // Programs depend only on grade and field.
    clickTile('Still figuring it out')
    return
  }
  clickTile('Medicine Hat')            // Q2 city
  clickTile('Still figuring it out')   // Q3 field
  clickTile("I'd rather not say")      // Q4 average
  clickTile('Somewhere else, or not sure')            // Q5 institution
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
    expect(screen.getByText('Programs')).toBeTruthy()
    expect(screen.getByText('Both')).toBeTruthy()
  })

  it('shows Question 1 of 5', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 5/i)).toBeTruthy()
  })

  it('skips the grade for scholarships: the catalogue is Grade 12 only', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    expect(screen.queryByText('What grade are you in?')).toBeNull()
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('still asks programs for a grade', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Programs')
    expect(screen.getByText('What grade are you in?')).toBeTruthy()
  })
})

// ── Question 2; City ─────────────────────────────────────────────────────────

describe('Question 2; City', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
  })

  it('renders city options', () => {
    expect(visibleLabels()).toEqual(['Calgary', 'Edmonton', 'Red Deer', 'Other'])
    expect(screen.queryByText('Medicine Hat')).toBeNull()
    expect(revealTile('Medicine Hat')).toBeTruthy()
  })

  it('shows Question 2 of 5', () => {
    expect(screen.getByText(/question 2 of 5/i)).toBeTruthy()
  })

  it('clicking a city advances to question 3', () => {
    clickTile('Medicine Hat')
    expect(screen.getByText("What are you interested in?")).toBeTruthy()
  })
})

// ── Question 3; Field ────────────────────────────────────────────────────────

describe('Question 3; Field', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Medicine Hat')
  })

  it('renders field options', () => {
    expect(screen.getByText('STEM & Engineering')).toBeTruthy()
    expect(screen.getByText('Health & Medicine')).toBeTruthy()
    expect(screen.queryByText('Trades')).toBeNull()
    fireEvent.click(document.querySelector('[data-quiz-more]')!)
    expect(screen.getByText('Trades')).toBeTruthy()
    expect(screen.getByText('Still figuring it out')).toBeTruthy()
    expect(document.querySelectorAll('.sabm-opt')).toHaveLength(3)
  })

  it('shows Question 3 of 5', () => {
    expect(screen.getByText(/question 3 of 5/i)).toBeTruthy()
  })

  it('Previous button returns to city question', () => {
    fireEvent.click(screen.getByText('← Previous'))
    expect(screen.getByText('Where are you based?')).toBeTruthy()
  })

  it('clicking a field advances to question 4', () => {
    clickTile('Still figuring it out')
    expect(screen.getByText("What's your academic average?")).toBeTruthy()
  })
})

// ── Question 4; Average ──────────────────────────────────────────────────────

describe('Question 4; Average', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
  })

  it('renders average options', () => {
    expect(screen.getByText('90% or higher')).toBeTruthy()
    expect(screen.getByText('80 – 89%')).toBeTruthy()
    expect(screen.getByText('Below 80%')).toBeTruthy()
    expect(screen.getByText("I'd rather not say")).toBeTruthy()
  })

  it('shows Question 4 of 5', () => {
    expect(screen.getByText(/question 4 of 5/i)).toBeTruthy()
  })

  it('clicking an average advances to question 5', () => {
    clickTile("I'd rather not say")
    expect(screen.getByText("Where are you planning to study?")).toBeTruthy()
  })
})

// ── Question 5; Institution ──────────────────────────────────────────────────

describe('Question 5; Institution', () => {
  beforeEach(() => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    clickTile('Medicine Hat')
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
  })

  it('renders institution options', () => {
    expect(screen.getByText('University of Calgary')).toBeTruthy()
    expect(screen.getByText('University of Alberta')).toBeTruthy()
    // Under the tiles on every page, not a tile among the schools.
    expect(document.querySelector('.sabm-opts')!.textContent).not.toContain('Somewhere else')
    expect(document.querySelector('.sabm-escape')?.textContent).toBe('Somewhere else, or not sure')
  })

  it('takes several schools and passes them all to the matcher', () => {
    fireEvent.click(revealTile('University of Calgary'))
    act(() => { vi.runAllTimers() })
    // A tap picks; it does not advance.
    expect(screen.getByText('Where are you planning to study?')).toBeTruthy()
    fireEvent.click(revealTile('SAIT'))
    fireEvent.click(revealTile('University of Calgary'))
    fireEvent.click(revealTile('Mount Royal University'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with 2 schools' }))
    act(() => { vi.runAllTimers() })
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    // List order, not tap order.
    expect(JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY)!).answers.institution).toBe('Mount Royal University|SAIT')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.targetInstitutions).toEqual(['Mount Royal University', 'SAIT'])
    expect(screen.getByRole('button', { name: /^Mount Royal University, SAIT\. Change your answer/ })).toBeTruthy()
  })

  it('shows Question 5 of 5', () => {
    expect(screen.getByText(/question 5 of 5/i)).toBeTruthy()
  })

  it('clicking an institution advances to results', () => {
    clickTile('Somewhere else, or not sure')
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
  })
})

// ── Results ───────────────────────────────────────────────────────────────────

describe('Results', () => {
  it('shows "0 scholarships found" when matchAll returns empty', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    expect(screen.getByText(/^Showing 0 scholarships/i)).toBeTruthy()
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

  it('keeps the fit ordering label without decorative rank numbers', () => {
    const s1 = makeScholarship({ id: 1, title: 'Ranked Award' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/Best fit first/)).toBeTruthy()
    expect(document.querySelector('.sabm-row-num')).toBeNull()
  })

  // Critique 2026-09-24: in September every top-fit row opened in March.
  it('puts what is open tonight above what opens later, in two labelled groups', () => {
    const later = makeScholarship({ id: 1, title: 'Opens Later Award', deadline: '2099-05-30', openDate: '2099-03-01' })
    const now = makeScholarship({ id: 2, title: 'Open Now Award', deadline: '2099-05-30' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'good' as ConfidenceTier, confidence: 0.6, signals: [], checks: [] },
      { id: 2, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[later as any, now as any]} programs={[]} />)
    advanceToResults()
    const text = document.querySelector('.sabm-table')!.textContent!
    expect(text.indexOf('Open now, best fit first')).toBeLessThan(text.indexOf('Open Now Award'))
    expect(text.indexOf('Open Now Award')).toBeLessThan(text.indexOf('Upcoming or undated, best fit first'))
    expect(text.indexOf('Upcoming or undated, best fit first')).toBeLessThan(text.indexOf('Opens Later Award'))
  })

  // Critique 2026-09-26: Loran, due in 19 days, sat below spring awards.
  it('puts open awards due within 30 days first, whatever their fit', () => {
    const soonIso = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    const far = makeScholarship({ id: 1, title: 'Far Award', deadline: '2099-05-30' })
    const soon = makeScholarship({ id: 2, title: 'Soon Award', deadline: soonIso })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'good' as ConfidenceTier, confidence: 0.6, signals: [], checks: [] },
      { id: 2, tier: 'possible' as ConfidenceTier, confidence: 0.2, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[far as any, soon as any]} programs={[]} />)
    advanceToResults()
    const text = document.querySelector('.sabm-table')!.textContent!
    expect(text.indexOf('Due in the next 30 days, best fit first')).toBeLessThan(text.indexOf('Soon Award'))
    expect(text.indexOf('Soon Award')).toBeLessThan(text.indexOf('Open now, best fit first'))
    expect(text.indexOf('Open now, best fit first')).toBeLessThan(text.indexOf('Far Award'))
  })

  // Critique 2026-10-01: three possible matches due soon led, and the three
  // strong fits the Save button named sat last.
  // Critique 2026-10-02: a strong fit that opens in spring led above Loran,
  // due in 13 days. It now heads "Upcoming" instead; open strong fits still lead.
  it('leads with up to five open strong matches, above the ones due soon, and saves those', () => {
    const soonIso = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    const strongs = Array.from({ length: 6 }, (_, i) => makeScholarship({ id: i + 1, title: `Strong ${i + 1}`, deadline: '2099-05-30' }))
    const later = makeScholarship({ id: 7, title: 'Strong Later', deadline: '2099-05-30', openDate: '2099-03-01' })
    const soon = makeScholarship({ id: 9, title: 'Soon Award', deadline: soonIso })
    mockMatchAll.mockReturnValue([
      { id: 7, tier: 'strong' as ConfidenceTier, confidence: 0.95, signals: [], checks: [] },
      ...strongs.map(s => ({ id: s.id, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] })),
      { id: 9, tier: 'possible' as ConfidenceTier, confidence: 0.2, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[later, ...strongs, soon] as any[]} programs={[]} />)
    advanceToResults()
    const text = document.querySelector('.sabm-table')!.textContent!
    expect(text.indexOf('Your strongest matches')).toBeLessThan(text.indexOf('Strong 1'))
    expect(text.indexOf('Strong 5')).toBeLessThan(text.indexOf('Soon Award'))
    expect(text.indexOf('Soon Award')).toBeLessThan(text.indexOf('Strong 6'))
    expect(text.indexOf('Soon Award')).toBeLessThan(text.indexOf('Strong Later'))
    expect(text.indexOf('Upcoming or undated, best fit first')).toBeLessThan(text.indexOf('Strong Later'))
    fireEvent.click(screen.getByRole('button', { name: 'Save the 5 strong matches' }))
    expect(mockToggleSaved.mock.calls.map(c => c[0])).toEqual([1, 2, 3, 4, 5])
  })

  it('orders the due-soon group biggest first and leaves restricted awards in their fit order', () => {
    const soonIso = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    const small = makeScholarship({ id: 1, title: 'Small Soon', amount: '$500', deadline: soonIso })
    const big = makeScholarship({ id: 2, title: 'Big Soon', amount: '~$150,000', deadline: soonIso })
    const gated = makeScholarship({ id: 3, title: 'Gated Soon', amount: '$40,000', deadline: soonIso })
    const far = makeScholarship({ id: 4, title: 'Far Award', deadline: '2099-05-30' })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: [] },
      { id: 2, tier: 'good' as ConfidenceTier, confidence: 0.45, signals: [], checks: ['Needs an average of 88%'] },
      { id: 3, tier: 'good' as ConfidenceTier, confidence: 0.6, signals: [], checks: ['Youth in care only'] },
      { id: 4, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[small, big, gated, far] as any[]} programs={[]} />)
    advanceToResults()
    const text = document.querySelector('.sabm-table')!.textContent!
    expect(text.indexOf('Big Soon')).toBeLessThan(text.indexOf('Small Soon'))
    expect(text.indexOf('Small Soon')).toBeLessThan(text.indexOf('Open now, best fit first'))
    expect(text.indexOf('Open now, best fit first')).toBeLessThan(text.indexOf('Gated Soon'))
  })

  it('puts a better fit ahead of a bigger award in the due-soon group, and says due today', () => {
    // Alberta's date, as the component counts it. The host's own date is a day
    // ahead from 6 p.m. in Alberta on a UTC runner, which failed CI at 01:18 UTC.
    const todayIso = albertaDate()
    const soonIso = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    const bigPossible = makeScholarship({ id: 1, title: 'Big Possible', amount: '~$100,000', deadline: todayIso })
    const smallStrong = makeScholarship({ id: 2, title: 'Small Strong', amount: '$500', deadline: soonIso })
    const others = [3, 4, 5, 6, 7].map(id => makeScholarship({ id, title: `Good ${id}`, deadline: '2099-05-30' }))
    mockMatchAll.mockReturnValue([
      { id: 2, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      ...[3, 4, 5, 6, 7].map(id => ({ id, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: [] })),
      { id: 1, tier: 'possible' as ConfidenceTier, confidence: 0.2, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[bigPossible, smallStrong, ...others] as any[]} programs={[]} />)
    advanceToResults()
    const text = document.querySelector('.sabm-table')!.textContent!
    expect(text.indexOf('Small Strong')).toBeLessThan(text.indexOf('Big Possible'))
    expect(text).toMatch(/due today/i)
    // Due today is not "the next 30 days": it lists below that group.
    expect(text.indexOf('Open now, best fit first')).toBeLessThan(text.indexOf('Big Possible'))
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
    expect(screen.getByText(/^Showing 2 scholarships/i)).toBeTruthy()
  })

  it('shows "1 scholarship found" with singular form', () => {
    const s1 = makeScholarship({ id: 1, title: 'Lone Scholarship' })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^Showing 1 scholarship\b/i)).toBeTruthy()
  })

  it('states the displayed and total counts, and shows the rest on request', () => {
    // "We found 10" would be the cap talking; 25 matched.
    const many = Array.from({ length: 25 }, (_, i) => makeScholarship({ id: i + 1, title: `Award ${i + 1}` }))
    mockMatchAll.mockReturnValue(many.map(s => ({ id: s.id, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] })))
    render(<EligibilityQuiz scholarships={many as any} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/^Showing 10 of 25 scholarships/i)).toBeTruthy()
    expect(screen.queryByText('Award 25')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /show all 25 scholarships/i }))
    expect(screen.getByText('Award 25')).toBeTruthy()
    expect(screen.getByText(/^Showing 25 scholarships/i)).toBeTruthy()
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

  // The tier stays beside the check, so "N strong matches" counts rows that
  // say Strong (critique 2026-09-26). capTier keeps a restricted award below
  // Strong, so the pair never reads as a promise.
  it('shows an unasked requirement beside the match label', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: ['Based on financial need'] },
      { id: 2, tier: 'good' as ConfidenceTier, confidence: 0.5, signals: [], checks: ['Indigenous students only'] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Check: Based on financial need')).toBeTruthy()
    expect(screen.getByText('Check: Indigenous students only')).toBeTruthy()
    expect(screen.getByText('Strong match')).toBeTruthy()
    expect(screen.getByText('Good match')).toBeTruthy()
    expect(screen.queryByText('1 strong match')).toBeNull()
  })

  it('never says the student qualifies', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.queryByText(/qualify/i)).toBeNull()
    expect(screen.getByText(/Confirm eligibility and dates on the provider’s site/i)).toBeTruthy()
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

  it('the empty state can recover by editing an answer without a duplicate reset button', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText(/no matches found for your profile/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Still figuring it out\. Change your answer/ }))
    clickTile('STEM & Engineering')
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    expect((mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0].fields).toEqual(['STEM'])
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
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
    advanceToResults('Programs')
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
    advanceToResults('Programs')
    expect(screen.getByText('Pays you')).toBeTruthy()
    expect(screen.getByText('$3,000 stipend')).toBeTruthy()
  })

  it('links open programs to their providers and unknown or closed programs to their details', () => {
    mockMatchPrograms.mockReturnValue([
      { id: 51, name: 'Open Program', deadline: '2099-06-01' },
      { id: 52, name: 'Rolling Program', deadline: 'Ongoing' },
      { id: 53, name: 'Unknown Program', deadline: 'TBA' },
      { id: 54, name: 'Closed Program', deadline: '2001-06-01' },
    ].map(p => ({ ...p, provider: 'Provider', url: `https://provider.example/${p.id}`, paid: false, stipend: null, category: null })))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Programs')
    const actions = [...document.querySelectorAll<HTMLAnchorElement>('.sabl-apply')]
    expect(actions.map(a => a.textContent?.replace(/[↗→]/g, '').trim())).toEqual(['Apply', 'Apply', 'Details', 'Details'])
    expect(actions.map(a => a.getAttribute('href'))).toEqual([
      'https://provider.example/51', 'https://provider.example/52', '/programs/unknown-program/', '/programs/closed-program/',
    ])
    expect(actions.map(a => a.target)).toEqual(['_blank', '_blank', '', ''])
  })

  it('saving keeps the save event and state without decorative confetti', () => {
    const s1 = makeScholarship({ id: 1 })
    mockMatchAll.mockReturnValue([{ id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] }])
    mockGetSaved.mockReturnValueOnce([]).mockReturnValue([1])
    render(<EligibilityQuiz scholarships={[s1 as any]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /^save: scholarship 1$/i }))
    expect(mockToggleSaved).toHaveBeenCalledWith(1)
    expect(mockSendEvent).toHaveBeenCalledWith('save', 'scholarship', 1, 'quiz')
    expect(mockShowConfetti).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^Remove from saved: scholarship 1$/i }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps per-row fit labels without a duplicate tier recap', () => {
    const s1 = makeScholarship({ id: 1 })
    const s2 = makeScholarship({ id: 2 })
    mockMatchAll.mockReturnValue([
      { id: 1, tier: 'strong' as ConfidenceTier, confidence: 0.9, signals: [], checks: [] },
      { id: 2, tier: 'good'   as ConfidenceTier, confidence: 0.7, signals: [], checks: [] },
    ])
    render(<EligibilityQuiz scholarships={[s1 as any, s2 as any]} programs={[]} />)
    advanceToResults()
    expect(screen.getByText('Strong match')).toBeTruthy()
    expect(screen.getByText('Good match')).toBeTruthy()
    expect(screen.queryByText('1 strong match')).toBeNull()
    expect(screen.queryByText('1 good match')).toBeNull()
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
    expect(screen.getByText(/question 2 of 5/i)).toBeTruthy()
  })

  it('starts over when the saved progress is older than the TTL', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' }, savedAt: Date.now() - QUIZ_TTL_MS - 1,
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 5/i)).toBeTruthy()
  })

  it('starts over on progress written before timestamps existed', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' },
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 5/i)).toBeTruthy()
  })
})

// ── Progress does not outlive the tab ────────────────────────────────────────

describe('Progress does not outlive the tab', () => {
  it('ignores and clears progress left in localStorage by an older build', () => {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      step: 1, answers: { searchType: 'scholarships' }, savedAt: Date.now(),
    }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText(/question 1 of 5/i)).toBeTruthy()
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

  /** Answer the first five, choosing `city`. */
  function answerFive(city: string) {
    clickTile('Scholarships')
    clickTile(city)
    clickTile('Still figuring it out')
    clickTile("I'd rather not say")
    clickTile('Somewhere else, or not sure')
  }

  it('asks a sixth question when the city has school-restricted awards', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerFive('Calgary')
    expect(screen.getByText('Which school do you go to?')).toBeTruthy()
    expect(screen.getByText(/question 6 of 6/i)).toBeTruthy()
  })

  it('stays at five questions for a city with no school-restricted awards', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerFive('Edmonton')
    expect(screen.queryByText('Which school do you go to?')).toBeNull()
  })

  it('offers each school once and an escape hatch', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerFive('Calgary')
    expect(screen.getByText('Western Canada High School')).toBeTruthy()
    expect(screen.getByText('Bowness High School')).toBeTruthy()
    expect(screen.getByText("My school isn't listed")).toBeTruthy()
  })

  it('passes the chosen school to the matcher', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerFive('Calgary')
    clickTile('Bowness High School')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.specificSchool).toBe('Bowness High School')
  })

  it('drops stored school and board answers when the city is changed on the way back', () => {
    // Seeded rather than clicked: the school question is the last step, so the
    // only way to reach a set school and then change city is a restored run.
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
      version: 3, step: 5,
      answers: {
        searchType: 'scholarships', city: 'Calgary', field: '',
        average: '', institution: '', school: 'Bowness High School', board: 'CBE',
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
    clickTile('Somewhere else, or not sure')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.city).toBe('Edmonton')
    expect(profile.specificSchool).toBeNull()
    expect(profile.schoolBoard).toBeNull()
  })

  // "My school isn't listed" is an answer: the matcher reads '' as "none of the
  // listed schools" and drops the school-only awards.
  it('passes the escape hatch as an empty answer, not a skip', () => {
    render(<EligibilityQuiz scholarships={calgarySchools as any} programs={[]} />)
    answerFive('Calgary')
    clickTile("My school isn't listed")
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.specificSchool).toBe('')
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
    for (const text of ['Medicine Hat', 'Still figuring it out', "I'd rather not say"]) clickTile(text)
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start']])
    fireEvent.click(revealTile('Somewhere else, or not sure'))
    act(() => { vi.advanceTimersByTime(259) })
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start']])
    act(() => { vi.advanceTimersByTime(1) })
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start'], ['quiz_complete']])
  })

  it('does not count restored results or an answer cancelled by navigation', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 3, step: 5, answers: { city: 'Medicine Hat' }, savedAt: Date.now() }))
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
    expect(screen.queryByRole('button', { name: /^Grade 12\. Change your answer/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Still figuring it out\. Change your answer/ }))
    expect(screen.getByText('What are you interested in?')).toBeTruthy()
    clickTile('STEM & Engineering')
    expect(screen.getByText('You answered')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^STEM & Engineering\. Change your answer/ })).toBeTruthy()
  })
})

describe('Town filter on the city question', () => {
  it('narrows the tiles as you type and always keeps Other Alberta', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    const input = screen.getByRole('searchbox', { name: /filter the list of towns/i }) as HTMLInputElement
    act(() => { input.value = 'leth'; dispatch.input(input) })
    expect(screen.queryByText('Lethbridge')).toBeTruthy()
    expect(screen.queryByText('Calgary')).toBeNull()
    expect(screen.queryByText('Other Alberta')).toBeTruthy()
  })

  it('starts with three population-ordered cities and Other navigation', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    const labels = [...document.querySelectorAll('.sabm-opt-label')].map(e => e.textContent)
    expect(labels).toEqual(['Calgary', 'Edmonton', 'Red Deer', 'Other'])
    expect(document.querySelector('[data-quiz-more]')?.textContent).toContain('More cities')
  })

  it('says Other Alberta includes a town it does not list, and Enter still picks a real city', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Scholarships')
    const input = screen.getByRole('searchbox', { name: /filter the list of towns/i }) as HTMLInputElement
    act(() => { input.value = 'Vulcan'; dispatch.input(input) })
    expect(screen.queryByText('Includes Vulcan')).toBeTruthy()
    act(() => { input.value = 'leth'; dispatch.input(input) })
    expect(screen.queryByText('Includes leth')).toBeNull()
    expect(screen.queryByText('Another town or county')).toBeTruthy()
  })
})

describe('Batch navigation', () => {
  const stored = () => JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY)!)
  function startCity() {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Both')
  }
  function typeQuery(value: string) {
    const input = screen.getByRole('searchbox') as HTMLInputElement
    act(() => { input.value = value; dispatch.input(input) })
    return input
  }

  it('reaches every city exactly once without answering, writing progress, or sending events', () => {
    startCity()
    const before = sessionStorage.getItem(QUIZ_STORAGE_KEY)
    const events = mockSendEvent.mock.calls.slice()
    const seen: string[] = []
    for (let i = 0; i < 30; i++) {
      expect(document.querySelectorAll('.sabm-opt').length).toBeLessThanOrEqual(4)
      seen.push(...visibleAnswerTiles().map(tile => tile.querySelector('.sabm-opt-label')!.textContent!))
      const more = document.querySelector('[data-quiz-more]')
      if (!more) break
      expect(visibleLabels().at(-1)).toBe('Other')
      fireEvent.click(more)
      act(() => { vi.advanceTimersByTime(300) })
      expect(screen.getByText('Where are you based?')).toBeTruthy()
      expect(sessionStorage.getItem(QUIZ_STORAGE_KEY)).toBe(before)
      expect(mockSendEvent.mock.calls).toEqual(events)
    }
    expect(seen).toEqual(QUIZ_QUESTIONS.find(q => q.key === 'city')!.opts.map(o => o.label))
    expect(new Set(seen).size).toBe(seen.length)
    expect(stored().answers).toEqual({ searchType: 'both' })
    expect(localStorage.getItem(QUIZ_STORAGE_KEY)).toBeNull()
  })

  it('Previous options changes only the batch; Previous returns to the prior question', () => {
    startCity()
    const first = visibleLabels()
    fireEvent.click(document.querySelector('[data-quiz-more]')!)
    expect(visibleLabels()).not.toEqual(first)
    fireEvent.click(screen.getByRole('button', { name: /Previous options$/i }))
    expect(visibleLabels()).toEqual(first)
    expect(screen.getByText(/Question 2 of 5/)).toBeTruthy()
    fireEvent.click(screen.getByText('← Previous'))
    expect(screen.getByText('What are you looking for?')).toBeTruthy()
  })

  it('ignores rapid answer and navigation clicks until the selected answer commits', () => {
    startCity()
    fireEvent.click(revealTile('Calgary'))
    fireEvent.click(screen.getByText('Edmonton'))
    fireEvent.click(document.querySelector('[data-quiz-more]')!)
    fireEvent.click(screen.getByText('← Previous'))
    act(() => { vi.advanceTimersByTime(259) })
    expect(stored().step).toBe(1)
    expect(stored().answers.city).toBeUndefined()
    expect(visibleLabels()).toEqual(['Calgary', 'Edmonton', 'Red Deer', 'Other'])
    act(() => { vi.advanceTimersByTime(1) })
    expect(stored().answers.city).toBe('Calgary')
    expect(stored().step).toBe(2)
  })

  it('searches all city batches and resets the visible batch when the query changes or clears', () => {
    startCity()
    revealTile('Other Alberta')
    const input = typeQuery('leth')
    expect(visibleLabels()).toEqual(['Lethbridge', 'Other Alberta'])
    expect(screen.queryByRole('button', { name: /Previous options$/i })).toBeNull()
    act(() => { dispatch.keyDown(input, { key: 'Enter' }); vi.runAllTimers() })
    expect(stored().answers.city).toBe('Lethbridge')
    expect(stored().answers.town).toBeUndefined()
    fireEvent.click(screen.getByText('← Previous'))
    typeQuery('Vulcan')
    expect(visibleLabels()).toEqual(['Other Alberta'])
    expect(screen.getByText('Includes Vulcan')).toBeTruthy()
    typeQuery('')
    expect(visibleLabels()).toEqual(['Calgary', 'Edmonton', 'Red Deer', 'Other'])
    const unmatched = typeQuery('Vulcan')
    act(() => { dispatch.keyDown(unmatched, { key: 'Enter' }); vi.runAllTimers() })
    expect(stored().answers.city).toBe('Other Alberta')
    expect(stored().answers.town).toBe('Vulcan')
  })

  it('restores the chosen city batch on Previous and a fresh mount without changing the stored schema', () => {
    startCity()
    clickTile('Medicine Hat')
    fireEvent.click(screen.getByText('← Previous'))
    expect(visibleAnswerTiles().some(t => t.textContent?.includes('Medicine Hat'))).toBe(true)
    const before = stored()
    expect(before.step).toBe(1)
    expect(before.answers.city).toBe('Medicine Hat')
    expect(Object.keys(before).sort()).toEqual(['answers', 'savedAt', 'step', 'version'])
    cleanup()
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText('Where are you based?')).toBeTruthy()
    expect(visibleAnswerTiles().some(t => t.textContent?.includes('Medicine Hat'))).toBe(true)
  })

  it('edits a late-batch institution directly and returns to results after the answer', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults()
    fireEvent.click(screen.getByRole('button', { name: /^Somewhere else, or not sure\. Change your answer/ }))
    expect(screen.getByText('Where are you planning to study?')).toBeTruthy()
    expect(visibleAnswerTiles().some(t => t.textContent?.includes('Somewhere else, or not sure'))).toBe(true)
    const input = typeQuery('Red Deer')
    expect(visibleLabels()).toEqual(['Red Deer Polytechnic', 'Somewhere else, or not sure'])
    // Enter picks the match and clears the box for the next school.
    act(() => { dispatch.keyDown(input, { key: 'Enter' }) })
    expect(input.value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Continue with 1 school' }))
    act(() => { vi.runAllTimers() })
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    expect(stored().answers.institution).toBe('Red Deer Polytechnic')
  })

  it('searches five-option school lists and keeps the empty answer available', () => {
    const schools = ['Alpha School', 'Beta School', 'Delta School', 'Omega School']
      .map((name, i) => schoolRestricted(i + 1, name))
    render(<EligibilityQuiz scholarships={schools as any} programs={[]} />)
    for (const label of ['Scholarships', 'Calgary', 'Still figuring it out', "I'd rather not say", 'Somewhere else, or not sure']) clickTile(label)
    // The empty answer sits under the tiles, after every school.
    expect(visibleLabels()).toEqual(['Alpha School', 'Beta School', 'Delta School', 'Omega School', "My school isn't listed"])
    typeQuery('Omega')
    expect(visibleLabels()).toEqual(['Omega School', "My school isn't listed"])
    clickTile("My school isn't listed")
    expect(stored().answers.school).toBe('')
    expect((mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0].specificSchool).toBe('')
  })

  it('clears a previous school and resets its batch after the board changes', () => {
    const schools = Array.from({ length: 8 }, (_, i) => makeScholarship({ id: i + 1, region: 'Calgary', eligibility: {
      ...EMPTY_ELIGIBILITY, schoolBoards: ['CBE'], specificSchools: [`Public School ${i + 1}`],
    } }))
    schools.push(makeScholarship({ id: 20, region: 'Calgary', eligibility: {
      ...EMPTY_ELIGIBILITY, schoolBoards: ['CCSD'], specificSchools: ['Catholic School'],
    } }))
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 3, step: 6, savedAt: Date.now(), answers: {
      searchType: 'scholarships', city: 'Calgary', field: '', average: '', institution: '', board: 'CBE', school: 'Public School 8',
    } }))
    render(<EligibilityQuiz scholarships={schools as any} programs={[]} />)
    expect(screen.getByText('Public School 8')).toBeTruthy()
    fireEvent.click(screen.getByText('← Previous'))
    clickTile('Calgary Catholic School District')
    expect(stored().answers.school).toBeUndefined()
    expect(visibleLabels()).toEqual(['Catholic School', "My school isn't listed"])
    expect(screen.queryByRole('button', { name: /Previous options$/i })).toBeNull()
    clickTile('Catholic School')
    const profile = (mockMatchAll.mock.calls.at(-1) as unknown as any[])?.[0]
    expect(profile.schoolBoard).toBe('CCSD')
    expect(profile.specificSchool).toBe('Catholic School')
  })
})

describe('Programs-only questions and session migration', () => {
  it('asks only search type, grade and field and persists the three-step version', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    clickTile('Programs')
    expect(screen.getByText('Question 2 of 3')).toBeTruthy()
    clickTile('Grade 11')
    expect(screen.getByText("What are you interested in?")).toBeTruthy()
    expect(screen.getByText('Question 3 of 3')).toBeTruthy()
    clickTile('Trades')
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    const saved = JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY)!)
    expect(saved).toMatchObject({ version: 3, step: 3, answers: { searchType: 'programs', grade: '11', field: 'trades' } })
    expect(Object.keys(saved.answers).sort()).toEqual(['field', 'grade', 'searchType'])
    expect(mockMatchAll).not.toHaveBeenCalled()
    expect(mockMatchPrograms).toHaveBeenLastCalledWith([], saved.answers, Infinity, expect.any(Date))
    expect(mockSendEvent.mock.calls).toEqual([['quiz_start'], ['quiz_complete']])
  })

  it.each([
    [0, 'What are you looking for?'], [1, 'What grade are you in?'],
    [2, "What are you interested in?"], [3, "What are you interested in?"],
    [4, 'Your combo'], [6, 'Your combo'], [8, 'Your combo'],
  ] as const)('maps legacy programs step %i to the same remaining matching inputs', (step, heading) => {
    const answers = { searchType: 'programs', grade: '11', city: 'Calgary', field: 'STEM' }
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step, answers, savedAt: Date.now() }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    expect(mockSendEvent).not.toHaveBeenCalled()
    const saved = JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY)!)
    expect(saved.version).toBe(3)
    expect(saved.answers.grade).toBe('11')
    expect(saved.answers.field).toBe('STEM')
  })

  it('does not remigrate completed version-2 programs results back to a question', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 2, step: 3, savedAt: Date.now(), answers: { searchType: 'programs', grade: '12', field: '' } }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    expect(mockSendEvent).not.toHaveBeenCalled()
  })

  it('walks the required scholarship questions when a programs result is changed to Both', () => {
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    advanceToResults('Programs')
    fireEvent.click(screen.getByRole('button', { name: /^Programs\. Change your answer/ }))
    clickTile('Both')
    expect(screen.getByText('Where are you based?')).toBeTruthy()
    for (const label of ['Medicine Hat', 'Still figuring it out', "I'd rather not say", 'Somewhere else, or not sure']) clickTile(label)
    expect(screen.getByRole('heading', { name: 'Your combo' })).toBeTruthy()
    const saved = JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY)!)
    expect(saved.step).toBe(5)
    expect(saved.answers.searchType).toBe('both')
    expect(saved.answers.city).toBe('Medicine Hat')
  })

  it('drops the grade from scholarship progress saved before version 3 and keeps its place', () => {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 2, step: 3, savedAt: Date.now(), answers: { searchType: 'scholarships', grade: '11', city: 'Calgary' } }))
    render(<EligibilityQuiz scholarships={[]} programs={[]} />)
    expect(screen.getByText("What are you interested in?")).toBeTruthy()
    expect(screen.getByText(/question 3 of 5/i)).toBeTruthy()
  })
})
