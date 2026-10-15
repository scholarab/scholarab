import { todayDate, calendarDaysUntil } from '../../lib/calendar'
export const prerender = false

import type { APIRoute } from 'astro'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { subscribers, events } from '../../lib/db/schema'
import catalogue from '../../data/runtime-catalogue.json'
import { jsonOk, jsonError } from '../../lib/api-response'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'
import { defer } from '../../lib/defer'
import { deviceClass } from '../../lib/device-class'
import { ALERT_MILESTONES, MAX_REMINDER_SET, cadenceFromInput, formatCadence, milestonesAhead, reminderState, type AlertKind, type AlertMilestone, type ItemType } from '../../lib/alerts'
import { sendConfirmEmail } from '../../lib/confirm-email'
import { canonicalUrl } from '../../lib/site-origin'
import { EMAIL_RE } from '../../lib/utils'


const TOO_SOON = 'This closes too soon for an email reminder. Apply today.'

/** The listing's name and the schedule a sign-up for it would store, or why
 * it takes none. Published JSON and the page's status rules are the only
 * authority, for one listing and for a set alike. */
function plan(itemType: ItemType, itemId: number, cadence: AlertMilestone[], now: Date):
  { label: string; cadence: string } | { error: string; status: number } {
  const item = itemType === 'scholarship'
    ? catalogue.scholarships.find(x => x.id === itemId)
    : catalogue.programs.find(x => x.id === itemId)
  if (!item) return { error: 'Listing not found', status: 404 }
  const state = reminderState(item, itemType, todayDate(now))
  if (!state) return { error: 'This listing has no reminder available', status: 400 }
  if (state === 'too-soon') return { error: TOO_SOON, status: 400 }
  const ahead = new Set<number>(milestonesAhead(calendarDaysUntil(item.deadline ?? '', now)))
  // Waiting sign-ups keep every chosen milestone: the date may not exist yet.
  const sendable: AlertKind[] = state === 'deadline'
    ? cadence.filter(m => ahead.has(m)) : [state, ...cadence]
  if (sendable.length === 0) return { error: TOO_SOON, status: 400 }
  return { label: 'title' in item ? item.title : item.name, cadence: formatCadence(sendable) }
}

const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)))
  .map(b => b.toString(16).padStart(2, '0')).join('')

const device = (request: Request) =>
  deviceClass(request.headers.get('user-agent') ?? '', request.headers.get('sec-ch-ua-mobile'))


export const POST: APIRoute = async ({ request, locals }) => {
  const ip = getClientIp(request)
  try {
    // Counts this request as it checks, in one statement. The cap stops one
    // script mailing confirmations to strangers; it is sized for a school,
    // where every student shares one address (20 refused a class, 2026-10-14).
    if (await hitRateLimit(`alert:${ip}`, 200, 15 * 60 * 1000))
      return jsonError('Too many requests. Try again later', 429)
  } catch (e) {
    // Fail open if the rate_limit table isn't migrated yet, but say so, or
    // the limiter can stop working here and nothing anywhere reports it.
    console.error('[rate-limit] alert check failed, allowing request:', e)
  }
  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Body must be an object', 400)

  const { email: rawEmail, itemType = 'scholarship', itemId, days, token: editToken, items, place } = body as Record<string, unknown>

  // Trim before validating, not after. EMAIL_RE is anchored and excludes \s, so
  // " a@b.com " failed the check even though the row would have been stored
  // trimmed anyway. The site's own forms never hit this; `<input type="email">`
  // strips surrounding whitespace before JS ever reads .value, but this is a
  // public JSON endpoint, and rejecting an otherwise-valid address for padding
  // is a trap for anything that isn't one of those forms.
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    return jsonError('That address is missing something. It should look like name@gmail.com.', 400)
  if (items !== undefined) {
    if (itemId !== undefined || days !== undefined || editToken !== undefined)
      return jsonError('Send items alone, without itemId, days or token', 400)
    return signUpSet(email, items, place, request, locals)
  }
  if (itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (!itemId || typeof itemId !== 'number' || !Number.isInteger(itemId))
    return jsonError('Valid itemId required', 400)

  // `days` is optional: callers that don't pick get the full 30/14/3, which is
  // what every sign-up did before the picker existed.
  const cadence = days === undefined ? [...ALERT_MILESTONES] : cadenceFromInput(days)
  if (cadence === null)
    return jsonError(`days must be a non-empty list of ${ALERT_MILESTONES.join(', ')}`, 400)

  const planned = plan(itemType, itemId, cadence, new Date())
  if ('error' in planned) return jsonError(planned.error, planned.status)
  const { label: itemLabel, cadence: cadenceValue } = planned

  const row = { email: email.toLowerCase(), itemType: itemType as string, itemId, token: newToken() }

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
      await defer(locals,db.insert(events).values({event:'alert_subscribe',itemType,itemId,device:device(request)}))
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

/**
 * One sign-up for a whole set: My combo, or the quiz results. A row per
 * listing, exactly what the listing form would store with its default
 * schedule, so the mailer and the confirm page need nothing new. Listings
 * that take no reminder are skipped rather than refusing the set, and the
 * answer says how many it covered; that count comes from the catalogue alone,
 * so it is the same for a new, waiting or confirmed address.
 *
 * One confirmation email names every new row and carries the first one's
 * link; the confirm page lists the rest by name and one click turns on all of
 * them (api/confirm.ts). The request counts once against the IP limit, since
 * it mails at most one confirmation, the thing the limit is for.
 */
async function signUpSet(email: string, items: unknown, place: unknown, request: Request, locals: unknown): Promise<Response> {
  if (!Array.isArray(items) || items.length === 0)
    return jsonError('items must be a non-empty list', 400)
  if (items.length > MAX_REMINDER_SET)
    return jsonError(`At most ${MAX_REMINDER_SET} listings per sign-up`, 400)
  const seen = new Set<string>()
  const picked: { itemType: ItemType; itemId: number }[] = []
  for (const entry of items) {
    const { itemType, itemId } = (entry ?? {}) as Record<string, unknown>
    if ((itemType !== 'scholarship' && itemType !== 'program') || typeof itemId !== 'number' || !Number.isInteger(itemId) || itemId < 1)
      return jsonError('Each item needs an itemType of scholarship or program and a whole-number itemId', 400)
    const key = `${itemType}:${itemId}`
    if (!seen.has(key)) { seen.add(key); picked.push({ itemType, itemId }) }
  }

  const now = new Date()
  const rows = picked.flatMap(({ itemType, itemId }) => {
    const planned = plan(itemType, itemId, [...ALERT_MILESTONES], now)
    return 'error' in planned ? [] : [{ itemType, itemId, label: planned.label, cadence: planned.cadence }]
  })
  if (rows.length === 0) return jsonError('None of these can take a reminder right now', 400)

  const address = email.toLowerCase()
  // A word for where it came from, never free text: it is stored.
  const from = place === 'saved' || place === 'match' ? place : null
  try {
    const inserted = await db.insert(subscribers)
      .values(rows.map(r => ({ email: address, itemType: r.itemType, itemId: r.itemId, token: newToken(), cadence: r.cadence })))
      .onConflictDoNothing({ target: [subscribers.email, subscribers.itemType, subscribers.itemId] })
      .returning({ id: subscribers.id, token: subscribers.token, itemType: subscribers.itemType, itemId: subscribers.itemId })
    if (inserted.length > 0) {
      await defer(locals, db.insert(events).values(inserted.map(r =>
        ({ event: 'alert_subscribe', itemType: r.itemType, itemId: r.itemId, meta: from, device: device(request) }))))
      // Named in the order they were asked for, which is the order the page shows.
      const order = new Map(rows.map((r, n) => [`${r.itemType}:${r.itemId}`, n]))
      inserted.sort((a, b) => order.get(`${a.itemType}:${a.itemId}`)! - order.get(`${b.itemType}:${b.itemId}`)!)
      const labels = inserted.map(r => rows[order.get(`${r.itemType}:${r.itemId}`)!]!.label)
      const first = inserted[0]!
      const confirmUrl = canonicalUrl(`/api/confirm?token=${first.token}`, request)
      const firstCadence = rows[order.get(`${first.itemType}:${first.itemId}`)!]!.cadence
      // Every row the email named is marked asked, so the daily sweep never
      // asks again for any of them; the confirm page lists them all.
      if (await sendConfirmEmail(email, labels, confirmUrl, firstCadence, first.id))
        await defer(locals, db.update(subscribers).set({ confirmSentAt: new Date() })
          .where(inArray(subscribers.id, inserted.map(r => r.id))))
    }
    return jsonOk({ ok: true, covered: rows.length })
  } catch (e) {
    console.error('[alert] set sign-up write failed', e)
    return jsonError('Unable to save your request. Please try again.', 500)
  }
}
