import { describe, it, expect } from 'vitest'
import { openCounts } from './counts'
import { scholarshipStatusOf, programStatusOf } from './status'

const TODAY = new Date('2026-09-23T00:00:00')

describe('openCounts', () => {
  it('counts dated open listings as open and undated open ones apart', () => {
    const items = [
      { deadline: '2026-12-01' },
      { deadline: '2026-10-01' },
      { deadline: null },
      { deadline: '2026-01-01' },
      { deadline: '2027-01-01', openDate: '2026-12-01' },
    ]
    expect(openCounts(items, s => scholarshipStatusOf(s, TODAY))).toEqual({ open: 2, ongoing: 1 })
  })

  // The home slide said "Competitions 8 open" while the hub said 3: home
  // folded year-round programs into "open". They are counted apart now.
  it('never folds year-round programs into open', () => {
    const items = [{ deadline: '2026-12-01' }, { deadline: 'Ongoing' }, { deadline: 'Ongoing' }, { deadline: 'TBA' }]
    expect(openCounts(items, p => programStatusOf(p, TODAY))).toEqual({ open: 1, ongoing: 2 })
  })
})
