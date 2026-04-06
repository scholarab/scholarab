import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'

export const prerender = false

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  emoji: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  grades: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  paid: z.boolean().optional(),
  stipend: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  url: z.string().url().optional(),
  description: z.string().optional().nullable(),
  lastVerified: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

export const PUT: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!checkMutationRateLimit(session.user.id)) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  const id = parseInt(params.id!)
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 })

  try {
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const [updated] = await db
      .update(researchPrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(researchPrograms.id, id))
      .returning()
    if (!updated) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 })
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!checkMutationRateLimit(session.user.id)) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  const id = parseInt(params.id!)
  if (isNaN(id)) return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 })

  try {
    await db.delete(researchPrograms).where(eq(researchPrograms.id, id))
    return new Response(null, { status: 204 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 })
  }
}
