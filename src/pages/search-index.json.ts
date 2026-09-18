import type { APIRoute } from 'astro';
import { loadScholarships, loadPrograms } from '../lib/data-loader';
import { enrichScholarships, enrichPrograms } from '../lib/enrich';
import {
  programSearchBlob,
  scholarshipSearchBlob,
  searchTokens,
} from '../lib/search-text';

// Exact card search and cross-directory suggestions, requested on first search.
export const GET: APIRoute = async () => {
  const [scholarships, programs] = await Promise.all([
    loadScholarships().then(enrichScholarships),
    loadPrograms().then(p => enrichPrograms(p.filter(x => x.active !== false))),
  ]);

  const collect = (blobs: string[]) => {
    const set = new Set<string>();
    for (const b of blobs) for (const t of searchTokens(b)) set.add(t);
    return [...set].sort();
  };

  const body = JSON.stringify({
    s: collect(scholarships.map(scholarshipSearchBlob)),
    p: collect(programs.map(programSearchBlob)),
    scholarship: Object.fromEntries(scholarships.map(s => [s.id, scholarshipSearchBlob(s)])),
    program: Object.fromEntries(programs.map(p => [p.id, programSearchBlob(p)])),
  });

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Card IDs and their search text must belong to the current catalogue.
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
};
