import { describe, it, expect } from 'vitest'
import {
  buildSearchBlob,
  normalizeSearchQuery,
  normalizeSearchText,
  programSearchBlob,
  scholarshipSearchBlob,
  searchTokens,
  tokenIndexMayMatch,
} from './search-text'

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
