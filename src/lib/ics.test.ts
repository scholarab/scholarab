import { describe, it, expect } from 'vitest'
import { buildICS } from './ics'

describe('buildICS', () => {
  const sch = [
    { id: 1, title: 'Big Award', amount: '$5,000', url: 'https://a.example', deadline: '2026-05-01' },
    { id: 2, title: 'No Deadline Award', amount: '$1,000', url: 'https://b.example', deadline: null },
  ]
  const prg = [
    { id: 7, name: 'Summer Lab', url: 'https://c.example', deadline: '2026-06-15' },
    { id: 8, name: 'Rolling Program', url: 'https://d.example', deadline: 'Ongoing' },
    { id: 9, name: 'TBA Program', url: 'https://e.example', deadline: 'TBA' },
  ]

  it('emits one all-day VEVENT per dated item and skips TBA/Ongoing/null', () => {
    const ics = buildICS(sch, prg)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('UID:scholarab-sch-1@scholarab.ca')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260501')
    expect(ics).toContain('DTEND;VALUE=DATE:20260502')
    expect(ics).toContain('SUMMARY:Deadline: Big Award')
    expect(ics).toContain('DESCRIPTION:Big Award: $5\\,000\\nApply at: https://a.example')
    expect(ics).toContain('UID:scholarab-prg-7@scholarab.ca')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615')
    expect(ics).not.toContain('No Deadline Award')
    expect(ics).not.toContain('Rolling Program')
    expect(ics).not.toContain('TBA Program')
  })

  it('escapes commas and semicolons in text fields per RFC 5545', () => {
    const ics = buildICS(
      [{ id: 3, title: 'Math, Science; Award', amount: null, url: 'https://f.example', deadline: '2026-04-01' }],
      [],
    )
    expect(ics).toContain('SUMMARY:Deadline: Math\\, Science\\; Award')
    expect(ics).not.toContain('undefined')
    expect(ics).not.toContain('null')
  })

  it('computes DTEND from the local calendar day, not UTC', () => {
    // Dec 31 + 1 day must be Jan 1 of the next year in every timezone
    const ics = buildICS(
      [{ id: 4, title: 'Year End Award', amount: '$1,000', url: 'https://g.example', deadline: '2026-12-31' }],
      [],
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
  })

  it('wraps events in a valid calendar envelope with CRLF line endings', () => {
    const ics = buildICS(sch, prg)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
  })
})
