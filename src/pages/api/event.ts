export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { events } from '../../lib/db/schema'
import { jsonError } from '../../lib/api-response'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'

// Client-sendable events only. alert_subscribe is recorded server-side in /api/alert.
// app_step left with the application-step ticker (deleted with /app, Aug 2026).
const ALLOWED_EVENTS = new Set(['detail_view', 'apply_click', 'save', 'quiz_start', 'quiz_complete', 'search_empty', 'source_visit', 'tour_open', 'tour_step', 'tour_finish', 'tour_close', 'tour_cta', 'combo_open'])
// Campaign sources, mirroring SOURCES in src/lib/events.ts. Anyone can type
// `?s=` into the address bar, so the server keeps its own copy of the list
// rather than trusting whatever the client sends.
const ALLOWED_SOURCES = new Set(['ig', 'tt', 'yt', 'em', 'qr'])
// Where a save was made: the listing page, a directory row, or quiz results.
// Added 2026-09-26 to learn which save button students actually use.
const SAVE_FROM = new Set(['page', 'row', 'quiz'])
// How the walkthrough was opened: by itself on a first visit ('auto', until
// 2026-09-27), from the first-visit strip that replaced that, or a button.
// 'button' is every hand opening before 2026-09-26, when the three buttons
// were told apart; pages cached from then still send it.
const TOUR_FROM = new Set(['auto', 'strip', 'bar', 'menu', 'sheet', 'button'])
// tour_step: the step reached (the first is the opening itself).
// tour_close: the step the dialog was closed on.
const TOUR_STEPS = new Set(['2', '3', '4', '5'])
const TOUR_CLOSED_ON = new Set(['1', '2', '3', '4', '5'])
// Real browser UAs never contain a URL, a script-runtime name, or an HTTP
// library name; bots and fetch libraries almost always do. JS-executing
// crawlers (Googlebot, Bytespider) all match one of the generic terms.
const BOT_UA = /bot|crawl|spider|slurp|curl|wget|python|java\b|httpclient|headless|lighthouse|pagespeed|prerender|preview|phantom|selenium|puppeteer|playwright|scrapy|axios|node-fetch|go-http|okhttp|libwww|urllib|https?:\/\//i
const META_MAX = 120
// Someone pasted an email (or their name@school) into search; never store it
const EMAIL_LIKE = /\S+@\S+\.\S+/

// Students browse from residential/school networks, never from cloud hosts.
// Catches JS-executing bots with flawless browser UAs. Checked, never stored.
const DATACENTER_ORG = /amazon|aws|google[- ]cloud|azure|microsoft[- ]corp|hetzner|digital[- ]?ocean|ovh|linode|akamai|vultr|alibaba|tencent|oracle|leaseweb|contabo|m247|datacamp|choopa|fly\.io|huawei[- ]cloud|scaleway/i

type CfRequest = { cf?: { asOrganization?: string } }

const accepted = () => new Response(null, { status: 204 })

export const POST: APIRoute = async ({ request }) => {
  // Drop bots silently; a 204 gives them nothing to retry against
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) return accepted()

  // Cloudflare tells us which network the request came from
  const asOrg = (request as CfRequest).cf?.asOrganization
  if (asOrg && DATACENTER_ORG.test(asOrg)) return accepted()

  // Only our own pages send events. Browsers set Origin on POST and
  // Sec-Fetch-Site on same-origin requests, if either is present and wrong,
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
    if (await hitRateLimit(`event:${ip}`, 300, 15 * 60 * 1000))
      return jsonError('Too many requests; try again later', 429)
  } catch (e) {
    // Fail open if the rate_limit table isn't migrated yet, but say so, or
    // the limiter can stop working here and nothing anywhere reports it.
    console.error('[rate-limit] event check failed, allowing request:', e)
  }

  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Body must be an object', 400)

  const { event, itemType, itemId, meta } = body as Record<string, unknown>

  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event))
    return jsonError('Unknown event', 400)
  if (itemType !== undefined && itemType !== 'scholarship' && itemType !== 'program')
    return jsonError('itemType must be scholarship or program', 400)
  if (itemId !== undefined && (typeof itemId !== 'number' || !Number.isInteger(itemId) || itemId < 1 || itemId > 1_000_000))
    return jsonError('itemId must be a positive integer', 400)
  // Both or neither. A half-identified row counts in the monthly totals but is
  // dropped from the per-item table, which is how three July apply_clicks made
  // those two numbers impossible to reconcile.
  if ((itemType === undefined) !== (itemId === undefined))
    return jsonError('itemType and itemId must be sent together', 400)
  // meta carries the query text for search_empty, the source code for
  // source_visit, the place for save, how tour_open was opened and the step
  // for tour_step and tour_close; nothing else takes a meta at all
  const META_EVENTS = new Set(['search_empty', 'source_visit', 'save', 'tour_open', 'tour_step', 'tour_close'])
  if (meta !== undefined && (!META_EVENTS.has(event) || typeof meta !== 'string'))
    return jsonError('meta not allowed for this event', 400)

  let cleanMeta: string | null = null
  if (event === 'source_visit') {
    // A source row with no source is just an untagged visit, which the page
    // views already count. Reject rather than store a null.
    if (typeof meta !== 'string' || !ALLOWED_SOURCES.has(meta))
      return jsonError('unknown source', 400)
    cleanMeta = meta
  } else if (event === 'tour_open') {
    if (meta !== undefined) {
      if (!TOUR_FROM.has(meta as string)) return jsonError('unknown tour opening', 400)
      cleanMeta = meta as string
    }
  } else if (event === 'tour_step' || event === 'tour_close') {
    // Required: a step event without its step says nothing
    if (!(event === 'tour_step' ? TOUR_STEPS : TOUR_CLOSED_ON).has(meta as string))
      return jsonError('unknown tour step', 400)
    cleanMeta = meta as string
  } else if (event === 'save') {
    // Optional, since pages cached before the field existed send none
    if (meta !== undefined) {
      if (!SAVE_FROM.has(meta as string)) return jsonError('unknown save place', 400)
      cleanMeta = meta as string
    }
  } else if (typeof meta === 'string') {
    // Empty-search queries that can't name a content gap aren't worth a row:
    // too short to mean anything, no letters, or something email-shaped (PII).
    // lowercased so "Rotary" and "rotary" aggregate as one search gap.
    // `search_empty` sends "query | /path". The path says which page the
    // student was standing on, which is the difference between a term the
    // site does not carry and a term the facet hub in front of them does not.
    // Split, clean each half, and rejoin, so a stray pipe in the query text
    // cannot forge a path.
    const [rawQuery, ...rest] = meta.split('|')
    const query = (rawQuery ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (query.length < 3 || !/\p{L}/u.test(query) || EMAIL_LIKE.test(query))
      return accepted()
    const path = (rest[0] ?? '').trim().toLowerCase()
    // Site-relative paths only, and nothing that could carry an identifier.
    const cleanPath = /^\/[a-z0-9/-]{0,60}$/.test(path) ? path : ''
    cleanMeta = (cleanPath ? `${query} | ${cleanPath}` : query).slice(0, META_MAX)
  }

  try {
    await db.insert(events).values({
      event,
      itemType: (itemType as string) ?? null,
      itemId: (itemId as number) ?? null,
      meta: cleanMeta,
    })
  } catch { /* analytics must never surface errors to the page */ }

  return accepted()
}
