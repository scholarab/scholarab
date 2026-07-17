// Anonymous event counting — fire-and-forget, no cookies, no ids, no payload
// beyond the event name and which item it concerns. Must never break the page.
export type AppEvent = 'detail_view' | 'apply_click' | 'save' | 'quiz_start' | 'quiz_complete' | 'search_empty'

const OPT_OUT_KEY = 'sa_no_track'

// Fallback dedupe when sessionStorage is unavailable (private mode, blocked
// storage). Module-level, so it survives view-transition swaps within a tab.
const sentInMemory = new Set<string>()

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
    return false
  } catch {
    // Storage unavailable — dedupe in memory for the page's lifetime instead
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
): void {
  try {
    if (shouldSkip(`sa_sent:${event}:${itemType ?? ''}:${itemId ?? ''}:${meta ?? ''}`)) return
    const payload = JSON.stringify({ event, itemType, itemId, meta })
    if (navigator.sendBeacon?.('/api/event', payload)) return
    fetch('/api/event', { method: 'POST', body: payload, keepalive: true }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}

/**
 * Send only if the user is still on the page after `dwellMs` — an instant
 * back/misclick isn't a view. Cancelled by navigation (view transition or
 * full unload) before the timer fires. Returns a cancel function.
 */
export function sendEventAfterDwell(
  event: AppEvent,
  itemType?: 'scholarship' | 'program',
  itemId?: number,
  dwellMs = 2500,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) { clearTimeout(timer); timer = null }
    document.removeEventListener('astro:before-preparation', cancel)
    window.removeEventListener('pagehide', cancel)
  }
  try {
    timer = setTimeout(() => { cancel(); sendEvent(event, itemType, itemId) }, dwellMs)
    document.addEventListener('astro:before-preparation', cancel)
    window.addEventListener('pagehide', cancel)
  } catch { /* never break the page for analytics */ }
  return cancel
}

/** Called from the admin panel so the owner's own browsing stops counting. */
export function optOutOfEvents(): void {
  try { localStorage.setItem(OPT_OUT_KEY, '1') } catch { /* ignore */ }
}
