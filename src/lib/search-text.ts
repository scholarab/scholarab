// One normalizer for every search surface.
//
// Three of them have to agree or the directory lies to its own analytics: the
// `data-search` blob each card carries, the full-corpus token index at
// /search-index.json, and the query a student types. They did not agree
// before. `mcdonalds` could never match the stored `McDonald's`, and every
// such miss was written to the events table as a content gap.

/**
 * Field separator inside a search blob.
 *
 * A normalized query collapses to single spaces and can never contain a
 * newline, so a phrase cannot match across the seam between two fields:
 * "excellence award" must not match a row whose category ends in
 * "Excellence" and whose next field begins with "Award".
 */
export const SEARCH_SEP = '\n';

/**
 * Lowercase, drop apostrophes, and reduce every other separator to a space.
 *
 * Apostrophes close up rather than split (`mcdonald's` to `mcdonalds`) so a
 * student who skips the punctuation still lands on the award. Everything else
 * becomes a space, which keeps "Access & Excellence" and "K-12" as two
 * tokens each instead of welding them into one unsearchable string.
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['‘’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}\n]+/gu, ' ')
    .split(SEARCH_SEP)
    .map(line => line.replace(/ +/g, ' ').trim())
    .filter(Boolean)
    .join(SEARCH_SEP);
}

/** What the search box produces: one line, no separators of its own. */
export function normalizeSearchQuery(input: string): string {
  return normalizeSearchText(input).split(SEARCH_SEP).join(' ').replace(/ +/g, ' ').trim();
}

/**
 * The searchable blob for one row.
 *
 * Newlines inside a single field are flattened first: a description that
 * wraps would otherwise plant an extra seam mid-sentence and stop a phrase
 * from matching across it.
 */
export function buildSearchBlob(fields: (string | null | undefined)[]): string {
  return normalizeSearchText(
    fields.filter(Boolean).map(f => String(f).replace(/[\r\n]+/g, ' ')).join(SEARCH_SEP),
  );
}

/** Unique tokens of a blob, for the cross-directory index. */
export function searchTokens(blob: string): string[] {
  return blob.split(/[\s\n]+/).filter(Boolean);
}

/**
 * Could a corpus holding these tokens have anything for this query?
 *
 * Deliberately looser than the substring match the directories run: every
 * query token need only appear *inside* some indexed token, and adjacency is
 * not checked. So "stett" reaches "stettler", and "lions club" passes on a
 * corpus holding both words apart. This only ever decides whether to offer a
 * link to the other directory, and that page then runs the real search and
 * shows the real count, so a generous nudge costs nothing. Being stricter
 * would put us back to reporting content gaps that are not gaps.
 */
export function tokenIndexMayMatch(tokens: readonly string[], query: string): boolean {
  const parts = searchTokens(normalizeSearchQuery(query));
  if (parts.length === 0) return false;
  return parts.every(p => tokens.some(t => t.includes(p)));
}

/**
 * The fields a scholarship is searchable by.
 *
 * `description` was missing until 2026-09-09, which is why searching a town
 * found nothing: three awards name Stettler in their descriptions while their
 * audience says only "Central Alberta". `notes` stays out on purpose. It is
 * verification prose ("Verified against the provider's page on ...") and
 * indexing it would match the boilerplate on nearly every row.
 */
export function scholarshipSearchBlob(
  s: { title?: string | null; audience?: string | null; category?: string | null; description?: string | null },
): string {
  return buildSearchBlob([s.title, s.audience, s.category, s.description]);
}

export function programSearchBlob(
  p: { name?: string | null; provider?: string | null; description?: string | null; category?: string | null },
): string {
  return buildSearchBlob([p.name, p.provider, p.description, p.category]);
}
