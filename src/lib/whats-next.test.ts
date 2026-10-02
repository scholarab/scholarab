import { describe, it, expect } from 'vitest'
import { whatsNext, workKey, workLabel } from './whats-next'
import type { ToApply } from './to-apply'

type L = { id: number; due: number; open: boolean; place?: string; cat?: string }
const L = (id: number, due: number, extra: Partial<L> = {}): L => ({ id, due, open: true, ...extra })

const opts = {
  isOpen: (l: L) => l.open,
  deadlineMs: (l: L) => l.due,
  reasons: [
    (a: L, b: L) => (a.place && a.place === b.place ? `Also ${b.place}` : null),
    (a: L, b: L) => (a.cat && a.cat === b.cat ? `Also ${b.cat}` : null),
  ],
  fallback: 'Due around the same time',
}

describe('whatsNext', () => {
  it('takes one pick per reason, nearest deadline first, then fills by timing', () => {
    const self = L(1, 100, { place: 'Calgary', cat: 'Arts' })
    const items = [self, L(2, 400, { place: 'Calgary' }), L(3, 120, { place: 'Calgary' }), L(4, 90, { cat: 'Arts' }), L(5, 101), L(6, 105, { open: false })]
    expect(whatsNext(self, items, opts).map(p => [p.item.id, p.why])).toEqual([
      [3, 'Also Calgary'],
      [4, 'Also Arts'],
      [5, 'Due around the same time'],
    ])
  })

  it('never repeats a pick, skips excluded ones, and stops at what is open', () => {
    const self = L(1, 100, { place: 'Calgary', cat: 'Arts' })
    const both = L(2, 110, { place: 'Calgary', cat: 'Arts' })
    const skip = L(3, 100, { place: 'Calgary' })
    const picks = whatsNext(self, [self, both, skip], { ...opts, exclude: new Set([skip]) })
    expect(picks.map(p => [p.item.id, p.why])).toEqual([[2, 'Also Calgary']])
  })

  it('only offers what the same student could apply to, bigger first within a window', () => {
    type M = L & { amt: number }
    const self = { ...L(1, 100), amt: 0 } as M
    const items = [self, { ...L(2, 101, { place: 'Olds' }), amt: 9000 }, { ...L(3, 104), amt: 500 }, { ...L(4, 106), amt: 5000 }] as M[]
    const picks = whatsNext(self, items, {
      ...opts,
      fits: (a, b) => !b.place || b.place === a.place,
      bucketMs: 10,
      prefer: (a, b) => b.amt - a.amt,
    })
    expect(picks.map(p => p.item.id)).toEqual([4, 3])
  })

  it('fills by timing only from listings good enough on their own', () => {
    const self = L(1, 100)
    const picks = whatsNext(self, [self, L(2, 101), L(3, 150, { cat: 'vetted' })], { ...opts, fallbackOk: l => l.cat === 'vetted' })
    expect(picks.map(p => p.item.id)).toEqual([3])
  })

  it('caps the timing-only picks', () => {
    const self = L(1, 100)
    expect(whatsNext(self, [self, L(2, 101), L(3, 102)], { ...opts, fallbackMax: 1 }).map(p => p.item.id)).toEqual([2])
    expect(whatsNext(self, [self, L(2, 101), L(3, 102), L(4, 103)], { ...opts, fallbackMax: 1, atLeast: 2 }).map(p => p.item.id)).toEqual([2, 3])
  })

  it('goes soonest first when the listing itself has no deadline', () => {
    const self = L(1, Infinity)
    expect(whatsNext(self, [L(2, 500), L(3, 200), L(4, Infinity)], opts).map(p => p.item.id)).toEqual([3, 2, 4])
  })
})

describe('same work', () => {
  const kit = (...kinds: string[]): ToApply => ({ checked: '2026-10-01', complete: true, items: kinds.map(k => ({ kind: k, text: k })) as ToApply['items'] })

  it('keys on the real work, not the form or the account', () => {
    expect(workKey(kit('account', 'form', 'essay', 'reference'))).toBe('essay+reference')
    expect(workKey(kit('reference', 'essay'))).toBe('essay+reference')
    expect(workKey(kit('none'))).toBe('none')
    expect(workKey(kit('form', 'other'))).toBeNull()
    expect(workKey(null)).toBeNull()
  })

  it('says it in words', () => {
    expect(workLabel('none')).toBe('Also no application')
    expect(workLabel('essay+reference')).toBe('Same work: essay, reference letter')
  })
})
