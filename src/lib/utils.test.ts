import { describe, it, expect } from 'vitest'
import { generateSlug, getToday, formatDeadline } from './utils'

// ── generateSlug ─────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  it('lowercases the input', () => {
    expect(generateSlug('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('Medicine Hat High School')).toBe('medicine-hat-high-school')
  })

  it('collapses multiple spaces into one hyphen', () => {
    expect(generateSlug('hello   world')).toBe('hello-world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(generateSlug('  hello world  ')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(generateSlug('Award (2026)!')).toBe('award-2026')
  })

  it('removes dollar signs and commas', () => {
    expect(generateSlug('$1,000 Scholarship')).toBe('1000-scholarship')
  })

  it('preserves existing hyphens', () => {
    expect(generateSlug('Alexander-Rutherford')).toBe('alexander-rutherford')
  })

  it('preserves numbers', () => {
    expect(generateSlug('Grade 12 Award 2026')).toBe('grade-12-award-2026')
  })

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles non-string input via String() coercion', () => {
    expect(generateSlug(123 as any)).toBe('123')
  })

  it('handles all-special-chars input', () => {
    expect(generateSlug('!!!')).toBe('')
  })

  it('handles unicode characters (removes them)', () => {
    expect(generateSlug('Café Award')).toBe('caf-award')
  })
})

// ── getToday ──────────────────────────────────────────────────────────────────

describe('getToday', () => {
  it('returns a Date instance', () => {
    expect(getToday()).toBeInstanceOf(Date)
  })

  it('has time zeroed to midnight', () => {
    const d = getToday()
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })

  it('matches today\'s calendar date', () => {
    const d = getToday()
    const now = new Date()
    expect(d.getFullYear()).toBe(now.getFullYear())
    expect(d.getMonth()).toBe(now.getMonth())
    expect(d.getDate()).toBe(now.getDate())
  })

  it('returns a new Date object each call', () => {
    const a = getToday()
    const b = getToday()
    expect(a).not.toBe(b)
  })
})

// ── formatDeadline ────────────────────────────────────────────────────────────

describe('formatDeadline', () => {
  it('returns null for null input', () => {
    expect(formatDeadline(null)).toBeNull()
  })

  it('returns undefined for undefined input', () => {
    expect(formatDeadline(undefined)).toBeUndefined()
  })

  it('passes "TBA" through unchanged', () => {
    expect(formatDeadline('TBA')).toBe('TBA')
  })

  it('passes "Ongoing" through unchanged', () => {
    expect(formatDeadline('Ongoing')).toBe('Ongoing')
  })

  it('returns empty string for empty string input (falsy)', () => {
    expect(formatDeadline('')).toBe('')
  })

  it('formats ISO date to Canadian locale with month name', () => {
    const result = formatDeadline('2026-05-15')
    expect(result).toContain('May')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })

  it('formats January correctly', () => {
    const result = formatDeadline('2026-01-01')
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })

  it('formats December correctly', () => {
    const result = formatDeadline('2026-12-31')
    expect(result).toContain('Dec')
    expect(result).toContain('31')
  })
})
