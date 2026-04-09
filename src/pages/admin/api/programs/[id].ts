import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'
import { logAudit } from '../../../../lib/audit'
import { httpsUrl } from '../../../../lib/validators'
import { jsonOk, jsonError } from '../../../../lib/api-response'

export const prerender = false

const UpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  emoji: z.string().max(10).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  provider: z.string().max(200).optional().nullable(),
  grades: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  paid: z.boolean().optional(),
  stipend: z.string().max(200).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  eligibility: z.string().max(10000).optional().nullable(),
  deadline: z.string().max(50).optional().nullable(),
  url: httpsUrl.optional(),
  description: z.string().max(5000).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
  active: z.boolean().optional(),
})

export const GET: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return jsonError('Invalid ID', 400)

  const [item] = await db.select().from(researchPrograms).where(eq(researchPrograms.id, id))
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
        .select({ updatedAt: researchPrograms.updatedAt })
        .from(researchPrograms)
        .where(eq(researchPrograms.id, id))
      if (!current) return jsonError('Not found', 404)

      const dbTs = new Date(current.updatedAt).getTime()
      const clientTs = new Date(clientUpdatedAt).getTime()
      if (dbTs !== clientTs) {
        return jsonOk({ error: 'conflict', message: 'This record was modified by someone else. Please refresh and try again.' }, 409)
      }
    }

    const [updated] = await db
      .update(researchPrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(researchPrograms.id, id))
      .returning()
    if (!updated) return jsonError('Not found', 404)
    logAudit(session.user.id, 'UPDATE', 'program', id).catch(() => {})
    return jsonOk(updated)
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid request data', 400)
    console.error('[PUT /admin/api/programs/:id]', e)
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
    await db.delete(researchPrograms).where(eq(researchPrograms.id, id))
    logAudit(session.user.id, 'DELETE', 'program', id).catch(() => {})
    return new Response(null, { status: 204 })
  } catch (e) {
    console.error('[DELETE /admin/api/programs/:id]', e)
    return jsonError('Internal server error', 500)
  }
}
