import type { APIRoute } from 'astro';
import { desc, sql, or, isNotNull, eq } from 'drizzle-orm';
import { isAdminRequest } from '../../../lib/adminAuth';
import { db } from '../../../lib/db/client';
import { publicationRequests, catalogueEntries } from '../../../lib/db/schema';
import { jsonOk, jsonError } from '../../../lib/api-response';
import { stableJson, type PublicationChange } from '../../../lib/catalogue';
import { mailKey } from '../../../lib/mail-delivery';
export const prerender = false;
async function preview() {
  const rows = await db
    .select()
    .from(catalogueEntries)
    .where(or(isNotNull(catalogueEntries.draft), eq(catalogueEntries.deleted, true)))
    .orderBy(catalogueEntries.kind, catalogueEntries.publicId);
  const changes: PublicationChange[] = rows.map((r) => ({
    kind: r.kind,
    publicId: r.publicId,
    base: r.draftBase,
    value: r.deleted ? null : r.draft,
    revision: r.revision,
  }));
  return {
    changes,
    hash: await mailKey(stableJson(changes)),
    items: rows.map((r) => ({
      kind: r.kind,
      id: r.publicId,
      title: String(
        (r.draft ?? r.published)?.title ?? (r.draft ?? r.published)?.name ?? r.publicId
      ),
      action: r.deleted ? 'Remove' : r.published ? 'Update' : 'Add',
      fields: r.deleted
        ? []
        : Object.keys(r.draft ?? {}).filter(
            (k) => stableJson(r.draft?.[k]) !== stableJson(r.draftBase?.[k])
          ),
    })),
  };
}
export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
  const [latest] = await db
    .select({
      id: publicationRequests.id,
      status: publicationRequests.status,
      message: publicationRequests.message,
      commitSha: publicationRequests.commitSha,
    })
    .from(publicationRequests)
    .orderBy(desc(publicationRequests.createdAt))
    .limit(1);
  const draftPreview = await preview();
  return jsonOk({
    ...latest,
    status: latest?.status ?? 'idle',
    previewHash: draftPreview.hash,
    drafts: draftPreview.items,
  });
};
export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Review the drafts before publishing.', 400);
    }
    const expected =
      body && typeof body === 'object'
        ? (body as { previewHash?: unknown }).previewHash
        : undefined;
    const current = await preview();
    if (expected !== current.hash)
      return jsonError('Drafts changed. Review the latest changes before publishing.', 409);
    const id = crypto.randomUUID();
    // Freeze the exact draft revisions that the editor requested. Later edits
    // stay drafts and are never silently included in this publication.
    const result = await db.execute(sql`INSERT INTO publication_requests (id,changes)
      SELECT ${id},jsonb_agg(jsonb_build_object('kind',kind,'publicId',public_id,
        'base',draft_base,'value',CASE WHEN deleted THEN NULL ELSE draft END,'revision',revision) ORDER BY kind,public_id)
      FROM catalogue_entries WHERE draft IS NOT NULL OR deleted
      HAVING count(*)>0 AND jsonb_agg(jsonb_build_object('kind',kind,'publicId',public_id,'base',draft_base,'value',CASE WHEN deleted THEN NULL ELSE draft END,'revision',revision) ORDER BY kind,public_id)=${JSON.stringify(current.changes)}::jsonb ON CONFLICT DO NOTHING RETURNING id`);
    if (!result.rows.length)
      return jsonError('No unpublished changes, or a publication is already queued.', 409);
    return jsonOk(
      { id, status: 'queued', message: 'Changes queued for validation and publication.' },
      202
    );
  } catch (e) {
    console.error('[publication] queue failed', e);
    return jsonError('Unable to queue publication. Your drafts are safe.', 500);
  }
};
