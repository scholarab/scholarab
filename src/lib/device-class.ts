// Phone, tablet or computer, from the request headers /api/event already
// receives. Only this word is stored, never the user agent (2026-10-14,
// Ilia: whether a student was on a phone or a computer is "pretty important").
export type DeviceClass = 'phone' | 'tablet' | 'computer'

const TABLET = /ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i
const PHONE = /mobi|iphone|ipod|android|windows phone/i

/**
 * Sec-CH-UA-Mobile is Chromium's own answer and wins when sent. Otherwise the
 * user agent decides, tablets first, because an Android tablet says Android
 * without Mobile. iPads since iPadOS 13 present as a Mac, so they count as a
 * computer. The server cannot tell them apart.
 */
export function deviceClass(userAgent: string, chMobile?: string | null): DeviceClass {
  if (chMobile === '?1') return 'phone'
  if (TABLET.test(userAgent)) return 'tablet'
  if (PHONE.test(userAgent)) return 'phone'
  return 'computer'
}
