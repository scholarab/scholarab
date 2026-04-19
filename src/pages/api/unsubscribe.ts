export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'

export const GET: APIRoute = async ({ request }) => {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  await db.delete(subscribers).where(eq(subscribers.token, token))

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unsubscribed — ScholarAB</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff}
    .card{text-align:center;padding:2rem;max-width:400px}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#888;font-size:.9rem}
    a{color:#22d3a5;text-decoration:none}</style></head>
    <body><div class="card"><h1>Unsubscribed</h1>
    <p>You won't receive any more deadline reminders for this scholarship.</p>
    <p style="margin-top:1.5rem"><a href="/">← Back to ScholarAB</a></p>
    </div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
