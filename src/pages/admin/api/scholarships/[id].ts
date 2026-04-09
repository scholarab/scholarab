import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'
import { eligibilitySchema } from '../../../../lib/data-loader'
import { logAudit } from '../../../../lib/audit'
import { httpsUrl } from '../../../../lib/validators'
import { jsonOk, jsonError } from '../../../../lib/api-response'

export const prerender = false

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  amount: z.string().min(1).max(100).optional(),
  deadline: z.string().max(50).optional().nullable(),
  openDate: z.string().max(50).optional().nullable(),
  audience: z.string().max(5000).optional().nullable(),
  url: httpsUrl.optional(),
  category: z.string().max(100).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  applyViaGuidance: z.boolean().optional(),
  active: z.boolean().optional(),
  eligibility: eligibilitySchema.optional().nullable(),
})

export const GET: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return jsonError('Invalid ID', 400)

  const [item] = await db.select().from(scholarships).where(eq(scholarships.id, id))
  if (!item) return jsonError('Not found', 404)
  return jsonOk(item)
}

export const PUT: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)
  if (!(await checkMutationRateLimit(session.user.id))) return jsonError('Rate limit exceeded', 429)

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return jsonError('Invalid ID', 400)

  try {
    const body = await request.json()
    const { updatedAt: clientUpdatedAt, ...rest } = body
    const data = UpdateSchema.parse(rest)

    // Optimistic locking: check if record was modified since client loaded it
    if (clientUpdatedAt) {
      const [current] = await db
        .select({ updatedAt: scholarships.updatedAt })
        .from(scholarships)
        .where(eq(scholarships.id, id))
      if (!current) return jsonError('Not found', 404)

      const dbTs = new Date(current.updatedAt).getTime()
      const clientTs = new Date(clientUpdatedAt).getTime()
      if (dbTs !== clientTs) {
        return jsonOk({ error: 'conflict', message: 'This record was modified by someone else. Please refresh and try again.' }, 409)
      }
    }

    const [updated] = await db
      .update(scholarships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scholarships.id, id))
      .returning()
    if (!updated) return jsonError('Not found', 404)
    logAudit(session.user.id, 'UPDATE', 'scholarship', id).catch(() => {})
    return jsonOk(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid request data', 400)
    console.error('[PUT /admin/api/scholarships/:id]', e)
    return jsonError('Internal server error', 500)
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)
  if (!(await checkMutationRateLimit(session.user.id))) return jsonError('Rate limit exceeded', 429)

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return jsonError('Invalid ID', 400)

  try {
    await db.delete(scholarships).where(eq(scholarships.id, id))
    logAudit(session.user.id, 'DELETE', 'scholarship', id).catch(() => {})
    return new Response(null, { status: 204 })
  } catch (e) {
    console.error('[DELETE /admin/api/scholarships/:id]', e)
    return jsonError('Internal server error', 500)
  }
}
