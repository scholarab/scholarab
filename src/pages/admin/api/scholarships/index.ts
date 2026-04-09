import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { ilike, desc } from 'drizzle-orm'
import { z } from 'zod'
import { checkMutationRateLimit } from '../../../../lib/adminRateLimit'
import { eligibilitySchema } from '../../../../lib/data-loader'
import { logAudit } from '../../../../lib/audit'
import { httpsUrl } from '../../../../lib/validators'
import { jsonOk, jsonError } from '../../../../lib/api-response'

export const prerender = false

const CreateSchema = z.object({
  title: z.string().min(1).max(500),
  amount: z.string().min(1).max(100),
  deadline: z.string().max(50).optional().nullable(),
  openDate: z.string().max(50).optional().nullable(),
  audience: z.string().max(5000).optional().nullable(),
  url: httpsUrl,
  category: z.string().max(100).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  applyViaGuidance: z.boolean().default(false),
  active: z.boolean().default(true),
  eligibility: eligibilitySchema.optional().nullable(),
})

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)

  const all = await db.select().from(scholarships).orderBy(desc(scholarships.updatedAt)).limit(1000)
  return jsonOk(all)
}

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return jsonError('Unauthorized', 401)
  if (!(await checkMutationRateLimit(session.user.id))) return jsonError('Rate limit exceeded', 429)

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
      return jsonOk({ error: 'duplicate', existing: existing[0].title }, 409)
    }

    const [created] = await db.insert(scholarships).values(data).returning()
    logAudit(session.user.id, 'CREATE', 'scholarship', created!.id).catch(() => {})
    return jsonOk(created, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError('Invalid request data', 400)
    return jsonError(e instanceof Error ? e.message : 'Internal server error', 400)
  }
}
