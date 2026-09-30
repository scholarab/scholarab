import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initDirectory } from './directory-client'
import type { DirectoryItem } from './directory-client'

vi.mock('./events.ts', () => ({ sendEvent: vi.fn() }))
vi.mock('./utils.ts', () => ({ showConfetti: vi.fn() }))

import { readListContext } from './list-context.ts'
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
      <a class="sabl-name" href="/scholarships/${name.toLowerCase()}/">${name}</a>
      <button type="button" class="sabl-save" data-dir-save
              aria-label="Save ${name}" aria-pressed="false">☆</button>
    </div>`
}

function mountFixture() {
  document.body.innerHTML = `
    <div id="dir-root">
      <div class="sabl-stat-value" data-dir-stat>0</div>
      <div class="sabl-stat-label" data-dir-stat-label></div>
      <div class="sabl-stat-soon" data-dir-stat-soon hidden></div>
      <input type="search" data-dir-search />
      <label>Sort<select data-fselect="sort">
        <option value="order">Order</option>
        <option value="name">A–Z</option>
      </select></label>
      <label>Type<select data-fselect="category">
        <option value="all" data-filter-label="All">All (3)</option>
        <option value="Science" data-filter-label="Science">Science (2)</option>
        <option value="Arts" data-filter-label="Arts">Arts (1)</option>
      </select></label>
      <div class="sabl-result-line" data-dir-count></div>
      <p data-dir-corrected hidden></p>
      <div class="sabl-grid" data-dir-grid>
        ${card(1, 'Beta Lab', 'Science', true, 2)}
        ${card(2, 'Alpha Camp', 'Arts', false, 1)}
        ${card(3, 'Gamma Research', 'Science', false, 3)}
      </div>
      <div class="sabl-empty" data-dir-empty hidden>
        <div data-dir-empty-sub>Try clearing a filter.</div>
        <div data-dir-elsewhere hidden></div>
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
    select(items, state) {
      const pool = state.category === 'all' ? items : items.filter(i => i.category === state.category)
      return [...pool].sort((a, b) =>
        state.sort === 'name'
          ? a.name.localeCompare(b.name)
          : (a as Item & { order: number }).order - (b as Item & { order: number }).order,
      )
    },
    countFor: (items, state) => (state.category === 'all' ? items : items.filter(i => i.category === state.category)).length,
    summary: (visible, total) => ({
      count: `${visible.length} OF ${total} SHOWN`,
      stat: String(visible.filter(i => i.paid).length),
      'stat-label': visible.some(i => i.paid) ? 'PAID' : 'NONE PAID',
      'stat-soon': visible.every(i => i.paid) ? '' : `+${visible.filter(i => !i.paid).length} UNPAID`,
    }),
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
const selectFilter = (key: string, value: string, root = '') => {
  const select = document.querySelector<HTMLSelectElement>(`${root} select[data-fselect="${key}"]`)!
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return select
}

/**
 * The corpus-wide token index the client fetches when a search comes up
 * empty. "nursing" stands for a term on another page of this same directory,
 * "telescope" for one that only exists in the other directory.
 */
const INDEX = { s: ['alpha', 'camp', 'beta', 'lab', 'gamma', 'research', 'nursing'], p: ['telescope', 'observatory'] }

/** Let the index fetch and its .then chain settle before asserting. */
const flushIndex = async () => { for (let i = 0; i < 4; i++) await Promise.resolve() }

beforeEach(() => {
  savedIds = []
  history.replaceState(null, '', '/scholarships/')
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(INDEX) })))
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

  it('paints the stat label and the secondary stat on load', () => {
    setup()
    expect($('[data-dir-stat-label]').textContent).toBe('PAID')
    expect($('[data-dir-stat-soon]').textContent).toBe('+2 UNPAID')
    expect(($('[data-dir-stat-soon]') as HTMLElement).hidden).toBe(false)
  })

  it('hides the secondary stat when it returns empty, and follows the filters', () => {
    setup()
    selectFilter('category', 'Science')
    // Science holds Beta Lab (paid) and Gamma Research (unpaid).
    expect($('[data-dir-stat]').textContent).toBe('1')
    expect($('[data-dir-stat-soon]').textContent).toBe('+1 UNPAID')
    selectFilter('category', 'Arts')
    // Arts holds only Alpha Camp, which is unpaid: no paid money to headline.
    expect($('[data-dir-stat-label]').textContent).toBe('NONE PAID')
    expect($('[data-dir-stat-soon]').textContent).toBe('+1 UNPAID')
  })

  it('category select filters cards and exposes the selected option and counts', () => {
    setup()
    const category = selectFilter('category', 'Science')
    expect(visibleCardNames()).toEqual(['Beta Lab', 'Gamma Research'])
    expect(category.value).toBe('Science')
    expect(category.selectedOptions[0]?.textContent).toBe('Science (2)')
    expect([...category.options].map(option => option.textContent)).toEqual(['All (3)', 'Science (2)', 'Arts (1)'])
    expect($('[data-dir-count]').textContent).toBe('2 OF 3 SHOWN')
    expect(new URL(location.href).searchParams.get('category')).toBe('Science')
  })

  it('selecting all removes the category filter', () => {
    setup()
    selectFilter('category', 'Science')
    const category = selectFilter('category', 'all')
    expect(visibleCardNames()).toHaveLength(3)
    expect(category.value).toBe('all')
    expect(category.selectedOptions[0]?.textContent).toBe('All (3)')
    expect(new URL(location.href).searchParams.has('category')).toBe(false)
  })

  it('updates option counts for the search while retaining alternatives to the selected filter', () => {
    setup()
    const category = selectFilter('category', 'Science')
    const input = $('[data-dir-search]') as HTMLInputElement
    input.value = 'alpha'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(visibleCardNames()).toEqual([])
    expect([...category.options].map(option => option.textContent)).toEqual(['All (1)', 'Science (0)', 'Arts (1)'])
    expect(category.value).toBe('Science')
    selectFilter('category', 'Arts')
    expect(visibleCardNames()).toEqual(['Alpha Camp'])
    expect($('[data-dir-count]').textContent).toBe('1 OF 3 SHOWN')
  })

  it('sort select reorders the grid DOM', () => {
    setup()
    // Make the fixture's numeric order differ from its alphabetical order so
    // a select that failed to dispatch would not accidentally pass this test.
    $('[data-dir-card][data-id="2"]').dataset.order = '3'
    $('[data-dir-card][data-id="3"]').dataset.order = '1'
    document.dispatchEvent(new Event('astro:page-load'))
    expect(gridOrderNames()).toEqual(['Gamma Research', 'Beta Lab', 'Alpha Camp'])
    selectFilter('sort', 'name')
    expect(gridOrderNames()).toEqual(['Alpha Camp', 'Beta Lab', 'Gamma Research'])
    expect(($('select[data-fselect="sort"]') as HTMLSelectElement).value).toBe('name')
    selectFilter('sort', 'order')
    expect(gridOrderNames()).toEqual(['Gamma Research', 'Beta Lab', 'Alpha Camp'])
  })

  it('search filters, shows empty state, and clear button resets everything', () => {
    setup()
    selectFilter('category', 'Arts')
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
    expect(($('select[data-fselect="category"]') as HTMLSelectElement).value).toBe('all')
  })

  it('hands the detail pages the order actually on screen', () => {
    setup()
    // The order the reader sees, not the order the JSON is in; this is the
    // whole basis of the detail page's ‹ › arrows.
    click($('.sabl-name'))
    expect(readListContext()).toEqual({
      paths: visibleCardNames().map(n => `/scholarships/${(n ?? "").toLowerCase()}/`),
      filtered: false,
    })

    const input = $('[data-dir-search]') as HTMLInputElement
    input.value = 'alpha'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    click($('[data-dir-card]:not([hidden]) .sabl-name'))
    const narrowed = readListContext()!
    expect(narrowed.paths).toEqual(visibleCardNames().map(n => `/scholarships/${(n ?? "").toLowerCase()}/`))
    expect(narrowed.paths.length).toBeLessThan(3)
    // The detail page says "FILTERED · 1 OF 1" off this flag; without it the
    // reader is told they are 1 of 1 in the whole directory.
    expect(narrowed.filtered).toBe(true)

    click($('[data-dir-clear]'))
    click($('.sabl-name'))
    expect(readListContext()!.filtered).toBe(false)
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
    expect(sendEvent).toHaveBeenCalledWith('save', 'scholarship', 2, 'row')

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
    const btn = $('[data-dir-card][data-id="2"] [data-dir-save]')
    expect(btn.classList.contains('on')).toBe(true)
    expect(btn.textContent).toBe('★')
  })

  it('fires search_empty after 1s only when the query misses the whole site', async () => {
    history.replaceState(null, '', '/scholarships/calgary/')
    setup()
    const input = $('[data-dir-search]') as HTMLInputElement
    const type = async (v: string) => {
      input.value = v
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await flushIndex()
    }

    // Misses both directories → debounced event carrying query and page
    vi.useFakeTimers()
    await type('  quantum  ')
    vi.advanceTimersByTime(1000)
    expect(sendEvent).toHaveBeenCalledWith('search_empty', undefined, undefined, 'quantum | /scholarships/calgary/')
    vi.useRealTimers()

    // Query that matches a card but is starved by a filter → no event
    vi.mocked(sendEvent).mockClear()
    selectFilter('category', 'Arts')
    vi.useFakeTimers()
    await type('gamma')
    vi.advanceTimersByTime(1500)
    expect(sendEvent).not.toHaveBeenCalled()
    vi.useRealTimers()

    // Typing again before the debounce fires cancels the pending event
    vi.useFakeTimers()
    await type('zzzz')
    vi.advanceTimersByTime(500)
    await type('')
    vi.advanceTimersByTime(2000)
    expect(sendEvent).not.toHaveBeenCalled()
    vi.useRealTimers()
    history.replaceState(null, '', '/')
  })

  it('shows what the student meant when the words as typed find nothing', async () => {
    setup()
    const input = $('[data-dir-search]') as HTMLInputElement
    const note = $('[data-dir-corrected]') as HTMLElement
    vi.useFakeTimers()
    input.value = 'gamma reserch'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushIndex()
    vi.advanceTimersByTime(2000)
    expect(visibleCardNames()).toEqual(['Gamma Research'])
    expect(note.hidden).toBe(false)
    expect(note.textContent).toBe('No listing says "gamma reserch". Showing results for "gamma research".')
    // A typo that was corrected is not a content gap
    expect(sendEvent).not.toHaveBeenCalledWith('search_empty', undefined, undefined, expect.anything())

    input.value = 'gamma'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(note.hidden).toBe(true)
    vi.useRealTimers()
  })

  it('offers the wider directory instead of logging a gap that is not one', async () => {
    setup()
    const input = $('[data-dir-search]') as HTMLInputElement
    const elsewhere = $('[data-dir-elsewhere]') as HTMLElement
    const sub = $('[data-dir-empty-sub]') as HTMLElement

    // On the page but hidden by a filter: no fallback, no event.
    selectFilter('category', 'Arts')

    // "nursing" is absent from this page's cards but present in the index's
    // scholarship tokens, which is the facet-slice case.
    input.value = 'nursing'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushIndex()
    expect(elsewhere.hidden).toBe(false)
    const link = elsewhere.querySelector('a')!
    expect(link.getAttribute('href')).toBe('/scholarships/?q=nursing')
    expect(link.textContent).toContain('all scholarships')
    // The generic advice is wrong here: no filter on this page is hiding it.
    expect(sub.hidden).toBe(true)

    // Present only in the other directory → link across.
    input.value = 'telescope'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushIndex()
    expect(elsewhere.querySelector('a')!.getAttribute('href')).toBe('/programs/?q=telescope')

    // A true miss restores the generic copy and hides the link.
    input.value = 'quantum'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushIndex()
    expect(elsewhere.hidden).toBe(true)
    expect(sub.hidden).toBe(false)
  })

  it('picks up ?q= so a handoff from the other directory keeps the query', async () => {
    history.replaceState(null, '', '/scholarships/?q=alpha')
    setup()
    expect(($('[data-dir-search]') as HTMLInputElement).value).toBe('alpha')
    expect(visibleCardNames()).toEqual(['Alpha Camp'])
    history.replaceState(null, '', '/scholarships/')
  })


  it('re-parses cards and restores URL filters on subsequent astro:page-load', () => {
    setup()
    selectFilter('category', 'Science')
    expect(visibleCardNames()).toHaveLength(2)
    document.dispatchEvent(new Event('astro:page-load'))
    expect(visibleCardNames()).toHaveLength(2)
    expect(($('select[data-fselect="category"]') as HTMLSelectElement).value).toBe('Science')
  })
})

// ── group headers ─────────────────────────────────────────────────────────────
// Its own root and its own initDirectory: the fixture above has no groups, and
// the delegated listeners are document-level, so a second root is the cheapest
// way to exercise the grouped path without disturbing the first.

describe('grouped grids', () => {
  let groupInit = false

  function gcard(id: number, name: string, group: string) {
    return `<div class="sabl-card" data-dir-card data-id="${id}" data-name="${name}"
              data-group="${group}" data-search="${name.toLowerCase()}"></div>`
  }

  function setupGroups(state = 'all') {
    document.body.innerHTML = `
      <div id="grp-root">
        <label>Status<select data-fselect="group">
          <option value="all" data-filter-label="All">All (3)</option>
          <option value="open" data-filter-label="Open">Open (2)</option>
        </select></label>
        <div data-dir-count></div>
        <div class="sabl-grid" data-dir-grid>
          ${gcard(1, 'One', 'open')}${gcard(2, 'Two', 'open')}${gcard(3, 'Three', 'closed')}
        </div>
        <div data-dir-empty hidden></div>
      </div>`
    if (!groupInit) {
      groupInit = true
      initDirectory<DirectoryItem & { group: string }, { group: string }>('#grp-root', {
        itemType: 'scholarship',
        defaultState: { group: state },
        parseCard: el => ({
          el, id: Number(el.dataset.id), name: el.dataset.name ?? '',
          search: el.dataset.search ?? '', group: el.dataset.group ?? '',
        }),
        select: (items, st) => (st.group === 'all' ? items : items.filter(i => i.group === st.group)),
        countFor: (items, st) => (st.group === 'all' ? items : items.filter(i => i.group === st.group)).length,
        summary: visible => ({ count: `${visible.length} SHOWN` }),
        groups: { key: i => i.group, label: k => k.toUpperCase() },
        getSavedIds: () => [],
        toggleSave: () => [],
        saveLabel: n => n,
      })
    }
    document.dispatchEvent(new Event('astro:page-load'))
  }

  const layout = () =>
    [...document.querySelectorAll<HTMLElement>('[data-dir-grid] > *')]
      .filter(el => !el.hidden)
      .map(el => el.dataset.dirGroup ? `H:${el.dataset.dirGroup}:${el.querySelector('.sabl-group-count')!.textContent}` : el.dataset.name)

  afterEach(() => { document.body.innerHTML = '' })

  it('heads each run with its label and count', () => {
    setupGroups()
    expect(layout()).toEqual(['H:open:2', 'One', 'Two', 'H:closed:1', 'Three'])
  })

  it('drops the headers when a filter leaves one group', () => {
    setupGroups()
    selectFilter('group', 'open')
    expect(layout()).toEqual(['One', 'Two'])
    expect(document.querySelectorAll('[data-dir-grid] [data-dir-group]:not([hidden])').length).toBe(0)
  })

  it('restores them when the filter is lifted', () => {
    setupGroups()
    selectFilter('group', 'open')
    selectFilter('group', 'all')
    expect(layout()).toEqual(['H:open:2', 'One', 'Two', 'H:closed:1', 'Three'])
    expect(document.querySelectorAll('[data-dir-group="open"]').length).toBe(1)
  })

  it('shuts a run when its heading is clicked and keeps the count', () => {
    setupGroups()
    const open = document.querySelector<HTMLElement>('[data-dir-group="open"]')!
    click(open)
    // The heading stays, still counting all two: shut is not empty, and it is
    // the only thing left that can open the run again.
    expect(layout()).toEqual(['H:open:2', 'H:closed:1', 'Three'])
    expect(open.querySelector('.sabl-group')!.getAttribute('aria-expanded')).toBe('false')
    expect(open.querySelector('[data-dir-group-word]')!.textContent).toBe('Show')
    click(open)
    expect(layout()).toEqual(['H:open:2', 'One', 'Two', 'H:closed:1', 'Three'])
    expect(open.querySelector('.sabl-group')!.getAttribute('aria-expanded')).toBe('true')
    expect(open.querySelector('[data-dir-group-word]')!.textContent).toBe('Hide')
  })

  it('forgets what was shut on the next page load', () => {
    setupGroups()
    click(document.querySelector<HTMLElement>('[data-dir-group="closed"]')!)
    expect(layout()).toEqual(['H:open:2', 'One', 'Two', 'H:closed:1'])
    setupGroups()
    expect(layout()).toEqual(['H:open:2', 'One', 'Two', 'H:closed:1', 'Three'])
  })

  it('opens a default-shut run when a filter leaves nothing else', () => {
    document.body.innerHTML = `
      <div id="shut-root">
        <label>Status<select data-fselect="group">
          <option value="all" data-filter-label="All">All (4)</option>
          <option value="closed" data-filter-label="Closed">Closed (1)</option>
        </select></label>
        <div data-dir-count></div>
        <div class="sabl-grid" data-dir-grid>
          ${gcard(1, 'One', 'open')}${gcard(2, 'Two', 'open')}${gcard(3, 'Three', 'closed')}${gcard(4, 'Four', 'after')}
        </div>
        <div data-dir-empty hidden></div>
      </div>`
    initDirectory<DirectoryItem & { group: string }, { group: string }>('#shut-root', {
      itemType: 'scholarship',
      defaultState: { group: 'all' },
      parseCard: el => ({
        el, id: Number(el.dataset.id), name: el.dataset.name ?? '',
        search: el.dataset.search ?? '', group: el.dataset.group ?? '',
      }),
      select: (items, st) => (st.group === 'all' ? items : items.filter(i => i.group === st.group || (st.group === 'closed' && i.group === 'after'))),
      countFor: (items, st) => (st.group === 'all' ? items : items.filter(i => i.group === st.group)).length,
      summary: visible => ({ count: `${visible.length} SHOWN` }),
      groups: { key: i => i.group, label: k => k.toUpperCase(), shut: ['closed', 'after'] },
      getSavedIds: () => [],
      toggleSave: () => [],
      saveLabel: n => n,
    })
    document.dispatchEvent(new Event('astro:page-load'))
    const grid = () => [...document.querySelectorAll<HTMLElement>('#shut-root [data-dir-grid] > *')]
      .filter(n => !n.hidden)
      .map(n => n.dataset.dirGroup ? `H:${n.dataset.dirGroup}` : n.dataset.name)
    // Default: the shut runs keep their headings, their cards stay off.
    expect(grid()).toEqual(['H:open', 'One', 'Two', 'H:closed', 'H:after'])
    // Every match of the filter sits in a shut run: open them rather than
    // answer with two headings over an empty page.
    selectFilter('group', 'closed', '#shut-root')
    expect(grid()).toEqual(['H:closed', 'Three', 'H:after', 'Four'])
    // Back to everything: the default shut returns.
    selectFilter('group', 'all', '#shut-root')
    expect(grid()).toEqual(['H:open', 'One', 'Two', 'H:closed', 'H:after'])
  })
})
