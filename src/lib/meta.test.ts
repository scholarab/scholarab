import { describe, it, expect } from 'vitest'
import { clampMeta, scholarshipMeta, programMeta, META_MAX } from './meta.ts'

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

describe('clampMeta', () => {
  it('leaves anything already short enough alone', () => {
    expect(clampMeta('short enough', 50)).toBe('short enough')
  })

  it('cuts on a word boundary rather than mid-word', () => {
    // The bug this replaces: slice(0, n) landed inside "underrepresented".
    expect(clampMeta('paid research for students underrepresented in science', 32))
      .toBe('paid research for students')
  })

  it('adds no ellipsis of its own', () => {
    expect(clampMeta('a bcd efg hij', 8)).not.toContain('...')
  })

  it('drops punctuation left dangling by the cut', () => {
    expect(clampMeta('grants, bursaries, and awards', 18)).toBe('grants, bursaries')
  })

  it('prefers a finished sentence when one is far enough in', () => {
    expect(clampMeta('Highest level of chemistry competition for youth. You enter through the contest in April, which is', 80))
      .toBe('Highest level of chemistry competition for youth.')
  })

  it('falls back to a clause boundary before a bare word boundary', () => {
    expect(clampMeta('Alberta students enrolled full-time in the Faculty of Humanities, Social Sciences, or Arts at an institution', 95))
      .toBe('Alberta students enrolled full-time in the Faculty of Humanities, Social Sciences')
  })

  it('never ends inside an unclosed parenthetical', () => {
    const d = clampMeta('A six-week paid Academy ($3,000 award, plus a $500 travel bursary) for students who have finished', 90)
    expect(d).toBe('A six-week paid Academy ($3,000 award, plus a $500 travel bursary) for students')
  })

  it('backs off a trailing function word', () => {
    expect(clampMeta('paid research placements for students who', 40)).toBe('paid research placements for students')
  })

  it('rejects a sentence break that would throw away half the room', () => {
    // "Yes." is a legal stop but keeping only it would waste the snippet.
    expect(clampMeta('Yes. A much longer explanation of the award follows here', 40)).toBe('Yes. A much longer explanation')
  })

  it('hard-cuts a single token with no space to break on', () => {
    expect(clampMeta('a'.repeat(40), 10)).toBe('a'.repeat(10))
  })
})

describe('scholarshipMeta', () => {
  const base = { title: 'Test Award', amount: '$2,500', audience: 'Alberta high school students', region: 'Alberta' }

  it('leads with the open date for a listing whose cycle has not started', () => {
    expect(scholarshipMeta({ ...base, openDate: '2026-08-01' }, 'future', fmt))
      .toMatch(/^Opens August 1, 2026\. \$2,500 for /)
  })

  it('says the dates are unannounced when a future listing has no open date', () => {
    // Never invents one: a null openDate means we have not confirmed it.
    expect(scholarshipMeta({ ...base }, 'future', fmt)).toMatch(/^Not open yet — next cycle dates to be announced\./)
  })

  it('leads with the closing date while the listing is open', () => {
    expect(scholarshipMeta({ ...base, deadline: '2026-10-01' }, 'active', fmt))
      .toMatch(/^Open now, closes October 1, 2026\. \$2,500 for /)
  })

  it('does not claim there is no deadline, only that none is announced', () => {
    const d = scholarshipMeta({ ...base, deadline: null }, 'active', fmt)
    expect(d).toContain('no deadline announced')
  })

  it('keeps the date and the amount when the audience is too long to fit', () => {
    const d = scholarshipMeta(
      { ...base, deadline: '2026-10-01', audience: 'Alberta students '.repeat(20) },
      'active',
      fmt,
    )
    expect(d.length).toBeLessThanOrEqual(META_MAX)
    expect(d).toContain('October 1, 2026')
    expect(d).toContain('$2,500')
  })

  it('marks the region only when the award is not national', () => {
    expect(scholarshipMeta({ ...base, region: 'National', deadline: '2026-10-01' }, 'active', fmt)).not.toContain('(')
    expect(scholarshipMeta({ ...base, region: 'Calgary', deadline: '2026-10-01' }, 'active', fmt)).toContain('(Calgary)')
  })

  it('survives a listing with no amount and no audience', () => {
    expect(scholarshipMeta({ title: 'Bare' }, 'active', fmt)).toBe('Open now, with no deadline announced.')
  })
})

describe('programMeta', () => {
  const p = { name: 'HYRS', provider: 'Alberta Innovates', description: 'A paid summer research placement.' }

  it('prefixes the closing date for a dated cycle', () => {
    expect(programMeta({ ...p, deadline: '2026-03-01' }, 'active', fmt))
      .toBe('Applications close March 1, 2026. A paid summer research placement.')
  })

  it('says open year-round for an ongoing program', () => {
    expect(programMeta(p, 'ongoing', fmt)).toBe('Open year-round. A paid summer research placement.')
  })

  it('leaves a TBA cycle with just its description', () => {
    expect(programMeta(p, 'tba', fmt)).toBe('A paid summer research placement.')
  })

  it('falls back to a generated sentence when the description is empty', () => {
    expect(programMeta({ name: 'X', provider: 'Y', description: '' }, 'tba', fmt))
      .toContain('X is a research program run by Y')
  })

  it('never returns more than Google renders', () => {
    const long = { ...p, description: 'word '.repeat(100), deadline: '2026-03-01' }
    expect(programMeta(long, 'active', fmt).length).toBeLessThanOrEqual(META_MAX)
  })
})
