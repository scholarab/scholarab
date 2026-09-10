import type { APIRoute } from 'astro';
import { isAdminRequest } from '../../../lib/adminAuth';
import { jsonOk, jsonError } from '../../../lib/api-response';
import { matchingCoverage } from '../../../lib/matching/store';
import { getCatalogueEntry } from '../../../lib/catalogue-store';
import { normalizeOpportunity } from '../../../lib/matching/normalize';
import { parseId } from '../../../lib/admin-crud';
export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401);
  try {
    const params = new URL(request.url).searchParams;
    let response: Response;
    if (params.has('id') || params.has('kind')) {
      const kind = params.get('kind');
      const id = parseId(params.get('id') ?? undefined);
      if (!id || (kind !== 'scholarship' && kind !== 'program'))
        return jsonError('Invalid catalogue identity', 400);
      const row = await getCatalogueEntry(kind, id);
      if (!row || (!row.draft && !row.published)) return jsonError('Not found', 404);
      const document = row.draft ?? row.published!;
      response = jsonOk({
        kind,
        id,
        revision: row.revision,
        deleted: row.deleted,
        hasDraft: !!row.draft,
        preview: normalizeOpportunity(document, kind),
      });
    } else response = jsonOk(await matchingCoverage());
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return jsonError(
      'Could not build matching coverage. Check catalogue validation and retry.',
      500
    );
  }
};
