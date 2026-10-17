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
  // From the 2026-10-14 log.
  higene: 'hygiene', indeginious: 'indigenous', bachh: 'bachelor',
  // From the 2026-10-16 log. Each starts with the wrong letter or sits too
  // far from the word for correctQuery to reach it.
  hygein: 'hygiene', hygeine: 'hygiene', hygine: 'hygiene',
  ingineering: 'engineering', engneering: 'engineering', engineet: 'engineer',
  megatronics: 'mechatronics', tobotics: 'robotics', radiograpy: 'radiography',
  veteranian: 'veterinarian', vetrinarian: 'veterinarian',
  opthalmology: 'ophthalmology', sugery: 'surgery', boreck: 'borek',
}

/**
 * The school shorthand students type, each group one school. Every one-word
 * member stands for the whole group, so "uofa" finds the 130 listings that
 * spell out "University of Alberta" (2 as typed, 2026-10-14).
 */
const SCHOOLS: string[][] = [
  ['uofa', 'ualberta', 'university of alberta', 'u of a'],
  ['uofc', 'uoc', 'ucalgary', 'university of calgary', 'u of c'],
];

/** A school shorthand glued to the word before it: "businessuofa". */
const GLUED = new RegExp(`^(\\p{L}{3,})(${SCHOOLS.flat().filter(s => !s.includes(' ')).join('|')})$`, 'u');

/** What the listings call X-ray and ultrasound training. */
const IMAGING = ['x ray', 'diagnostic imaging', 'medical imaging'];

/** Listings for the medical degree. Never "medicine": it starts "Medicine Hat". */
const PHYSICIAN = ['physician', 'medical school', 'medical student', 'pre med'];

/**
 * Other words the listings use for what a student typed.
 *
 * Every entry here was a zero-result search in the events table, and every
 * alternative finds real listings that answer it (2026-10-14): "lpn" found
 * nothing while seven practical nursing awards did. The alternatives are
 * added to what was typed, never put in its place, and each is matched from
 * the start of a word. A term with no listings behind it stays off this list:
 * the empty result is then the truth, and the gap gets logged.
 */
export const ALIASES: Record<string, string[]> = {
  lpn: ['practical nurs'],
  hygienist: ['dental hygien'],
  pharmacist: ['pharmac'],
  therapist: ['therap'],
  sonography: ['sonograph', 'diagnostic imaging', 'medical imaging'],
  sonographer: ['sonograph', 'diagnostic imaging', 'medical imaging'],
  ultrasonography: ['sonograph', 'diagnostic imaging', 'medical imaging'],
  ultrasound: ['sonograph', 'diagnostic imaging', 'medical imaging'],
  hvac: ['refrigeration', 'sheet metal', 'gasfit'],
  'aircraft maintenance': ['aircraft'],
  criminology: ['criminal justice', 'justice studies'],
  camera: ['photography'],
  immigration: ['immigrant', 'newcomer', 'refugee', 'new canadian'],
  'barrel racing': ['rodeo'],
  rvs: ['rocky view'],
  interpipeline: ['inter pipeline'],
  // From the 2026-10-16 log.
  xray: IMAGING, radiology: IMAGING, radiography: IMAGING, radiographer: IMAGING, radiologist: IMAGING,
  // A medical specialty is a medical degree first; no listing names one.
  surgery: PHYSICIAN, surgeon: PHYSICIAN, cardiac: PHYSICIAN, anesthesiologist: PHYSICIAN,
  ophthalmology: PHYSICIAN, pediatric: PHYSICIAN, pediatrician: PHYSICIAN,
  psychologist: ['psycholog'],
  pulmonary: ['respiratory'],
  pcp: ['primary care paramedic', 'paramedic'],
  veterinarian: ['veterinar'],
  mechatronics: ['robotic'],
  bakery: ['culinary', 'baking', 'pastry'],
  baker: ['culinary', 'baking', 'pastry'],
  botany: ['plant science', 'horticultur'],
  hairdresser: ['hairstyl', 'cosmetolog'],
  hairdressing: ['hairstyl', 'cosmetolog'],
  nail: ['esthetic', 'cosmetolog'],
  nails: ['esthetic', 'cosmetolog'],
  disaster: ['emergency management'],
  governance: ['politic', 'public administration'],
  euphonium: ['brass', 'music'],
  ethiopian: ['black student', 'black canad'],
  ukrainian: ['ukrain'],
  bible: ['christian'],
  // A town whose awards are named for its county or school division. Each
  // town sits inside the area named (checked 2026-10-16), and its own name
  // is on none of those listings.
  bruderheim: ['lamont', 'elk island'],
  falun: ['county of wetaskiwin'],
  grovedale: ['greenview'],
  hinton: ['grande yellowhead'],
  // Misspellings long enough that a student pauses halfway through them.
  // The prefix rule below then reads "milwr" and "kinie" as these.
  milwright: ['millwright'],
  kiniesiology: ['kinesiology'],
};
for (const group of SCHOOLS) {
  for (const m of group) if (!m.includes(' ')) ALIASES[m] = group.filter(g => g !== m);
}

/**
 * What the search box produces: one line, no separators of its own. A
 * trailing "ab" is the province code typed after a town ("hinton ab", 2026-10-16),
 * which no listing spells out, so it is dropped.
 */
export function normalizeSearchQuery(input: string): string {
  return normalizeSearchText(input).split(SEARCH_SEP).join(' ').replace(/ +/g, ' ').trim()
    .replace(/(.) ab$/, '$1')
    .split(' ').map(w => SPELLING[w] ?? w.replace(GLUED, '$1 $2')).join(' ');
}

/**
 * The alternatives for a query, each a list of units that must all match.
 *
 * A unit is one typed word, or a whole alias phrase that has to match as a
 * phrase ("university of alberta" may not be satisfied by "alberta" here and
 * "university" there). The query as typed is always the first variant. With
 * `prefix`, the last word, still being typed, also stands for any alias it
 * begins: the 1-second empty-search log caught "ultrasonogra" and "interpip"
 * mid-word.
 */
function queryVariants(query: string, prefix: boolean): string[][] {
  const words = query.split(' ').filter(Boolean);
  let out: string[][] = [[]];
  for (let i = 0; i < words.length;) {
    let len = 1;
    let alts: string[] = [];
    for (let n = Math.min(3, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).join(' ');
      alts = ALIASES[key] ?? [];
      if (prefix && i + n === words.length && key.length >= 5) {
        for (const k in ALIASES) if (k !== key && k.startsWith(key)) alts = [...alts, k, ...ALIASES[k]!];
      }
      if (alts.length > 0) { len = n; break; }
    }
    const options = [words.slice(i, i + len), ...[...new Set(alts)].map(a => [a])];
    out = out.flatMap(v => options.map(o => [...v, ...o])).slice(0, 32);
    i += len;
  }
  return out;
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

/** The phrase starts a word in the row, within one field. */
function startsWordIn(blob: string, phrase: string): boolean {
  return (' ' + blob).includes(' ' + phrase) || blob.includes('\n' + phrase);
}

/** Every unit starts a word somewhere in the row. */
function allUnitsMatch(blob: string, units: string[]): boolean {
  return units.every(u => startsWordIn(blob, stemPhrase(u)));
}

/**
 * The rows any variant finds: the typed phrase anywhere in a field (as
 * before), an alias phrase only from the start of a word, then, when none of
 * that finds anything, every unit of a variant on its own.
 */
function matchVariants<T>(rows: readonly T[], blobOf: (row: T) => string, variants: string[][]): T[] {
  const [typed, ...others] = variants;
  const phrase = stemPhrase(typed!.join(' '));
  const aliased = others.map(v => stemPhrase(v.join(' ')));
  const hits = rows.filter(r => {
    const b = blobOf(r);
    return b.includes(phrase) || aliased.some(a => startsWordIn(b, a));
  });
  if (hits.length > 0) return hits;
  const loose = variants.filter(v => v.length >= 2);
  if (loose.length === 0) return hits;
  return rows.filter(r => loose.some(v => allUnitsMatch(blobOf(r), v)));
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
 *
 * Aliases ride along in both steps ("lpn" also finds "practical nursing").
 * A half-typed last word is read as the alias it begins only when nothing
 * else matched, so "ultra" keeps its own results.
 */
export function searchRows<T>(rows: readonly T[], blobOf: (row: T) => string, query: string): T[] {
  if (!query) return [...rows];
  const hits = matchVariants(rows, blobOf, queryVariants(query, false));
  if (hits.length > 0) return hits;
  const partial = queryVariants(query, true);
  return partial.length > 1 ? matchVariants(rows, blobOf, partial) : hits;
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
  const q = normalizeSearchQuery(query);
  if (!q) return false;
  // Aliases count here too, or a filtered-out "lpn" hit is logged as a gap.
  return queryVariants(q, true).some(v => searchTokens(v.join(' ')).every(p => tokens.some(t => t.includes(p))));
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

/**
 * The words offered under an empty search box (SabDirBar, after
 * polymarket.com's list under its own). Only words that find at least `min`
 * of this page's rows, in the order given, so a suggestion never opens on an
 * empty list. Not "trending": nothing here is measured, so the box says "Try".
 */
export function searchSuggestions<T>(
  rows: readonly T[], blobOf: (row: T) => string, candidates: readonly string[], n = 5, min = 3,
): string[] {
  const blobs = rows.map(blobOf);
  return candidates.filter(c => searchRows(blobs, b => b, normalizeSearchQuery(c)).length >= min).slice(0, n);
}
