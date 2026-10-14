import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sendEvent, sendEventAfterDwell, optOutOfEvents, syncTrackingOptOut, isLocalPreview, parseSource, recordSourceVisit, sendApply, savedState, visitKind, notFoundFrom } from './events'

/** happy-dom allows navigation via history, which is enough to set a query. */
const setSearch = (search: string) => history.replaceState(null, '', '/' + search)

// MODE is 'test' under vitest, so the development guard does not trip here.

let beaconCalls: { url: string; body: string }[] = []

beforeEach(() => {
  beaconCalls = []
  sessionStorage.clear()
  localStorage.clear()
  setSearch('')
  Object.defineProperty(navigator, 'sendBeacon', {
    value: (url: string, body: string) => { beaconCalls.push({ url, body }); return true },
    writable: true,
    configurable: true,
  })
  Object.defineProperty(navigator, 'webdriver', {
    value: false,
    writable: true,
    configurable: true,
  })
})

describe('sendEvent', () => {
  it('sends an event via sendBeacon', () => {
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(1)
    expect(beaconCalls[0]!.url).toBe('/api/event')
    expect(JSON.parse(beaconCalls[0]!.body)).toEqual({
      event: 'apply_click', itemType: 'scholarship', itemId: 42,
    })
  })

  it('dedupes repeat events for the same item within a session', () => {
    sendEvent('apply_click', 'scholarship', 42)
    sendEvent('apply_click', 'scholarship', 42)
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(1)
  })

  it('does not dedupe across different items or events', () => {
    sendEvent('apply_click', 'scholarship', 42)
    sendEvent('apply_click', 'scholarship', 43)
    sendEvent('save', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(3)
  })

  it('does not dedupe search_empty with different queries', () => {
    sendEvent('search_empty', undefined, undefined, 'rotary')
    sendEvent('search_empty', undefined, undefined, 'kiwanis')
    sendEvent('search_empty', undefined, undefined, 'rotary')
    expect(beaconCalls).toHaveLength(2)
  })

  it('skips automated browsers', () => {
    Object.defineProperty(navigator, 'webdriver', { value: true, writable: true, configurable: true })
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(0)
  })

  it('skips after opt-out', () => {
    optOutOfEvents()
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(0)
  })

  it('opts the browser out from ?nt=1 before the first event is counted', () => {
    setSearch('?nt=1')
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(0)
    // and it sticks once the param is gone
    setSearch('')
    sendEvent('apply_click', 'scholarship', 43)
    expect(beaconCalls).toHaveLength(0)
  })

  it('says so on screen when ?nt=1 changes the browser, and only then', () => {
    document.getElementById('sa-toast')?.remove()
    setSearch('?nt=1')
    syncTrackingOptOut()
    expect(document.getElementById('sa-toast')?.textContent).toBe('This browser is no longer counted')
    document.getElementById('sa-toast')?.remove()
    syncTrackingOptOut()
    expect(document.getElementById('sa-toast')).toBeNull()
    setSearch('?nt=0')
    syncTrackingOptOut()
    expect(document.getElementById('sa-toast')?.textContent).toBe('This browser is counted again')
    document.getElementById('sa-toast')?.remove()
  })

  it('opts back in from ?nt=0', () => {
    optOutOfEvents()
    setSearch('?nt=0')
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(1)
    expect(localStorage.getItem('sa_no_track')).toBeNull()
  })

  it('leaves the flag alone when nt is absent', () => {
    setSearch('?ref=school')
    sendEvent('apply_click', 'scholarship', 42)
    expect(beaconCalls).toHaveLength(1)
  })

  it('still dedupes when sessionStorage throws (private mode)', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('QuotaExceededError') }
    try {
      sendEvent('save', 'program', 9)
      sendEvent('save', 'program', 9)
      expect(beaconCalls).toHaveLength(1)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('sendEventAfterDwell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    return () => vi.useRealTimers()
  })

  it('sends after the dwell time elapses', () => {
    sendEventAfterDwell('detail_view', 'scholarship', 42, 2500)
    expect(beaconCalls).toHaveLength(0)
    vi.advanceTimersByTime(2500)
    expect(beaconCalls).toHaveLength(1)
    expect(JSON.parse(beaconCalls[0]!.body).event).toBe('detail_view')
  })

  it('does not send if the user navigates away first (view transition)', () => {
    sendEventAfterDwell('detail_view', 'scholarship', 42, 2500)
    vi.advanceTimersByTime(1000)
    document.dispatchEvent(new Event('astro:before-preparation'))
    vi.advanceTimersByTime(5000)
    expect(beaconCalls).toHaveLength(0)
  })

  it('does not send if the page unloads first', () => {
    sendEventAfterDwell('detail_view', 'program', 7, 2500)
    window.dispatchEvent(new Event('pagehide'))
    vi.advanceTimersByTime(5000)
    expect(beaconCalls).toHaveLength(0)
  })

  it('cancel function stops the send', () => {
    const cancel = sendEventAfterDwell('detail_view', 'scholarship', 1, 2500)
    cancel()
    vi.advanceTimersByTime(5000)
    expect(beaconCalls).toHaveLength(0)
  })
})

describe('syncTrackingOptOut', () => {
  it('works on pages that never fire an event', () => {
    setSearch('?nt=1')
    syncTrackingOptOut()
    expect(localStorage.getItem('sa_no_track')).toBe('1')
  })

  it('does not throw when storage is unavailable', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('blocked') }
    try {
      setSearch('?nt=1')
      expect(() => syncTrackingOptOut()).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('parseSource', () => {
  it('accepts the known campaign codes', () => {
    for (const s of ['ig', 'tt', 'yt', 'em', 'qr'])
      expect(parseSource(`?s=${s}`)).toBe(s)
  })

  it('rejects anything not on the list', () => {
    // The value comes from a URL anyone can edit, so an unknown code is not a
    // new channel to start counting; it is someone typing into our database.
    for (const s of ['', 'IG', 'instagram', 'ig ', 'ilia@example.com', '<script>'])
      expect(parseSource(`?s=${encodeURIComponent(s)}`)).toBeNull()
  })

  it('returns null when there is no s param', () => {
    expect(parseSource('')).toBeNull()
    expect(parseSource('?nt=1&q=rotary')).toBeNull()
  })

  it('reads s alongside other params', () => {
    expect(parseSource('?q=rotary&s=tt')).toBe('tt')
  })
})

describe('recordSourceVisit', () => {
  it('sends the source as meta, with no item attached', () => {
    setSearch('?s=ig')
    recordSourceVisit()
    expect(beaconCalls).toHaveLength(1)
    expect(JSON.parse(beaconCalls[0]!.body)).toEqual({ event: 'source_visit', meta: 'ig' })
  })

  it('sends nothing on an untagged visit', () => {
    setSearch('?q=rotary')
    recordSourceVisit()
    expect(beaconCalls).toHaveLength(0)
  })

  it('counts one visit once, however many pages it touches', () => {
    setSearch('?s=ig')
    recordSourceVisit()
    recordSourceVisit()
    recordSourceVisit()
    expect(beaconCalls).toHaveLength(1)
  })

  it('counts a different source separately', () => {
    setSearch('?s=ig')
    recordSourceVisit()
    setSearch('?s=tt')
    recordSourceVisit()
    expect(beaconCalls).toHaveLength(2)
  })

  it('respects the ?nt=1 opt-out', () => {
    optOutOfEvents()
    setSearch('?s=ig')
    recordSourceVisit()
    expect(beaconCalls).toHaveLength(0)
  })
})

describe('isLocalPreview', () => {
  it('catches every shape of local host, including a built bundle under wrangler', () => {
    for (const h of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', 'ilia-mac.local'])
      expect(isLocalPreview(h)).toBe(true)
  })

  it('lets the real site through', () => {
    for (const h of ['scholarab.ca', 'www.scholarab.ca', 'scholarab.pages.dev'])
      expect(isLocalPreview(h)).toBe(false)
  })
})

describe('sendApply', () => {
  const metaOf = (i: number) => JSON.parse(beaconCalls[i]!.body).meta
  // tracker.ts caches each list in memory and drops it on a storage event
  const setList = (key: string, ids: number[]) => {
    localStorage.setItem(key, JSON.stringify(ids))
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }
  beforeEach(() => { setList('scholarab_saved', []); setList('scholarab_saved_programs', []) })

  it('says where Apply was clicked and whether the student saved the award first', () => {
    setList('scholarab_saved', [42])
    sendApply('scholarship', 42, 'mine')
    sendApply('scholarship', 43, 'row')
    expect(metaOf(0)).toBe('mine:saved')
    expect(metaOf(1)).toBe('row:new')
  })

  it('tells a starter-pack award apart from one the student chose', () => {
    setList('scholarab_saved', [14])
    expect(savedState('scholarship', 14)).toBe('starter')
    expect(savedState('scholarship', 15)).toBe('new')
  })

  it('reads the program list for a program', () => {
    setList('scholarab_saved_programs', [7])
    expect(savedState('program', 7)).toBe('saved')
    expect(savedState('scholarship', 7)).toBe('new')
  })

  it('still counts one student once per item, whichever button they clicked', () => {
    sendApply('scholarship', 42, 'row')
    sendApply('scholarship', 42, 'page')
    expect(beaconCalls).toHaveLength(1)
  })

  it('sends nothing for an item with no id', () => {
    sendApply('scholarship', Number.NaN, 'row')
    expect(beaconCalls).toHaveLength(0)
  })
})

describe('visitKind', () => {
  afterEach(() => vi.useRealTimers())

  it('is new on the first day and back on a later one, and keeps the first day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 14, 9, 0))
    expect(visitKind()).toBe('new')
    vi.setSystemTime(new Date(2026, 9, 14, 23, 0))
    expect(visitKind()).toBe('new')
    vi.setSystemTime(new Date(2026, 9, 15, 7, 0))
    expect(visitKind()).toBe('back')
    expect(localStorage.getItem('sa_first_seen')).toBe('2026-10-14')
  })

  it('starts over from a value it did not write', () => {
    localStorage.setItem('sa_first_seen', 'hello')
    expect(visitKind()).toBe('new')
    expect(localStorage.getItem('sa_first_seen')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('labels a listing view sent after the dwell', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 15, 7, 0))
    localStorage.setItem('sa_first_seen', '2026-10-01')
    sendEventAfterDwell('detail_view', 'scholarship', 5, 2500, visitKind)
    vi.advanceTimersByTime(2500)
    expect(JSON.parse(beaconCalls[0]!.body)).toEqual({ event: 'detail_view', itemType: 'scholarship', itemId: 5, meta: 'back' })
  })
})


describe('notFoundFrom', () => {
  it('names where the link to a missing page was, never the URL', () => {
    expect(notFoundFrom('', 'www.scholarab.ca')).toBe('none')
    expect(notFoundFrom('https://www.scholarab.ca/scholarships/', 'www.scholarab.ca')).toBe('site')
    expect(notFoundFrom('https://www.google.com/', 'www.scholarab.ca')).toBe('search')
    expect(notFoundFrom('https://duckduckgo.com/', 'www.scholarab.ca')).toBe('search')
    expect(notFoundFrom('https://www.reddit.com/r/alberta', 'www.scholarab.ca')).toBe('other')
    expect(notFoundFrom('not a url', 'www.scholarab.ca')).toBe('none')
  })
})
