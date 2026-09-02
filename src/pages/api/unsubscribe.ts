export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'

// Unsubscribing is a two-step flow on purpose. The link in the email is a GET,
// and mail security stacks (Outlook Safe Links, Proofpoint, Mimecast, corporate
// gateways) fetch every URL in a message to scan it; a GET that deleted would
// unsubscribe people who never clicked, silently. So GET only renders a
// confirmation, and the delete happens on the POST that the button submits.
// The token stays the only credential: no Origin check here, because a blocked
// unsubscribe is worse than a forged one.

// Site palette (see .sabp in global.css); this page renders outside the Astro
// layout, so the colours are inlined rather than inherited.
const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}; ScholarAB</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
        min-height:100vh;margin:0;background:#FBF8F2;color:#141915}
      .card{text-align:center;padding:2rem;max-width:420px}
      h1{font-size:1.5rem;margin:0 0 .5rem}
      p{color:#5A605B;font-size:.95rem;line-height:1.5}
      a{color:#141915}
      button{font:inherit;font-weight:600;background:#2FD3A0;color:#08120E;border:0;border-radius:100px;
        padding:12px 28px;cursor:pointer;margin-top:1.25rem}
      button:hover{background:#28BC8E}
      button.secondary{background:transparent;color:#5A605B;border:1px solid #d8d4c8;font-weight:500;
        padding:10px 22px;margin-top:.75rem}
      button.secondary:hover{background:#F2EFE6;color:#141915}
      .fine{font-size:.8rem;color:#8A8F8B;margin-top:1rem}
      .fine a{color:#8A8F8B}
      .back{display:inline-block;margin-top:1.5rem;font-size:.9rem}
    </style></head>
    <body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )

const backLink = '<p class="back"><a href="/">← Back to ScholarAB</a></p>'

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
  if (await limited(request)) return new Response('Too many requests; try again later', { status: 429 })

  const token = new URL(request.url).searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  // Nothing is deleted here, so an automated prefetch of this URL is harmless.
  return page(
    'Unsubscribe',
    `<h1>Unsubscribe?</h1>
     <p>You'll stop receiving deadline reminders for this scholarship.</p>
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
     email address and erases the address itself. Nothing else about you is
     stored; see the <a href="/privacy/">privacy policy</a>.</p>
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  if (await limited(request)) return new Response('Too many requests; try again later', { status: 429 })

  // The button posts a form; Gmail's and Yahoo's one-click unsubscribe posts
  // `List-Unsubscribe=One-Click` and no fields at all, so the token has to be
  // readable from the query string too. That does not reopen the prefetch hole
  // the two-step flow exists to close: mail security scanners fetch URLs, they
  // do not POST to them, and RFC 8058 requires that this POST unsubscribe
  // without any further interaction.
  let form: FormData
  try { form = await request.formData() } catch { form = new FormData() }
  const token = form.get('token') ?? new URL(request.url).searchParams.get('token')
  if (typeof token !== 'string' || !token) return new Response('Missing token', { status: 400 })

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
  if (form.get('scope') === 'all') {
    const [row] = await db.select({ email: subscribers.email })
      .from(subscribers).where(eq(subscribers.token, token)).limit(1)
    if (row?.email) await db.delete(subscribers).where(eq(subscribers.email, row.email))
    // Same page whether or not the token matched; see below.
    return page(
      'Deleted',
      `<h1>Deleted</h1>
       <p>Every reminder set up with that email address is gone, and so is the
       address. Nothing of yours is left on our side.</p>
       ${backLink}`
    )
  }

  await db.delete(subscribers).where(eq(subscribers.token, token))

  // Same response whether or not the token matched, so this can't be used to
  // probe which tokens are live.
  return page(
    'Unsubscribed',
    `<h1>Unsubscribed</h1>
     <p>You won't receive any more deadline reminders for this scholarship.</p>
     ${backLink}`
  )
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
