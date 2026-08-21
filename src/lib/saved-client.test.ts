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

function schWrap(id: number, title: string, deadline: string | null) {
  return `
    <div class="h-full" data-sv-wrap data-type="scholarship" data-id="${id}" hidden>
      <div class="sabl-card h-full" data-id="${id}" data-name="${title}"
           ${deadline ? `data-deadline="${deadline}"` : ''} data-amount="$1,000" data-url="https://x.example">
        <span class="sabl-days" data-sv-chip></span>
        <button type="button" class="sabl-save on" data-sv-remove aria-label="Remove bookmark">★</button>
        <a href="https://x.example" class="sabl-apply" data-sv-apply>Apply →</a>
      </div>
    </div>`
}

function prgWrap(id: number, name: string, deadline: string | null) {
  return `
    <div class="h-full" data-sv-wrap data-type="program" data-id="${id}" hidden>
      <div class="sabl-card h-full" data-id="${id}" data-name="${name}"
           ${deadline ? `data-deadline="${deadline}"` : ''} data-url="https://y.example">
        <span class="sabl-days" data-sv-chip></span>
        <button type="button" class="sabl-save on" data-sv-remove aria-label="Remove bookmark">★</button>
      </div>
    </div>`
}

function mount() {
  document.body.innerHTML = `
    <div id="sab-saved">
      <div class="sabl-page" data-sv-skeleton>skeleton</div>
      <div class="sabl-page" data-sv-content hidden>
        <p data-sv-count></p>
        <button data-sv-view="list" class="on" aria-pressed="true">List</button>
        <button data-sv-view="calendar" aria-pressed="false">Calendar</button>
        <div data-sv-empty hidden>empty</div>
        <div data-sv-list hidden>
          <div data-sv-sh-section hidden>
            <span data-sv-sh-label></span>
            <div class="sabl-grid">${schWrap(1, 'Big Award', '2026-05-01')}${schWrap(2, 'Closed Award', '2026-01-01')}</div>
          </div>
          <div data-sv-pr-section hidden>
            <span data-sv-pr-label></span>
            <div class="sabl-grid">${prgWrap(7, 'Summer Lab', '2026-06-15')}</div>
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
    expect($('[data-sv-skeleton]').hidden).toBe(true)
    expect($('[data-sv-content]').hidden).toBe(false)
    expect($('[data-sv-empty]').hidden).toBe(false)
    expect($('[data-sv-list]').hidden).toBe(true)
    expect($('[data-sv-count]').textContent).toBe('0 items bookmarked. Your shortlist lives here.')
  })

  it('unhides only the saved cards and writes counts and section labels', () => {
    savedSch = [1]
    savedPrg = [7]
    setup()
    expect($('[data-sv-empty]').hidden).toBe(true)
    expect($('[data-sv-list]').hidden).toBe(false)
    expect($$('[data-sv-wrap]').filter(w => !w.hidden).map(w => w.dataset.id)).toEqual(['1', '7'])
    expect($('[data-sv-count]').textContent).toBe('2 items bookmarked: 1 scholarship, 1 program.')
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
    const applyTexts = $$('[data-sv-apply]').map(a => a.textContent)
    expect(applyTexts).toEqual(['Apply →', 'Visit →'])
  })

  it('remove button unsaves the item, hides its card, and updates counts', () => {
    savedSch = [1, 2]
    setup()
    const wrap = $$('[data-sv-wrap]').find(w => w.dataset.id === '1')!
    click(wrap.querySelector('[data-sv-remove]')!)
    expect(savedSch).toEqual([2])
    expect(wrap.hidden).toBe(true)
    expect(showToast).toHaveBeenCalledWith('Removed from saved')
    expect($('[data-sv-count]').textContent).toBe('1 item bookmarked: 1 scholarship, 0 programs.')
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
    expect($('[data-cal-add]').textContent).toBe('✓ Added to calendar')

    // Back to list view
    click($('[data-sv-view="list"]'))
    expect($('[data-sv-cal]').hidden).toBe(true)
    expect($('[data-sv-list]').hidden).toBe(false)
  })
})
