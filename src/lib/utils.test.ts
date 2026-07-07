import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateSlug, getToday, formatDeadline, parseAmount, showConfetti, showToast } from './utils'

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

// ── showConfetti ──────────────────────────────────────────────────────────────

function makeCanvasMock() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  }
}

describe('showConfetti', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(makeCanvasMock() as any)
    // Run rAF once synchronously so the animation tick fires, then stop
    let calls = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      if (calls++ === 0) cb(0)
      return calls
    })
    vi.stubGlobal('performance', { now: () => 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.getElementById('sa-confetti')?.remove()
  })

  it('appends a canvas element to the body', () => {
    showConfetti()
    expect(document.getElementById('sa-confetti')).not.toBeNull()
  })

  it('removes any existing canvas before creating a new one', () => {
    showConfetti()
    showConfetti()
    expect(document.querySelectorAll('#sa-confetti').length).toBe(1)
  })

  it('does not throw when called with no element (uses window center)', () => {
    expect(() => showConfetti()).not.toThrow()
  })

  it('does not throw when called with null', () => {
    expect(() => showConfetti(null)).not.toThrow()
  })

  it('does not throw when called with a real element', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    expect(() => showConfetti(el)).not.toThrow()
    el.remove()
  })

  it('canvas has pointer-events none and fixed position', () => {
    showConfetti()
    const canvas = document.getElementById('sa-confetti') as HTMLCanvasElement
    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.style.position).toBe('fixed')
  })
})

// ── showToast ─────────────────────────────────────────────────────────────────

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.getElementById('sa-toast')?.remove()
  })

  it('creates a toast element with the correct message', () => {
    showToast('Saved!')
    const el = document.getElementById('sa-toast')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('Saved!')
  })

  it('removes existing toast before creating a new one', () => {
    showToast('First')
    showToast('Second')
    expect(document.querySelectorAll('#sa-toast').length).toBe(1)
    expect(document.getElementById('sa-toast')?.textContent).toBe('Second')
  })

  it('toast is removed from DOM after timeout elapses', () => {
    showToast('Gone soon')
    expect(document.getElementById('sa-toast')).not.toBeNull()
    vi.advanceTimersByTime(2800 + 300 + 50)
    expect(document.getElementById('sa-toast')).toBeNull()
  })

  it('does not throw for empty string message', () => {
    expect(() => showToast('')).not.toThrow()
  })
})

// ── parseAmount ──────────────────────────────────────────────────────────────

describe('parseAmount', () => {
  it('parses a plain dollar amount', () => {
    expect(parseAmount('$2,500')).toBe(2500)
  })

  it('parses the dollar figure out of surrounding text', () => {
    expect(parseAmount('up to $8,000')).toBe(8000)
  })

  it('takes the first figure of a range', () => {
    expect(parseAmount('$4,000\u2013$5,000')).toBe(4000)
  })

  it('ignores bare numbers without a dollar sign', () => {
    expect(parseAmount('2 awards of $500')).toBe(500)
  })

  it('returns 0 for unparseable amounts', () => {
    expect(parseAmount('Varies')).toBe(0)
  })

  it('returns 0 for null and undefined', () => {
    expect(parseAmount(null)).toBe(0)
    expect(parseAmount(undefined)).toBe(0)
  })
})
