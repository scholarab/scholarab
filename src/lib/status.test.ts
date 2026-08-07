import { describe, it, expect } from 'vitest'
import { scholarshipStatusOf } from './status.ts'

const TODAY = new Date('2026-04-05T00:00:00')

describe('scholarshipStatusOf', () => {
  it('is future before the open date, whatever the deadline says', () => {
    expect(scholarshipStatusOf({ openDate: '2026-06-01', deadline: '2026-09-01' }, TODAY)).toBe('future')
  })

  it('is closed once the deadline has passed with no next open date', () => {
    expect(scholarshipStatusOf({ deadline: '2026-04-04' }, TODAY)).toBe('closed')
  })

  it('is future, not closed, when auto-expire has flipped active off for the next cycle', () => {
    // This is the case the sitemap used to drop: the deadline is still in the
    // future, `active` is false, and the page renders "OPENING SOON".
    expect(scholarshipStatusOf({ deadline: '2027-05-15', active: false }, TODAY)).toBe('future')
  })

  it('treats a missing deadline as open, not as a 1970 cutoff', () => {
    expect(scholarshipStatusOf({ deadline: null }, TODAY)).toBe('active')
    expect(scholarshipStatusOf({}, TODAY, { deadlineMs: 0 })).toBe('active')
  })

  it('prefers the precomputed ms hints over parsing the ISO strings', () => {
    const past = new Date('2026-01-01T00:00:00').getTime()
    expect(scholarshipStatusOf({ deadline: '2027-01-01' }, TODAY, { deadlineMs: past })).toBe('closed')
  })
})
