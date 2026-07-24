export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { getClientIp, isRateLimited, recordHit } from '../../lib/rate-limit'

// Unsubscribing is a two-step flow on purpose. The link in the email is a GET,
// and mail security stacks (Outlook Safe Links, Proofpoint, Mimecast, corporate
// gateways) fetch every URL in a message to scan it — a GET that deleted would
// unsubscribe people who never clicked, silently. So GET only renders a
// confirmation, and the delete happens on the POST that the button submits.
// The token stays the only credential: no Origin check here, because a blocked
// unsubscribe is worse than a forged one.

// Site palette (see .sabp in global.css) — this page renders outside the Astro
// layout, so the colours are inlined rather than inherited.
const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} — ScholarAB</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
        min-height:100vh;margin:0;background:#FAF7F0;color:#141915}
      .card{text-align:center;padding:2rem;max-width:420px}
      h1{font-size:1.5rem;margin:0 0 .5rem}
      p{color:#5A605B;font-size:.95rem;line-height:1.5}
      a{color:#141915}
      button{font:inherit;font-weight:600;background:#2FD3A0;color:#0B1512;border:0;border-radius:100px;
        padding:12px 28px;cursor:pointer;margin-top:1.25rem}
      button:hover{background:#28BC8E}
      .back{display:inline-block;margin-top:1.5rem;font-size:.9rem}
    </style></head>
    <body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )

const backLink = '<p class="back"><a href="/">← Back to ScholarAB</a></p>'

async function limited(request: Request): Promise<boolean> {
  const ip = getClientIp(request)
  try {
    if (await isRateLimited(`unsub:${ip}`, 10, 15 * 60 * 1000)) return true
    await recordHit(`unsub:${ip}`)
  } catch { /* fail open if rate_limit table not yet migrated */ }
  return false
}

export const GET: APIRoute = async ({ request }) => {
  if (await limited(request)) return new Response('Too many requests — try again later', { status: 429 })

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
     ${backLink}`
  )
}

export const POST: APIRoute = async ({ request }) => {
  if (await limited(request)) return new Response('Too many requests — try again later', { status: 429 })

  const form = await request.formData()
  const token = form.get('token')
  if (typeof token !== 'string' || !token) return new Response('Missing token', { status: 400 })

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
