export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq, and, or, gt, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import catalogue from '../../data/runtime-catalogue.json'
import { PENDING_CONFIRM_DAYS } from '../../lib/mail-delivery'
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

// A student who saves two awards a few minutes apart gets one confirmation
// email, because claimRecipient allows one per address per 15 minutes. The
// token proves the person reads that inbox, the same proof "Delete all my
// data" acts on, so the confirm page lists every sign-up still waiting for the
// address and one click turns on exactly the ones it listed. Listing them is
// what keeps it consent: a sign-up someone else typed this address into is
// shown by name before anything is switched on.
const MAX_LISTED = 25
const recent = () => gt(subscribers.createdAt, sql`now() - make_interval(days => ${PENDING_CONFIRM_DAYS})`)

function listingName(itemType: string, itemId: number): string | null {
  const item = itemType === 'program'
    ? catalogue.programs.find(x => x.id === itemId)
    : catalogue.scholarships.find(x => x.id === itemId)
  if (!item) return null
  return 'title' in item ? item.title : item.name
}

/** Every sign-up waiting on this token's address, the emailed one first. A
 * listing that has since been removed has nothing to switch on, so it is left
 * out of the list (the token's own row still confirms). */
async function waiting(token: string): Promise<{ id: number; name: string; own: boolean }[]> {
  const mine = alias(subscribers, 'mine')
  const own = sql<boolean>`${subscribers.id} = ${mine.id}`
  const rows = await db.select({ id: subscribers.id, itemType: subscribers.itemType, itemId: subscribers.itemId, own })
    .from(subscribers)
    .innerJoin(mine, eq(mine.email, subscribers.email))
    .where(and(eq(mine.token, token), isNull(subscribers.confirmedAt), or(own, recent())))
    .orderBy(sql`${own} desc`, subscribers.createdAt, subscribers.id)
    .limit(MAX_LISTED + 1)
  return rows.flatMap(r => {
    const name = listingName(r.itemType, r.itemId)
    return name ? [{ id: r.id, name, own: r.own }] : []
  })
}

export const GET: APIRoute = async ({ request }) => {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return reminderError('missing-token')

  // Nothing is written here, so a scanner prefetching this URL confirms nobody.
  // A failed lookup still offers the button for the emailed reminder.
  let picks: { id: number; name: string; own: boolean }[] = []
  try { picks = await waiting(token) } catch { /* the one reminder still confirms */ }
  const others = picks.filter(p => !p.own)

  const hidden = `<input type="hidden" name="token" value="${escapeAttr(token)}">`
  if (others.length === 0) return page(
    'Confirm reminder',
    `<h1>Confirm your reminder</h1>
     <p>We'll use the reminder schedule shown in your confirmation email.</p>
     <form method="post">
       ${hidden}
       <button type="submit">Yes, remind me</button>
     </form>
     ${backLink}`
  )

  // The emailed one can already be on, leaving a single other to list
  const one = picks.length === 1
  return page(
    one ? 'Confirm reminder' : 'Confirm reminders',
    `<h1>${one ? 'Confirm your reminder' : 'Confirm your reminders'}</h1>
     <p>${one ? 'You picked this with the same email address.' : 'You picked these with this email address. One click turns on reminders for all of them.'}</p>
     <ul class="picks">${picks.map(p => `<li>${escapeAttr(p.name)}</li>`).join('')}</ul>
     <p>${one ? 'It keeps the reminder schedule you chose for it.' : 'Each one keeps the reminder schedule you chose for it.'}</p>
     <form method="post">
       ${hidden}
       ${others.map(o => `<input type="hidden" name="also" value="${o.id}">`).join('')}
       <button type="submit">${one ? 'Yes, remind me' : `Yes, remind me about all ${picks.length}`}</button>
     </form>
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  let form: FormData
  try { form = await request.formData() } catch { return reminderError('invalid-form') }
  const token = form.get('token')
  if (typeof token !== 'string' || !token) return reminderError('missing-token')

  // The waiting sign-ups the page listed. Only ids that belong to this token's
  // address and are still waiting count, so a forged list switches on nothing
  // that the token's owner could not have confirmed from their own page.
  const also = [...new Set(form.getAll('also').map(Number))]
    .filter(id => Number.isInteger(id) && id > 0)
    .slice(0, MAX_LISTED)
  const sameAddress = sql`${subscribers.email} = (select mine.email from ${subscribers} mine where mine.token = ${token})`

  // Only ever sets the timestamp on a row that has none, so clicking the link
  // in an old email a second time cannot move the consent date forward.
  // One statement, since the Neon HTTP driver has no transactions.
  await db.update(subscribers)
    .set({ confirmedAt: sql`now()` })
    .where(and(isNull(subscribers.confirmedAt), also.length === 0
      ? eq(subscribers.token, token)
      : or(eq(subscribers.token, token), and(inArray(subscribers.id, also), recent(), sameAddress))))

  // Same response whether or not the token matched anything, so this can't be
  // used to probe which tokens are live.
  return page(
    'Confirmed',
    `<h1>You're all set</h1>
     <p>Your selected reminders are now enabled. We'll email you at the upcoming milestones you chose.</p>
     ${backLink}`
  )
}
