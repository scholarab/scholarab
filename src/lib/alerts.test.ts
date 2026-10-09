import { describe, it, expect } from 'vitest'
import {
  ALERT_MILESTONES, isMilestone, parseCadence, formatCadence, cadenceFromInput,
  milestonesAhead, milestonePhrase, reminderCopy, reminderState, inReminderWindow, remindersDue,
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


describe('reminder states from the shared listing status', () => {
  const today = new Date('2026-10-09T00:00:00')
  it.each([
    [{ deadline: '2026-12-01' }, 'deadline'],
    [{ deadline: '2026-10-12' }, 'too-soon'],
    [{ deadline: '2026-10-09' }, 'too-soon'],
    [{ deadline: '2026-10-08' }, null],
    [{ deadline: '2026-12-01', openDate: '2026-11-01' }, 'open'],
    [{ openDate: '2026-11-01' }, 'open'],
    [{ active: false, openDate: '2026-11-01', deadline: '2026-12-01' }, 'open'],
    [{ active: false, deadline: '2026-12-01' }, null],
    [{ active: false, deadline: '2026-12-01', openDate: '2026-09-01' }, null],
    [{}, 'posted'],
    [{ deadline: '2026-12-01', deadlineEstimated: true, openDate: '2026-11-01' }, 'posted'],
    [{ deadline: '2026-10-08', deadlineEstimated: true }, null],
    [{ rolling: true }, null],
    [{ concluded: true }, null],
    [{ concluded: true, deadline: '2026-12-01', openDate: '2026-11-01' }, null],
  ] as const)('scholarship %j gets %s', (item, state) => {
    expect(reminderState(item, 'scholarship', today)).toBe(state)
  })
  it.each([
    [{ deadline: '2026-12-01' }, 'deadline'],
    [{ deadline: '2026-10-12' }, 'too-soon'],
    [{ deadline: '2026-10-08' }, null],
    [{ deadline: 'TBA' }, 'posted'],
    [{}, 'posted'],
    [{ deadline: 'Ongoing' }, null],
    [{ deadline: '2026-12-01', openDate: '2026-11-01' }, 'open'],
    [{ active: false, deadline: 'TBA' }, null],
  ] as const)('program %j gets %s', (item, state) => {
    expect(reminderState(item, 'program', today)).toBe(state)
  })
})

describe('waiting cadence', () => {
  it('round trips kinds alongside the original milestone format', () => {
    expect(parseCadence(' open , 3,30,open,14,bogus')).toEqual(['open', 30, 14, 3])
    expect(parseCadence('posted')).toEqual(['posted'])
    expect(parseCadence('posted,14,3')).toEqual(['posted', 14, 3])
    expect(formatCadence(['posted', 3, 30, 14, 'posted'])).toBe('posted,30,14,3')
    expect(cadenceFromInput(['posted'])).toBeNull() // server chooses kind from status
  })
})

describe('Alberta sending hours on UTC runners', () => {
  it.each([
    ['2026-10-09T13:59:59Z', false], // 07:59 MDT
    ['2026-10-09T14:00:00Z', true],
    ['2026-10-10T01:59:59Z', true],
    ['2026-10-10T02:00:00Z', false],
    ['2025-12-09T14:59:59Z', false], // 07:59 MST
    ['2025-12-09T15:00:00Z', true],
    ['2025-12-10T02:59:59Z', true],
    ['2025-12-10T03:00:00Z', false],
    ['2026-03-08T13:59:59Z', false], // spring DST transition
    ['2026-03-08T14:00:00Z', true],
    ['2025-11-02T14:59:59Z', false], // autumn DST transition
    ['2025-11-02T15:00:00Z', true],
  ])('%s allowed: %s', (instant, allowed) => {
    expect(inReminderWindow(new Date(instant))).toBe(allowed)
  })
  it('uses Alberta today after UTC midnight', () => {
    const due = remindersDue({ openDate: '2026-10-09', deadline: '2026-11-08' }, 'scholarship', 'Award', new Date('2026-10-10T01:00:00Z'))
    expect(due.map(d => d.kind)).toEqual(['open', 'posted', 30])
    expect(due[0]!.copy.subject).toBe('Award opens today')
  })
  it('does not mistake an estimate or a passed date for publication', () => {
    for (const item of [{}, { deadline: '2026-11-08', deadlineEstimated: true }, { deadline: '2026-10-09' }, { concluded: true, deadline: '2026-11-08' }]) {
      expect(remindersDue(item, 'scholarship', 'Award', new Date('2026-10-09T18:00:00Z')).some(d => d.kind === 'posted')).toBe(false)
    }
  })
})
