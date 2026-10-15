export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { confirmationRecipients, events, subscribers } from '../../lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { recipientKey } from '../../lib/mail-delivery'
import { reminderPage as page, reminderBackLink as backLink, reminderError, escapeAttr } from '../../lib/reminder-page'

// Unsubscribing is a two-step flow on purpose. The link in the email is a GET,
// and mail security stacks (Outlook Safe Links, Proofpoint, Mimecast, corporate
// gateways) fetch every URL in a message to scan it; a GET that deleted would
// unsubscribe people who never clicked, silently. So GET only renders a
// confirmation, and the delete happens on the POST that the button submits.
// The token stays the only credential: no Origin check here, because a blocked
// unsubscribe is worse than a forged one.

// No per-IP cap. The 48-character random token cannot be guessed, so a cap
// guarded nothing, and it refused a class confirming from one school address
// (each link counts twice, page then button: 5 students per 15 minutes).

// An anonymous count of who leaves, written here because the deleted row
// leaves nothing behind to count. No address, token or id: only how they left
// (the button, Gmail's or Yahoo's one-click, or Delete all my data) and, for a
// single deadline, which listing it was. Failure never blocks the unsubscribe.
async function countUnsubscribe(how: 'button' | 'oneclick' | 'all', item?: { itemType: string; itemId: number }) {
  try {
    await db.insert(events).values({ event: 'unsubscribe', meta: how, itemType: item?.itemType ?? null, itemId: item?.itemId ?? null })
  } catch (e) {
    console.error('[unsubscribe] count failed:', e instanceof Error ? e.message : 'unknown')
  }
}

// A bundled reminder (several due the same day for one address) links here
// with scope=all and up to three tokens, so the link still works after one of
// those reminders is stopped on its own. More than three are ignored.
function tokensFrom(values: readonly (string | File)[]): string[] {
  return values.filter((t): t is string => typeof t === 'string' && t !== '').slice(0, 3)
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const tokens = tokensFrom(url.searchParams.getAll('token'))
  const token = tokens[0]
  if (!token) return reminderError('missing-token')

  // Nothing is deleted here, so an automated prefetch of this URL is harmless.
  if (url.searchParams.get('scope') === 'all') return page(
    'Unsubscribe',
    `<h1>Stop all your reminders?</h1>
     <p>You'll stop receiving every ScholarAB reminder sent to this address.</p>
     <form method="post">
       ${tokens.map(t => `<input type="hidden" name="token" value="${escapeAttr(t)}">`).join('')}
       <input type="hidden" name="scope" value="all">
       <button type="submit">Yes, stop them all</button>
     </form>
     <p class="fine">This removes every reminder set up with this email address, the
     address itself, and its confirmation-email fingerprint. See the
     <a href="/privacy/">privacy policy</a> for other collection and retention details.</p>
     ${backLink}`
  )
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
  // The button posts a form; Gmail's and Yahoo's one-click unsubscribe posts
  // `List-Unsubscribe=One-Click` and no fields at all, so the token has to be
  // readable from the query string too. That does not reopen the prefetch hole
  // the two-step flow exists to close: mail security scanners fetch URLs, they
  // do not POST to them, and RFC 8058 requires that this POST unsubscribe
  // without any further interaction.
  let form: FormData
  try { form = await request.formData() } catch { form = new FormData() }
  const query = new URL(request.url).searchParams
  const token = form.get('token') ?? query.get('token')
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
  //
  // A bundled reminder asks for this in its query string, because a one-click
  // post carries no fields of its own.
  if ((form.get('scope') ?? query.get('scope')) === 'all') {
    const posted = form.getAll('token')
    const tokens = tokensFrom(posted.length ? posted : query.getAll('token'))
    const [row] = await db.select({ email: subscribers.email })
      .from(subscribers).where(inArray(subscribers.token, tokens)).limit(1)
    if (row?.email) {
      await db.delete(confirmationRecipients).where(eq(confirmationRecipients.key, await recipientKey(row.email)))
      await db.delete(subscribers).where(eq(subscribers.email, row.email))
      await countUnsubscribe('all')
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

  const [gone] = await db.delete(subscribers).where(eq(subscribers.token, token))
    .returning({ itemType: subscribers.itemType, itemId: subscribers.itemId })
  if (gone) await countUnsubscribe(form.get('List-Unsubscribe') === 'One-Click' ? 'oneclick' : 'button', gone)

  // Same response whether or not the token matched, so this can't be used to
  // probe which tokens are live.
  return page(
    'Unsubscribed',
    `<h1>Unsubscribed</h1>
     <p>You won't receive any more emails for this deadline.</p>
     ${backLink}`
  )
}
