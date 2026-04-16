import type { APIRoute } from 'astro'
import { getEnv } from 'astro/env/runtime'
import { isAdminRequest } from '../../../lib/adminAuth'
import { db } from '../../../lib/db/client'
import { deployLog } from '../../../lib/db/schema'
import { jsonOk, jsonError } from '../../../lib/api-response'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)

  const hookUrl = getEnv('DEPLOY_HOOK_URL') ?? import.meta.env.DEPLOY_HOOK_URL ?? process.env.DEPLOY_HOOK_URL
  if (!hookUrl) return jsonError('Deploy hook not configured', 500)

  try {
    const response = await fetch(hookUrl, { method: 'POST' })
    const result = await response.json().catch(() => ({}))
    await db.insert(deployLog).values({
      triggeredBy: 'admin',
      triggerReason: 'Manual publish from admin panel',
      deployResponse: result,
    })
    return jsonOk({ success: true, ...result })
  } catch {
    return jsonError('Failed to trigger deployment', 500)
  }
}
