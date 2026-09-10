import type { APIRoute } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { isAdminRequest } from './adminAuth';
import { db } from './db/client';
import { catalogueEntries as entries } from './db/schema';
import { jsonOk, jsonError } from './api-response';
import { entryView, type CatalogueKind, type Document } from './catalogue';
import { getCatalogueEntry, listCatalogue } from './catalogue-store';

interface AdminCrudConfig {
  kind: CatalogueKind;
  createSchema: z.ZodType<Record<string, unknown>>;
  updateSchema: z.ZodType<Record<string, unknown>>;
}
export const parseId = (raw: string | undefined): number | null =>
  raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) <= 2147483647
    ? Number(raw)
    : null;
const conflict = () => jsonError('This record changed. Refresh and try again.', 409);
function failure(e: unknown) {
  if (e instanceof SyntaxError) return jsonError('Invalid JSON', 400);
  if (e instanceof z.ZodError)
    return jsonError(
      `Invalid request data: ${e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      400
    );
  const code =
    (e as { code?: string; cause?: { code?: string } })?.code ??
    (e as { cause?: { code?: string } })?.cause?.code;
  if (code === '23505') return jsonError('A listing with that name already exists', 409);
  console.error('[admin catalogue]', e);
  return jsonError('Unable to save. Please try again.', 500);
}
export function makeAdminCollectionRoutes(cfg: AdminCrudConfig): { GET: APIRoute; POST: APIRoute } {
  return {
    GET: async ({ request }) => {
      if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
      const params = new URL(request.url).searchParams;
      const page = Number(params.get('page') ?? 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 100000)
        return jsonError('Invalid page', 400);
      try {
        return jsonOk(
          await listCatalogue(
            cfg.kind,
            page,
            (params.get('q') ?? '').slice(0, 500),
            (params.get('facet') ?? 'All').slice(0, 100)
          )
        );
      } catch (e) {
        return failure(e);
      }
    },
    POST: async ({ request }) => {
      if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
      try {
        const data = cfg.createSchema.parse(await request.json());
        // The unique PK arbitrates concurrent allocation; each retry uses a
        // fresh statement snapshot. Never recycle IDs of retained tombstones.
        for (let attempt = 0; attempt < 5; attempt++) {
          const [next] = await db
            .select({ id: sql<number>`coalesce(max(${entries.publicId}),0)+1` })
            .from(entries)
            .where(eq(entries.kind, cfg.kind));
          const id = next!.id;
          const [created] = await db
            .insert(entries)
            .values({ kind: cfg.kind, publicId: id, draft: { ...data, id } as Document })
            .onConflictDoNothing({ target: [entries.kind, entries.publicId] })
            .returning();
          if (created) return jsonOk(entryView(created), 201);
        }
        return conflict();
      } catch (e) {
        return failure(e);
      }
    },
  };
}
export function makeAdminItemRoutes(cfg: AdminCrudConfig): {
  GET: APIRoute;
  PUT: APIRoute;
  DELETE: APIRoute;
} {
  const write =
    (deleting: boolean): APIRoute =>
    async ({ request, params }) => {
      if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
      const id = parseId(params.id);
      if (!id) return jsonError('Invalid ID', 400);
      try {
        const body = z
          .looseObject({ revision: z.number().int().positive() })
          .parse(await request.json());
        const current = await getCatalogueEntry(cfg.kind, id);
        if (!current || current.deleted || (!current.published && !current.draft))
          return jsonError('Not found', 404);
        const fields = { ...body };
        const existingUrl = (current.draft ?? current.published)?.url;
        // Four vetted legacy providers still use HTTP. Preserve their unchanged
        // URLs when editing another field; new or changed links require HTTPS.
        if (
          fields.url === existingUrl &&
          typeof existingUrl === 'string' &&
          existingUrl.startsWith('http://')
        )
          delete fields.url;
        const data = deleting ? {} : cfg.updateSchema.parse(fields);
        const document = { ...(current.draft ?? current.published), ...data, id } as Document;
        const [saved] = await db
          .update(entries)
          .set({
            draft: document,
            draftBase: current.draft ? current.draftBase : current.published,
            deleted: deleting,
            revision: sql`${entries.revision}+1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(entries.kind, cfg.kind),
              eq(entries.publicId, id),
              eq(entries.revision, body.revision)
            )
          )
          .returning();
        if (!saved) return conflict();
        return deleting ? new Response(null, { status: 204 }) : jsonOk(entryView(saved));
      } catch (e) {
        return failure(e);
      }
    };
  return {
    GET: async ({ request, params }) => {
      if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
      const id = parseId(params.id);
      if (!id) return jsonError('Invalid ID', 400);
      try {
        const row = await getCatalogueEntry(cfg.kind, id);
        return row && !row.deleted && (row.draft || row.published)
          ? jsonOk(entryView(row))
          : jsonError('Not found', 404);
      } catch (e) {
        return failure(e);
      }
    },
    PUT: write(false),
    DELETE: write(true),
  };
}
