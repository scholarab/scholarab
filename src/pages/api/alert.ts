export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers, events } from '../../lib/db/schema'
import { loadScholarships, loadPrograms } from '../../lib/data-loader'
import { jsonOk, jsonError } from '../../lib/api-response'
import { getClientIp, isRateLimited, recordHit } from '../../lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  try {
    if (await isRateLimited(`alert:${ip}`, 20, 15 * 60 * 1000))
      return jsonError('Too many requests — try again later', 429)
  } catch { /* fail open if rate_limit table not yet migrated */ }
  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  const { email, itemType = 'scholarship', itemId } = body as Record<string, unknown>

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email))
    return jsonError('Valid email required', 400)
  if (itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (!itemId || typeof itemId !== 'number' || !Number.isInteger(itemId))
    return jsonError('Valid itemId required', 400)

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

  try {
    await db.insert(subscribers).values({
      email: email.toLowerCase().trim(),
      itemType: itemType as string,
      itemId,
      token,
    }).onConflictDoNothing()
  } catch {
    return jsonError('Internal server error', 500)
  }

  recordHit(`alert:${ip}`).catch(() => {})
  db.insert(events).values({ event: 'alert_subscribe', itemType: itemType as string, itemId }).catch(() => {})
  return jsonOk({ ok: true })
}
