export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { confirmationRecipients, subscribers } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { recipientKey } from '../../lib/mail-delivery'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'
import { reminderPage as page, reminderBackLink as backLink, reminderError, escapeAttr } from '../../lib/reminder-page'

// Unsubscribing is a two-step flow on purpose. The link in the email is a GET,
// and mail security stacks (Outlook Safe Links, Proofpoint, Mimecast, corporate
// gateways) fetch every URL in a message to scan it; a GET that deleted would
// unsubscribe people who never clicked, silently. So GET only renders a
// confirmation, and the delete happens on the POST that the button submits.
// The token stays the only credential: no Origin check here, because a blocked
// unsubscribe is worse than a forged one.

async function limited(request: Request): Promise<boolean> {
  const ip = getClientIp(request)
  try {
    if (await hitRateLimit(`unsub:${ip}`, 10, 15 * 60 * 1000)) return true
  } catch (e) {
    // Fail open if the rate_limit table isn't migrated yet, but say so, or
    // the limiter can stop working here and nothing anywhere reports it.
    console.error('[rate-limit] unsubscribe check failed, allowing request:', e)
  }
  return false
}

export const GET: APIRoute = async ({ request }) => {
  if (await limited(request)) return reminderError('rate-limit')

  const token = new URL(request.url).searchParams.get('token')
  if (!token) return reminderError('missing-token')

  // Nothing is deleted here, so an automated prefetch of this URL is harmless.
  return page(
    'Unsubscribe',
    `<h1>Unsubscribe?</h1>
     <p>You'll stop receiving emails for this deadline.</p>
     <form method="post">
       <input type="hidden" name="token" value="${escapeAttr(token)}">
       <button type="submit">Yes, unsubscribe me</button>
     </form>
     <form method="post">
       <input type="hidden" name="token" value="${escapeAttr(token)}">
       <input type="hidden" name="scope" value="all">
       <button type="submit" class="secondary">Delete all my data</button>
     </form>
     <p class="fine">"Delete all my data" removes every reminder set up with this
     email address, the address itself, and its confirmation-email fingerprint.
     See the <a href="/privacy/">privacy policy</a> for other collection and retention details.</p>
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  if (await limited(request)) return reminderError('rate-limit')

  // The button posts a form; Gmail's and Yahoo's one-click unsubscribe posts
  // `List-Unsubscribe=One-Click` and no fields at all, so the token has to be
  // readable from the query string too. That does not reopen the prefetch hole
  // the two-step flow exists to close: mail security scanners fetch URLs, they
  // do not POST to them, and RFC 8058 requires that this POST unsubscribe
  // without any further interaction.
  let form: FormData
  try { form = await request.formData() } catch { form = new FormData() }
  const token = form.get('token') ?? new URL(request.url).searchParams.get('token')
  if (typeof token !== 'string' || !token) return reminderError('missing-token')

  // "Delete all my data"; the PIPEDA erasure path. The token is what proves
  // ownership of the address: it only ever reached the person who can read
  // that inbox. So no second confirmation email is needed, and no endpoint
  // takes a bare address, which would let anyone wipe anyone's reminders and
  // double as a test for whether an address is on the list.
  //
  // Read-then-delete rather than a subquery: the Neon HTTP driver has no
  // transactions, and a `delete ... where email = (select email where token
  // = ...)` cannot see its own row disappear mid-statement anyway. Worst case
  // between the two is a concurrent second click, which deletes nothing more.
  // The confirmation throttle's hash of the address goes first: if the second
  // delete then fails, the token still works and a retry finishes the job.
  if (form.get('scope') === 'all') {
    const [row] = await db.select({ email: subscribers.email })
      .from(subscribers).where(eq(subscribers.token, token)).limit(1)
    if (row?.email) {
      await db.delete(confirmationRecipients).where(eq(confirmationRecipients.key, await recipientKey(row.email)))
      await db.delete(subscribers).where(eq(subscribers.email, row.email))
    }
    // Same page whether or not the token matched; see below.
    return page(
      'Deleted',
      `<h1>Deleted</h1>
       <p>Every reminder set up with that email address, the address itself, and
       its confirmation-email fingerprint have been deleted.</p>
       ${backLink}`
    )
  }

  await db.delete(subscribers).where(eq(subscribers.token, token))

  // Same response whether or not the token matched, so this can't be used to
  // probe which tokens are live.
  return page(
    'Unsubscribed',
    `<h1>Unsubscribed</h1>
     <p>You won't receive any more emails for this deadline.</p>
     ${backLink}`
  )
}
