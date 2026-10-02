import { describe, it, expect } from 'vitest'
import { feeFigure } from './fee-figure'

describe('feeFigure', () => {
  it('lifts a leading amount', () => {
    expect(feeFigure('$10 per student')).toBe('$10')
    expect(feeFigure('CA$80 program fee')).toBe('CA$80')
    expect(feeFigure('About US$5,500 including room and board in 2026')).toBe('About US$5,500')
    expect(feeFigure('$7 CAD per student, minimum 5 students per school')).toBe('$7 CAD')
  })

  it('says "From" when a second price sits beside the first', () => {
    expect(feeFigure('$55 early bird or $75 regular site fee')).toBe('From $55')
    expect(feeFigure('US$1,275 to $1,575 per course in 2026')).toBe('From US$1,275')
    expect(feeFigure('$15 per individual entry, $40 per portfolio; fee waivers available')).toBe('From $15')
    expect(feeFigure('$20 early-bird, $25 regular per student (2026)')).toBe('From $20')
  })

  it('leaves an add-on or a worded note alone', () => {
    expect(feeFigure('$5 per extra Second Round nomination')).toBeNull()
    expect(feeFigure('Tuition fee applies')).toBeNull()
    expect(feeFigure(null)).toBeNull()
  })
})
