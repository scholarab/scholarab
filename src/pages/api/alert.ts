import { todayDate } from '../../lib/calendar'
export const prerender = false

import type { APIRoute } from 'astro'
import { eq, and } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { subscribers, events } from '../../lib/db/schema'
import { loadScholarshipsFromJson, loadProgramsFromJson } from '../../lib/data-loader'
import { jsonOk, jsonError } from '../../lib/api-response'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'
import { defer } from '../../lib/defer'
import { ALERT_MILESTONES, cadenceFromInput, formatCadence } from '../../lib/alerts'
import { sendConfirmEmail } from '../../lib/confirm-email'
import { canonicalUrl } from '../../lib/site-origin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const today = todayDate()

  let deadline: string
  let itemLabel: string
  // Resolve against the committed JSON, not loadScholarships()/loadPrograms().
  // Those prefer Postgres whenever DATABASE_URL is bound, which it always is
  // here, while the page that posted this itemId was prerendered from the JSON
  // with DATABASE_URL blanked. The two stores drifted apart -- the DB stops at
  // id 174 and marks most of what it does hold inactive -- so the DB path was
  // answering "Scholarship not found" for 142 of the 151 listings whose pages
  // show a working reminder form. scripts/send-alerts.ts reads the same JSON,
  // so this is also what makes sign-up and delivery agree on what exists.
  if (itemType === 'scholarship') {
    const scholarships = await loadScholarshipsFromJson()
    const s = scholarships.find(x => x.id === itemId)
    if (!s) return jsonError('Scholarship not found', 404)
    if (s.active === false) return jsonError('This scholarship is not open', 400)
    if (!s.deadline) return jsonError('This scholarship has no deadline', 400)
    deadline = s.deadline
    itemLabel = s.title
  } else {
    const programs = await loadProgramsFromJson()
    const p = programs.find(x => x.id === itemId)
    if (!p) return jsonError('Program not found', 404)
    // `active !== false` rather than truthy, matching the sender: most program
    // entries omit the field entirely.
    if (p.active === false) return jsonError('This program is not open', 400)
    if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing')
      return jsonError('This program has no fixed deadline', 400)
    deadline = p.deadline
    itemLabel = p.name
  }

  if (new Date(deadline + 'T00:00:00') <= today)
    return jsonError('Deadline has already passed', 400)

  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const row = { email: email.toLowerCase(), itemType: itemType as string, itemId, token }
  const cadenceValue = formatCadence(cadence)

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
