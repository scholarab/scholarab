import { describe, it, expect } from 'vitest'
import {
  ALIASES,
  buildSearchBlob,
  correctQuery,
  searchRows,
  searchSuggestions,
  normalizeSearchQuery,
  normalizeSearchText,
  programSearchBlob,
  scholarshipSearchBlob,
  searchTokens,
  tokenIndexMayMatch,
} from './search-text'
import scholarshipData from '../data/scholarships.json'
import programData from '../data/research-programs.json'

describe('normalizeSearchText', () => {
  it('closes up apostrophes so a student can skip them', () => {
    // The live miss this was written for: "mcdonalds" logged as a content gap
    // against a stored "McDonald's Canada".
    expect(normalizeSearchText("McDonald's Canada")).toBe('mcdonalds canada')
    expect(normalizeSearchText('Queen’s Platinum Jubilee')).toBe('queens platinum jubilee')
  })

  it('turns every other separator into a single space', () => {
    expect(normalizeSearchText('Access & Excellence')).toBe('access excellence')
    expect(normalizeSearchText('Grades 9-12  (graduating)')).toBe('grades 9 12 graduating')
  })

  it('keeps field seams, so a phrase cannot span two fields', () => {
    const blob = buildSearchBlob(['Award of Excellence', 'Award for artists'])
    expect(blob).toBe('award of excellence\naward for artists')
    expect(blob.includes('excellence award')).toBe(false)
  })

  it('flattens newlines inside one field rather than adding a seam', () => {
    expect(buildSearchBlob(['open to\nAlberta students'])).toBe('open to alberta students')
  })

  it('drops empty and nullish fields', () => {
    expect(buildSearchBlob(['Title', null, undefined, '', '  '])).toBe('title')
  })

  it('reduces a query to one line', () => {
    expect(normalizeSearchQuery('  Lions   Club!  ')).toBe('lions club')
    expect(normalizeSearchQuery('   ')).toBe('')
  })
})

describe('row blobs', () => {
  it('searches a scholarship by its description, not just its audience', () => {
    // Three awards name Stettler in the description while their audience says
    // only "Central Alberta"; searching the town used to find nothing.
    const blob = scholarshipSearchBlob({
      title: 'Regional Access Scholarship',
      audience: 'Students from a listed Central Alberta school',
      category: 'General',
      description: 'Open to graduates of schools in Stettler, Olds and Hanna.',
    })
    expect(blob.includes('stettler')).toBe(true)
  })

  it('leaves notes out, so verification prose is not searchable', () => {
    const blob = scholarshipSearchBlob({
      title: 'Some Award', audience: null, category: null, description: 'A bursary.',
      // @ts-expect-error notes is deliberately not part of the contract
      notes: 'Verified against the provider page on 2026-09-08.',
    })
    expect(blob.includes('verified')).toBe(false)
  })

  it('searches a program by provider', () => {
    expect(programSearchBlob({ name: 'SHAD', provider: 'SHAD Canada', description: null, category: 'STEM' }))
      .toBe('shad\nshad canada\nstem')
  })
})

describe('tokenIndexMayMatch', () => {
  const tokens = searchTokens('nursing stettler lions club bursary')

  it('reaches a full word from a partial one', () => {
    // "stett" was a real logged query; the award says Stettler.
    expect(tokenIndexMayMatch(tokens, 'stett')).toBe(true)
    expect(tokenIndexMayMatch(tokens, 'stettler')).toBe(true)
  })

  it('accepts a phrase whose words are all present', () => {
    expect(tokenIndexMayMatch(tokens, 'lions club')).toBe(true)
  })

  it('rejects a query with any unknown word', () => {
    expect(tokenIndexMayMatch(tokens, 'cocoa')).toBe(false)
    expect(tokenIndexMayMatch(tokens, 'lions cocoa')).toBe(false)
  })

  it('matches through punctuation and case', () => {
    expect(tokenIndexMayMatch(searchTokens('mcdonalds'), "McDonald's")).toBe(true)
  })

  it('is false for an empty query rather than matching everything', () => {
    expect(tokenIndexMayMatch(tokens, '   ')).toBe(false)
  })
})

describe('misspellings', () => {
  it('reads the common misspellings of the site vocabulary as the word meant', () => {
    expect(normalizeSearchQuery('Bursery')).toBe('bursary')
    expect(normalizeSearchQuery('schollarship calgery')).toBe('scholarship calgary')
    expect(normalizeSearchQuery('Kiwanis')).toBe('kiwanis')
  })
})

describe('accents', () => {
  it('matches with or without them, both ways', () => {
    const blob = scholarshipSearchBlob({ title: 'Métis Scholar Award', audience: 'École secondaire students' })
    expect(blob.includes(normalizeSearchQuery('metis'))).toBe(true)
    expect(blob.includes(normalizeSearchQuery('Métis'))).toBe(true)
    expect(blob.includes(normalizeSearchQuery('ecole'))).toBe(true)
    expect(normalizeSearchText('Montréal-Nord')).toBe('montreal nord')
  })
})

describe('correctQuery', () => {
  const vocab = ['volleyball', 'medicine', 'hockey', 'rocky', 'mountain', 'cameron', 'nursing', 'community', 'involvement', 'kiwanis']

  it('turns a misspelled word into the one the listings use', () => {
    expect(correctQuery('hocky', vocab)).toBe('hockey')
    expect(correctQuery('nursng', vocab)).toBe('nursing')
    expect(correctQuery('vollyballl', vocab)).toBe('volleyball')
    // An adjacent swap is one slip, not two
    expect(correctQuery('medicien', vocab)).toBe('medicine')
  })

  it('keeps the words that already match and fixes only the rest', () => {
    expect(correctQuery('community involvment', vocab)).toBe('community involvement')
  })

  it('never changes the first letter, so hocky is not rocky', () => {
    expect(correctQuery('hocky', ['rocky'])).toBeNull()
    expect(correctQuery('camera', ['pamela'])).toBeNull()
  })

  it('allows one slip in a short word and two in a long one', () => {
    expect(correctQuery('camera', vocab)).toBeNull() // cameron is two away
    expect(correctQuery('involvmnt', vocab)).toBe('involvement')
    expect(correctQuery('volybal', vocab)).toBeNull() // three away
  })

  it('leaves short words, numbers and nonsense alone', () => {
    expect(correctQuery('rvs', vocab)).toBeNull()
    expect(correctQuery('chemistry 3p', ['chemistry'])).toBeNull()
    expect(correctQuery('quantum', vocab)).toBeNull()
  })

  it('returns null when the query already matches, or cannot all be fixed', () => {
    expect(correctQuery('kiwanis', vocab)).toBeNull()
    expect(correctQuery('hocky zzzzzz', vocab)).toBeNull()
  })

  it('knows the misspellings from the empty-search log', () => {
    expect(normalizeSearchQuery('voley')).toBe('volleyball')
    expect(normalizeSearchQuery('Medicne')).toBe('medicine')
    expect(normalizeSearchQuery('energy reveiled')).toBe('energy revealed')
  })
})

describe('searchRows', () => {
  const rows = [
    'cenovus indigenous scholarship\nindigenous students in power engineering',
    'nursing bursary\nstudents entering a nursing program',
    'a nurse practitioner award',
    'first nation students\nhorse lake',
    'loran scholarship\nentering university for the first year\nunited nations model',
    'medicine hat rotary\nstudents in medicine hat',
    'ask what that costs\nmedicine',
    '4 h club award',
  ]
  const find = (q: string) => searchRows(rows, r => r, normalizeSearchQuery(q))

  it('finds every word in any order when the phrase finds nothing', () => {
    expect(find('indigenous engineering')).toEqual([rows[0]])
    expect(find('engineering indigenous')).toEqual([rows[0]])
  })

  it('stems the last word, so nurse and nursing find each other', () => {
    expect(find('nurse')).toEqual([rows[1], rows[2]])
    expect(find('nursing')).toEqual([rows[1], rows[2]])
    expect(find('first nations')).toEqual([rows[3]])
  })

  it('keeps the phrase when it finds something, so common words do not flood in', () => {
    // "first" and "nations" both appear in the Loran row, apart
    expect(find('first nations')).not.toContain(rows[4])
  })

  it('matches the start of a word, never the inside', () => {
    expect(find('medicine hat')).toEqual([rows[5]])
    expect(find('costs medicine hat')).toEqual([])
  })

  it('needs every word, short ones too, so a nonsense word finds nothing', () => {
    expect(find('4-h')).toEqual([rows[7]])
    expect(find('zz nursing bursary')).toEqual([])
  })
})

describe('searchSuggestions', () => {
  const rows = ['nursing award', 'nursing bursary', 'rural nursing prize', 'music award', 'hockey award'].map(t => buildSearchBlob([t]))

  it('offers only words that find enough rows, in the order given', () => {
    expect(searchSuggestions(rows, r => r, ['Music', 'Nursing', 'Award'], 5, 3)).toEqual(['Nursing', 'Award'])
  })

  it('stops at n', () => {
    expect(searchSuggestions(rows, r => r, ['Nursing', 'Award'], 1, 1)).toEqual(['Nursing'])
  })
})

describe('aliases', () => {
  const rows = [
    'striving for nursing excellence\nstudents in licensed practical nursing',
    'timber dental scholarship\nentering a dental hygiene program',
    'ippc indigenous pharmacy scholarship',
    'massage therapy entrance scholarship',
    'health sciences award\nprograms such as paramedic sonography',
    'camis diagnostic imaging entrance scholarship',
    'capital plumbing and heating\nplumbing refrigeration sheet metal',
    'turtle spirit award\nentering the university of alberta',
    'presidents admission\nentering ucalgary',
    'deans entrance citation in business university of alberta',
    'ahsra scholarships\nthe alberta high school rodeo association',
    'inspiring immigrant award',
    'new canadians award\nfor a newcomer',
    'inter pipeline discovery awards program',
    'fort mckay trades scholarship\nplumbing electrical millwright',
    'bachelor of science in kinesiology',
    'chief jack beaton bursary in criminal justice studies',
    'sait trades aircraft or engineering technology programs',
    'smart photography scholarship',
    'rocky view teachers scholarship',
    'someone who worked at a pharmacy counter of a store',
    'fort high health sciences\nx ray technology or nursing',
    'northern alberta rural physicians fund',
    'medicine hat college student awards',
    'sandy and carl krenning culinary fund',
    'mc college excellence in cosmetology scholarship',
    'greenview post secondary scholarship\nmd of greenview residents',
    'lamont lions scholarship',
    'county of wetaskiwin agricultural bursary',
    'grande yellowhead public school division graduates',
  ]
  const find = (q: string) => searchRows(rows, r => r, normalizeSearchQuery(q)).map(r => rows.indexOf(r))

  // Each query below returned nothing on 2026-10-14 (or earlier in the log).
  it('reads career words as the field the listings name', () => {
    expect(find('LPN')).toEqual([0])
    expect(find('hygienist')).toEqual([1])
    expect(find('dental hygienist')).toEqual([1])
    expect(find('pharmacist')).toEqual([2, 20])
    expect(find('therapist')).toEqual([3])
    expect(find('ultrasonography')).toEqual([4, 5])
    expect(find('HVAC')).toEqual([6])
    expect(find('criminology')).toEqual([16])
    expect(find('aircraft maintenance engineer')).toEqual([17])
    expect(find('camera')).toEqual([18])
  })

  // Each returned nothing in the 2026-10-16 log.
  it('reads the 2026-10-16 career words as the field the listings name', () => {
    expect(find('xray')).toEqual([5, 21])
    expect(find('radiology')).toEqual([5, 21])
    expect(find('radiogra')).toEqual([5, 21])
    expect(find('radiograpy')).toEqual([5, 21])
    expect(find('bakery')).toEqual([24])
    expect(find('hairdresser')).toEqual([25])
    expect(find('nails')).toEqual([25])
  })

  it('reads a medical specialty as the medical degree, never Medicine Hat', () => {
    expect(find('cardiac surgery')).toEqual([22])
    expect(find('cardiac sugery')).toEqual([22])
    expect(find('opthalmology')).toEqual([22])
    expect(find('anesthesiologist')).toEqual([22])
  })

  // Each town returned nothing on 2026-10-16 while its county or division had awards.
  it('reads a town as the county or division its awards name', () => {
    expect(find('grovedale')).toEqual([26])
    expect(find('bruderheim')).toEqual([27])
    expect(find('falun')).toEqual([28])
    expect(find('hinton')).toEqual([29])
    expect(find('Hinton AB')).toEqual([29])
  })

  it('drops a trailing province code but keeps a lone ab', () => {
    expect(normalizeSearchQuery('Calgary, AB')).toBe('calgary')
    expect(normalizeSearchQuery('ab')).toBe('ab')
    expect(normalizeSearchQuery('kenn boreck air')).toBe('kenn borek air')
  })

  it('reads school shorthand as the school', () => {
    expect(find('uofa')).toEqual([7, 9])
    expect(find('UofC')).toEqual([8])
    expect(find('uoc')).toEqual([8])
    expect(find('ualberta')).toEqual([7, 9])
    expect(find('rvs')).toEqual([19])
  })

  it('splits a shorthand glued to the word before it', () => {
    expect(normalizeSearchQuery('businessuofa')).toBe('business uofa')
    expect(find('businessuofa')).toEqual([9])
    // Only a school shorthand splits off; an ordinary word is left whole
    expect(normalizeSearchQuery('volunteering')).toBe('volunteering')
  })

  it('finds the listings for an interest by the word they use', () => {
    expect(find('barrel racing')).toEqual([10])
    expect(find('immigration')).toEqual([11, 12])
  })

  it('reads a half-typed last word as the alias it begins', () => {
    expect(find('ultrasonogra')).toEqual([4, 5])
    expect(find('interpip')).toEqual([13])
    expect(find('milwr')).toEqual([14])
    expect(find('kinie')).toEqual([15])
  })

  it('reads the logged misspellings', () => {
    expect(find('dental higene')).toEqual([1])
    expect(find('bachh')).toEqual([15])
    expect(normalizeSearchQuery('indeginious')).toBe('indigenous')
    expect(normalizeSearchQuery('dental hygein')).toBe('dental hygiene')
    expect(normalizeSearchQuery('ingineering')).toBe('engineering')
    expect(normalizeSearchQuery('veteranian')).toBe('veterinarian')
    expect(find('aircraft maintenance engineet')).toEqual([17])
  })

  it('matches an alias only from the start of a word', () => {
    // "u of a" must not match inside "menu of all"
    expect(searchRows(['the menu of all dishes'], r => r, 'uofa')).toEqual([])
  })

  it('keeps a word that matches as typed off the prefix rule', () => {
    // "ultra" is not read as "ultrasonography" while a row says it
    expect(searchRows(['ultra marathon fund', 'paramedic sonography'], r => r, 'ultra')).toEqual(['ultra marathon fund'])
  })

  it('leaves terms with no listings behind them empty', () => {
    expect(find('piercing')).toEqual([])
    expect(find('dietary aid')).toEqual([])
  })

  it('lets the cross-directory index see an alias hit', () => {
    const tokens = searchTokens('striving practical nursing university of alberta')
    expect(tokenIndexMayMatch(tokens, 'lpn')).toBe(true)
    expect(tokenIndexMayMatch(tokens, 'uofa')).toBe(true)
    expect(tokenIndexMayMatch(tokens, 'piercing')).toBe(false)
  })

  it('points every alternative at listings the catalogue really has', () => {
    // Never invent coverage: an alias with nothing behind it would hide a
    // real content gap from the empty-search log.
    const blobs = [
      ...(scholarshipData as Parameters<typeof scholarshipSearchBlob>[0][]).map(scholarshipSearchBlob),
      ...(programData as Parameters<typeof programSearchBlob>[0][]).map(programSearchBlob),
    ].map(b => ' ' + b.replace(/\n/g, ' '))
    const dead = Object.entries(ALIASES)
      .filter(([, alts]) => !alts.some(a => blobs.some(b => b.includes(' ' + a))))
      .map(([key]) => key)
    expect(dead).toEqual([])
  })
})
