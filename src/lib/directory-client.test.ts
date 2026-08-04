import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initDirectory } from './directory-client'
import type { DirectoryItem } from './directory-client'

vi.mock('./events.ts', () => ({ sendEvent: vi.fn() }))
vi.mock('./utils.ts', () => ({ showConfetti: vi.fn() }))

import { sendEvent } from './events.ts'
import { showConfetti } from './utils.ts'

// Minimal fixture mirroring the data-* contract the directory components emit.
type Item = DirectoryItem & { category: string | null; paid: boolean }
type State = { sort: string; category: string }

let savedIds: number[] = []

function card(id: number, name: string, category: string, paid: boolean, order: number) {
  return `
    <div class="sabl-card" data-dir-card data-id="${id}" data-name="${name}"
         data-category="${category}" data-paid="${paid ? '1' : ''}" data-order="${order}"
         data-search="${name.toLowerCase()}\n${category.toLowerCase()}">
      <button type="button" class="sabl-save" data-dir-save data-id="${id}" data-name="${name}"
              aria-label="Save ${name}" aria-pressed="false">☆</button>
    </div>`
}

function mountFixture() {
  document.body.innerHTML = `
    <div id="dir-root">
      <div class="sabl-stat-value" data-dir-stat>0</div>
      <input type="search" data-dir-search />
      <button class="sabl-chip on" data-fkey="sort" data-fval="order" aria-pressed="true">Order</button>
      <button class="sabl-chip" data-fkey="sort" data-fval="name" aria-pressed="false">A–Z</button>
      <button class="sabl-chip on" data-fkey="category" data-fval="all" aria-pressed="true">All</button>
      <button class="sabl-chip" data-fkey="category" data-fval="Science" aria-pressed="false">Science</button>
      <button class="sabl-chip" data-fkey="category" data-fval="Arts" aria-pressed="false">Arts</button>
      <div class="sabl-result-line" data-dir-count></div>
      <div class="sabl-grid" data-dir-grid>
        ${card(1, 'Beta Lab', 'Science', true, 2)}
        ${card(2, 'Alpha Camp', 'Arts', false, 1)}
        ${card(3, 'Gamma Research', 'Science', false, 3)}
      </div>
      <div class="sabl-empty" data-dir-empty hidden>
        <button type="button" data-dir-clear>Clear all filters</button>
      </div>
    </div>`
}

// initDirectory registers document-level delegated listeners; call it once for
// the whole file (like a real page script) and remount the fixture per test.
let initialized = false

function setup() {
  mountFixture()
  if (initialized) {
    document.dispatchEvent(new Event('astro:page-load'))
    return
  }
  initialized = true
  initDirectory<Item, State>('#dir-root', {
    itemType: 'scholarship',
    defaultState: { sort: 'order', category: 'all' },
    toggleKeys: ['category'],
    parseCard(el) {
      const d = el.dataset
      return {
        el,
        id: Number(d.id),
        name: d.name ?? '',
        search: d.search ?? '',
        category: d.category ?? null,
        paid: d.paid === '1',
        order: Number(d.order),
      } as Item & { order: number }
    },
    select(items, state, q) {
      const pool = state.category === 'all' ? items : items.filter(i => i.category === state.category)
      const searched = q ? pool.filter(i => i.search.includes(q)) : pool
      return [...searched].sort((a, b) =>
        state.sort === 'name'
          ? a.name.localeCompare(b.name)
          : (a as Item & { order: number }).order - (b as Item & { order: number }).order,
      )
    },
    countLine: (shown, total) => `${shown} OF ${total} SHOWN`,
    stat: visible => String(visible.filter(i => i.paid).length),
    getSavedIds: () => savedIds,
    toggleSave: id => {
      savedIds = savedIds.includes(id) ? savedIds.filter(s => s !== id) : [...savedIds, id]
      return savedIds
    },
    saveLabel: (name, saved) => (saved ? `Remove ${name} from saved` : `Save ${name}`),
  })
  document.dispatchEvent(new Event('astro:page-load'))
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const visibleCardNames = () =>
  $$('[data-dir-card]').filter(el => !el.hidden).map(el => el.dataset.name)
const gridOrderNames = () => $$('[data-dir-grid] [data-dir-card]').map(el => el.dataset.name)
const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }))

beforeEach(() => {
  savedIds = []
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('initDirectory', () => {
  it('paints count, stat, and default sort order on load', () => {
    setup()
    expect($('[data-dir-count]').textContent).toBe('3 OF 3 SHOWN')
    expect($('[data-dir-stat]').textContent).toBe('1')
    expect(gridOrderNames()).toEqual(['Alpha Camp', 'Beta Lab', 'Gamma Research'])
  })

  it('category chip filters cards and updates chip state', () => {
    setup()
    const science = $$('[data-fkey="category"]').find(c => c.dataset.fval === 'Science')!
    click(science)
    expect(visibleCardNames()).toEqual(['Beta Lab', 'Gamma Research'])
    expect(science.classList.contains('on')).toBe(true)
    expect(science.getAttribute('aria-pressed')).toBe('true')
    expect($$('[data-fkey="category"]').find(c => c.dataset.fval === 'all')!.classList.contains('on')).toBe(false)
    expect($('[data-dir-count]').textContent).toBe('2 OF 3 SHOWN')
  })

  it('re-clicking the active category toggles back to all', () => {
    setup()
    const science = $$('[data-fkey="category"]').find(c => c.dataset.fval === 'Science')!
    click(science)
    click(science)
    expect(visibleCardNames()).toHaveLength(3)
    expect(science.classList.contains('on')).toBe(false)
  })

  it('sort chip reorders the grid DOM', () => {
    setup()
    click($$('[data-fkey="sort"]').find(c => c.dataset.fval === 'name')!)
    expect(gridOrderNames()).toEqual(['Alpha Camp', 'Beta Lab', 'Gamma Research'])
    click($$('[data-fkey="sort"]').find(c => c.dataset.fval === 'order')!)
    expect(gridOrderNames()).toEqual(['Alpha Camp', 'Beta Lab', 'Gamma Research'])
  })

  it('search filters, shows empty state, and clear button resets everything', () => {
    setup()
    const input = $('[data-dir-search]') as HTMLInputElement
    input.value = 'zzz nothing'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(visibleCardNames()).toEqual([])
    expect($('[data-dir-empty]').hidden).toBe(false)
    expect(($('[data-dir-grid]') as HTMLElement).hidden).toBe(true)

    click($('[data-dir-clear]'))
    expect(visibleCardNames()).toHaveLength(3)
    expect($('[data-dir-empty]').hidden).toBe(true)
    expect(input.value).toBe('')
  })

  it('save button toggles state, label, and fires confetti only on save', () => {
    setup()
    const btn = $$('[data-dir-save]')[0]!
    click(btn)
    expect(btn.classList.contains('on')).toBe(true)
    expect(btn.textContent).toBe('★')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('aria-label')).toBe('Remove Alpha Camp from saved')
    expect(showConfetti).toHaveBeenCalledTimes(1)
    expect(sendEvent).toHaveBeenCalledWith('save', 'scholarship', 2)

    click(btn)
    expect(btn.classList.contains('on')).toBe(false)
    expect(btn.textContent).toBe('☆')
    expect(btn.getAttribute('aria-label')).toBe('Save Alpha Camp')
    expect(showConfetti).toHaveBeenCalledTimes(1)
    // Un-saving is not an event: the metric counts people who shortlisted it
    expect(sendEvent).toHaveBeenCalledTimes(1)
  })

  it('paints previously saved ids on load', () => {
    savedIds = [2]
    setup()
    const btn = $$('[data-dir-save]').find(b => b.dataset.id === '2')!
    expect(btn.classList.contains('on')).toBe(true)
    expect(btn.textContent).toBe('★')
  })

  it('fires search_empty after 1s only when the query misses the whole directory', () => {
    vi.useFakeTimers()
    setup()
    const input = $('[data-dir-search]') as HTMLInputElement

    // Misses everything → debounced event with the trimmed query
    input.value = '  quantum  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(1000)
    expect(sendEvent).toHaveBeenCalledWith('search_empty', undefined, undefined, 'quantum')

    // Query that matches a card but is starved by a filter → no event
    vi.mocked(sendEvent).mockClear()
    click($$('[data-fkey="category"]').find(c => c.dataset.fval === 'Arts')!)
    input.value = 'gamma'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(1500)
    expect(sendEvent).not.toHaveBeenCalled()

    // Typing again before the debounce fires cancels the pending event
    input.value = 'zzzz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(500)
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(2000)
    expect(sendEvent).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('re-parses cards and resets filters on subsequent astro:page-load', () => {
    setup()
    click($$('[data-fkey="category"]').find(c => c.dataset.fval === 'Science')!)
    expect(visibleCardNames()).toHaveLength(2)
    document.dispatchEvent(new Event('astro:page-load'))
    expect(visibleCardNames()).toHaveLength(3)
    expect($$('[data-fkey="category"]').find(c => c.dataset.fval === 'all')!.classList.contains('on')).toBe(true)
  })
})
