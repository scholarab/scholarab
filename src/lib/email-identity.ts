/**
 * The sender-identification block CASL requires at the foot of every
 * commercial electronic message.
 *
 * s.6(2) wants three things in the message itself: who is sending it, a
 * mailing address, and at least one other way to reach them that stays valid
 * for 60 days. s.6(2)(c) wants an unsubscribe mechanism that is "readily
 * performed" and honoured within 10 business days.
 *
 * Shared by scripts/send-alerts.ts (plain Node) and src/lib/confirm-email.ts
 * (the Worker), so nothing in here may import from Astro or from the database.
 */

/**
 * Where mail to ScholarAB goes.
 *
 * A municipality is what the site has always published (see the footer in
 * SabFooter.astro) and it is truthful, but where CASL's identification rules
 * apply they mean a *postal* address; a street or PO box.
 *
 * Decided 2026-08-22, after pricing PO boxes and virtual mailboxes: ScholarAB
 * is not renting one. The position is that these messages are not commercial
 * electronic messages at all; the site sells nothing, carries no ads, takes
 * no commissions and has no revenue, and a deadline reminder the recipient
 * asked for encourages participation in no commercial activity. That is an
 * argument rather than a certainty, so it is recorded here and, at more
 * length, in docs/compliance.md, which is tracked; outreach/outreach_plan.md
 * has the same reasoning but is gitignored, so it is not where this belongs.
 *
 * The position depends entirely on the site staying non-monetized. If an
 * affiliate link, sponsor or paid placement ever lands, this stops being
 * defensible: get a real address and set ALERT_MAILING_ADDRESS, which still
 * overrides this fallback without a code change.
 */
export const DEFAULT_MAILING_ADDRESS = 'Medicine Hat, Alberta, Canada'

export const SENDER_NAME = 'ScholarAB'
export const SENDER_CONTACT_EMAIL = 'contact.scholarab@gmail.com'

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The footer block. `unsubscribeUrl` is optional only because a message can
 * legitimately have no subscription behind it yet, but every message this
 * codebase sends does have one, so in practice it is always supplied.
 */
export function senderIdentityHtml(opts: {
  mailingAddress?: string
  unsubscribeUrl?: string
  siteUrl: string
  /** Prepended above the identification, e.g. how the recipient got here. */
  preamble?: string
}): string {
  const address = escape(opts.mailingAddress || DEFAULT_MAILING_ADDRESS)
  const site = escape(opts.siteUrl)
  const parts: string[] = []
  if (opts.preamble) parts.push(opts.preamble)
  parts.push(
    `${escape(SENDER_NAME)} · ${address} · ` +
    `<a href="${site}" style="color:#0c8060;text-decoration:none">${site.replace(/^https?:\/\//, '')}</a> · ` +
    `<a href="mailto:${escape(SENDER_CONTACT_EMAIL)}" style="color:#0c8060;text-decoration:none">${escape(SENDER_CONTACT_EMAIL)}</a>`
  )
  if (opts.unsubscribeUrl)
    parts.push(`<a href="${escape(opts.unsubscribeUrl)}" style="color:#aaa">Unsubscribe</a>`)

  return `<p style="margin:0;font-size:12px;line-height:1.6;color:#aaa">${parts.join('<br>')}</p>`
}

/**
 * RFC 8058 one-click unsubscribe headers.
 *
 * Not a legal requirement; CASL is satisfied by the visible link in the
 * footer. This is deliverability: Gmail and Yahoo's bulk-sender rules expect
 * one-click above 5,000 messages a day, and mailbox providers weigh the
 * header well below that threshold when deciding whether a small sender is
 * legitimate. A reminder that lands in spam is a reminder that never arrives.
 *
 * `List-Unsubscribe-Post` is only sent alongside the URL form, never with a
 * bare mailto, because it promises the receiving provider that an unattended
 * POST to that URL will unsubscribe with no further interaction. /api/unsubscribe
 * honours that by reading the token from the query string when the one-click
 * body carries no form field; see the POST handler there. Both headers are
 * omitted entirely when there is no subscription URL, since a provider that
 * POSTs to nothing marks the attempt as failed.
 */
export function listUnsubscribeHeaders(unsubscribeUrl?: string): Record<string, string> {
  if (!unsubscribeUrl) return {}
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${SENDER_CONTACT_EMAIL}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
