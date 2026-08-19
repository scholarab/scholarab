// Meta descriptions for the listing detail pages.
//
// The GSC export for 2026-07-20..08-16 shows the whole site sitting at 0.87%
// CTR across 687 impressions in positions 8-10 and 1.38% across 650 in 5-7 —
// roughly a third of what those positions normally return. The cause was the
// snippet, not the ranking: 153 of 154 scholarship descriptions ran over
// Google's ~155-character cut (median 221, longest 302), and the template put
// the deadline at character ~180. So the one fact the query was asking for was
// always the part that got truncated away, behind a "The <award name> offers"
// prefix restating the title printed directly above it in the SERP and a
// "Browse more Alberta scholarships at ScholarAB" tail nobody ever saw.
//
// The top query shape on the site is "when does X open" (five Rutherford
// variants alone drew 82 impressions and zero clicks). So the date leads, the
// money comes second, and the audience takes whatever room is left.

/**
 * The long-date form both the snippet and the page's visible facts use.
 *
 * It lives here rather than in the page's frontmatter because getStaticPaths is
 * hoisted to module scope while the rest of the frontmatter is the component
 * body — a function declared there is invisible to getStaticPaths, which is
 * where the corpus-wide descriptions have to be built.
 *
 * 'TBA' and 'Ongoing' are values the program data actually carries in the
 * deadline field, so they pass through as themselves rather than parsing to
 * Invalid Date.
 */
export function formatListingDate(str: string | null | undefined): string {
  if (!str) return 'TBA';
  if (str === 'TBA' || str === 'Ongoing') return str;
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Google renders roughly this many characters of a description. */
export const META_MAX = 155;

/**
 * Trim to `max` characters on a word boundary, without a trailing ellipsis.
 *
 * The old program path did `slice(0, 157) + '...'`, which cut 123 of 125
 * descriptions mid-word ("...students underreprese..."). A snippet that ends
 * on a whole word reads as a finished thought; Google appends its own ellipsis
 * when it truncates further.
 */
export function clampMeta(text: string, max: number = META_MAX): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const window = t.slice(0, max + 1);

  // Three fallbacks, best first. Anything that keeps less than half the room is
  // rejected — a description that stops at its first four-word sentence throws
  // away more than the ragged edge costs.
  const floor = max * 0.5;

  // 1. A finished sentence reads as deliberate copy rather than a cut-off.
  const stop = lastIndexOfAny(window, /[.!?](?=\s)/g);
  if (stop >= floor && balanced(t.slice(0, stop + 1))) return t.slice(0, stop + 1);

  // 2. Failing that, a clause boundary: "...who qualify for full-time student
  //    aid" beats "...and enrol in an eligible high-demand".
  const clause = lastIndexOfAny(window, /[,;:](?=\s)/g);
  if (clause >= floor && balanced(t.slice(0, clause))) return t.slice(0, clause);

  // 3. Otherwise a word boundary, backing off any trailing function word so
  //    the snippet does not end on "at an" or "for the".
  const lastSpace = window.lastIndexOf(' ');
  // No space at all in the window: a single very long token, so hard-cut it.
  let body = (lastSpace > 0 ? window.slice(0, lastSpace) : t.slice(0, max)).trimEnd();
  // Back out of an unclosed parenthetical rather than ending inside one:
  // "...Research Academy ($3,000 award" is a visible fault in a SERP.
  if (!balanced(body)) body = body.slice(0, body.lastIndexOf('(')).trimEnd();
  while (body.length > floor) {
    const tail = body.slice(body.lastIndexOf(' ') + 1).toLowerCase().replace(/[^a-z]/g, '');
    if (!DANGLING.has(tail)) break;
    body = body.slice(0, body.lastIndexOf(' ')).trimEnd();
  }
  // Don't leave dangling punctuation from the middle of a clause.
  return body.replace(/[,;:—–-]+$/, '');
}

/** Index of the last match of a global regex in `s`, or -1. */
function lastIndexOfAny(s: string, re: RegExp): number {
  let last = -1;
  for (const m of s.matchAll(re)) last = m.index;
  return last;
}

/** Whether every '(' opened in the candidate is closed inside it. */
function balanced(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
  }
  return depth === 0;
}

/** Function words a snippet should never end on. */
const DANGLING = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'with',
  'by', 'as', 'that', 'which', 'who', 'whose', 'is', 'are', 'was', 'were', 'be', 'been',
  'plus', 'per', 'into', 'over', 'under', 'their', 'its', 'his', 'her', 'your', 'our',
  'have', 'has', 'had', 'do', 'does', 'can', 'will', 'than', 'when', 'where', 'while',
  'after', 'before', 'during', 'through', 'across', 'among', 'between', 'about', 'within',
]);

export interface ScholarshipMetaInput {
  title: string;
  amount?: string | null;
  audience?: string | null;
  region?: string | null;
  openDate?: string | null;
  deadline?: string | null;
}

export type ScholarshipMetaStatus = 'active' | 'future' | 'closed';

/**
 * The clause that answers "when". Every branch states only what the data
 * actually knows — a null deadline means we have not confirmed one, which is
 * not the same claim as "there is no deadline", so it says so that way.
 */
function whenClause(
  s: ScholarshipMetaInput,
  status: ScholarshipMetaStatus,
  fmt: (iso: string) => string,
): string {
  if (status === 'closed') {
    return s.openDate ? `Closed for this cycle. Reopens ${fmt(s.openDate)}.` : 'Closed for this cycle.';
  }
  if (status === 'future') {
    return s.openDate ? `Opens ${fmt(s.openDate)}.` : 'Not open yet — next cycle dates to be announced.';
  }
  if (s.deadline) return `Open now, closes ${fmt(s.deadline)}.`;
  return 'Open now, with no deadline announced.';
}

/**
 * Status-aware description for a scholarship detail page, capped at META_MAX.
 *
 * `fmt` is injected rather than hardcoded so the tests can pin a formatter;
 * callers pass formatListingDate above.
 */
export function scholarshipMeta(
  s: ScholarshipMetaInput,
  status: ScholarshipMetaStatus,
  fmt: (iso: string) => string,
): string {
  const when = whenClause(s, status, fmt);
  const region = !s.region || s.region === 'National' ? '' : ` (${s.region})`;
  const head = s.amount ? `${when} ${s.amount}` : when;
  if (!s.audience) return clampMeta(`${head}${region}${s.amount ? '.' : ''}`);

  // The audience clause is the only elastic part, so it absorbs the clamp: the
  // date and the dollar figure are never the words that get dropped.
  const prefix = s.amount ? `${head} for ` : `${head} `;
  const room = META_MAX - prefix.length - region.length - 1;
  const audience = room > 12 ? clampMeta(s.audience, room) : '';
  if (!audience) return clampMeta(`${head}${region}${s.amount ? '.' : ''}`);
  // The region tag goes on only when the audience clause survived whole, and
  // only when it isn't already named there. Appended to a clamped clause it
  // reads as a fault ("...enrol in an eligible high-demand (Alberta)."), and
  // most audience strings open with "Alberta students" anyway.
  const tag =
    audience === s.audience.trim() && !audience.includes(region.slice(2, -1)) ? region : '';
  return clampMeta(`${prefix}${audience}${tag}.`);
}

/**
 * Programs already carry hand-written editorial descriptions that read well,
 * so this only fixes the truncation and prefixes the deadline when there is a
 * real one — the same "answer the when" reasoning, applied without rewriting
 * copy that is already doing its job.
 */
export function programMeta(
  p: { name: string; provider?: string | null; description?: string | null; deadline?: string | null },
  status: 'active' | 'tba' | 'ongoing' | 'closed',
  fmt: (iso: string) => string,
): string {
  const body =
    p.description?.trim() ||
    `${p.name} is a research program${p.provider ? ` run by ${p.provider}` : ''} for Alberta high school students.`;
  const lead =
    status === 'active' && p.deadline ? `Applications close ${fmt(p.deadline)}. `
    : status === 'ongoing' ? 'Open year-round. '
    : '';
  return clampMeta(`${lead}${body}`);
}

/**
 * Descriptions for a whole scholarship corpus, parallel to `list`.
 *
 * Dropping the award's own name from the description is what buys the room for
 * the date and the amount, but it assumes the remaining facts identify the
 * page — and five Edmonton Public Schools awards share an amount, an audience
 * and both dates, differing only by name. They generated one byte-identical
 * description five times over, which is a worse signal than the redundancy
 * removing the name avoided. So the name goes back on exactly the listings
 * that need it to be distinguishable, and nowhere else.
 *
 * Corpus-wide, so it belongs to the caller that has the whole list —
 * getStaticPaths — rather than to the per-page render.
 */
export function scholarshipMetas(
  list: (ScholarshipMetaInput & { title: string })[],
  statusOf: (s: ScholarshipMetaInput) => ScholarshipMetaStatus,
  fmt: (iso: string) => string,
): string[] {
  const base = list.map((s) => scholarshipMeta(s, statusOf(s), fmt));
  const seen = new Map<string, number>();
  for (const d of base) seen.set(d, (seen.get(d) ?? 0) + 1);
  return base.map((d, i) => {
    if ((seen.get(d) ?? 0) < 2) return d;
    const name = list[i]!.title;
    // Lowercased so the name reads as the subject of the sentence that follows
    // rather than as two sentences jammed together.
    return clampMeta(`${name}: ${d.charAt(0).toLowerCase()}${d.slice(1)}`);
  });
}
