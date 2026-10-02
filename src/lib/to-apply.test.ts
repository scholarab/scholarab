import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { toApplyProblems } from './to-apply'

describe('toApplyProblems', () => {
  const sound = { checked: '2026-10-01', complete: true, items: [{ kind: 'essay', text: 'A 500-word essay' }] }

  it('accepts a listing without the field', () => {
    expect(toApplyProblems(undefined)).toEqual([])
    expect(toApplyProblems(null)).toEqual([])
  })

  it('accepts a sound entry', () => {
    expect(toApplyProblems(sound)).toEqual([])
    expect(toApplyProblems({ ...sound, items: [{ kind: 'reference', text: 'Two letters', count: 2 }] })).toEqual([])
  })

  it('rejects an unknown kind, empty text and a bad date', () => {
    expect(toApplyProblems({ ...sound, checked: 'Oct 2026' })).toContain('checked must be YYYY-MM-DD')
    expect(toApplyProblems({ ...sound, items: [{ kind: 'poem', text: 'x' }] })[0]).toMatch(/unknown kind/)
    expect(toApplyProblems({ ...sound, items: [{ kind: 'essay', text: ' ' }] })[0]).toMatch(/empty text/)
    expect(toApplyProblems({ ...sound, items: [] })).toContain('items must be a non-empty list')
  })

  it('keeps counts on references and "none" on its own', () => {
    expect(toApplyProblems({ ...sound, items: [{ kind: 'essay', text: 'x', count: 2 }] })).toContain('item 0: count is only for references')
    expect(toApplyProblems({ ...sound, items: [{ kind: 'none', text: 'No application' }, { kind: 'essay', text: 'x' }] })).toContain('a "none" item stands alone')
  })

  it('holds for every listing in the catalogue', () => {
    const all = JSON.parse(readFileSync(join(__dirname, '../data/scholarships.json'), 'utf8')) as Array<{ id: number; toApply?: unknown }>
    const bad = all.flatMap((s) => toApplyProblems(s.toApply).map((p) => `${s.id}: ${p}`))
    expect(bad).toEqual([])
    expect(all.filter((s) => s.toApply).length).toBeGreaterThan(0)
  })
})
