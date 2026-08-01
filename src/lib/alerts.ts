// Deadline-alert cadence: which milestones before a deadline a subscriber
// wants to hear about. Shared by /api/alert (writes it), scripts/send-alerts.ts
// (reads it) and the /app alerts screen (picks it), so all three agree on what
// a stored `cadence` string means.
//
// Stored as a comma-separated day list on `subscribers.cadence` rather than
// three booleans: the milestone set is the mailer's to define, and a text
// column lets it change without another migration.

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
 * Anything unreadable — null, empty, a value written before the column
 * existed, garbage — falls back to every milestone. A subscriber whose row is
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
 * caller sent something that is not a non-empty list of known milestones —
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

/** "30, 14 and 3 days" — the sentence the app and the emails both use. */
export function cadenceSentence(days: readonly AlertMilestone[]): string {
  const sorted = sortCadence([...days])
  if (sorted.length === 0) return 'never'
  if (sorted.length === 1) return `${sorted[0]} days`
  const head = sorted.slice(0, -1).join(', ')
  return `${head} and ${sorted[sorted.length - 1]} days`
}

function sortCadence<T extends number>(days: T[]): T[] {
  return days.sort((a, b) => b - a)
}
