import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'

export const prerender = false

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  amount: z.string().min(1).optional(),
  deadline: z.string().optional().nullable(),
  openDate: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  url: z.string().url().optional(),
  category: z.string().optional().nullable(),
  lastVerified: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  applyViaGuidance: z.boolean().optional(),
  active: z.boolean().optional(),
  eligibility: z.unknown().optional().nullable(),
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

      const dbTs = Math.floor(new Date(current.updatedAt).getTime() / 1000)
      const clientTs = Math.floor(new Date(clientUpdatedAt).getTime() / 1000)
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
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (e) {
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
    return new Response(null, { status: 204 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}
