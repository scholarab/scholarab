import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sendEvent, sendEventAfterDwell, optOutOfEvents } from './events'

// MODE is 'test' under vitest, so the development guard does not trip here.

let beaconCalls: { url: string; body: string }[] = []

beforeEach(() => {
  beaconCalls = []
  sessionStorage.clear()
  localStorage.clear()
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
