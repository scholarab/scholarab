import { describe, it, expect } from 'vitest'
import {
  ALERT_MILESTONES, isMilestone, parseCadence, formatCadence, cadenceFromInput,
  milestonesAhead, milestonePhrase, reminderCopy,
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

describe('milestonesAhead', () => {
  it('keeps only the milestones strictly before today', () => {
    expect(milestonesAhead(45)).toEqual([30, 14, 3])
    expect(milestonesAhead(30)).toEqual([14, 3])
    expect(milestonesAhead(10)).toEqual([3])
  })
  it('is empty when no reminder can arrive', () => {
    expect(milestonesAhead(3)).toEqual([])
    expect(milestonesAhead(1)).toEqual([])
    expect(milestonesAhead(0)).toEqual([])
  })
})

describe('milestonePhrase', () => {
  it('reads as a list', () => {
    expect(milestonePhrase([30, 14, 3])).toBe('30, 14 and 3 days')
    expect(milestonePhrase([14, 3])).toBe('14 and 3 days')
    expect(milestonePhrase([3])).toBe('3 days')
  })
})

describe('reminderCopy', () => {
  const today = new Date('2026-10-01T00:00:00')
  const deadline = '2026-10-15'

  it('states a posted date plainly, at every milestone', () => {
    for (const days of [30, 14, 3]) {
      const copy = reminderCopy({ deadline, active: true }, 'Bursary X', days, today)!
      expect(copy.subject).toBe(`${days} days left: Bursary X closes October 15, 2026`)
      expect(copy.kicker).toBe(`${days} days left to apply`)
      expect(copy.caution).toBeNull()
      expect(copy.button).toBe('Apply Now')
    }
  })

  it('says a rolled-forward date is a guess, and never counts days to it', () => {
    const copy = reminderCopy({ deadline, active: true, deadlineEstimated: true }, 'Bursary X', 14, today)!
    expect(copy.subject).toBe('Check the date: Bursary X usually closes around October 15, 2026')
    expect(copy.kicker).toBe('Date not confirmed yet')
    expect(copy.dateLine).toContain("last year's deadline")
    expect(copy.caution).toContain("hasn't posted this year's date")
    expect(copy.button).toBe('Check the date')
    expect(`${copy.subject} ${copy.kicker} ${copy.dateLine}`).not.toMatch(/days? left/)
  })

  it('sends nothing for a closed, ended or between-cycles listing', () => {
    expect(reminderCopy({ deadline: '2026-09-01', active: true }, 'X', 3, today)).toBeNull()
    expect(reminderCopy({ deadline: '2026-09-01', active: true, deadlineEstimated: true }, 'X', 3, today)).toBeNull()
    expect(reminderCopy({ deadline, active: true, concluded: true }, 'X', 14, today)).toBeNull()
    expect(reminderCopy({ deadline, active: false }, 'X', 14, today)).toBeNull()
    expect(reminderCopy({ deadline, active: false, deadlineEstimated: true }, 'X', 14, today)).toBeNull()
  })

  it('keeps mailing a posted deadline that opens later, as it always has', () => {
    expect(reminderCopy({ deadline, openDate: '2026-10-05' }, 'X', 14, today)?.caution).toBeNull()
  })

  it('says 1 day, not 1 days', () => {
    expect(reminderCopy({ deadline: '2026-10-02' }, 'X', 1, today)!.subject).toBe('1 day left: X closes October 2, 2026')
  })
})
