import { describe, it, expect } from 'vitest'
import { saysNoApplication } from './apply-method'
import scholarships from '../data/scholarships.json'

describe('saysNoApplication', () => {
  it.each([
    'There is nothing to fill in.',
    'There is no application.',
    'No application; your coach puts your name forward.',
    'No separate application form.',
    'You do not apply for this one directly; the school nominates.',
    'Students are automatically considered for this scholarship.',
    'French teachers nominate; no application is necessary.',
  ])('reads "%s" as no application', t => {
    expect(saysNoApplication(t)).toBe(true)
  })

  it.each([
    'There is no application essay and no need test.',
    'FOPA publishes no application page of its own, so student services holds the form.',
    'The committee may give no award if no application fits.',
    'Apply online before March 1.',
    'One online form enters you for every award, so you do not apply to them individually.',
    "Unlike the school's subject prizes, which are decided on marks alone and need no application.",
    'A teacher can nominate you by letter even if you do not apply yourself.',
  ])('does not read "%s" as no application', t => {
    expect(saysNoApplication(t)).toBe(false)
  })

  it('ignores missing text', () => {
    expect(saysNoApplication(null, undefined, '')).toBe(false)
  })

  it('flags the Rutherford Scholar Award and leaves the Alexander Rutherford alone', () => {
    const find = (title: string) => (scholarships as unknown as Array<Record<string, string | null>>).find(s => s.title === title)!
    const scholar = find('Rutherford Scholar Award')
    const alexander = find('Alexander Rutherford Scholarship')
    expect(saysNoApplication(scholar.notes, scholar.metaDetail, scholar.description)).toBe(true)
    expect(saysNoApplication(alexander.notes, alexander.metaDetail, alexander.description)).toBe(false)
  })
})
