import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'

export const prerender = false

const httpsUrl = z.string().url().max(2048).refine(u => u.startsWith('https://'), 'URL must use HTTPS')

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

export const PUT: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!(await checkMutationRateLimit(session.user.id))) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  const id = parseInt(params.id!, 10)
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
    await db.delete(researchPrograms).where(eq(researchPrograms.id, id))
    return new Response(null, { status: 204 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}
