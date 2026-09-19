import { describe, it, expect } from 'vitest'
import { deadlineStats } from './deadline-stats'
import scholarships from '../data/scholarships.json'

describe('deadlineStats', () => {
  const s = deadlineStats([
    { deadline: '2027-05-30', url: 'https://www.educationmatters.ca/a' },
    { deadline: '2027-05-30', url: 'https://calgaryfoundation.org/b' },
    { deadline: '2026-12-18', url: 'https://www.keyano.ca/c' },
    { deadline: null, url: 'https://x.ca' },
  ])

  it('counts only dated listings, by month and by day', () => {
    expect(s.total).toBe(3)
    expect(s.byMonth[4]).toBe(2)
    expect(s.sum(5, 12)).toBe(3)
    expect(s.onDay('05-30')).toBe(2)
  })

  it('matches hosts with or without www', () => {
    expect(s.onDayFrom('05-30', 'educationmatters.ca')).toBe(1)
    expect(s.onDayFrom('12-18', 'www.keyano.ca')).toBe(1)
  })

  it('months add up to the total on the real catalogue', () => {
    const real = deadlineStats(scholarships as Array<{ deadline?: string | null; url?: string | null }>)
    expect(real.byMonth.reduce((a, b) => a + b, 0)).toBe(real.total)
  })
})
