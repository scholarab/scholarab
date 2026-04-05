import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { ilike, desc } from 'drizzle-orm'
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
  eligibility: z.unknown().optional().nullable(),
})

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const all = await db.select().from(scholarships).orderBy(desc(scholarships.updatedAt))
  return new Response(JSON.stringify(all), { status: 200 })
}

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  try {
    const body = await request.json()
    const data = CreateSchema.parse(body)

    // Server-side duplicate check (case-insensitive)
    const existing = await db
      .select({ id: scholarships.id, title: scholarships.title })
      .from(scholarships)
      .where(ilike(scholarships.title, data.title.trim()))
      .limit(1)
    if (existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'duplicate', existing: existing[0].title }),
        { status: 409 }
      )
    }

    const [created] = await db.insert(scholarships).values(data).returning()
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 })
  }
}
