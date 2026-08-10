import { describe, it, expect } from 'vitest'
import {
  scholarshipStatusOf,
  programStatusOf,
  scholarshipIsIndexable,
  programIsIndexable,
} from './status.ts'

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

describe('programStatusOf', () => {
  it('reads the two sentinel deadlines rather than parsing them as dates', () => {
    expect(programStatusOf({ deadline: 'TBA' }, TODAY)).toBe('tba')
    expect(programStatusOf({ deadline: 'Ongoing' }, TODAY)).toBe('ongoing')
    expect(programStatusOf({ deadline: null }, TODAY)).toBe('tba')
  })

  it('is active up to and including the deadline day, closed after it', () => {
    expect(programStatusOf({ deadline: '2026-04-05' }, TODAY)).toBe('active')
    expect(programStatusOf({ deadline: '2026-04-04' }, TODAY)).toBe('closed')
  })
})

// These two are the contract generate-sitemap.ts and [type]/[slug].astro share:
// the sitemap lists exactly the pages that do NOT carry a noindex. A listing
// that disagrees across the two is the "Excluded by 'noindex' tag" error.
describe('the sitemap/noindex contract', () => {
  it('keeps a scholarship indexable while it waits for its next cycle', () => {
    expect(scholarshipIsIndexable({ deadline: '2027-05-15', active: false }, TODAY)).toBe(true)
    expect(scholarshipIsIndexable({ openDate: '2026-09-01', deadline: '2026-12-01' }, TODAY)).toBe(true)
  })

  it('drops a scholarship whose deadline passed with no next open date', () => {
    expect(scholarshipIsIndexable({ deadline: '2026-04-04' }, TODAY)).toBe(false)
  })

  it('drops a program whose deadline passed before auto-expire reset it to TBA', () => {
    // The gap this closes: auto-expire runs once a day, so for up to a day a
    // passed date sits in the JSON. The page noindexed it and the old sitemap
    // filter — which only looked at `active` — listed it anyway.
    expect(programIsIndexable({ deadline: '2026-04-04' }, TODAY)).toBe(false)
    expect(programIsIndexable({ deadline: '2026-04-05' }, TODAY)).toBe(true)
  })

  it('drops a retired program, whichever deadline it was left holding', () => {
    // programs.astro keeps these pages for old links but hides them from the
    // directory and the quiz, so there is nothing to send Google to.
    expect(programIsIndexable({ deadline: 'TBA', active: false }, TODAY)).toBe(false)
    expect(programIsIndexable({ deadline: 'Ongoing', active: false }, TODAY)).toBe(false)
  })

  it('keeps a live program with no announced date — most of the directory', () => {
    expect(programIsIndexable({ deadline: 'TBA' }, TODAY)).toBe(true)
    expect(programIsIndexable({ deadline: 'Ongoing' }, TODAY)).toBe(true)
  })
})
