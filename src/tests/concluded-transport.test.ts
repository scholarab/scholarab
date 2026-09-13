import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { savedScholarshipChip } from '../lib/saved-client'
import { scholarshipDayChip } from '../lib/list-core'
import { quizPayload } from '../lib/quiz-payload'
import type { Scholarship } from '../lib/data-loader'
import scholarships from '../data/scholarships.json'
import generated from '../data/quiz-payload.json'

// `concluded` was added to status.ts and the detail page, but the directory,
// Saved and the quiz each rebuild a listing from their own transport and dropped
// the flag. The ended TD award then showed OPENING SOON beside "No longer
// accepting applications" on the live directory, and stayed in quiz results.

const ended = { deadline: null, openDate: null, active: false, concluded: true }

describe('a concluded award is closed on every client surface', () => {
  it('Saved chips it CLOSED', () => {
    expect(savedScholarshipChip(ended)).toEqual({ label: 'CLOSED', cls: 'sabl-days neutral' })
  })

  it('the directory chips it CLOSED', () => {
    expect(scholarshipDayChip({ id: 1, title: 'x', ...ended } as never)).toEqual({ label: 'CLOSED', cls: 'sabl-days neutral' })
  })

  it('the quiz payload keeps the flag, and only where it is true', () => {
    const rows = quizPayload([
      { id: 1, title: 'Ended', concluded: true },
      { id: 2, title: 'Open' },
    ] as unknown as Scholarship[], [])
    expect(rows.scholarships[0]).toHaveProperty('concluded', true)
    expect(rows.scholarships[1]).not.toHaveProperty('concluded')
  })

  it('the generated quiz payload marks every concluded listing in the data', () => {
    const ids = (scholarships as Array<{ id: number; concluded?: boolean }>).filter(s => s.concluded).map(s => s.id)
    expect(ids.length).toBeGreaterThan(0)
    const marked = new Set(generated.scholarships.filter(s => (s as { concluded?: boolean }).concluded).map(s => s.id))
    expect([...marked].sort()).toEqual([...ids].sort())
  })
})

describe('every card transport that carries `inactive` also carries `concluded`', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  const count = (text: string, needle: string) => text.split(needle).length - 1

  // SabDetail is absent on purpose: the detail page withholds its clock-driven
  // attributes for a concluded award instead of passing the flag through.
  for (const file of ['components/sab/ScholarshipDirectory.astro', 'components/sab/SavedDirectory.astro', 'lib/saved-client.ts']) {
    it(file, () => {
      const text = src(file)
      expect(count(text, 'data-concluded=')).toBe(count(text, 'data-inactive='))
      expect(count(text, 'd.concluded')).toBe(count(text, 'd.inactive'))
    })
  }

  it('the quiz drops concluded awards before matching', () => {
    expect(src('components/EligibilityQuiz.tsx')).toContain('!s.concluded')
  })
})
