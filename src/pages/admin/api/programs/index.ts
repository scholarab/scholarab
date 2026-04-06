import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'

export const prerender = false

const CreateSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  grades: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  paid: z.boolean().default(false),
  stipend: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  url: z.string().url(),
  description: z.string().optional().nullable(),
  lastVerified: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  if (!(await checkMutationRateLimit(session.user.id))) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })

  try {
    const body = await request.json()
    const data = CreateSchema.parse(body)
    const [created] = await db.insert(researchPrograms).values(data).returning()
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}
