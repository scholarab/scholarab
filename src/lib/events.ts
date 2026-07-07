// Anonymous event counting — fire-and-forget, no cookies, no ids, no payload
// beyond the event name and which item it concerns. Must never break the page.
export type AppEvent = 'detail_view' | 'apply_click' | 'save' | 'quiz_complete' | 'search_empty'

const OPT_OUT_KEY = 'sa_no_track'

function shouldSkip(dedupeKey: string): boolean {
  // Dev server writes to the production table via .env.local — never count it
  if (import.meta.env.MODE === 'development') return true
  // Automated browsers (Playwright, etc.)
  if (navigator.webdriver) return true
  try {
    // Admin opt-out flag (set automatically by the admin panel)
    if (localStorage.getItem(OPT_OUT_KEY)) return true
    // Once per tab session per event+item: counts become "people who did X",
    // not "times X happened"
    if (sessionStorage.getItem(dedupeKey)) return true
    sessionStorage.setItem(dedupeKey, '1')
  } catch { /* storage unavailable (private mode) — send anyway */ }
  return false
}

export function sendEvent(
  event: AppEvent,
  itemType?: 'scholarship' | 'program',
  itemId?: number,
  meta?: string,
): void {
  try {
    if (shouldSkip(`sa_sent:${event}:${itemType ?? ''}:${itemId ?? ''}:${meta ?? ''}`)) return
    const payload = JSON.stringify({ event, itemType, itemId, meta })
    if (navigator.sendBeacon?.('/api/event', payload)) return
    fetch('/api/event', { method: 'POST', body: payload, keepalive: true }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}

/** Called from the admin panel so the owner's own browsing stops counting. */
export function optOutOfEvents(): void {
  try { localStorage.setItem(OPT_OUT_KEY, '1') } catch { /* ignore */ }
}
