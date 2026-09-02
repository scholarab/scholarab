// Factory for the admin CRUD API routes; scholarships and programs share
// identical GET/POST/PUT/DELETE logic and differ only in table, schemas,
// and which column is checked for duplicates.
import type { APIRoute } from 'astro'
import { eq, ilike, desc } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { isAdminRequest } from './adminAuth'
import { db } from './db/client'
import { jsonOk, jsonError } from './api-response'

export interface AdminCrudConfig {
  // Drizzle's table generics don't survive a generic factory; the routes only
  // use the columns passed explicitly below, so the table itself stays loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any
  idColumn: AnyPgColumn
  updatedAtColumn: AnyPgColumn
  dupColumn: AnyPgColumn
  /** Field name checked for duplicates on create ('title' / 'name'). */
  dupField: string
  createSchema: z.ZodType<Record<string, unknown>>
  updateSchema: z.ZodType<Record<string, unknown>>
  /** URL segment for log lines, e.g. 'scholarships'. */
  logTag: string
}

function zodDetail(e: z.ZodError): string {
  return e.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ')
}

export function makeAdminCollectionRoutes(cfg: AdminCrudConfig): { GET: APIRoute; POST: APIRoute } {
  const GET: APIRoute = async ({ request }) => {
    if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)
    const all = await db.select().from(cfg.table).orderBy(desc(cfg.updatedAtColumn)).limit(1000)
    return jsonOk(all)
  }

  const POST: APIRoute = async ({ request }) => {
    if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)

    try {
      const body = await request.json()
      const data = cfg.createSchema.parse(body)

      const dupValue = String(data[cfg.dupField] ?? '').trim()
      // Escape LIKE wildcards; a literal % or _ in a title would otherwise
      // pattern-match unrelated rows and report a false duplicate.
      const dupPattern = dupValue.replace(/([\\%_])/g, '\\$1')
      const existing = await db
        .select({ id: cfg.idColumn, [cfg.dupField]: cfg.dupColumn })
        .from(cfg.table)
        .where(ilike(cfg.dupColumn, dupPattern))
        .limit(1)
      if (existing.length > 0) {
        return jsonOk({ error: 'duplicate', existing: existing[0]![cfg.dupField] }, 409)
      }

      const [created] = (await db.insert(cfg.table).values(data).returning()) as Record<string, unknown>[]
      return jsonOk(created, 201)
    } catch (e) {
      if (e instanceof z.ZodError) {
        const detail = zodDetail(e)
        console.error(`[POST /admin/api/${cfg.logTag}] ZodError:`, detail)
        return jsonError(`Invalid request data: ${detail}`, 400)
      }
      console.error(`[POST /admin/api/${cfg.logTag}]`, e)
      return jsonError('Internal server error', 500)
    }
  }

  return { GET, POST }
}

export function makeAdminItemRoutes(cfg: AdminCrudConfig): { GET: APIRoute; PUT: APIRoute; DELETE: APIRoute } {
  const GET: APIRoute = async ({ request, params }) => {
    if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)
    const id = parseInt(params.id!, 10)
    if (isNaN(id)) return jsonError('Invalid ID', 400)
    const [item] = await db.select().from(cfg.table).where(eq(cfg.idColumn, id))
    if (!item) return jsonError('Not found', 404)
    return jsonOk(item)
  }

  const PUT: APIRoute = async ({ request, params }) => {
    if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)
    const id = parseInt(params.id!, 10)
    if (isNaN(id)) return jsonError('Invalid ID', 400)

    try {
      const body = await request.json()
      // Destructuring a null or scalar body throws a TypeError, which the
      // catch below turns into a 500. A malformed body is a 400.
      if (body === null || typeof body !== 'object' || Array.isArray(body))
        return jsonError('Invalid request data: body must be an object', 400)
      const { updatedAt: clientUpdatedAt, ...rest } = body as Record<string, unknown>
      const data = cfg.updateSchema.parse(rest)

      if (clientUpdatedAt) {
        const [current] = await db
          .select({ updatedAt: cfg.updatedAtColumn })
          .from(cfg.table)
          .where(eq(cfg.idColumn, id))
        if (!current) return jsonError('Not found', 404)
        const dbTs = (current.updatedAt as Date | null)?.getTime() ?? 0
        const clientTs = new Date(clientUpdatedAt as string | number | Date).getTime()
        if (dbTs !== clientTs) {
          return jsonOk({ error: 'conflict', message: 'This record was modified by someone else. Please refresh and try again.' }, 409)
        }
      }

      const [updated] = await db
        .update(cfg.table)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(cfg.idColumn, id))
        .returning()
      if (!updated) return jsonError('Not found', 404)
      return jsonOk(updated)
    } catch (e) {
      if (e instanceof z.ZodError) {
        const detail = zodDetail(e)
        console.error(`[PUT /admin/api/${cfg.logTag}/:id] ZodError:`, detail)
        return jsonError(`Invalid request data: ${detail}`, 400)
      }
      console.error(`[PUT /admin/api/${cfg.logTag}/:id]`, e)
      return jsonError('Internal server error', 500)
    }
  }

  const DELETE: APIRoute = async ({ request, params }) => {
    if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)
    const id = parseInt(params.id!, 10)
    if (isNaN(id)) return jsonError('Invalid ID', 400)
    try {
      await db.delete(cfg.table).where(eq(cfg.idColumn, id))
      return new Response(null, { status: 204 })
    } catch (e) {
      console.error(`[DELETE /admin/api/${cfg.logTag}/:id]`, e)
      return jsonError('Internal server error', 500)
    }
  }

  return { GET, PUT, DELETE }
}
