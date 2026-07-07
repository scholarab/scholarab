// Anonymous event counting — fire-and-forget, no cookies, no ids, no payload
// beyond the event name and which item it concerns. Must never break the page.
export type AppEvent = 'apply_click' | 'save' | 'quiz_complete' | 'search_empty'

export function sendEvent(
  event: AppEvent,
  itemType?: 'scholarship' | 'program',
  itemId?: number,
  meta?: string,
): void {
  try {
    const payload = JSON.stringify({ event, itemType, itemId, meta })
    if (navigator.sendBeacon?.('/api/event', payload)) return
    fetch('/api/event', { method: 'POST', body: payload, keepalive: true }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}
