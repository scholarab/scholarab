import { describe, it, expect } from 'vitest'
import { citySpecials } from './city-specials'
import type { ScholarshipStatus } from './status'

type S = { title: string; amount: string; openDate?: string | null; status: ScholarshipStatus }
const s = (title: string, amount: string, status: ScholarshipStatus, openDate: string | null = null): S => ({ title, amount, status, openDate })

describe('citySpecials', () => {
  it('names the biggest award still to go for and the next to open', () => {
    const items = [
      s('Closed big', '$90,000', 'closed'),
      s('Varies', 'Amount varies', 'active'),
      s('Big', 'Up to $29,500', 'future', '2027-03-01'),
      s('Soon', '$1,000', 'future', '2027-01-05'),
      s('Later', '$2,000', 'future', '2027-02-01'),
      s('Open', '$5,000', 'active'),
    ]
    const out = citySpecials(items, i => i.status, '2026-10-02')
    expect(out.biggest?.title).toBe('Big')
    expect(out.nextToOpen?.title).toBe('Soon')
  })

  it('never names the same award twice, and skips an open date already passed', () => {
    const items = [s('Big', '$9,000', 'future', '2027-01-05'), s('Past', '$100', 'future', '2026-09-01')]
    const out = citySpecials(items, i => i.status, '2026-10-02')
    expect(out.biggest?.title).toBe('Big')
    expect(out.nextToOpen).toBeNull()
  })
})
