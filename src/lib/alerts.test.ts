import { describe, it, expect } from 'vitest'
import {
  ALERT_MILESTONES, isMilestone, parseCadence, formatCadence, cadenceFromInput,
} from './alerts'

describe('isMilestone', () => {
  it('accepts only the days the mailer sends on', () => {
    expect(isMilestone(30)).toBe(true)
    expect(isMilestone(14)).toBe(true)
    expect(isMilestone(3)).toBe(true)
    expect(isMilestone(7)).toBe(false)
    expect(isMilestone('30')).toBe(false)
    expect(isMilestone(null)).toBe(false)
    expect(isMilestone(NaN)).toBe(false)
  })
})

describe('parseCadence', () => {
  it('reads a stored value back, biggest first', () => {
    expect(parseCadence('3,30')).toEqual([30, 3])
    expect(parseCadence('30,14,3')).toEqual([30, 14, 3])
  })

  it('tolerates whitespace and duplicates', () => {
    expect(parseCadence(' 14 , 14, 3 ')).toEqual([14, 3])
  })

  it('falls back to every milestone rather than dropping a subscriber', () => {
    // A row written before the column existed, or corrupted since, still gets
    // reminded; being over-mailed beats silently hearing nothing.
    expect(parseCadence(null)).toEqual([30, 14, 3])
    expect(parseCadence(undefined)).toEqual([30, 14, 3])
    expect(parseCadence('')).toEqual([30, 14, 3])
    expect(parseCadence('nonsense')).toEqual([30, 14, 3])
    expect(parseCadence('7,9')).toEqual([30, 14, 3])
  })

  it('keeps the valid days out of a partly bad value', () => {
    expect(parseCadence('30,7,3')).toEqual([30, 3])
  })
})

describe('formatCadence', () => {
  it('normalizes to the stored form', () => {
    expect(formatCadence([3, 30, 14])).toBe('30,14,3')
    expect(formatCadence([14, 14])).toBe('14')
  })

  it('drops days the mailer does not send on', () => {
    expect(formatCadence([30, 7])).toBe('30')
  })

  it('round-trips through parseCadence', () => {
    for (const days of [[30], [14, 3], [30, 14, 3]]) {
      expect(parseCadence(formatCadence(days))).toEqual(days.slice().sort((a, b) => b - a))
    }
  })
})

describe('cadenceFromInput', () => {
  it('accepts a valid list and normalizes the order', () => {
    expect(cadenceFromInput([3, 30])).toEqual([30, 3])
  })

  it('rejects anything that is not a list of known milestones', () => {
    expect(cadenceFromInput('30,14')).toBeNull()
    expect(cadenceFromInput([30, 7])).toBeNull()
    expect(cadenceFromInput(['30'])).toBeNull()
    expect(cadenceFromInput(null)).toBeNull()
    expect(cadenceFromInput([30, 14, 3, 30])).toBeNull() // longer than the milestone set
  })

  it('rejects an empty list; that is what unsubscribing is for', () => {
    expect(cadenceFromInput([])).toBeNull()
  })

  it('deduplicates within the allowed length', () => {
    expect(cadenceFromInput([14, 14])).toEqual([14])
  })
})

describe('ALERT_MILESTONES', () => {
  it('is ordered biggest first, which the UI renders in order', () => {
    expect([...ALERT_MILESTONES]).toEqual([30, 14, 3])
  })

  it('matches the default the migration writes', () => {
    expect(formatCadence([...ALERT_MILESTONES])).toBe('30,14,3')
  })
})
