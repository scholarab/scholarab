import { describe, it, expect } from 'vitest'
import { openCounts } from './counts'
import { scholarshipStatusOf, programStatusOf } from './status'

const TODAY = new Date('2026-09-23T00:00:00')

describe('openCounts', () => {
  it('counts every listing open today, dated or rolling, as open', () => {
    const items = [
      { deadline: '2026-12-01' },
      { deadline: '2026-10-01' },
      { deadline: null, rolling: true },
      { deadline: null },
      { deadline: '2026-01-01' },
      { deadline: '2027-01-01', openDate: '2026-12-01' },
    ]
    expect(openCounts(items, s => scholarshipStatusOf(s, TODAY))).toEqual({ open: 3 })
  })

  // The home slide said "Competitions 8 open" while the hub said 3 because
  // they counted differently. Since 2026-10-01 both fold year-round programs
  // into open, the same set as the hub's "Open now" chip.
  it('counts year-round programs as open and TBA as not', () => {
    const items = [{ deadline: '2026-12-01' }, { deadline: 'Ongoing' }, { deadline: 'Ongoing' }, { deadline: 'TBA' }]
    expect(openCounts(items, p => programStatusOf(p, TODAY))).toEqual({ open: 3 })
  })
})
