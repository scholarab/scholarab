export const prerender = false

import type { APIRoute } from 'astro'
import { sql } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { subscribers, events } from '../../lib/db/schema'
import { loadScholarships, loadPrograms } from '../../lib/data-loader'
import { jsonOk, jsonError } from '../../lib/api-response'
import { getClientIp, isRateLimited, recordHit } from '../../lib/rate-limit'
import { defer } from '../../lib/defer'
import { ALERT_MILESTONES, cadenceFromInput, formatCadence } from '../../lib/alerts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = getClientIp(request)
  try {
    if (await isRateLimited(`alert:${ip}`, 20, 15 * 60 * 1000))
      return jsonError('Too many requests — try again later', 429)
  } catch (e) {
    // Fail open if the rate_limit table isn't migrated yet — but say so, or
    // the limiter can stop working here and nothing anywhere reports it.
    console.error('[rate-limit] alert check failed, allowing request:', e)
  }
  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  const { email: rawEmail, itemType = 'scholarship', itemId, days } = body as Record<string, unknown>

  // Trim before validating, not after. EMAIL_RE is anchored and excludes \s, so
  // " a@b.com " failed the check even though the row would have been stored
  // trimmed anyway. The site's own forms never hit this — `<input type="email">`
  // strips surrounding whitespace before JS ever reads .value — but this is a
  // public JSON endpoint, and rejecting an otherwise-valid address for padding
  // is a trap for anything that isn't one of those forms.
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
  if (!email || !EMAIL_RE.test(email))
    return jsonError('Valid email required', 400)
  if (itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (!itemId || typeof itemId !== 'number' || !Number.isInteger(itemId))
    return jsonError('Valid itemId required', 400)

  // `days` is optional: callers that don't pick get the full 30/14/3, which is
  // what every sign-up did before the picker existed.
  const cadence = days === undefined ? [...ALERT_MILESTONES] : cadenceFromInput(days)
  if (cadence === null)
    return jsonError(`days must be a non-empty list of ${ALERT_MILESTONES.join(', ')}`, 400)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let deadline: string
  if (itemType === 'scholarship') {
    const scholarships = await loadScholarships()
    const s = scholarships.find(x => x.id === itemId)
    if (!s) return jsonError('Scholarship not found', 404)
    if (!s.deadline) return jsonError('This scholarship has no deadline', 400)
    deadline = s.deadline
  } else {
    const programs = await loadPrograms()
    const p = programs.find(x => x.id === itemId)
    if (!p) return jsonError('Program not found', 404)
    if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing')
      return jsonError('This program has no fixed deadline', 400)
    deadline = p.deadline
  }

  if (new Date(deadline + 'T00:00:00') <= today)
    return jsonError('Deadline has already passed', 400)

  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const row = { email: email.toLowerCase(), itemType: itemType as string, itemId, token }
  const cadenceValue = formatCadence(cadence)

  // Whether this call created a reminder or just retuned an existing one.
  // `alert_subscribe` is the signup metric, so a cadence change must not fire
  // it — otherwise "Alert signups" drifts above "People on email" and the gap
  // reads as churn that never happened.
  let isNewReminder: boolean
  try {
    // Re-subscribing used to be a no-op. Now it is how a student changes their
    // mind about when to be mailed, so the conflict updates the cadence — but
    // never the token, which is the credential in the unsubscribe link already
    // sitting in their inbox.
    const [inserted] = await db.insert(subscribers)
      .values({ ...row, cadence: cadenceValue })
      .onConflictDoUpdate({
        target: [subscribers.email, subscribers.itemType, subscribers.itemId],
        set: { cadence: cadenceValue },
      })
      // Postgres leaves xmax at 0 on a genuine insert and stamps it with the
      // locking txid on the DO UPDATE path — the only way to tell the two
      // apart, since both return a row.
      .returning({ isNew: sql<boolean>`(xmax = 0)` })
    isNewReminder = inserted?.isNew ?? true
  } catch (e) {
    // Deploys are not ordered against migrations, so this route can go live
    // before 0009_subscriber_cadence.sql has run. Getting the reminder set at
    // the default cadence beats refusing the sign-up; the log is how a missing
    // migration gets noticed rather than silently costing everyone their pick.
    console.error('[alert] cadence insert failed, retrying without it:', e)
    try {
      // DO NOTHING returns no row at all on conflict, so the row count is the
      // same signal xmax gives above.
      const rows = await db.insert(subscribers).values(row).onConflictDoNothing().returning({ id: subscribers.id })
      isNewReminder = rows.length > 0
    } catch {
      return jsonError('Internal server error', 500)
    }
  }

  // Both writes are deferred rather than fired-and-forgotten: the Worker
  // cancels un-awaited I/O at return, which is why every signup between the
  // Jul 16 wipe and now recorded a subscriber row but no alert_subscribe event.
  await defer(locals, recordHit(`alert:${ip}`))
  if (isNewReminder)
    await defer(locals, db.insert(events).values({ event: 'alert_subscribe', itemType: itemType as string, itemId }))
  return jsonOk({ ok: true })
}
