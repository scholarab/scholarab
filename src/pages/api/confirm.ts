export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { getClientIp, hitRateLimit } from '../../lib/rate-limit'

// The confirm half of double opt-in. Two steps, for the same reason
// /api/unsubscribe is: mail security stacks (Outlook Safe Links, Proofpoint,
// Mimecast) fetch every URL in a message to scan it. A GET that confirmed
// would let the recipient's own mail gateway supply the consent, which is
// precisely the thing double opt-in exists to obtain from a human. So GET
// renders a button and POST is what actually records consent.
//
// The token is the only credential, and it is the same token the unsubscribe
// link already carries; one secret per subscription, not two.

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
      .back{display:inline-block;margin-top:1.5rem;font-size:.9rem}
    </style></head>
    <body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )

const backLink = '<p class="back"><a href="/">← Back to ScholarAB</a></p>'

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function limited(request: Request): Promise<boolean> {
  const ip = getClientIp(request)
  try {
    if (await hitRateLimit(`confirm:${ip}`, 10, 15 * 60 * 1000)) return true
  } catch (e) {
    console.error('[rate-limit] confirm check failed, allowing request:', e)
  }
  return false
}

export const GET: APIRoute = async ({ request }) => {
  if (await limited(request)) return new Response('Too many requests; try again later', { status: 429 })

  const token = new URL(request.url).searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  // Nothing is written here, so a scanner prefetching this URL confirms nobody.
  return page(
    'Confirm reminder',
    `<h1>Confirm your reminder</h1>
     <p>We'll email you 30, 14 and 3 days before this deadline.</p>
     <form method="post">
       <input type="hidden" name="token" value="${escapeAttr(token)}">
       <button type="submit">Yes, remind me</button>
     </form>
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  if (await limited(request)) return new Response('Too many requests; try again later', { status: 429 })

  const form = await request.formData()
  const token = form.get('token')
  if (typeof token !== 'string' || !token) return new Response('Missing token', { status: 400 })

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
     <p>We'll send your first reminder 30 days before the deadline, or sooner if
     it's closer than that already.</p>
     ${backLink}`
  )
}
