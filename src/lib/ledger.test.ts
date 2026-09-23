import { describe, it, expect, vi } from 'vitest'
import { monthBars, programFigs, scholarshipFigs, shortMoney } from './ledger'
import { programDeadlinesByMonth, scholarshipMoneyByMonth } from './list-core'
import type { ProgramWithMeta, ScholarshipWithMeta } from './list-core'

vi.mock('./utils.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('./utils')>()
  return { ...real, getToday: () => new Date('2026-04-05T00:00:00') }
})

const ms = (iso: string) => new Date(iso + 'T00:00:00').getTime()
const s = (id: number, o: Partial<ScholarshipWithMeta> = {}): ScholarshipWithMeta => ({
  id, title: `S${id}`, amount: '$1,000', deadline: null, openDate: null, audience: null, url: '',
  category: null, lastVerified: null, region: null, notes: null, applyViaGuidance: false,
  active: true, eligibility: null, _amount: 1000,
  _deadline_ms: o.deadline ? ms(o.deadline) : 0, _open_ms: o.openDate ? ms(o.openDate) : 0,
  ...o,
} as ScholarshipWithMeta)
const p = (id: number, o: Partial<ProgramWithMeta> = {}): ProgramWithMeta => ({
  id, name: `P${id}`, paid: false, deadline: null, ...o,
} as ProgramWithMeta)

describe('scholarshipFigs', () => {
  it('leads with open money, then the count, the next deadline and the money opening later', () => {
    const figs = scholarshipFigs([
      s(1, { deadline: '2026-04-20', _amount: 2500 }),
      s(2, { deadline: '2026-04-09', _amount: 500 }),
      s(3, { openDate: '2026-09-01', deadline: '2026-10-01', active: false, _amount: 4000 }),
    ])
    expect(figs).toEqual([
      { key: 'open', value: '$3,000', label: 'Open to apply now', money: true },
      { key: 'count', value: '2', label: 'Awards open' },
      { key: 'next', value: 'Apr 9', label: 'Next deadline, 4 days left' },
      { key: 'soon', value: '$4,000', label: 'Opening later this cycle', money: false },
    ])
  })

  it('leaves out a figure it has nothing for, rather than printing $0', () => {
    const figs = scholarshipFigs([s(1, { openDate: '2026-06-01', deadline: '2026-07-01', active: false, _amount: 900 })])
    expect(figs.find(f => f.key === 'open')!.value).toBe('')
    expect(figs.find(f => f.key === 'count')).toMatchObject({ value: '1', label: 'Listing' })
    expect(figs.find(f => f.key === 'next')).toMatchObject({ value: 'Jun 1', label: 'Next opening, in 57 days' })
    expect(figs.find(f => f.key === 'soon')).toMatchObject({ value: '$900', label: 'Opening in a later cycle', money: true })
  })
})

describe('scholarshipMoneyByMonth', () => {
  it('files dated, open or upcoming money under the next twelve months, this one first', () => {
    const months = scholarshipMoneyByMonth([
      s(1, { deadline: '2026-04-30', _amount: 1000 }),
      s(2, { deadline: '2026-04-06', _amount: 500 }),
      s(3, { deadline: '2026-06-15', _amount: 3000 }),
      s(4, { deadline: '2026-06-20', deadlineEstimated: true, _amount: 9999 }), // a guess, left out
      s(5, { deadline: '2026-03-01', _amount: 9999 }), // closed
      s(6, { deadline: '2027-04-10', _amount: 9999 }), // month thirteen
      s(7, { deadline: null, _amount: 9999 }),
    ])
    expect(months).toHaveLength(12)
    expect(months[0]).toMatchObject({ key: '2026-04', label: 'Apr', total: 1500, count: 2 })
    expect(months[2]).toMatchObject({ key: '2026-06', total: 3000, count: 1 })
    expect(months[11]!.key).toBe('2027-03')
    expect(months.reduce((n, m) => n + m.total, 0)).toBe(4500)
  })
})

describe('programs', () => {
  const list = [
    p(1, { deadline: '2026-05-01', paid: true }),
    p(2, { deadline: '2026-04-10' }),
    p(3, { deadline: 'Ongoing' }),
    p(4, { deadline: '2026-01-01' }),
  ]
  it('counts open, paid, the next deadline and the undated', () => {
    expect(programFigs(list).map(f => f.value)).toEqual(['2', '1', 'Apr 10', '1'])
  })
  it('counts programs closing per month', () => {
    expect(programDeadlinesByMonth(list).slice(0, 2).map(m => m.total)).toEqual([1, 1])
  })
})

describe('bars', () => {
  it('prints short money and scales to the biggest month', () => {
    expect([shortMoney(900), shortMoney(2500), shortMoney(76400), shortMoney(1_250_000)]).toEqual(['$900', '$2.5k', '$76k', '$1.3M'])
    const bars = monthBars(scholarshipMoneyByMonth([s(1, { deadline: '2026-04-30', _amount: 2000 }), s(2, { deadline: '2026-05-30', _amount: 500 })]), 'money')
    expect(bars.slice(0, 3).map(b => [b.value, b.height, b.sub])).toEqual([['$2k', 100, '1 due'], ['$500', 25, '1 due'], ['$0', 0, '0 due']])
    expect(bars[0]!.spoken).toBe('April 2026: $2,000 due across 1 award')
    expect(monthBars(programDeadlinesByMonth([]), 'count').every(b => b.height === 0)).toBe(true)
  })
})
