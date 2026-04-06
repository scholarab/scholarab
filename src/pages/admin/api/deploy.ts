import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db/client'
import { deployLog } from '../../../lib/db/schema'

export const prerender = false

const ALLOWED_ORIGINS = [
  'https://www.scholarab.ca',
  'https://scholarab.ca',
  'http://localhost:4321',
]

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL
  if (!hookUrl) {
    return new Response(JSON.stringify({ error: 'Deploy hook not configured' }), { status: 500 })
  }

  try {
    const response = await fetch(hookUrl, { method: 'POST' })
    const result = await response.json().catch(() => ({}))

    await db.insert(deployLog).values({
      triggeredBy: session.user.email,
      triggerReason: 'Manual publish from admin panel',
      vercelResponse: result,
    })

    return new Response(JSON.stringify({ success: true, ...result }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to trigger deployment' }), { status: 500 })
  }
}
