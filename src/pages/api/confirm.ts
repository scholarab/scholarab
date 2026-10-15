export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { reminderPage as page, reminderBackLink as backLink, reminderError, escapeAttr } from '../../lib/reminder-page'

// The confirm half of double opt-in. Two steps, for the same reason
// /api/unsubscribe is: mail security stacks (Outlook Safe Links, Proofpoint,
// Mimecast) fetch every URL in a message to scan it. A GET that confirmed
// would let the recipient's own mail gateway supply the consent, which is
// precisely the thing double opt-in exists to obtain from a human. So GET
// renders a button and POST is what actually records consent.
//
// The token is the only credential, and it is the same token the unsubscribe
// link already carries; one secret per subscription, not two.

// No per-IP cap. The 48-character random token cannot be guessed, so a cap
// guarded nothing, and it refused a class confirming from one school address
// (each link counts twice, page then button: 5 students per 15 minutes).

export const GET: APIRoute = async ({ request }) => {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return reminderError('missing-token')

  // Nothing is written here, so a scanner prefetching this URL confirms nobody.
  return page(
    'Confirm reminder',
    `<h1>Confirm your reminder</h1>
     <p>We'll use the reminder schedule shown in your confirmation email.</p>
     <form method="post">
       <input type="hidden" name="token" value="${escapeAttr(token)}">
       <button type="submit">Yes, remind me</button>
     </form>
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  let form: FormData
  try { form = await request.formData() } catch { return reminderError('invalid-form') }
  const token = form.get('token')
  if (typeof token !== 'string' || !token) return reminderError('missing-token')

  // Only ever sets the timestamp on a row that has none, so clicking the link
  // in an old email a second time cannot move the consent date forward.
  await db.update(subscribers)
    .set({ confirmedAt: sql`now()` })
    .where(and(eq(subscribers.token, token), isNull(subscribers.confirmedAt)))

  // Same response whether or not the token matched anything, so this can't be
  // used to probe which tokens are live.
  return page(
    'Confirmed',
    `<h1>You're all set</h1>
     <p>Your selected reminders are now enabled. We'll email you at the upcoming milestones you chose.</p>
     ${backLink}`
  )
}
