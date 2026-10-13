import type { APIRoute } from 'astro';
import { loadScholarships, loadPrograms } from '../lib/data-loader';
import { savedItems } from '../lib/saved-items';

/**
 * Every listing My combo can draw, fetched by /saved/ only when a visitor has
 * saved something beyond the starter pack the page carries. Inlined in the
 * page it was 754 KB of HTML that Lighthouse's slow phone waited for before
 * the first paint (mobile 94, 2026-10-13).
 */
export const GET: APIRoute = async () => {
  const [scholarships, programs] = await Promise.all([loadScholarships(), loadPrograms()]);
  return new Response(JSON.stringify(savedItems(scholarships, programs)), {
    headers: { 'Content-Type': 'application/json' },
  });
};
