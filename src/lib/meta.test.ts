import { describe, it, expect } from 'vitest'
import { clampMeta, scholarshipMeta, scholarshipMetas, programMeta, brandedTitle, listingTitle, amountFragment, wholeSentences, daysBetween, META_MAX, TITLE_MAX } from './meta.ts'
import scholarshipData from '../data/scholarships.json'
import programData from '../data/research-programs.json'
import { scholarshipStatusOf } from './status.ts'

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

  it('prefers a finished sentence when one lands near the budget', () => {
    expect(clampMeta('Highest level of chemistry competition for high school students in Canada. You enter in April', 80))
      .toBe('Highest level of chemistry competition for high school students in Canada.')
  })

  it('takes the fuller cut when the only sentence end is far short of the budget', () => {
    // The defect this replaces: a full stop at 79 of 155 beat a word boundary
    // at 150, so 25 program pages rendered half a snippet. A boundary is worth
    // a few characters, not fifty.
    expect(clampMeta('Highest level of chemistry competition for youth. You enter through the contest in April, which is', 80))
      .toBe('Highest level of chemistry competition for youth. You enter through the contest')
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

  // amountFragment lowercases "Up to" so it can continue a title after a colon.
  // In an undated snippet the same fragment opens the sentence, and four live
  // pages shipped reading "up to $6,000 for ...".
  it('capitalizes an "Up to" amount when it opens an undated snippet', () => {
    expect(scholarshipMeta({ ...base, amount: 'Up to $6,000' }, 'future', fmt))
      .toMatch(/^Up to \$6,000 for /)
  })

  it('leaves a dated snippet\'s amount exactly as the data spells it', () => {
    expect(scholarshipMeta({ ...base, amount: 'Up to $6,000', openDate: '2026-08-01' }, 'future', fmt))
      .toMatch(/^Opens August 1, 2026\. Up to \$6,000 for /)
  })

  it('moves an unannounced next cycle to the end and leads with the award', () => {
    // Never invents a date: a null openDate means we have not confirmed one,
    // so the snippet still says so -- just not in the opening position, where
    // it used to spend 46 of 155 characters answering nothing.
    const out = scholarshipMeta({ ...base }, 'future', fmt)
    expect(out).toMatch(/^\$2,500 for Alberta high school students/)
    expect(out).toMatch(/Next cycle dates are not announced yet\.$/)
  })

  it('never opens an undated future snippet on a non-figure amount', () => {
    // "Varies for Alberta golfers entering post-secondary" opens on a word
    // that answers nothing; with no date clause in front of it, it is dropped.
    expect(scholarshipMeta({ ...base, amount: 'Varies' }, 'future', fmt))
      .toMatch(/^Alberta high school students/)
  })

  it('keeps a non-figure amount where a date clause still leads it', () => {
    expect(scholarshipMeta({ ...base, amount: 'Varies', deadline: '2026-10-01' }, 'active', fmt))
      .toMatch(/^Open now, closes October 1, 2026\. Varies for /)
  })

  it('drops the trail rather than the audience when room is short', () => {
    const long = { ...base, audience: 'Alberta students who qualify for full-time student aid and enrol in an eligible high-demand program at an approved institution' }
    const out = scholarshipMeta(long, 'future', fmt)
    expect(out.length).toBeLessThanOrEqual(META_MAX)
    expect(out).toMatch(/^\$2,500 for Alberta students who qualify/)
    expect(out).not.toContain('Next cycle')
  })

  it('leads with the closing date while the listing is open', () => {
    expect(scholarshipMeta({ ...base, deadline: '2026-10-01' }, 'active', fmt))
      .toMatch(/^Open now, closes October 1, 2026\. \$2,500 for /)
  })

  it('says only that it is open when no deadline is announced', () => {
    // "Open now, with no deadline announced." spent 36 characters on the
    // absence of a fact, ahead of the amount and the audience. It still must
    // not claim there IS no deadline; it just stops leading with the gap.
    const d = scholarshipMeta({ ...base, deadline: null }, 'active', fmt)
    expect(d).toMatch(/^Open now\. \$2,500 for /)
    expect(d).not.toContain('no deadline')
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
    expect(scholarshipMeta({ title: 'Bare' }, 'active', fmt)).toBe('Open now.')
  })

  // The 2026-09-01 audit found 133 pages opening on a 2027 date, 119 of them
  // sharing one bulk-imported openDate. The date is not wrong; it is just
  // useless as the first thing a student reads six months out.
  describe('the open-date horizon', () => {
    const TODAY = '2026-09-01'
    const near = { ...base, openDate: '2026-10-15' }   // 44 days out
    const far = { ...base, openDate: '2027-03-01' }    // 181 days out

    it('still leads with an open date inside the horizon', () => {
      expect(scholarshipMeta(near, 'future', fmt, TODAY))
        .toMatch(/^Opens October 15, 2026\. \$2,500 for /)
    })

    it('leads with the amount when the open date is beyond the horizon', () => {
      const d = scholarshipMeta(far, 'future', fmt, TODAY)
      expect(d).toMatch(/^\$2,500 for /)
      expect(d).not.toContain('Opens March 1, 2027')
    })

    it('moves a distant date to the trail at month precision', () => {
      // Month precision on purpose: in a bulk-imported cycle date the day is
      // the part least likely to be true.
      expect(scholarshipMeta(far, 'future', fmt, TODAY)).toContain('Next cycle opens March 2027.')
    })

    it('keeps the undated trail distinct from the distant one', () => {
      expect(scholarshipMeta({ ...base, openDate: null }, 'future', fmt, TODAY))
        .toContain('Next cycle dates are not announced yet.')
    })

    it('leads with the date when today is unknown, as it did before', () => {
      expect(scholarshipMeta(far, 'future', fmt)).toMatch(/^Opens March 1, 2027\./)
    })

    it('treats the horizon boundary as inclusive', () => {
      const onDay = { ...base, openDate: '2026-11-30' } // exactly 90 days
      expect(scholarshipMeta(onDay, 'future', fmt, TODAY)).toMatch(/^Opens November 30, 2026\./)
    })

    it('never exceeds META_MAX with a trail attached', () => {
      const d = scholarshipMeta(far, 'future', fmt, TODAY)
      expect(d.length).toBeLessThanOrEqual(META_MAX)
    })
  })
})

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-09-01', '2026-09-02')).toBe(1)
    expect(daysBetween('2026-09-01', '2027-03-01')).toBe(181)
  })

  it('crosses a DST boundary without drifting', () => {
    // Alberta springs forward 2027-03-14. A local-time subtraction would give
    // 30.958 days here and round to 31.
    expect(daysBetween('2027-03-01', '2027-04-01')).toBe(31)
  })

  it('returns null for a value that is not an ISO date', () => {
    expect(daysBetween('2026-09-01', 'TBA')).toBeNull()
    expect(daysBetween('Ongoing', '2026-09-01')).toBeNull()
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

  it('does not leave half the snippet unused on any real listing', () => {
    // 25 of these rendered 79 to 96 characters out of descriptions holding 169
    // to 704, because the clamp stopped at the first boundary that cleared its
    // floor. Status 'tba' is the worst case: no date lead to pad the length.
    for (const x of programData as { name: string; description?: string | null }[]) {
      if ((x.description ?? '').length <= META_MAX) continue
      const out = programMeta(x, 'tba', fmt)
      expect(out.length, `${x.name} -> ${out.length} chars: ${out}`).toBeGreaterThan(100)
    }
  })
})

describe('metaDetail', () => {
  const base = { title: 'Test Award', amount: '$1,000', audience: 'Grade 12 students', region: 'Alberta' }

  it('appends an authored clause after the derived head', () => {
    const out = scholarshipMeta({ ...base, metaDetail: 'Awarded on need.' }, 'active', fmt)
    expect(out).toContain('$1,000 for Grade 12 students')
    expect(out.endsWith('Awarded on need.')).toBe(true)
  })

  it('drops the clause whole rather than truncating it', () => {
    const long = 'x'.repeat(200)
    const out = scholarshipMeta({ ...base, metaDetail: long }, 'active', fmt)
    expect(out).not.toContain('x')
    expect(out.length).toBeLessThanOrEqual(META_MAX)
  })

  it('never displaces the date or the amount', () => {
    const out = scholarshipMeta(
      { ...base, deadline: '2027-05-01', metaDetail: 'Awarded on need.' },
      'active',
      fmt,
    )
    expect(out.startsWith('Open now, closes May 1, 2027. $1,000')).toBe(true)
  })

  it('takes the room ahead of the undated trail', () => {
    // Both fit here, and the detail comes first; a fact about the award is
    // worth more than a note that the dates are unknown.
    const out = scholarshipMeta({ ...base, metaDetail: 'Awarded on need.' }, 'future', fmt)
    expect(out.indexOf('Awarded on need.')).toBeLessThan(out.indexOf('Next cycle'))
  })

  it('is not appended to an audience that was already truncated', () => {
    const out = scholarshipMeta(
      { ...base, audience: 'Alberta students '.repeat(20), metaDetail: 'Awarded on need.' },
      'active',
      fmt,
    )
    expect(out).not.toContain('Awarded on need.')
  })

  it('leaves no real listing under 100 characters without a reason', () => {
    // 14 listings sat between 70 and 99 characters; 13 now carry a metaDetail.
    // The Kinsmen grant is the deliberate holdout -- its description adds only
    // an amount that contradicts the amount field, so there is nothing
    // non-redundant to append until that is resolved. validate-data names it.
    const metas = scholarshipMetas(
      scholarshipData as Parameters<typeof scholarshipMetas>[0],
      s => scholarshipStatusOf(s, new Date()),
      fmt,
    )
    const short = metas.filter(d => d.length < 100)
    expect(short.length).toBeLessThanOrEqual(1)
  })
})

describe('scholarshipMetas', () => {
  const active = () => 'active' as const
  // The real case: five Edmonton Public Schools awards sharing an amount, an
  // audience and both dates, differing only by name.
  const eps = (title: string) => ({
    title, amount: '$1,000', audience: 'Edmonton Public Schools Grade 12 students',
    region: 'Alberta', openDate: '2027-02-01', deadline: '2027-04-27',
  })

  it('names the award when the facts alone would not tell two listings apart', () => {
    const out = scholarshipMetas([eps('Betty Finch Scholarship'), eps('James P. Jones Scholarship')], active, fmt)
    expect(new Set(out).size).toBe(2)
    expect(out[0]).toMatch(/^Betty Finch Scholarship: open/)
    expect(out[1]).toMatch(/^James P\. Jones Scholarship: open/)
  })

  it('leaves a listing that is already distinct alone', () => {
    const out = scholarshipMetas(
      [eps('Betty Finch Scholarship'), { ...eps('Other Award'), amount: '$9,000' }],
      active,
      fmt,
    )
    expect(out[0]).not.toContain('Betty Finch Scholarship:')
    expect(out[1]).not.toContain('Other Award:')
  })

  it('keeps every disambiguated description inside the cut', () => {
    const long = 'A'.repeat(60)
    const out = scholarshipMetas([eps(long), eps(long + 'B')], active, fmt)
    for (const d of out) expect(d.length).toBeLessThanOrEqual(META_MAX)
  })

  it('returns one description per listing, in order', () => {
    const out = scholarshipMetas([eps('A'), eps('B'), eps('C')], active, fmt)
    expect(out).toHaveLength(3)
  })
})

describe('brandedTitle', () => {
  it('keeps the brand when the whole title still fits', () => {
    const out = brandedTitle('Loran Scholarship')
    expect(out).toBe('Loran Scholarship | ScholarAB')
    expect(out.length).toBeLessThanOrEqual(TITLE_MAX)
  })

  it('keeps the brand at exactly the cut', () => {
    // 48 + ' | ScholarAB'.length (12) === 60
    const name = 'A'.repeat(48)
    expect(brandedTitle(name)).toBe(`${name} | ScholarAB`)
    expect(brandedTitle(name)).toHaveLength(TITLE_MAX)
  })

  it('drops the brand one character past the cut', () => {
    const name = 'A'.repeat(49)
    expect(brandedTitle(name)).toBe(name)
  })

  it('returns a long name unchanged rather than cutting it', () => {
    // Truncating a proper award name mid-word is a worse snippet than a long
    // one that at least begins correctly.
    const name = 'Alex Tutschek FCPA, FCA Award for Indigenous Student High School Achievement'
    expect(brandedTitle(name)).toBe(name)
  })

  it('trims incidental whitespace', () => {
    expect(brandedTitle('  Loran Scholarship  ')).toBe('Loran Scholarship | ScholarAB')
  })
})

describe('listing titles, corpus-wide', () => {
  const names = [
    ...(scholarshipData as { title: string }[]).map(s => s.title),
    ...(programData as { name: string; active?: boolean }[]).map(p => p.name),
  ]

  it('never truncates a title that the brand alone pushed over', () => {
    for (const name of names) {
      const out = brandedTitle(name)
      // Either it fits, or the bare name was already over on its own.
      expect(
        out.length <= TITLE_MAX || out === name.trim(),
        `${name} -> ${out} (${out.length})`,
      ).toBe(true)
    }
  })

  it('stays unique, so dropping the brand cannot merge two listings', () => {
    const titles = names.map(brandedTitle)
    const seen = new Map<string, string>()
    for (const [i, t] of titles.entries()) {
      expect(seen.has(t), `${t} is claimed by both ${seen.get(t)} and ${names[i]}`).toBe(false)
      seen.set(t, names[i]!)
    }
  })
})

describe('amountFragment', () => {
  it('takes a plain figure verbatim', () => {
    expect(amountFragment('$2,500')).toBe('$2,500')
  })

  it('keeps the provider\'s own phrasing when it fits', () => {
    expect(amountFragment('$1,000\u2013$10,000')).toBe('$1,000\u2013$10,000')
    expect(amountFragment('up to $20,000')).toBe('up to $20,000')
    expect(amountFragment('$50,000+')).toBe('$50,000+')
  })

  it('lowercases a leading "Up to" so it continues the title', () => {
    expect(amountFragment('Up to $6,000')).toBe('up to $6,000')
  })

  it('reduces an over-long value to its cap, never to its headline figure', () => {
    // "$5,000/year (up to $20,000)" must not become "$5,000" -- that reads as
    // the whole award -- and must not become more than the award is worth.
    expect(amountFragment('$5,000/year (up to $20,000)')).toBe('up to $20,000')
  })

  it('drops a value carrying no figure', () => {
    expect(amountFragment('Varies')).toBeNull()
    expect(amountFragment('')).toBeNull()
    expect(amountFragment(null)).toBeNull()
    expect(amountFragment(undefined)).toBeNull()
  })
})

describe('listingTitle', () => {
  it('spends the leftover budget on the award value', () => {
    expect(listingTitle('Alexander Rutherford Scholarship', '$2,500'))
      .toBe('Alexander Rutherford Scholarship: $2,500 | ScholarAB')
  })

  it('drops the brand before it drops the figure', () => {
    const out = listingTitle('Medicine Hat Exhibition & Stampede Scholarship', '$1,000')
    expect(out).toBe('Medicine Hat Exhibition & Stampede Scholarship: $1,000')
    expect(out.length).toBeLessThanOrEqual(TITLE_MAX)
  })

  it('gives the room back to the name when the figure will not fit', () => {
    const name = 'Alberta Foundation for the Arts Film and Video Arts Scholarship'
    expect(listingTitle(name, '$3,000')).toBe(brandedTitle(name))
  })

  it('avoids a second colon on a name that already has one', () => {
    expect(listingTitle('Keyera Energy: Peter J. Renton Memorial Scholarship', '$3,000'))
      .toBe('Keyera Energy: Peter J. Renton Memorial Scholarship ($3,000)')
  })

  it('falls back to brandedTitle when there is no figure', () => {
    expect(listingTitle('ATB Financial Bursary', 'Varies')).toBe(brandedTitle('ATB Financial Bursary'))
    expect(listingTitle('ATB Financial Bursary')).toBe(brandedTitle('ATB Financial Bursary'))
  })

  it('never prints a year, because no field records the cycle', () => {
    // The deadline is the tempting source and the wrong one: it is 2027 on 117
    // of 153 listings whose pages read "Opens ... 2026".
    expect(listingTitle('Kinsmen Club of Medicine Hat Grant', '$1,000')).not.toMatch(/\b20\d{2}\b/)
  })
})

describe('listingTitle, corpus-wide', () => {
  const listings = (scholarshipData as { title: string; amount?: string | null }[])

  it('never runs past the budget unless the bare name already did', () => {
    for (const s of listings) {
      const out = listingTitle(s.title, s.amount)
      expect(
        out.length <= TITLE_MAX || out === s.title.trim(),
        `${s.title} -> ${out} (${out.length})`,
      ).toBe(true)
    }
  })

  it('stays unique, so the shared suffixes cannot merge two listings', () => {
    const seen = new Map<string, string>()
    for (const s of listings) {
      const out = listingTitle(s.title, s.amount)
      expect(seen.has(out), `${out} is claimed by both ${seen.get(out)} and ${s.title}`).toBe(false)
      seen.set(out, s.title)
    }
  })

  it('never ends on a separator or an unclosed bracket', () => {
    for (const s of listings) {
      const out = listingTitle(s.title, s.amount)
      expect(out, s.title).not.toMatch(/[:,;(-]$/)
      expect(
        (out.match(/\(/g) ?? []).length === (out.match(/\)/g) ?? []).length,
        `${out} has unbalanced brackets`,
      ).toBe(true)
    }
  })

  it('carries a figure on the listings that have one to carry', () => {
    const withFigure = listings.filter(s => amountFragment(s.amount) !== null)
    const carried = withFigure.filter(s => /[:(]\s?(up to )?\$/.test(listingTitle(s.title, s.amount)))
    // Not all of them: a name long enough to crowd out the figure keeps the
    // name. This pins the ratio so a regression that silently drops the figure
    // corpus-wide fails rather than passing quietly.
    expect(carried.length).toBeGreaterThan(withFigure.length * 0.8)
  })
})

describe('wholeSentences', () => {
  it('takes as many finished sentences as fit', () => {
    expect(wholeSentences('One here. Two here. Three here.', 20)).toBe('One here. Two here.')
  })

  it('never returns a fragment with no terminator', () => {
    expect(wholeSentences('A finished thought. then a fragment', 100)).toBe('A finished thought.')
  })

  it('returns nothing when not even the first sentence fits', () => {
    expect(wholeSentences('A sentence far longer than the room given.', 10)).toBe('')
  })

  it('does not split on a period inside a token', () => {
    // The bug this replaces dropped "biogenius" out of "biogenius.ca", because
    // a character-class match skips the text between two unmatched positions.
    const out = wholeSentences('The site is offline. biogenius.ca redirects to Sanofi.', 200)
    expect(out).toContain('biogenius.ca')
  })

  it('accounts for every character it keeps', () => {
    for (const p of programData as { description?: string | null }[]) {
      const body = (p.description ?? '').trim()
      if (!body) continue
      const out = wholeSentences(body, META_MAX)
      if (!out) continue
      expect(body.startsWith(out), `${out} is not a prefix of its source`).toBe(true)
    }
  })
})

describe('programMeta, corpus-wide', () => {
  const programs = programData as { name: string; description?: string | null; deadline?: string | null }[]
  const statusOf = (d?: string | null) =>
    !d || d === 'TBA' ? 'tba' as const : d === 'Ongoing' ? 'ongoing' as const : 'active' as const

  it('never exceeds the budget', () => {
    for (const p of programs) {
      expect(programMeta(p, statusOf(p.deadline), fmt).length, p.name).toBeLessThanOrEqual(META_MAX)
    }
  })

  it('prefers an authored metaDescription over anything derived', () => {
    const p = { name: 'Test', description: 'A long editorial sentence that would otherwise be used.', metaDescription: 'The authored one.' }
    expect(programMeta(p, 'tba', fmt)).toBe('The authored one.')
  })

  it('still leads an authored snippet with the date clause', () => {
    const p = { name: 'Test', metaDescription: 'The authored one.', deadline: '2026-03-01' }
    expect(programMeta(p, 'active', fmt)).toBe('Applications close March 1, 2026. The authored one.')
  })

  it('leaves no snippet ending mid-clause', () => {
    // Was a floor of 54 of 124 while the backlog existed; 86345b1 authored the
    // remaining 70 metaDescriptions, so the whole corpus now ends on a finished
    // thought and the floor is the corpus. Deleting a metaDescription, or
    // weakening clampMeta or SENTENCE_FLOOR, fails here rather than quietly
    // shipping a truncated snippet.
    //
    // It follows that a newly added program has to arrive with a description
    // that ends cleanly inside the budget or a metaDescription of its own.
    // That is deliberate: research-programs.json is hand-curated (the daily
    // sync only writes scholarships.json), so the cost lands on the author,
    // who is the one who can pay it. validate-data names the offender.
    const ragged = programs.filter(p => !/[.!?]$/.test(programMeta(p, statusOf(p.deadline), fmt)))
    expect(ragged.map(p => p.name)).toEqual([])
  })
})
