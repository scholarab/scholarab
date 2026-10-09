import { todayDate, calendarDaysUntil } from '../../lib/calendar'
export const prerender = false

import type { APIRoute } from 'astro'
import { eq, and } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { subscribers, events } from '../../lib/db/schema'
import catalogue from '../../data/runtime-catalogue.json'
import { jsonOk, jsonError } from '../../lib/api-response'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'
import { defer } from '../../lib/defer'
import { ALERT_MILESTONES, cadenceFromInput, formatCadence, milestonesAhead, reminderState, type AlertKind } from '../../lib/alerts'
import { sendConfirmEmail } from '../../lib/confirm-email'
import { canonicalUrl } from '../../lib/site-origin'
import { EMAIL_RE } from '../../lib/utils'


export const POST: APIRoute = async ({ request, locals }) => {
  const ip = getClientIp(request)
  try {
    // Counts this request as it checks, in one statement. The old pair
    // checked here and recorded after the response, so concurrent callers all
    // read the same pre-hit count and all sailed through.
    if (await hitRateLimit(`alert:${ip}`, 20, 15 * 60 * 1000))
      return jsonError('Too many requests. Try again later', 429)
  } catch (e) {
    // Fail open if the rate_limit table isn't migrated yet, but say so, or
    // the limiter can stop working here and nothing anywhere reports it.
    console.error('[rate-limit] alert check failed, allowing request:', e)
  }
  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Body must be an object', 400)

  const { email: rawEmail, itemType = 'scholarship', itemId, days, token: editToken } = body as Record<string, unknown>

  // Trim before validating, not after. EMAIL_RE is anchored and excludes \s, so
  // " a@b.com " failed the check even though the row would have been stored
  // trimmed anyway. The site's own forms never hit this; `<input type="email">`
  // strips surrounding whitespace before JS ever reads .value, but this is a
  // public JSON endpoint, and rejecting an otherwise-valid address for padding
  // is a trap for anything that isn't one of those forms.
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    return jsonError('That address is missing something. It should look like name@gmail.com.', 400)
  if (itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (!itemId || typeof itemId !== 'number' || !Number.isInteger(itemId))
    return jsonError('Valid itemId required', 400)

  // `days` is optional: callers that don't pick get the full 30/14/3, which is
  // what every sign-up did before the picker existed.
  const cadence = days === undefined ? [...ALERT_MILESTONES] : cadenceFromInput(days)
  if (cadence === null)
    return jsonError(`days must be a non-empty list of ${ALERT_MILESTONES.join(', ')}`, 400)

  const now = new Date()
  const today = todayDate(now)

  // Published JSON and the page's status rules are the only authority.
  const item = itemType === 'scholarship'
    ? catalogue.scholarships.find(x => x.id === itemId)
    : catalogue.programs.find(x => x.id === itemId)
  if (!item) return jsonError('Listing not found', 404)
  const itemLabel = 'title' in item ? item.title : item.name
  const state = reminderState(item, itemType, today)
  if (!state) return jsonError('This listing has no reminder available', 400)
  if (state === 'too-soon')
    return jsonError('This closes too soon for an email reminder. Apply today.', 400)
  const ahead = new Set<number>(milestonesAhead(calendarDaysUntil(item.deadline ?? '', now)))
  // Waiting sign-ups keep every chosen milestone: the date may not exist yet.
  const sendable: AlertKind[] = state === 'deadline'
    ? cadence.filter(m => ahead.has(m)) : [state, ...cadence]
  if (sendable.length === 0)
    return jsonError('This closes too soon for an email reminder. Apply today.', 400)

  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const row = { email: email.toLowerCase(), itemType: itemType as string, itemId, token }
  const cadenceValue = formatCadence(sendable)

  // Updating an existing reminder requires the credential from its email.
  // Public signups never overwrite someone else's confirmed settings.
  if (editToken !== undefined) {
    if (typeof editToken !== 'string' || !/^[a-f0-9]{48}$/.test(editToken)) return jsonError('Invalid subscription token', 400)
    await db.update(subscribers).set({cadence:cadenceValue}).where(and(
      eq(subscribers.token,editToken),eq(subscribers.email,row.email),
      eq(subscribers.itemType,itemType),eq(subscribers.itemId,itemId)))
    return jsonOk({ok:true})
  }
  try {
    const [inserted] = await db.insert(subscribers).values({...row,cadence:cadenceValue})
      .onConflictDoNothing({target:[subscribers.email,subscribers.itemType,subscribers.itemId]})
      .returning({id:subscribers.id,token:subscribers.token})
    if (inserted) {
      await defer(locals,db.insert(events).values({event:'alert_subscribe',itemType,itemId}))
      const confirmUrl=canonicalUrl(`/api/confirm?token=${inserted.token}`,request)
      if(await sendConfirmEmail(email,itemLabel,confirmUrl,cadenceValue,inserted.id))
        await defer(locals,db.update(subscribers).set({confirmSentAt:new Date()}).where(eq(subscribers.id,inserted.id)))
    }
    // Identical response for new, pending and confirmed addresses.
    return jsonOk({ok:true})
  } catch(e) {
    console.error('[alert] subscription write failed', e)
    return jsonError('Unable to save your request. Please try again.',500)
  }
}
