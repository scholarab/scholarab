import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initSaved } from './saved-client'

let savedSch: number[] = []
let savedPrg: number[] = []

vi.mock('./tracker.ts', () => ({
  getSaved: vi.fn(() => savedSch),
  getSavedPrograms: vi.fn(() => savedPrg),
  toggleSaved: vi.fn((id: number) => {
    savedSch = savedSch.includes(id) ? savedSch.filter(s => s !== id) : [...savedSch, id]
    return savedSch
  }),
  toggleSavedProgram: vi.fn((id: number) => {
    savedPrg = savedPrg.includes(id) ? savedPrg.filter(s => s !== id) : [...savedPrg, id]
    return savedPrg
  }),
}))
vi.mock('./utils.ts', () => ({
  showToast: vi.fn(),
  prefersReducedMotion: () => true, // makes the remove flow synchronous
  getToday: () => {
    const d = new Date('2026-04-05T00:00:00')
    d.setHours(0, 0, 0, 0)
    return d
  },
}))
vi.mock('./events.ts', () => ({ sendEvent: vi.fn() }))
vi.mock('./ics.ts', () => ({ buildICS: vi.fn(() => ''), downloadICS: vi.fn() }))

import { showToast } from './utils.ts'
import { downloadICS } from './ics.ts'

function mount() {
  document.body.innerHTML = `
    <div id="sab-saved">
      <script type="application/json" data-sv-items>${JSON.stringify([
        { type: 'scholarship', id: 1, name: 'Big Award', deadline: '2026-05-01', amount: '$1,000', url: 'https://x.example', href: '/scholarships/big-award/' },
        { type: 'scholarship', id: 2, name: 'Closed Award', deadline: '2026-01-01', amount: '$1,000', url: 'https://x.example', href: '/scholarships/closed-award/' },
        { type: 'program', id: 7, name: 'Summer Lab', deadline: '2026-06-15', url: 'https://y.example', href: '/programs/summer-lab/' },
      ])}</script>
      <div class="sabl-page" data-sv-skeleton>skeleton</div>
      <div class="sabl-page" data-sv-content hidden>
        <p data-sv-count></p>
        <button data-sv-view="list" class="on" aria-pressed="true">List</button>
        <button data-sv-view="calendar" aria-pressed="false">Calendar</button>
        <div data-sv-empty hidden>empty</div>
        <div data-sv-list hidden>
          <div data-sv-sh-section hidden>
            <span data-sv-sh-label></span>
            <div class="sabl-grid"></div>
          </div>
          <div data-sv-pr-section hidden>
            <span data-sv-pr-label></span>
            <div class="sabl-grid"></div>
          </div>
        </div>
        <div data-sv-cal hidden></div>
      </div>
    </div>`
}

let initialized = false
function setup() {
  mount()
  if (!initialized) { initSaved(); initialized = true }
  document.dispatchEvent(new Event('astro:page-load'))
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }))

beforeEach(() => {
  savedSch = []
  savedPrg = []
  vi.clearAllMocks()
})

afterEach(() => { document.body.innerHTML = '' })

describe('initSaved', () => {
  it('swaps the skeleton for content and shows the empty state with nothing saved', () => {
    setup()
    expect($$('[data-sv-wrap]')).toHaveLength(0)
    expect($('[data-sv-skeleton]').hidden).toBe(true)
    expect($('[data-sv-content]').hidden).toBe(false)
    expect($('[data-sv-empty]').hidden).toBe(false)
    expect($('[data-sv-list]').hidden).toBe(true)
    expect($('[data-sv-count]').textContent).toBe('0 items bookmarked. Your shortlist lives here.')
  })

  it('renders only the saved cards and writes counts and section labels', () => {
    savedSch = [1]
    savedPrg = [7]
    setup()
    expect($('[data-sv-empty]').hidden).toBe(true)
    expect($('[data-sv-list]').hidden).toBe(false)
    expect($$('[data-sv-wrap]').filter(w => !w.hidden).map(w => w.dataset.id)).toEqual(['1', '7'])
    // The per-type split belongs to the section heads, not to this line too.
    expect($('[data-sv-count]').textContent).toBe('2 items bookmarked. Your shortlist lives here.')
    expect($('[data-sv-sh-label]').textContent).toBe('SCHOLARSHIPS · 1')
    expect($('[data-sv-pr-label]').textContent).toBe('RESEARCH PROGRAMS · 1')
  })

  it('recomputes day chips from the current clock', () => {
    savedSch = [1, 2]
    savedPrg = [7]
    setup()
    // getToday mock = 2026-04-05
    const chips = Object.fromEntries($$('[data-sv-wrap]').map(w => [
      w.dataset.id, w.querySelector('[data-sv-chip]')!.textContent,
    ]))
    expect(chips['1']).toBe('26 DAYS LEFT')
    expect(chips['2']).toBe('CLOSED')
    expect(chips['7']).toBe('71 DAYS LEFT')
    // The word is recomputed from the clock; the ↗ marking it as a link that
    // leaves the site is markup and must survive that rewrite.
    const applyTexts = $$('[data-sv-apply]').map(a => a.textContent)
    expect(applyTexts).toEqual(['Apply↗', 'Visit↗'])
    expect($$('[data-sv-apply]')[1]!.getAttribute('aria-label')).toBe(
      "Visit Closed Award on the sponsor's site (opens in a new tab)",
    )
  })

  it('remove button unsaves the item, hides its card, and updates counts', () => {
    savedSch = [1, 2]
    setup()
    const wrap = $$('[data-sv-wrap]').find(w => w.dataset.id === '1')!
    click(wrap.querySelector('[data-sv-remove]')!)
    expect(savedSch).toEqual([2])
    expect(wrap.hidden).toBe(true)
    expect(showToast).toHaveBeenCalledWith('Removed from saved')
    expect($('[data-sv-count]').textContent).toBe('1 item bookmarked. Your shortlist lives here.')
  })

  it('removing the last item shows the empty state', () => {
    savedPrg = [7]
    setup()
    click($$('[data-sv-wrap]').find(w => w.dataset.id === '7')!.querySelector('[data-sv-remove]')!)
    expect($('[data-sv-empty]').hidden).toBe(false)
    expect($('[data-sv-list]').hidden).toBe(true)
  })

  it('calendar view renders the month grid, deadline list, and ICS download', () => {
    savedSch = [1]
    savedPrg = [7]
    setup()
    click($('[data-sv-view="calendar"]'))
    const cal = $('[data-sv-cal]')
    expect(cal.hidden).toBe(false)
    expect($('[data-sv-list]').hidden).toBe(true)
    expect(cal.querySelector('.sabs-cal-month')!.textContent).toBe('April 2026')
    expect(cal.textContent).toContain('No deadlines this month.')

    // The next-month arrow is badged with the deadline waiting in May, and
    // says so to a screen reader.
    const next = cal.querySelector('[data-cal-next]')!
    expect(next.querySelector('.sabs-cal-nav-count')!.textContent).toBe('1')
    expect(next.getAttribute('aria-label')).toBe('Next month, May 2026, 1 deadline')

    // Navigate to May 2026 where the scholarship deadline lands
    click(next)
    expect($('.sabs-cal-month').textContent).toBe('May 2026')
    expect($('[data-sv-cal]').textContent).toContain('Big Award')
    expect($('[data-sv-cal]').querySelector('.sabs-cal-cell.has-due .sabs-cal-due')!.textContent).toBe('1 DUE')

    // The arrow back to April carries no badge; the one to May did, which is
    // the only reason a student would press it.
    expect($('[data-cal-prev]').querySelector('.sabs-cal-nav-count')).toBeNull()
    expect($('[data-cal-prev]').getAttribute('aria-label')).toContain('no deadlines')

    click($('[data-cal-add]'))
    expect(downloadICS).toHaveBeenCalledTimes(1)
    // A download is all this does; the import happens in the student's calendar.
    expect($('[data-cal-add]').textContent).toBe('✓ Calendar file downloaded')

    // Back to list view
    click($('[data-sv-view="list"]'))
    expect($('[data-sv-cal]').hidden).toBe(true)
    expect($('[data-sv-list]').hidden).toBe(false)
  })

  it('restores cards saved in another tab without changing catalogue order', () => {
    savedSch = [2]
    setup()
    savedSch = [2, 1, 99999]
    window.dispatchEvent(new StorageEvent('storage', { key: 'scholarab_saved' }))
    expect($$('[data-sv-wrap]').map(w => w.dataset.id)).toEqual(['1', '2'])
    expect($('[data-sv-count]').textContent).toContain('2 items')
  })

  it('offers no calendar export when nothing saved carries a date', () => {
    // An undated bookmark produces zero VEVENTs, so the export used to hand the
    // student an empty 118-byte file and report "Added to calendar".
    savedSch = [3]
    mount()
    // Added here rather than to the shared fixture, so the other tests keep
    // counting exactly the cards they were written against.
    $('[data-sv-items]').textContent = JSON.stringify([
      { type: 'scholarship', id: 3, name: 'Undated Award', deadline: null, url: 'https://x.example', href: '/scholarships/undated-award/' },
    ])
    document.dispatchEvent(new Event('astro:page-load'))
    click($('[data-sv-view="calendar"]'))
    expect($('[data-sv-cal]').hidden).toBe(false)
    expect(document.querySelector('[data-cal-add]')).toBeNull()
    expect(downloadICS).not.toHaveBeenCalled()
  })
})
