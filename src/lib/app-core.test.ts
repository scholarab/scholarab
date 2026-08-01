import { describe, it, expect } from 'vitest'
import {
  expandEligibility, expandItem, amountValue, slugify, daysUntil, statusOf, chipFor,
  initialsOf, orgLine, hashTags, feedStamp, applySteps, shortMoney, moneyTotal,
  openListings, byDeadline, searchListings, filterCategory, categoryKeys, nearbyListings,
  profileFromAnswers, profileChips, weekStrip, deadlineWeeks, timePressure, midnight, tabFromHash,
  expandProgram, programStatusOf, programChipFor, isDatedIso,
  programPayLabel, programDueLabel, programCategoryKeys, filterProgramCategory, sortPrograms,
  reopenStats, reopenHeadline, reopenRegions, nextToOpen, closedListings,
  expandGuide, routeFromHash, QUIZ_QUESTIONS,
  type WireItem, type Listing, type ProgramItem,
} from './app-core'
import { EMPTY_ELIGIBILITY } from './eligibility-types'
import { guides } from './guides'

const TODAY = midnight(new Date('2026-07-30T09:41:00'))

function makeListing(over: Partial<Listing> & { id: number }): Listing {
  return {
    title: `Award ${over.id}`,
    amount: '$1,000',
    amountValue: 1000,
    deadline: null,
    openDate: null,
    category: null,
    region: null,
    audience: null,
    url: 'https://example.com',
    slug: `award-${over.id}`,
    verified: null,
    guidance: false,
    active: true,
    eligibility: null,
    ...over,
  }
}

// ── Wire expansion ────────────────────────────────────────────────────────────

describe('expandEligibility', () => {
  it('returns null for a listing with no eligibility data', () => {
    expect(expandEligibility(null)).toBeNull()
    expect(expandEligibility(undefined)).toBeNull()
  })

  it('restores every default the serializer drops', () => {
    const restored = expandEligibility({ grades: ['12'], citizenship: 'canadian' })
    // matchScholarship dereferences these unconditionally — undefined would throw
    expect(restored).toEqual({ ...EMPTY_ELIGIBILITY, grades: ['12'], citizenship: 'canadian' })
    expect(restored!.schoolBoards).toEqual([])
    expect(restored!.fields).toEqual([])
    expect(restored!.minAverage).toBeNull()
    expect(restored!.indigenousRequired).toBe(false)
  })
})

describe('expandItem', () => {
  it('maps the compact wire shape onto a full listing', () => {
    const wire: WireItem = {
      i: 7, t: 'Big STEM Award', a: '$12,500', d: '2026-08-15', c: 'STEM',
      r: 'Medicine Hat', b: 'Grade 12 students', u: 'https://x.test', v: '2026-07-28',
      g: true, e: { grades: ['12'] },
    }
    const l = expandItem(wire)
    expect(l).toMatchObject({
      id: 7, title: 'Big STEM Award', amount: '$12,500', amountValue: 12500,
      deadline: '2026-08-15', openDate: null, category: 'STEM', region: 'Medicine Hat',
      slug: 'big-stem-award', verified: '2026-07-28', guidance: true, active: true,
    })
    expect(l.eligibility!.grades).toEqual(['12'])
  })

  it('treats the x flag as active: false and a missing g as apply-online', () => {
    const l = expandItem({ i: 1, t: 'A', a: 'Varies', u: 'https://x.test', x: true })
    expect(l.active).toBe(false)
    expect(l.guidance).toBe(false)
    expect(l.amountValue).toBe(0)
  })
})

describe('amountValue / slugify', () => {
  it('reads the first dollar figure, like utils.parseAmount', () => {
    expect(amountValue('$2,500')).toBe(2500)
    expect(amountValue('up to $8,000')).toBe(8000)
    expect(amountValue('$4,000–$5,000')).toBe(4000)
    expect(amountValue('Varies')).toBe(0)
    expect(amountValue(null)).toBe(0)
  })

  it('slugifies the way the detail routes do', () => {
    expect(slugify('First Nations, Métis and Inuit Bursary')).toBe('first-nations-mtis-and-inuit-bursary')
  })
})

// ── Dates and status ──────────────────────────────────────────────────────────

describe('daysUntil', () => {
  it('counts whole days forward and floors at zero', () => {
    expect(daysUntil('2026-07-30', TODAY)).toBe(0)
    expect(daysUntil('2026-07-31', TODAY)).toBe(1)
    expect(daysUntil('2026-08-20', TODAY)).toBe(21)
    expect(daysUntil('2026-07-01', TODAY)).toBe(0)
  })
})

describe('statusOf', () => {
  it('is closed once the deadline has passed', () => {
    expect(statusOf(makeListing({ id: 1, deadline: '2026-07-29' }), TODAY)).toBe('closed')
  })

  it('is active on the deadline day itself', () => {
    expect(statusOf(makeListing({ id: 1, deadline: '2026-07-30' }), TODAY)).toBe('active')
  })

  it('is future before the open date', () => {
    expect(statusOf(makeListing({ id: 1, openDate: '2026-09-01', deadline: '2026-10-01' }), TODAY)).toBe('future')
  })

  it('treats a curator-closed listing with a future deadline as next-cycle', () => {
    expect(statusOf(makeListing({ id: 1, deadline: '2026-12-01', active: false }), TODAY)).toBe('future')
  })

  it('is active with no deadline at all', () => {
    expect(statusOf(makeListing({ id: 1 }), TODAY)).toBe('active')
  })
})

describe('chipFor', () => {
  it('names the last two days rather than counting them', () => {
    expect(chipFor(makeListing({ id: 1, deadline: '2026-07-30' }), TODAY).text).toBe('CLOSES TODAY')
    expect(chipFor(makeListing({ id: 2, deadline: '2026-07-31' }), TODAY).text).toBe('CLOSES TOMORROW')
  })

  it('marks everything inside ten days urgent', () => {
    expect(chipFor(makeListing({ id: 1, deadline: '2026-08-08' }), TODAY)).toMatchObject({ text: '9 DAYS LEFT', urgent: true })
    expect(chipFor(makeListing({ id: 2, deadline: '2026-08-20' }), TODAY)).toMatchObject({ text: '21 DAYS · START NOW', urgent: false })
  })

  it('covers the states the mock never had', () => {
    expect(chipFor(makeListing({ id: 1, deadline: '2026-07-01' }), TODAY).text).toBe('CLOSED')
    expect(chipFor(makeListing({ id: 2, openDate: '2026-09-01', deadline: '2026-10-01' }), TODAY).text).toBe('OPENS SEP 1')
    expect(chipFor(makeListing({ id: 3, active: false, deadline: '2026-12-01' }), TODAY).text).toBe('OPENING SOON')
    expect(chipFor(makeListing({ id: 4 }), TODAY).text).toBe('OPEN · NO FIXED DATE')
  })
})

// ── Derived labels ────────────────────────────────────────────────────────────

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('South Country Co-op Scholarship')).toBe('SC')
    expect(initialsOf('Rutherford')).toBe('RU')
    expect(initialsOf('!!!')).toBe('SA')
  })
})

describe('orgLine / hashTags / feedStamp', () => {
  const l = makeListing({ id: 1, category: 'STEM', region: 'Medicine Hat', verified: '2026-07-28' })

  it('builds the org line from region and category', () => {
    expect(orgLine(l)).toBe('Medicine Hat · STEM')
    expect(orgLine(makeListing({ id: 2 }))).toBe('Alberta')
  })

  it('slugs the tag line and says how to apply', () => {
    expect(hashTags(l)).toBe('#stem #medicinehat #applyonline')
    expect(hashTags(makeListing({ id: 2, category: 'Trades', guidance: true }))).toBe('#trades #viaschool')
  })

  it('stamps the feed card with the real verification date', () => {
    expect(feedStamp(l)).toBe('STEM · MEDICINE HAT · HAND-CHECKED JUL 28')
    expect(feedStamp(makeListing({ id: 2 }))).toBe('SCHOLARSHIP · ALBERTA')
  })
})

describe('applySteps', () => {
  it('routes school-administered awards through the counsellor', () => {
    const steps = applySteps(makeListing({ id: 1, guidance: true, deadline: '2026-08-15' }))
    expect(steps[0]).toContain('guidance counsellor')
    expect(steps[2]).toContain('before Aug 15, 2026')
  })

  it('drops the date clause when there is no deadline', () => {
    const steps = applySteps(makeListing({ id: 1 }))
    expect(steps[2]).toBe('Submit through the official website.')
  })
})

describe('shortMoney / moneyTotal', () => {
  it('abbreviates thousands and leaves unparseable amounts alone', () => {
    expect(shortMoney('$120,000')).toBe('$120k')
    expect(shortMoney('$1,000')).toBe('$1k')
    expect(shortMoney('$500')).toBe('$500')
    expect(shortMoney('Varies')).toBe('Varies')
    expect(moneyTotal(0)).toBe('$0')
    expect(moneyTotal(11500)).toBe('$12k')
  })
})

// ── Selection ─────────────────────────────────────────────────────────────────

describe('openListings / byDeadline', () => {
  const pool = [
    makeListing({ id: 1, deadline: '2026-07-01' }),               // closed
    makeListing({ id: 2, deadline: '2026-08-20' }),
    makeListing({ id: 3, deadline: '2026-07-31' }),
    makeListing({ id: 4 }),                                        // no deadline
  ]

  it('drops expired listings', () => {
    expect(openListings(pool, TODAY).map(l => l.id)).toEqual([2, 3, 4])
  })

  it('sorts soonest first and puts undated listings last', () => {
    expect([...pool].sort(byDeadline).map(l => l.id)).toEqual([1, 3, 2, 4])
  })
})

describe('searchListings', () => {
  const pool = [
    makeListing({ id: 1, title: 'Rutherford Scholarship', category: 'Academic' }),
    makeListing({ id: 2, title: 'Trades Award', audience: 'RAP apprentices', region: 'Medicine Hat' }),
  ]

  it('matches title, audience, category and region', () => {
    expect(searchListings(pool, 'ruth').map(l => l.id)).toEqual([1])
    expect(searchListings(pool, 'apprentice').map(l => l.id)).toEqual([2])
    expect(searchListings(pool, 'medicine hat').map(l => l.id)).toEqual([2])
    expect(searchListings(pool, 'academic').map(l => l.id)).toEqual([1])
  })

  it('returns everything for a blank query', () => {
    expect(searchListings(pool, '   ')).toHaveLength(2)
  })
})

describe('filterCategory / categoryKeys', () => {
  const pool = [
    makeListing({ id: 1, category: 'Academic' }),
    makeListing({ id: 2, category: 'STEM' }),
    makeListing({ id: 3, category: 'Academic' }),
    makeListing({ id: 4, category: null }),
  ]

  it('filters case-insensitively against the uppercased chip', () => {
    expect(filterCategory(pool, 'ACADEMIC').map(l => l.id)).toEqual([1, 3])
    expect(filterCategory(pool, 'ALL')).toHaveLength(4)
  })

  it('orders chips by how many listings each holds', () => {
    expect(categoryKeys(pool)).toEqual(['ACADEMIC', 'STEM'])
  })
})

describe('nearbyListings', () => {
  const pool = [
    makeListing({ id: 1, region: 'Medicine Hat' }),
    makeListing({ id: 2, region: 'Alberta' }),
    makeListing({ id: 3, region: 'National' }),
    makeListing({ id: 4, region: 'Calgary' }),
  ]

  it('keeps the student’s own city plus Alberta-wide awards', () => {
    expect(nearbyListings(pool, 'Medicine Hat').map(l => l.id)).toEqual([1, 2])
  })

  it('falls back to Alberta-wide when the quiz has not been taken', () => {
    expect(nearbyListings(pool, null).map(l => l.id)).toEqual([2])
  })

  it('still gives Other Alberta students the Alberta-wide set', () => {
    // No listing carries region "Other Alberta", so a city-only rule would
    // leave these students with a permanently empty Nearby feed.
    expect(nearbyListings(pool, 'Other Alberta').map(l => l.id)).toEqual([2])
  })

  it('never includes National or out-of-city awards', () => {
    expect(nearbyListings(pool, 'Medicine Hat').map(l => l.region)).not.toContain('National')
    expect(nearbyListings(pool, 'Medicine Hat').map(l => l.region)).not.toContain('Calgary')
  })
})

describe('programs', () => {
  it('expands the compact program wire shape', () => {
    const p = expandProgram({ i: 3, n: 'TRIUMF High School Fellowship', d: '2026-08-10', u: 'https://x.test', pr: 'TRIUMF', p: true })
    expect(p).toMatchObject({
      id: 3, name: 'TRIUMF High School Fellowship', deadline: '2026-08-10',
      provider: 'TRIUMF', paid: true, slug: 'triumf-high-school-fellowship',
    })
    expect(expandProgram({ i: 4, n: 'A', u: 'https://x.test' }).paid).toBe(false)
  })

  it('only treats real ISO dates as dated', () => {
    expect(isDatedIso('2026-08-10')).toBe(true)
    expect(isDatedIso('TBA')).toBe(false)
    expect(isDatedIso('Ongoing')).toBe(false)
    expect(isDatedIso(null)).toBe(false)
  })

  it('maps TBA/Ongoing/null to tba status, dates to active or closed', () => {
    expect(programStatusOf({ deadline: 'TBA' }, TODAY)).toBe('tba')
    expect(programStatusOf({ deadline: 'Ongoing' }, TODAY)).toBe('tba')
    expect(programStatusOf({ deadline: null }, TODAY)).toBe('tba')
    expect(programStatusOf({ deadline: '2026-08-10' }, TODAY)).toBe('active')
    expect(programStatusOf({ deadline: '2026-07-01' }, TODAY)).toBe('closed')
  })

  it('chips programs like the saved page does', () => {
    expect(programChipFor({ deadline: 'Ongoing' }, TODAY).text).toBe('ROLLING')
    expect(programChipFor({ deadline: '2026-07-01' }, TODAY).text).toBe('CLOSED')
    expect(programChipFor({ deadline: '2026-07-31' }, TODAY).text).toBe('CLOSES TOMORROW')
  })

  it('keeps timePressure at zero for pseudo-deadlines', () => {
    expect(timePressure({ deadline: 'TBA' }, TODAY)).toBe(0)
    expect(timePressure({ deadline: 'Ongoing' }, TODAY)).toBe(0)
    expect(timePressure({ deadline: '2026-08-29' }, TODAY)).toBe(50)
  })
})

describe('tabFromHash', () => {
  it('maps the four deep-linkable tabs', () => {
    expect(tabFromHash('#due')).toBe('due')
    expect(tabFromHash('#match')).toBe('match')
    expect(tabFromHash('#saved')).toBe('saved')
    expect(tabFromHash('#me')).toBe('me')
  })

  it('lands everything else on the feed', () => {
    expect(tabFromHash('')).toBe('feed')
    expect(tabFromHash('#feed')).toBe('feed')
    expect(tabFromHash('#nonsense')).toBe('feed')
  })
})

// ── Quiz profile ──────────────────────────────────────────────────────────────

describe('profileFromAnswers', () => {
  it('needs a city before it can build a profile', () => {
    expect(profileFromAnswers(null)).toBeNull()
    expect(profileFromAnswers({ grade: '12' })).toBeNull()
  })

  it('maps answers the same way the quiz does', () => {
    const p = profileFromAnswers({ grade: '11', city: 'Calgary', field: 'STEM', average: '85', institution: 'University of Calgary' })!
    expect(p).toMatchObject({
      grade: '11', city: 'Calgary', fields: ['STEM'], averagePercent: 85,
      targetInstitution: 'University of Calgary',
    })
    // Identity answers the app never asks stay null so they never hard-filter
    expect(p.identifiesAsFemale).toBeNull()
    expect(p.identifiesAsIndigenous).toBeNull()
  })

  it('treats the quiz’s "rather not say" empty strings as unanswered', () => {
    const p = profileFromAnswers({ city: 'Edmonton', field: '', average: '', institution: '' })!
    expect(p.fields).toEqual([])
    expect(p.averagePercent).toBeNull()
    expect(p.targetInstitution).toBeNull()
    expect(p.grade).toBe('12')
  })
})

describe('profileChips', () => {
  it('shows grade, city and field', () => {
    expect(profileChips({ grade: '12', city: 'Medicine Hat', field: 'STEM' })).toEqual(['GRADE 12', 'MEDICINE HAT', 'STEM'])
  })

  it('labels post-secondary without a grade number', () => {
    expect(profileChips({ grade: 'post-secondary', city: 'Calgary' })).toEqual(['POST-SECONDARY', 'CALGARY'])
  })

  it('is empty with no answers', () => {
    expect(profileChips(null)).toEqual([])
  })
})

// ── Saved screen ──────────────────────────────────────────────────────────────

describe('weekStrip', () => {
  it('runs Monday to Sunday around today', () => {
    // 2026-07-30 is a Thursday
    const week = weekStrip(TODAY, new Set())
    expect(week.map(d => d.num)).toEqual(['27', '28', '29', '30', '31', '1', '2'])
    expect(week.map(d => d.dow)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })

  it('marks today, past days, and days holding a saved deadline', () => {
    const week = weekStrip(TODAY, new Set(['2026-07-31']))
    expect(week.map(d => d.kind)).toEqual(['past', 'past', 'past', 'today', 'due', 'future', 'future'])
  })
})

describe('deadlineWeeks', () => {
  it('fills the bucket each deadline falls into', () => {
    expect(deadlineWeeks(TODAY, ['2026-07-31', '2026-08-20'])).toEqual([true, false, false, true, false])
  })

  it('ignores deadlines outside the five-week window', () => {
    expect(deadlineWeeks(TODAY, ['2026-06-01', '2026-12-01'])).toEqual([false, false, false, false, false])
  })
})

describe('timePressure', () => {
  it('fills as the deadline closes in', () => {
    expect(timePressure(makeListing({ id: 1, deadline: '2026-07-30' }), TODAY)).toBe(100)
    expect(timePressure(makeListing({ id: 2, deadline: '2026-08-29' }), TODAY)).toBe(50)
  })

  it('stays visible for far-off and undated listings', () => {
    expect(timePressure(makeListing({ id: 1, deadline: '2027-07-30' }), TODAY)).toBe(4)
    expect(timePressure(makeListing({ id: 2 }), TODAY)).toBe(0)
  })
})

// ── Research programs ─────────────────────────────────────────────────────────

function makeProgram(over: Partial<ProgramItem> & { id: number }): ProgramItem {
  return {
    name: `Program ${over.id}`,
    deadline: null,
    url: 'https://example.com',
    category: null,
    provider: null,
    paid: false,
    stipend: null,
    grades: null,
    duration: null,
    location: null,
    eligibility: null,
    description: null,
    slug: `program-${over.id}`,
    ...over,
  }
}

describe('expandProgram', () => {
  it('carries the detail fields the program sheet renders', () => {
    const p = expandProgram({
      i: 7, n: 'HYRS', u: 'https://example.com', d: 'TBA',
      p: true, s: '$3,000', g: 'Grade 11', du: '6 weeks', lo: 'Calgary',
      el: '85% in Math 20', de: 'Paid summer research.',
    })
    expect(p).toMatchObject({
      id: 7, paid: true, stipend: '$3,000', grades: 'Grade 11',
      duration: '6 weeks', location: 'Calgary', eligibility: '85% in Math 20',
      description: 'Paid summer research.',
    })
  })

  it('defaults every optional field so the sheet never prints undefined', () => {
    const p = expandProgram({ i: 1, n: 'Bare', u: 'https://example.com' })
    expect(p.stipend).toBeNull()
    expect(p.grades).toBeNull()
    expect(p.paid).toBe(false)
  })
})

describe('programPayLabel', () => {
  it('shows the stipend alongside PAID', () => {
    expect(programPayLabel({ paid: true, stipend: '$3,000' })).toBe('PAID · $3,000')
  })

  it('does not repeat itself when the stipend already says paid', () => {
    expect(programPayLabel({ paid: true, stipend: 'Paid (hourly rate in offer letter)' }))
      .toBe('PAID (HOURLY RATE IN OFFER LETTER)')
  })

  it('falls back to bare PAID and UNPAID', () => {
    expect(programPayLabel({ paid: true, stipend: null })).toBe('PAID')
    expect(programPayLabel({ paid: false, stipend: null })).toBe('UNPAID')
  })
})

describe('programDueLabel', () => {
  it('dates the ones that have a date', () => {
    expect(programDueLabel({ deadline: '2026-10-01' }, TODAY)).toBe('DUE OCT 1')
  })

  it('separates TBA, Ongoing and already-closed', () => {
    expect(programDueLabel({ deadline: 'TBA' }, TODAY)).toBe('DATE TBA')
    expect(programDueLabel({ deadline: null }, TODAY)).toBe('DATE TBA')
    expect(programDueLabel({ deadline: 'Ongoing' }, TODAY)).toBe('ONGOING')
    expect(programDueLabel({ deadline: '2026-01-01' }, TODAY)).toBe('CLOSED')
  })
})

describe('programCategoryKeys', () => {
  it('orders categories by how many programs each holds', () => {
    const list = [
      makeProgram({ id: 1, category: 'STEM' }),
      makeProgram({ id: 2, category: 'Health' }),
      makeProgram({ id: 3, category: 'STEM' }),
      makeProgram({ id: 4, category: null }),
    ]
    expect(programCategoryKeys(list)).toEqual(['STEM', 'HEALTH'])
  })
})

describe('filterProgramCategory', () => {
  it('matches case-insensitively and passes everything through on ALL', () => {
    const list = [makeProgram({ id: 1, category: 'Health' }), makeProgram({ id: 2, category: 'STEM' })]
    expect(filterProgramCategory(list, 'HEALTH').map(p => p.id)).toEqual([1])
    expect(filterProgramCategory(list, 'ALL')).toHaveLength(2)
  })
})

describe('sortPrograms', () => {
  it('puts what you can still apply to first, then TBA, then closed', () => {
    const list = [
      makeProgram({ id: 1, name: 'Closed', deadline: '2026-01-01' }),
      makeProgram({ id: 2, name: 'Tba', deadline: 'TBA' }),
      makeProgram({ id: 3, name: 'Later', deadline: '2026-12-01' }),
      makeProgram({ id: 4, name: 'Sooner', deadline: '2026-09-01' }),
    ]
    expect(sortPrograms(list, TODAY).map(p => p.id)).toEqual([4, 3, 2, 1])
  })

  it('does not mutate the list it is given', () => {
    const list = [makeProgram({ id: 1, deadline: '2026-12-01' }), makeProgram({ id: 2, deadline: '2026-09-01' })]
    sortPrograms(list, TODAY)
    expect(list.map(p => p.id)).toEqual([1, 2])
  })
})

// ── Awards that reopen ────────────────────────────────────────────────────────

describe('reopenStats', () => {
  it('splits the catalog into closed and everything the app still shows', () => {
    const list = [
      makeListing({ id: 1, deadline: '2026-05-01' }),                          // closed
      makeListing({ id: 2, deadline: '2026-06-01' }),                          // closed
      makeListing({ id: 3, deadline: '2026-09-01' }),                          // open
      makeListing({ id: 4, deadline: '2026-09-01', openDate: '2026-08-15' }),  // not open yet, dated
      makeListing({ id: 5, deadline: '2026-12-01', active: false }),           // not open yet, undated
    ]
    expect(reopenStats(list, TODAY)).toEqual({ closed: 2, open: 3, dated: 1 })
  })

  it('agrees with openListings, so the two screens never contradict', () => {
    const list = [
      makeListing({ id: 1, deadline: '2026-05-01' }),
      makeListing({ id: 2, deadline: '2026-09-01' }),
      makeListing({ id: 3, deadline: '2026-09-01', openDate: '2026-08-15' }),
    ]
    expect(reopenStats(list, TODAY).open).toBe(openListings(list, TODAY).length)
  })
})

describe('reopenHeadline', () => {
  it('names the month when most of the catalog is shut', () => {
    expect(reopenHeadline({ closed: 107, open: 50, dated: 18 }, TODAY)).toBe('July is a quiet month.')
  })

  it('reports the count instead when more is open than closed', () => {
    expect(reopenHeadline({ closed: 10, open: 50, dated: 2 }, TODAY)).toBe('10 closed for this cycle.')
  })

  it('says so when nothing is closed at all', () => {
    expect(reopenHeadline({ closed: 0, open: 50, dated: 0 }, TODAY)).toBe('Everything in the catalog is open.')
  })
})

describe('reopenRegions', () => {
  it('groups closed listings by region, biggest group first', () => {
    const list = [
      makeListing({ id: 1, region: 'Alberta', deadline: '2026-03-01' }),
      makeListing({ id: 2, region: 'Alberta', deadline: '2026-06-01' }),
      makeListing({ id: 3, region: 'Medicine Hat', deadline: '2026-05-01' }),
      makeListing({ id: 4, region: 'Alberta', deadline: '2026-09-01' }), // still open
    ]
    expect(reopenRegions(list, TODAY)).toEqual([
      { region: 'Alberta', n: 2, months: 'MOST CLOSED MAR – JUN' },
      { region: 'Medicine Hat', n: 1, months: 'ALL CLOSED IN MAY' },
    ])
  })

  it('files a region-less listing under Alberta', () => {
    const list = [makeListing({ id: 1, deadline: '2026-04-15' })]
    expect(reopenRegions(list, TODAY)[0]!.region).toBe('Alberta')
  })
})

describe('nextToOpen', () => {
  it('picks the soonest published open date still ahead', () => {
    const list = [
      makeListing({ id: 1, openDate: '2026-09-01', deadline: '2026-12-01' }),
      makeListing({ id: 2, openDate: '2026-08-01', deadline: '2026-12-01' }),
      makeListing({ id: 3, deadline: '2026-12-01', active: false }), // dormant, no date
    ]
    expect(nextToOpen(list, TODAY)?.id).toBe(2)
  })

  it('returns null when nothing has a published date', () => {
    expect(nextToOpen([makeListing({ id: 1, deadline: '2026-09-01' })], TODAY)).toBeNull()
  })
})

describe('closedListings', () => {
  it('returns only closed listings, most recently closed first', () => {
    const list = [
      makeListing({ id: 1, deadline: '2026-03-01' }),
      makeListing({ id: 2, deadline: '2026-06-01' }),
      makeListing({ id: 3, deadline: '2026-09-01' }),
    ]
    expect(closedListings(list, TODAY).map(l => l.id)).toEqual([2, 1])
  })
})

// ── Guides ────────────────────────────────────────────────────────────────────

describe('expandGuide', () => {
  it('renames the wire keys to what the reader reads', () => {
    expect(expandGuide({
      s: 'essay', t: 'Title', k: 'WRITING', d: 'Stand', m: 8, u: '2026-07-19', p: ['a', 'b'],
    })).toEqual({
      slug: 'essay', title: 'Title', kicker: 'WRITING', standfirst: 'Stand',
      minutes: 8, updated: '2026-07-19', points: ['a', 'b'],
    })
  })
})

describe('guide metadata', () => {
  it('gives every guide exactly three takeaways for the app reader', () => {
    for (const g of guides) {
      expect(g.takeaways, g.slug).toHaveLength(3)
      for (const t of g.takeaways) expect(t.length, g.slug).toBeGreaterThan(20)
    }
  })
})

// ── Deep links ────────────────────────────────────────────────────────────────

describe('routeFromHash', () => {
  it('reads a bare tab', () => {
    expect(routeFromHash('#saved')).toEqual({ tab: 'saved', screen: null, slug: null })
  })

  it('opens a pushed screen over its home tab', () => {
    expect(routeFromHash('#programs')).toEqual({ tab: 'me', screen: 'programs', slug: null })
    expect(routeFromHash('#reopening')).toEqual({ tab: 'due', screen: 'reopening', slug: null })
    expect(routeFromHash('#quiz')).toEqual({ tab: 'match', screen: 'quiz', slug: null })
  })

  it('carries a guide slug', () => {
    expect(routeFromHash('#guide/how-to-write-a-scholarship-essay'))
      .toEqual({ tab: 'me', screen: 'guide', slug: 'how-to-write-a-scholarship-essay' })
  })

  it('falls back to the feed for anything it does not recognize', () => {
    expect(routeFromHash('#nonsense')).toEqual({ tab: 'feed', screen: null, slug: null })
    expect(routeFromHash('')).toEqual({ tab: 'feed', screen: null, slug: null })
  })
})

// ── Quiz parity ───────────────────────────────────────────────────────────────

describe('QUIZ_QUESTIONS', () => {
  it('asks for everything profileFromAnswers needs to build a profile', () => {
    const answers: Record<string, string> = {}
    for (const q of QUIZ_QUESTIONS) answers[q.key] = q.opts[0]!.value
    const profile = profileFromAnswers(answers)
    expect(profile).not.toBeNull()
    expect(profile!.city).toBe('Medicine Hat')
    expect(profile!.grade).toBe('10')
  })

  it('keeps every option answerable — a label, a hint and a defined value', () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.opts.length, q.key).toBeGreaterThan(1)
      for (const o of q.opts) {
        expect(o.label, q.key).toBeTruthy()
        expect(o.hint, q.key).toBeTruthy()
        expect(typeof o.value, q.key).toBe('string')
      }
    }
  })
})
