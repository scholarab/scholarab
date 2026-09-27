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
 * Lowercase, drop accents and apostrophes, and reduce every other separator
 * to a space.
 *
 * Apostrophes close up rather than split (`mcdonald's` to `mcdonalds`) so a
 * student who skips the punctuation still lands on the award. Everything else
 * becomes a space, which keeps "Access & Excellence" and "K-12" as two
 * tokens each instead of welding them into one unsearchable string.
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    // Accents fold away, so "metis" finds the Métis awards (4 listings as
    // typed, 18 with the accent, 2026-09-26) and "ecole" finds "École".
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/['‘’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}\n]+/gu, ' ')
    .split(SEARCH_SEP)
    .map(line => line.replace(/ +/g, ' ').trim())
    .filter(Boolean)
    .join(SEARCH_SEP);
}

/**
 * Misspellings of the site's own vocabulary, read as the word meant.
 *
 * "bursery" returned 0 of 1,542 (critique 2026-09-25). A fixed list, not fuzzy
 * matching: a first-time applicant misspells the three or four words the
 * category is named with, and an edit-distance match on award names would
 * turn "Kiwanis" into things it is not.
 */
const SPELLING: Record<string, string> = {
  bursery: 'bursary', bursury: 'bursary', bursarys: 'bursaries', burseries: 'bursaries', bursuary: 'bursary',
  scholorship: 'scholarship', schollarship: 'scholarship', scholership: 'scholarship', scolarship: 'scholarship',
  scholarhip: 'scholarship', scholarshp: 'scholarship', schoolarship: 'scholarship',
  scholorships: 'scholarships', schollarships: 'scholarships', scholerships: 'scholarships', scolarships: 'scholarships',
  calgery: 'calgary', edmonten: 'edmonton', edmontn: 'edmonton', lethbrige: 'lethbridge',
  indiginous: 'indigenous', indigenious: 'indigenous', nurseing: 'nursing', engeneering: 'engineering', enginering: 'engineering',
  // From the search_empty log, Jul to Sep 2026. Most are also caught by
  // correctQuery below; these stay so the match needs no second pass.
  voley: 'volleyball', vollybal: 'volleyball', vollyballl: 'volleyball', vollyball: 'volleyball', volleybal: 'volleyball',
  medicne: 'medicine', medecine: 'medicine', involvment: 'involvement',
  reveled: 'revealed', reveiled: 'revealed', reviled: 'revealed', revieled: 'revealed',
}

/** What the search box produces: one line, no separators of its own. */
export function normalizeSearchQuery(input: string): string {
  return normalizeSearchText(input).split(SEARCH_SEP).join(' ').replace(/ +/g, ' ').trim()
    .split(' ').map(w => SPELLING[w] ?? w).join(' ');
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

/**
 * A word cut back to the part its other forms share, so "nurse" finds
 * "nursing" and "nursing" finds "nurse" (11 and 40 scholarships as typed,
 * critique 2026-09-27). One suffix at most, and never below four letters:
 * "arts" stays "arts" rather than matching every "art" inside "start".
 */
function stemWord(w: string): string {
  for (const suf of ['ing', 'ed', 's', 'e']) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

/** The phrase with its last word stemmed: "nurse" also finds "nursing". */
function stemPhrase(query: string): string {
  const words = query.split(' ');
  words[words.length - 1] = stemWord(words[words.length - 1]!);
  return words.join(' ');
}

/** Every word starts a word somewhere in the row. */
function allWordsMatch(blob: string, words: string[]): boolean {
  const padded = ' ' + blob.replace(/\n/g, ' ');
  return words.every(w => padded.includes(' ' + stemWord(w)));
}

/**
 * The rows a normalized query finds. The one search every directory and the
 * match list share, so a query cannot find a row on one surface and not
 * another.
 *
 * The phrase comes first, its last word stemmed. Only when the phrase finds
 * nothing does each word get matched on its own, in any order and field:
 * "indigenous engineering" found nothing as one phrase while awards that are
 * both exist (critique 2026-09-27). Doing that on every query was tried and
 * dropped the same day: "first nations" then matched every row saying "first
 * year". Every word must start a word ("hat" is not in "that"), short ones
 * included: dropping them let "zz no matching student award" find three
 * awards on "matching", "student" and "award".
 */
export function searchRows<T>(rows: readonly T[], blobOf: (row: T) => string, query: string): T[] {
  if (!query) return [...rows];
  const phrase = stemPhrase(query);
  const hits = rows.filter(r => blobOf(r).includes(phrase));
  if (hits.length > 0) return hits;
  const words = query.split(' ').filter(Boolean);
  if (words.length < 2) return hits;
  return rows.filter(r => allWordsMatch(blobOf(r), words));
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

/** Edit distance with adjacent swaps (Damerau, optimal string alignment). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * The query a student most likely meant, when what they typed finds nothing.
 *
 * Each word that appears nowhere in `vocab` is swapped for the closest word
 * that does: one edit for words up to six letters, two for longer ones, and
 * never for words under four letters or with digits, where one edit is a
 * different word ("rvs", "3p"), and only for a word with the same first
 * letter. Words that already match are kept. Returns
 * null unless every word ends up matching, so a half-fixed query never
 * stands in for the student's. The caller only asks after the search as
 * typed came back empty, which is what keeps this from turning a real name
 * the site does not carry into some other listing.
 */
export function correctQuery(ql: string, vocab: Iterable<string>): string | null {
  const words = ql.split(' ').filter(Boolean);
  if (words.length === 0) return null;
  const tokens = [...new Set(vocab)];
  let changed = false;
  const out: string[] = [];
  for (const w of words) {
    if (tokens.some(t => t.includes(w))) { out.push(w); continue; }
    if (w.length < 4 || /\d/.test(w)) return null;
    const max = w.length <= 6 ? 1 : 2;
    let best: string | null = null;
    let bestD = max + 1;
    for (const t of tokens) {
      // Same first letter: a typo almost never starts the word wrong, and
      // without this "camera" became "pamela" and "hocky" became "rocky".
      if (t[0] !== w[0] || t.length < 4 || /\d/.test(t)) continue;
      const d = editDistance(w, t, max);
      if (d < bestD || (d === bestD && best !== null && Math.abs(t.length - w.length) < Math.abs(best.length - w.length))) {
        best = t;
        bestD = d;
      }
    }
    if (best === null) return null;
    out.push(best);
    changed = true;
  }
  return changed ? out.join(' ') : null;
}
