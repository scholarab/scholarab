import { describe, it, expect, beforeEach } from 'vitest'
import { getStatus, setStatus, planOrder, startWith, planNeeds, type PlanItem, type PlanStatus } from './saved-plan'

const sch = (id: number, extra: Partial<PlanItem> = {}): PlanItem => ({ type: 'scholarship', id, closed: false, ...extra })

describe('status store', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to not started and round-trips a status', () => {
    expect(getStatus('scholarship', 5)).toBe('todo')
    setStatus('scholarship', 5, 'submitted')
    setStatus('program', 5, 'working')
    expect(getStatus('scholarship', 5)).toBe('submitted')
    expect(getStatus('program', 5)).toBe('working')
  })

  it('stores nothing for not started', () => {
    setStatus('scholarship', 5, 'won')
    setStatus('scholarship', 5, 'todo')
    expect(localStorage.getItem('scholarab_status')).toBe('{}')
  })

  it('drops garbage it finds in storage', () => {
    localStorage.setItem('scholarab_status', JSON.stringify({ 's:1': 'won', 's:2': 'lost', 'x': 'won', 's:3': 7 }))
    expect(getStatus('scholarship', 1)).toBe('won')
    expect(getStatus('scholarship', 2)).toBe('todo')
    localStorage.setItem('scholarab_status', 'not json')
    expect(getStatus('scholarship', 1)).toBe('todo')
  })
})

describe('plan', () => {
  const st = (m: Record<number, PlanStatus>) => (i: PlanItem) => m[i.id] ?? 'todo'

  it('sinks submitted and won below the work still to do, keeping order', () => {
    const list = [sch(1), sch(2), sch(3), sch(4)]
    expect(planOrder(list, st({ 1: 'won', 2: 'submitted', 4: 'working' })).map(i => i.id)).toEqual([3, 4, 2, 1])
  })

  it('starts with the first three open awards that take an application', () => {
    const none = { k: ['none' as const], r: 0, c: true }
    const list = [sch(1, { closed: true }), sch(2, { kit: none }), sch(3), sch(4), { ...sch(5), type: 'program' as const }, sch(6), sch(7)]
    expect(startWith(list, st({ 4: 'submitted' })).map(i => i.id)).toEqual([3, 6, 7])
  })

  it('skips awards that wait on a nomination or take nothing, and counts only the second as nothing', () => {
    const list = [sch(1, { via: 'nominated' }), sch(2, { via: 'none' }), sch(3, { via: 'school' })]
    expect(startWith(list, st({})).map(i => i.id)).toEqual([3])
    expect(planNeeds(list, st({})).nothing).toBe(1)
  })

  it('adds up what the open, unsent awards ask for', () => {
    const list = [
      sch(1, { kit: { k: ['essay', 'reference', 'reference'], r: 2, c: true } }),
      sch(2, { kit: { k: ['reference', 'transcript'], r: 1, c: false } }),
      sch(3, { kit: { k: ['essay'], r: 0, c: true } }),
      sch(4, { kit: { k: ['none'], r: 0, c: true } }),
      sch(5),
      sch(6, { closed: true, kit: { k: ['video'], r: 0, c: true } }),
    ]
    const out = planNeeds(list, st({ 3: 'submitted' }))
    expect(out.needs).toEqual([
      { n: 3, label: 'reference letters', short: 'letters' },
      { n: 1, label: 'award with essays', short: 'essay' },
      { n: 1, label: 'transcript', short: 'transcript' },
    ])
    expect(out).toMatchObject({ todo: 3, listed: 2, partial: 1, nothing: 1 })
  })
})
