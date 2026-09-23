import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initDirectory } from './directory-client'
import type { DirectoryItem } from './directory-client'

vi.mock('./events.ts', () => ({ sendEvent: vi.fn() }))
vi.mock('./utils.ts', () => ({ showConfetti: vi.fn() }))

// The "Show more" step, at a page size of 2 so five cards cover every case:
// a first step, a partial last step, a filter that fits in one step.
type Item = DirectoryItem & { category: string; order: number }
type State = { category: string }

function card(id: number, category: string) {
  return `<div class="sabl-card" data-dir-card data-id="${id}" data-name="Card ${id}" data-category="${category}" data-search="card ${id}">
    <a class="sabl-name" href="/scholarships/card-${id}/">Card ${id}</a></div>`
}

function mount() {
  document.body.innerHTML = `
    <div id="paging-root">
      <input type="search" data-dir-search />
      <button data-fkey="category" data-fval="all">All</button>
      <button data-fkey="category" data-fval="Arts">Arts</button>
      <div data-dir-count></div>
      <div data-dir-grid>
        ${card(1, 'Arts')}${card(2, 'Arts')}${card(3, 'Science')}${card(4, 'Science')}${card(5, 'Science')}
      </div>
      <div data-dir-more>
        <p data-dir-more-line></p>
        <button type="button" data-dir-more-btn></button>
        <button type="button" data-dir-all></button>
      </div>
      <div data-dir-empty hidden><div data-dir-empty-sub></div><div data-dir-elsewhere hidden></div><button data-dir-clear>Clear</button></div>
    </div>`
}

let initialized = false
function setup(url = '/scholarships/') {
  history.replaceState(null, '', url)
  mount()
  if (!initialized) {
    initialized = true
    initDirectory<Item, State>('#paging-root', {
      itemType: 'scholarship',
      defaultState: { category: 'all' },
      toggleKeys: ['category'],
      pageSize: 2,
      parseCard: el => ({ el, id: Number(el.dataset.id), name: el.dataset.name ?? '', search: el.dataset.search ?? '', category: el.dataset.category ?? '', order: Number(el.dataset.id) }),
      select: (items, state) => items.filter(i => state.category === 'all' || i.category === state.category),
      countFor: (items, state) => items.filter(i => state.category === 'all' || i.category === state.category).length,
      summary: (visible, total) => ({ count: `${visible.length} OF ${total}` }),
      groups: { key: i => i.category, label: k => k.toUpperCase() },
      getSavedIds: () => [],
      toggleSave: () => [],
      saveLabel: n => n,
    })
  }
  document.dispatchEvent(new Event('astro:page-load'))
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const shownIds = () => [...document.querySelectorAll<HTMLElement>('[data-dir-card]')].filter(c => !c.hidden).map(c => Number(c.dataset.id))
const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))
  sessionStorage.clear()
})
afterEach(() => { document.body.innerHTML = '' })

describe('directory "Show more"', () => {
  it('shows the first step and says what is left, while the count covers every match', () => {
    setup()
    expect(shownIds()).toEqual([1, 2])
    expect($('[data-dir-count]').textContent).toBe('5 OF 5')
    expect($('[data-dir-more-line]').textContent).toBe('Showing 2 of 5')
    expect($('[data-dir-more-btn]').textContent).toBe('Show 2 more')
    expect($('[data-dir-all]').hidden).toBe(false)
    expect($('[data-dir-all]').textContent).toBe('Show all 5')
  })

  it('reveals the next step, shrinks the last one, and records it in the URL', () => {
    setup()
    click($('[data-dir-more-btn]'))
    expect(shownIds()).toEqual([1, 2, 3, 4])
    expect($('[data-dir-more-btn]').textContent).toBe('Show 1 more')
    // One press of the step button already shows the rest.
    expect($('[data-dir-all]').hidden).toBe(true)
    expect(new URL(location.href).searchParams.get('show')).toBe('4')
  })

  it('hides the block once everything is out and hands focus to the first new card', () => {
    setup()
    $('[data-dir-all]').focus()
    click($('[data-dir-all]'))
    expect(shownIds()).toEqual([1, 2, 3, 4, 5])
    expect($('[data-dir-more]').hidden).toBe(true)
    expect(document.activeElement?.textContent).toBe('Card 3')
  })

  it('starts over when the filter changes, and drops ?show', () => {
    setup()
    click($('[data-dir-more-btn]'))
    click($('[data-fkey="category"][data-fval="Arts"]'))
    expect(shownIds()).toEqual([1, 2])
    expect($('[data-dir-more]').hidden).toBe(true)
    expect(new URL(location.href).searchParams.has('show')).toBe(false)
  })

  it('starts over when the search changes', () => {
    setup()
    click($('[data-dir-all]'))
    const input = $('[data-dir-search]') as HTMLInputElement
    input.value = 'card'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(shownIds()).toEqual([1, 2])
  })

  it('restores the step from ?show on load and ignores nonsense values', () => {
    setup('/scholarships/?show=4')
    expect(shownIds()).toEqual([1, 2, 3, 4])
    setup('/scholarships/?show=banana')
    expect(shownIds()).toEqual([1, 2])
  })

  it('heads only the runs that have started, counting every match rather than the revealed cards', () => {
    setup()
    // Label and count, not the whole bar: it also carries a Hide/Show word.
    const headers = () => [...document.querySelectorAll<HTMLElement>('[data-dir-group]')].filter(h => !h.hidden)
      .map(h => h.querySelector('.sabl-group-label')!.textContent! + h.querySelector('.sabl-group-count')!.textContent)
    // Cards 1 and 2 are out: only the Arts run has started, so only its header
    // shows. Science's appears once one of its cards is revealed, already
    // carrying all three.
    expect(headers()).toEqual(['ARTS2'])
    click($('[data-dir-more-btn]'))
    expect(headers()).toEqual(['ARTS2', 'SCIENCE3'])
  })

  it('shutting a run gives its place in the step to the runs still open', () => {
    setup()
    expect(shownIds()).toEqual([1, 2])
    // Arts shut: its two cards leave the page, and the step spends itself on
    // the first two Science cards instead of showing nothing in their place.
    click($('[data-dir-group="Arts"]'))
    expect(shownIds()).toEqual([3, 4])
    expect($('[data-dir-more-line]').textContent).toBe('Showing 2 of 3')
    // The count line still describes every match; shutting a run is not a filter.
    expect($('[data-dir-count]').textContent).toBe('5 OF 5')
    click($('[data-dir-group="Arts"]'))
    expect(shownIds()).toEqual([1, 2])
  })
})
