import type { APIRoute } from 'astro'
import { isAdminRequest } from '../../../../lib/adminAuth'
import { db } from '../../../../lib/db/client'
import { researchPrograms } from '../../../../lib/db/schema'
import { ilike, desc } from 'drizzle-orm'
import { z } from 'zod'
import { httpsUrl } from '../../../../lib/validators'
import { jsonOk, jsonError } from '../../../../lib/api-response'

export const prerender = false

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

export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)
  const all = await db.select().from(researchPrograms).orderBy(desc(researchPrograms.updatedAt)).limit(1000)
  return jsonOk(all)
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)

  try {
    const body = await request.json()
    const data = CreateSchema.parse(body)

    const existing = await db
      .select({ id: researchPrograms.id, name: researchPrograms.name })
      .from(researchPrograms)
      .where(ilike(researchPrograms.name, data.name.trim()))
      .limit(1)
    if (existing.length > 0) {
      return jsonOk({ error: 'duplicate', existing: existing[0]!.name }, 409)
    }

    const [created] = await db.insert(researchPrograms).values(data).returning()
    return jsonOk(created, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid request data', 400)
    console.error('[POST /admin/api/programs]', e)
    return jsonError('Internal server error', 500)
  }
}
