export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { events } from '../../lib/db/schema'
import { jsonError } from '../../lib/api-response'
import { getClientIp, isRateLimited, recordHit } from '../../lib/rate-limit'

// Client-sendable events only. alert_subscribe is recorded server-side in /api/alert.
const ALLOWED_EVENTS = new Set(['detail_view', 'apply_click', 'save', 'quiz_start', 'quiz_complete', 'search_empty'])
// Real browser UAs never contain a URL, a script-runtime name, or an HTTP
// library name — bots and fetch libraries almost always do. JS-executing
// crawlers (Googlebot, Bytespider) all match one of the generic terms.
const BOT_UA = /bot|crawl|spider|slurp|curl|wget|python|java\b|httpclient|headless|lighthouse|pagespeed|prerender|preview|phantom|selenium|puppeteer|playwright|scrapy|axios|node-fetch|go-http|okhttp|libwww|urllib|https?:\/\//i
const META_MAX = 120
// Someone pasted an email (or their name@school) into search — never store it
const EMAIL_LIKE = /\S+@\S+\.\S+/

// Students browse from residential/school networks, never from cloud hosts.
// Catches JS-executing bots with flawless browser UAs. Checked, never stored.
const DATACENTER_ORG = /amazon|aws|google[- ]cloud|azure|microsoft[- ]corp|hetzner|digital[- ]?ocean|ovh|linode|akamai|vultr|alibaba|tencent|oracle|leaseweb|contabo|m247|datacamp|choopa|fly\.io|huawei[- ]cloud|scaleway/i

type CfLocals = { runtime?: { cf?: { asOrganization?: string } } }

const accepted = () => new Response(null, { status: 204 })

export const POST: APIRoute = async ({ request, locals }) => {
  // Drop bots silently — a 204 gives them nothing to retry against
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) return accepted()

  // Cloudflare tells us which network the request came from
  const asOrg = (locals as CfLocals | undefined)?.runtime?.cf?.asOrganization
  if (asOrg && DATACENTER_ORG.test(asOrg)) return accepted()

  // Only our own pages send events. Browsers set Origin on POST and
  // Sec-Fetch-Site on same-origin requests; if either is present and wrong,
  // it's cross-site spam. Absent headers pass (older browsers).
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite && secFetchSite !== 'same-origin') return accepted()
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).hostname !== new URL(request.url).hostname) return accepted()
    } catch { return accepted() }
  }

  const ip = getClientIp(request)
  try {
    // Generous limit: school computer labs share one NAT IP, and a classroom
    // burst is exactly the traffic we most want to measure
    if (await isRateLimited(`event:${ip}`, 300, 15 * 60 * 1000))
      return jsonError('Too many requests — try again later', 429)
  } catch { /* fail open if rate_limit table not yet migrated */ }

  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  const { event, itemType, itemId, meta } = body as Record<string, unknown>

  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event))
    return jsonError('Unknown event', 400)
  if (itemType !== undefined && itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (itemId !== undefined && (typeof itemId !== 'number' || !Number.isInteger(itemId) || itemId < 1 || itemId > 1_000_000))
    return jsonError('itemId must be a positive integer', 400)
  // meta carries the query text for search_empty only — nothing else needs free text
  if (meta !== undefined && (event !== 'search_empty' || typeof meta !== 'string'))
    return jsonError('meta not allowed for this event', 400)

  // Empty-search queries that can't name a content gap aren't worth a row:
  // too short to mean anything, no letters, or something email-shaped (PII).
  // lowercased so "Rotary" and "rotary" aggregate as one search gap.
  let cleanMeta: string | null = null
  if (typeof meta === 'string') {
    cleanMeta = meta.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, META_MAX)
    if (cleanMeta.length < 3 || !/\p{L}/u.test(cleanMeta) || EMAIL_LIKE.test(cleanMeta))
      return accepted()
  }

  try {
    await db.insert(events).values({
      event,
      itemType: (itemType as string) ?? null,
      itemId: (itemId as number) ?? null,
      meta: cleanMeta,
    })
  } catch { /* analytics must never surface errors to the page */ }

  recordHit(`event:${ip}`).catch(() => {})
  return accepted()
}
