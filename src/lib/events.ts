// Anonymous event counting; fire-and-forget, no cookies, no ids, no payload
// beyond the event name and which item it concerns. Must never break the page.
import { getSaved, getSavedPrograms } from './tracker.ts'
import { STARTER_PACK_IDS } from './starter-pack.ts'

export type AppEvent =
  | 'detail_view' | 'apply_click' | 'save' | 'quiz_start' | 'quiz_complete' | 'search_empty'
  /** The How it works walkthrough: opened (meta: where from), each step
   *  reached (meta: 2-5), read to its last step, closed (meta: the step it
   *  was closed on) and its closing "Find my scholarships" clicked. */
  | 'tour_open' | 'tour_step' | 'tour_finish' | 'tour_close' | 'tour_cta'
  /** Landed from an off-site campaign link carrying `?s=`. Meta is the source
   *  code, never free text; see SOURCES. */
  | 'source_visit'
  /** "See the combo" on a /match result's combo tray. No meta: which combo
   *  is not worth an open field in the events table. */
  | 'combo_open'
  /** A status set on /saved. Meta is the status (working, submitted, won):
   *  the first count of whether a saved award gets applied for or won. */
  | 'app_status'

const OPT_OUT_KEY = 'sa_no_track'
/** `?nt=1` opts this browser out, `?nt=0` opts back in. */
const OPT_OUT_PARAM = 'nt'

/** `?s=ig` etc. names which off-site link the visit came from. */
const SOURCE_PARAM = 's'
/**
 * The only source codes that get recorded. A closed set, not free text: the
 * value arrives from a URL anyone can edit, and an open field would be an
 * open invitation to write something identifying into the events table.
 * ig = Instagram, tt = TikTok, yt = YouTube, em = counsellor email, qr = print/QR,
 * rm = a deadline reminder email (2026-10-14), kept apart from em so the
 * reminders' own pull back to the site can be read.
 */
export const SOURCES = ['ig', 'tt', 'yt', 'em', 'qr', 'rm'] as const
export type Source = (typeof SOURCES)[number]

export function parseSource(search: string): Source | null {
  try {
    const v = new URLSearchParams(search).get(SOURCE_PARAM)
    return v !== null && (SOURCES as readonly string[]).includes(v) ? (v as Source) : null
  } catch {
    return null
  }
}

/**
 * Record which campaign link brought this visit, if any.
 *
 * Called from the layout on every page load rather than from a landing page,
 * because a bio link can point at any URL on the site. sendEvent's per-session
 * dedupe keys on the meta, so one visit counts once per source no matter how
 * many pages it touches, and a student who arrives from Instagram in the
 * morning and TikTok at night counts on both.
 */
export function recordSourceVisit(): void {
  try {
    const source = parseSource(location.search)
    if (source) sendEvent('source_visit', undefined, undefined, source)
  } catch { /* never break the page for analytics */ }
}

// Fallback dedupe when sessionStorage is unavailable (private mode, blocked
// storage). Module-level, so it survives view-transition swaps within a tab.
const sentInMemory = new Set<string>()

/**
 * Is this a build being served locally rather than the real site?
 *
 * The MODE check below only catches `astro dev`. A production bundle served by
 * `wrangler dev` reports MODE 'production' and still holds a live
 * DATABASE_URL, so clicking anything while verifying the real build wrote
 * straight into the production events table, which is exactly the sort of
 * self-inflicted row this file exists to keep out.
 */
export function isLocalPreview(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
    hostname === '[::1]' || hostname === '::1' || hostname.endsWith('.local')
}

/**
 * Honour `?nt=1` / `?nt=0` in the URL.
 *
 * The opt-out used to be set only when /admin mounted, so it covered exactly
 * the browsers where the owner had opened the admin panel, not his phone, not
 * a fresh profile, not a second laptop. Un-flagged testing then landed in the
 * table looking exactly like student traffic: 26 of the first 35 `save` rows
 * came from one 30-minute run down a list of consecutive ids. A URL you can
 * open anywhere flags a device before it records anything. `nt=0` exists so a
 * browser flagged by accident isn't silently dead forever.
 */
export function syncTrackingOptOut(): void {
  try {
    const v = new URLSearchParams(location.search).get(OPT_OUT_PARAM)
    if (v === null) return
    // warn, not info: "this browser is no longer being counted" is exactly the
    // sort of thing that should be hard to miss if it was set by accident.
    if (v === '0') {
      localStorage.removeItem(OPT_OUT_KEY)
      console.warn('[scholarab] analytics re-enabled on this browser')
    } else {
      localStorage.setItem(OPT_OUT_KEY, '1')
      console.warn('[scholarab] analytics disabled on this browser, so nothing you do here will be counted')
    }
  } catch { /* storage or URL unavailable; nothing to sync */ }
}

function shouldSkip(dedupeKey: string): boolean {
  // Dev server writes to the production table via .env.local; never count it
  if (import.meta.env.MODE === 'development') return true
  // Nor does a built bundle served from localhost. Exempt under vitest, whose
  // happy-dom window is itself served from localhost.
  if (import.meta.env.MODE !== 'test' && isLocalPreview(location.hostname)) return true
  // Automated browsers (Playwright, etc.)
  if (navigator.webdriver) return true
  // Before the storage read below, so `?nt=1` takes effect on the very first
  // event of the page rather than the second
  syncTrackingOptOut()
  try {
    // Admin opt-out flag (set automatically by the admin panel)
    if (localStorage.getItem(OPT_OUT_KEY)) return true
    // Once per tab session per event+item: counts become "people who did X",
    // not "times X happened"
    if (sessionStorage.getItem(dedupeKey)) return true
    sessionStorage.setItem(dedupeKey, '1')
    return false
  } catch {
    // Storage unavailable; dedupe in memory for the page's lifetime instead
    if (sentInMemory.has(dedupeKey)) return true
    sentInMemory.add(dedupeKey)
    return false
  }
}

export function sendEvent(
  event: AppEvent,
  itemType?: 'scholarship' | 'program',
  itemId?: number,
  meta?: string,
  /** What the once-per-session dedupe keys on, when that is not the meta. */
  dedupeMeta: string | undefined = meta,
): void {
  try {
    if (shouldSkip(`sa_sent:${event}:${itemType ?? ''}:${itemId ?? ''}:${dedupeMeta ?? ''}`)) return
    const payload = JSON.stringify({ event, itemType, itemId, meta })
    if (navigator.sendBeacon?.('/api/event', payload)) return
    fetch('/api/event', { method: 'POST', body: payload, keepalive: true }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}

/**
 * Send only if the user is still on the page after `dwellMs`; an instant
 * back/misclick isn't a view. Cancelled by navigation (view transition or
 * full unload) before the timer fires. Returns a cancel function.
 */
export function sendEventAfterDwell(
  event: AppEvent,
  itemType?: 'scholarship' | 'program',
  itemId?: number,
  dwellMs = 2500,
  meta?: () => string | undefined,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null }
    document.removeEventListener('astro:before-preparation', cancel)
    window.removeEventListener('pagehide', cancel)
  }
  try {
    timer = setTimeout(() => { cancel(); sendEvent(event, itemType, itemId, meta?.(), '') }, dwellMs)
    document.addEventListener('astro:before-preparation', cancel)
    window.addEventListener('pagehide', cancel)
  } catch { /* never break the page for analytics */ }
  return cancel
}

/** Where an Apply click was made. `mine` is My combo (/saved). */
export type ApplyPlace = 'page' | 'row' | 'quiz' | 'combo' | 'mine'

/**
 * Was this award in the device's My combo when Apply was clicked: `saved` by
 * the student, `starter` only because the starter pack put it there (nobody
 * chose it), or `new`. The question it answers is whether saves turn into
 * applications, which a bare apply_click could not say (2026-10-14).
 */
export function savedState(itemType: 'scholarship' | 'program', itemId: number): 'saved' | 'starter' | 'new' {
  try {
    const ids = itemType === 'program' ? getSavedPrograms() : getSaved()
    if (!ids.includes(itemId)) return 'new'
    return itemType === 'scholarship' && (STARTER_PACK_IDS as readonly number[]).includes(itemId) ? 'starter' : 'saved'
  } catch {
    return 'new'
  }
}

/**
 * apply_click with "place:state" as its meta, say "row:saved". The dedupe
 * still keys on the item alone, so one student clicking Apply on a row and
 * then on its page counts once, as before the meta existed.
 */
export function sendApply(itemType: 'scholarship' | 'program', itemId: number, place: ApplyPlace): void {
  if (!Number.isInteger(itemId) || itemId < 1) return
  sendEvent('apply_click', itemType, itemId, `${place}:${savedState(itemType, itemId)}`, '')
}

/** The device's own calendar day it first opened the site. Never sent. */
const FIRST_SEEN_KEY = 'sa_first_seen'

function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * `back` when this device first opened the site on an earlier day, else
 * `new`. Only the word leaves the device, on a listing view. The day stays in
 * local storage. Called on every page load so the first page sets it.
 * Storage blocked: undefined, and the view goes unlabelled.
 */
export function visitKind(): 'new' | 'back' | undefined {
  try {
    const today = localDay()
    const first = localStorage.getItem(FIRST_SEEN_KEY)
    if (!first || !/^\d{4}-\d{2}-\d{2}$/.test(first) || first > today) {
      localStorage.setItem(FIRST_SEEN_KEY, today)
      return 'new'
    }
    return first < today ? 'back' : 'new'
  } catch {
    return undefined
  }
}

/** Called from the admin panel so the owner's own browsing stops counting. */
export function optOutOfEvents(): void {
  try { localStorage.setItem(OPT_OUT_KEY, '1') } catch { /* ignore */ }
}
