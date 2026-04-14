import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db/client'
import { deployLog } from '../../../lib/db/schema'
import { jsonOk, jsonError } from '../../../lib/api-response'

export const prerender = false

const ALLOWED_ORIGINS = [
  'https://www.scholarab.ca',
  'https://scholarab.ca',
  'http://localhost:4321',
]

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return jsonError('Forbidden', 403)

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)

  const hookUrl = (import.meta as unknown as Record<string, Record<string, string>>).env?.DEPLOY_HOOK_URL ?? process.env.DEPLOY_HOOK_URL
  if (!hookUrl) return jsonError('Deploy hook not configured', 500)

  try {
    const response = await fetch(hookUrl, { method: 'POST' })
    const result = await response.json().catch(() => ({}))

    await db.insert(deployLog).values({
      triggeredBy: session.user.email,
      triggerReason: 'Manual publish from admin panel',
      deployResponse: result,
    })

    return jsonOk({ success: true, ...result })
  } catch {
    return jsonError('Failed to trigger deployment', 500)
  }
}
