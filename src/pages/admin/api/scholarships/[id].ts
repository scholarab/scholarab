import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'
import { eligibilitySchema } from '../../../../lib/data-loader'
import { logAudit } from '../../../../lib/audit'

export const prerender = false

const httpsUrl = z.string().url().max(2048).refine(u => u.startsWith('https://'), 'URL must use HTTPS')

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
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 })

  const [item] = await db.select().from(scholarships).where(eq(scholarships.id, id))
  if (!item) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  return new Response(JSON.stringify(item), { status: 200 })
}

export const PUT: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!(await checkMutationRateLimit(session.user.id))) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 })

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
      if (!current) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

      const dbTs = new Date(current.updatedAt).getTime()
      const clientTs = new Date(clientUpdatedAt).getTime()
      if (dbTs !== clientTs) {
        return new Response(
          JSON.stringify({ error: 'conflict', message: 'This record was modified by someone else. Please refresh and try again.' }),
          { status: 409 }
        )
      }
    }

    const [updated] = await db
      .update(scholarships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scholarships.id, id))
      .returning()
    if (!updated) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    logAudit(session.user.id, 'UPDATE', 'scholarship', id).catch(() => {})
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), { status: 400 })
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!(await checkMutationRateLimit(session.user.id))) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  const id = parseInt(params.id!, 10)
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 })

  try {
    await db.delete(scholarships).where(eq(scholarships.id, id))
    logAudit(session.user.id, 'DELETE', 'scholarship', id).catch(() => {})
    return new Response(null, { status: 204 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}
