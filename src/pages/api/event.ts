export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { events } from '../../lib/db/schema'
import { jsonError } from '../../lib/api-response'
import { getClientIp, isRateLimited, recordHit } from '../../lib/rate-limit'

// Client-sendable events only. alert_subscribe is recorded server-side in /api/alert.
const ALLOWED_EVENTS = new Set(['apply_click', 'save', 'quiz_complete', 'search_empty'])
const BOT_UA = /bot|crawler|spider|curl|wget|python|httpclient|headless/i
const META_MAX = 120

const accepted = () => new Response(null, { status: 204 })

export const POST: APIRoute = async ({ request }) => {
  // Drop bots silently — a 204 gives them nothing to retry against
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) return accepted()

  const ip = getClientIp(request)
  try {
    if (await isRateLimited(`event:${ip}`, 60, 15 * 60 * 1000))
      return jsonError('Too many requests — try again later', 429)
  } catch { /* fail open if rate_limit table not yet migrated */ }

  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  const { event, itemType, itemId, meta } = body as Record<string, unknown>

  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event))
    return jsonError('Unknown event', 400)
  if (itemType !== undefined && itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (itemId !== undefined && (typeof itemId !== 'number' || !Number.isInteger(itemId)))
    return jsonError('itemId must be an integer', 400)
  // meta carries the query text for search_empty only — nothing else needs free text
  if (meta !== undefined && (event !== 'search_empty' || typeof meta !== 'string'))
    return jsonError('meta not allowed for this event', 400)

  try {
    await db.insert(events).values({
      event,
      itemType: (itemType as string) ?? null,
      itemId: (itemId as number) ?? null,
      meta: typeof meta === 'string' ? meta.trim().slice(0, META_MAX) || null : null,
    })
  } catch { /* analytics must never surface errors to the page */ }

  recordHit(`event:${ip}`).catch(() => {})
  return accepted()
}
