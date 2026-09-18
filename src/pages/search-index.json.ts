import type { APIRoute } from 'astro';
import { loadScholarships, loadPrograms } from '../lib/data-loader';
import { enrichScholarships, enrichPrograms } from '../lib/enrich';
import {
  programSearchBlob,
  scholarshipSearchBlob,
  searchTokens,
} from '../lib/search-text';

/**
 * Every word either directory can be searched by, as two sorted token lists.
 *
 * This exists so a search that comes up empty can tell the difference between
 * "we do not have this" and "we have it, just not on the page you are
 * standing on". A facet page holds a slice of the corpus, so /scholarships/
 * calgary searching "nursing" saw nothing and reported a content gap while
 * sixteen nursing awards sat one page away.
 *
 * Tokens rather than the text they came from: the blobs run to 126KB gzipped
 * and dedupe down to 20KB, and a token list answers the only question asked
 * of it. Fetched lazily, once, and only after a search has already failed.
 */
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
  });

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Rebuilt on every deploy, and a stale token list only softens a nudge.
      'cache-control': 'public, max-age=3600',
    },
  });
};
