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

  it('folds every content line to 75 octets, unfolding back to the original', () => {
    const longTitle = 'Alexander Rutherford Scholarship for High School Achievement, Southern Alberta Regional Selection Committee'
    const ics = buildICS(
      [{ id: 5, title: longTitle, amount: '$2,500', url: 'https://very.long.example/apply/2027/southern-alberta/regional', deadline: '2027-03-01' }],
      [],
    )
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    // A folded line is one leading space plus the continuation; stripping the
    // fold has to give the SUMMARY back exactly. Compared against the escaped
    // title, since the comma in it is escaped before the line is ever folded.
    const unfolded = ics.split('\r\n ').join('')
    expect(unfolded).toContain(`SUMMARY:Deadline: ${longTitle.replace(/,/g, '\\,')}`)
  })

  it('never folds in the middle of a multi-byte character', () => {
    const ics = buildICS(
      [],
      [{ id: 6, name: 'Programme de recherche en génie électrique et informatique de l\'Université de Montréal', url: 'https://u.example', deadline: '2027-05-01' }],
    )
    // A fold that split a surrogate pair or a UTF-8 sequence would leave a
    // replacement character behind on the round trip.
    expect(ics).not.toContain('\uFFFD')
    const unfolded = ics.split('\r\n ').join('')
    expect(unfolded).toContain('génie électrique')
  })

  it('wraps events in a valid calendar envelope with CRLF line endings', () => {
    const ics = buildICS(sch, prg)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
  })
})
