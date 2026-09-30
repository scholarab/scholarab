// Deadline-alert cadence: which milestones before a deadline a subscriber
// wants to hear about. Shared by /api/alert (writes it) and
// scripts/send-alerts.ts (reads it), so both agree on what a stored `cadence`
// string means. The /app alerts screen was the third reader until /app was
// deleted (2026-08-12).
//
// Stored as a comma-separated day list on `subscribers.cadence` rather than
// three booleans: the milestone set is the mailer's to define, and a text
// column lets it change without another migration.

import { scholarshipStatusOf, type StatusInput } from './status'

/** The days before a deadline the mailer can send on, biggest first. */
export const ALERT_MILESTONES = [30, 14, 3] as const

export type AlertMilestone = (typeof ALERT_MILESTONES)[number]

const MILESTONE_SET: ReadonlySet<number> = new Set(ALERT_MILESTONES)

export function isMilestone(n: unknown): n is AlertMilestone {
  return typeof n === 'number' && MILESTONE_SET.has(n)
}

/**
 * Read a stored cadence back into days.
 *
 * Anything unreadable; null, empty, a value written before the column
 * existed, garbage; falls back to every milestone. A subscriber whose row is
 * malformed should be over-reminded, never silently dropped: they asked to
 * hear about this deadline, and the cadence is only a refinement of when.
 */
export function parseCadence(raw: string | null | undefined): AlertMilestone[] {
  if (!raw) return [...ALERT_MILESTONES]
  const days = raw
    .split(',')
    .map(part => Number(part.trim()))
    .filter(isMilestone)
  const unique = [...new Set(days)]
  return unique.length > 0 ? sortCadence(unique) : [...ALERT_MILESTONES]
}

/** Normalize days into the stored form: valid, deduped, biggest first. */
export function formatCadence(days: readonly number[]): string {
  return sortCadence([...new Set(days.filter(isMilestone))]).join(',')
}

/**
 * Validate a cadence off the wire. Returns the normalized days, or null if the
 * caller sent something that is not a non-empty list of known milestones;
 * an empty list is a request to be mailed never, which is what unsubscribing
 * is for, so it is rejected rather than stored.
 */
export function cadenceFromInput(input: unknown): AlertMilestone[] | null {
  if (!Array.isArray(input)) return null
  if (input.length === 0 || input.length > ALERT_MILESTONES.length) return null
  if (!input.every(isMilestone)) return null
  const unique = [...new Set(input as AlertMilestone[])]
  return sortCadence(unique)
}

/**
 * The milestones still ahead of a deadline `daysLeft` calendar days away.
 * Strictly ahead: the mailer runs once a day and a sign-up still has to be
 * confirmed, so a milestone falling today may already have gone. A form that
 * promised "30, 14 and 3 days" on an award closing tomorrow promised mail the
 * mailer never sends (critique 2026-09-29).
 */
export function milestonesAhead(daysLeft: number): AlertMilestone[] {
  return ALERT_MILESTONES.filter(m => m < daysLeft)
}

/** "30, 14 and 3 days" / "14 and 3 days" / "3 days". */
export function milestonePhrase(days: readonly number[]): string {
  const list = days.map(String)
  const head = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? ''
  return `${head} ${days.length === 1 && days[0] === 1 ? 'day' : 'days'}`
}

/** "today" / "tomorrow" / "on Thursday", for a deadline a few days out. */
export function closesPhrase(daysLeft: number, deadlineIso: string): string {
  if (daysLeft <= 0) return 'today'
  if (daysLeft === 1) return 'tomorrow'
  return `on ${new Date(deadlineIso + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long' })}`
}

function sortCadence<T extends number>(days: T[]): T[] {
  return days.sort((a, b) => b - a)
}

/** "October 1, 2026": the date as every reminder prints it. */
export function reminderDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export interface ReminderCopy {
  subject: string
  kicker: string
  dateLine: string
  /** Said under the date when the date is a guess; null when it is posted. */
  caution: string | null
  button: string
}

/**
 * What a reminder says, or null when there is nothing to remind about.
 *
 * Status comes from scholarshipStatusOf, the same rule the listing page uses,
 * rather than a filter of the mailer's own. `active: false` still sends
 * nothing: the listing is between cycles and its subscribers were never
 * mailed for it. A rolled-forward date (status `unconfirmed`) is mailed in
 * words that say it is a guess. The sender used to mail it as "3 days left:
 * X closes Oct 1", the site asserting a date the provider never gave, to
 * someone who signed up while the date was real (debug 2026-09-27).
 */
export function reminderCopy(
  item: StatusInput & { deadline: string },
  label: string,
  daysLeft: number,
  today: Date,
): ReminderCopy | null {
  if (item.active === false) return null
  const status = scholarshipStatusOf(item, today)
  if (status === 'closed') return null
  const date = reminderDate(item.deadline)
  if (status === 'unconfirmed') {
    return {
      subject: `Check the date: ${label} usually closes around ${date}`,
      kicker: 'Date not confirmed yet',
      dateLine: `Expected around ${date}, going by last year's deadline`,
      caution: "The provider hasn't posted this year's date. It may move, or the award may already be closed, so check it before you plan around it.",
      button: 'Check the date',
    }
  }
  const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  return {
    subject: `${days} left: ${label} closes ${date}`,
    kicker: `${days} left to apply`,
    dateLine: `Deadline: ${date}`,
    caution: null,
    button: 'Apply Now',
  }
}
