import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'

export const prerender = false

const httpsUrl = z.string().url().max(2048).refine(u => u.startsWith('https://'), 'URL must use HTTPS')

const CreateSchema = z.object({
  name: z.string().min(1).max(500),
  emoji: z.string().max(10).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  provider: z.string().max(200).optional().nullable(),
  grades: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  paid: z.boolean().default(false),
  stipend: z.string().max(200).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  eligibility: z.string().max(10000).optional().nullable(),
  deadline: z.string().max(50).optional().nullable(),
  url: httpsUrl,
  description: z.string().max(5000).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
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
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), { status: 400 })
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }), { status: 400 })
  }
}
