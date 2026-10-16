import { describe, expect, it } from 'vitest'
import { pageText, proseMarks } from '../../scripts/check-prose-marks'

describe('proseMarks', () => {
  it('flags a colon or semicolon in body text, the title and the description', () => {
    const html = [
      '<html><head><title>Aaron Family Scholarship: $750 | ScholarAB</title>',
      '<meta name="description" content="Opens soon; check back."></head>',
      '<body><p>Three things matter: the date, the amount and you.</p>',
      '<p><strong>When you apply:</strong> early.</p></body></html>',
    ].join('')
    expect(proseMarks(pageText(html), [])).toEqual([
      'Aaron Family Scholarship: $750 | ScholarAB',
      'Opens soon; check back.',
      'Three things matter: the date, the amount and you.',
      'When you apply:',
    ])
  })

  it('passes clock times, URLs, entities, code and scripts', () => {
    const html = [
      '<html><head><title>Deadlines | ScholarAB</title></head><body>',
      '<p>Doors open at 9:30 am at https://www.scholarab.ca/ and more&hellip; next &rarr;</p>',
      '<pre>Deadline: [date].</pre><script>const a = { b: 1 };</script>',
      '<!-- note: kept --></body></html>',
    ].join('')
    expect(proseMarks(pageText(html), [])).toEqual([])
  })

  it('passes an official name that carries a colon, and nothing else around it', () => {
    const name = 'Keyera Energy: Peter J. Renton Memorial Scholarship'
    expect(proseMarks([`${name} ($1,000) | ScholarAB`], [name])).toEqual([])
    expect(proseMarks([`${name} pays out: twice a year`], [name])).toEqual([`${name} pays out: twice a year`])
  })
})
