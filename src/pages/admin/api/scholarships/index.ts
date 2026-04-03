import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { z } from 'zod'

export const prerender = false

const CreateSchema = z.object({
  title: z.string().min(1),
  amount: z.string().min(1),
  deadline: z.string().optional().nullable(),
  openDate: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  url: z.string().url(),
  category: z.string().optional().nullable(),
  lastVerified: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  applyViaGuidance: z.boolean().default(false),
  active: z.boolean().default(true),
})

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  try {
    const body = await request.json()
    const data = CreateSchema.parse(body)
    const [created] = await db.insert(scholarships).values(data).returning()
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 })
  }
}
