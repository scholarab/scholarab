import { describe, expect, it } from 'vitest'
import { shadowedSources } from '../../scripts/check-redirect-shadows'

describe('shadowedSources', () => {
  const built = new Set(['/scholarships/lethbridge/combos/', '/scholarships/calgary/'])
  const isPage = (p: string) => built.has(p)

  it('names both slash forms of a rule whose source is a built page', () => {
    const file = [
      '# comment /scholarships/calgary/ stays out',
      '/scholarships/lethbridge/combos /scholarships/lethbridge/ 301',
      '/scholarships/lethbridge/combos/ /scholarships/lethbridge/ 301',
      '/scholarships/old-name /scholarships/calgary/ 301',
      '',
    ].join('\n')
    expect(shadowedSources(file, isPage)).toEqual(['/scholarships/lethbridge/combos', '/scholarships/lethbridge/combos/'])
  })

  it('leaves splats and placeholders alone', () => {
    expect(shadowedSources('/scholarships/* /x/ 301\n/scholarships/:slug /x/ 301', () => true)).toEqual([])
  })
})
