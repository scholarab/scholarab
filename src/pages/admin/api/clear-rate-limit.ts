import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db/client'
import { authRateLimit } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { jsonOk, jsonError } from '../../../lib/api-response'

export const prerender = false

const Schema = z.object({ ip: z.string().min(1).max(100) })

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)

  try {
    const body = await request.json()
    const { ip } = Schema.parse(body)
    await db.delete(authRateLimit).where(eq(authRateLimit.ip, ip))
    return jsonOk({ cleared: true })
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid request data', 400)
    console.error('[POST /admin/api/clear-rate-limit]', e)
    return jsonError('Internal server error', 500)
  }
}
