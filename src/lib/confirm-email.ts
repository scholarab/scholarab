/**
 * The confirmation half of double opt-in. Shared by /api/alert, which sends it
 * the moment someone signs up, and scripts/send-alerts.ts, which sweeps any
 * row the Worker could not mail (no RESEND_API_KEY bound, Resend down) so a
 * sign-up is never silently stranded unconfirmed.
 */
import { listUnsubscribeHeaders, senderIdentityHtml } from './email-identity'

export const CONFIRM_SUBJECT = 'Confirm your ScholarAB deadline reminder'

/**
 * `astro/env/runtime` is imported lazily rather than at the top of the file:
 * scripts/send-alerts.ts pulls confirmEmailHtml() in from plain Node, where
 * that specifier does not resolve. Nothing above this line touches Astro, so
 * the script only ever loads the pure half.
 */
async function env(name: string): Promise<string> {
  let fromAstro: string | undefined
  try {
    const { getEnv } = await import('astro/env/runtime')
    fromAstro = getEnv(name) as string | undefined
  } catch { /* not running inside the Worker */ }
  // `astro check` type-checks this file outside the Astro app graph, where
  // ImportMeta has no `env`; hence the cast rather than a bare
  // `import.meta.env`. Both remaining lookups are for the Node script path.
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return fromAstro ?? viteEnv?.[name] ?? process.env?.[name] ?? ''
}

/**
 * The unsubscribe link that pairs with a confirm link.
 *
 * Derived from the confirm URL rather than passed in, because the two carry
 * the same token; one secret per subscription, and deriving it here makes it
 * impossible for a caller to mail a confirm link and a mismatched opt-out.
 *
 * Why a consent request carries an opt-out at all: under CASL a message asking
 * for consent is itself a commercial electronic message. /api/alert is public
 * JSON and the address is never proved before this is sent, so the recipient
 * may well be someone who did not ask. Giving them a one-click way out, which
 * deletes the unconfirmed row outright; is the honest handling.
 */
function unsubscribeUrlFor(confirmUrl: string): string | undefined {
  try {
    const u = new URL(confirmUrl)
    u.pathname = u.pathname.replace(/\/confirm$/, '/unsubscribe')
    return u.pathname.endsWith('/unsubscribe') ? u.toString() : undefined
  } catch {
    return undefined
  }
}

export function confirmEmailHtml(itemLabel: string, confirmUrl: string, mailingAddress?: string): string {
  const origin = (() => {
    try { return new URL(confirmUrl).origin } catch { return 'https://www.scholarab.ca' }
  })()
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#141915;line-height:1.55">
  <p>Someone (hopefully you) asked ScholarAB to send deadline reminders for <strong>${escapeHtml(itemLabel)}</strong>.</p>
  <p>Confirm and we'll email you 30, 14 and 3 days before it closes.</p>
  <p><a href="${escapeHtml(confirmUrl)}"
        style="display:inline-block;background:#2FD3A0;color:#08120E;font-weight:600;
               text-decoration:none;padding:12px 28px;border-radius:100px">Confirm my reminder</a></p>
  <p style="color:#5A605B;font-size:14px">If this wasn't you, ignore this email.
  We store your address only to send these reminders, and
  <a href="${escapeHtml(origin)}/privacy/" style="color:#0c8060">explain exactly what we keep</a>.</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
  ${senderIdentityHtml({
    mailingAddress,
    unsubscribeUrl: unsubscribeUrlFor(confirmUrl),
    siteUrl: origin,
  })}
  </body></html>`
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Returns false when there is nothing to send with, rather than throwing: a
 * missing key must not turn a sign-up into a 500. The caller records whether
 * the mail went out so the daily sweep can try again.
 */
export async function sendConfirmEmail(to: string, itemLabel: string, confirmUrl: string): Promise<boolean> {
  const key = await env('RESEND_API_KEY')
  if (!key) return false
  const from = (await env('ALERT_FROM_EMAIL')) || 'ScholarAB <alerts@scholarab.ca>'
  const replyTo = (await env('ALERT_REPLY_TO')) || 'contact.scholarab@gmail.com'
  const mailingAddress = await env('ALERT_MAILING_ADDRESS')
  // Same token, same URL the footer link uses; see unsubscribeUrlFor.
  const unsubscribeUrl = unsubscribeUrlFor(confirmUrl)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: replyTo,
        subject: CONFIRM_SUBJECT,
        html: confirmEmailHtml(itemLabel, confirmUrl, mailingAddress),
        headers: listUnsubscribeHeaders(unsubscribeUrl),
      }),
    })
    if (!res.ok) {
      console.error('[confirm] Resend', res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('[confirm] send failed:', e)
    return false
  }
}
