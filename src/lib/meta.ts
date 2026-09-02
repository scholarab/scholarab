// Meta descriptions for the listing detail pages.
//
// The GSC export for 2026-07-20..08-16 shows the whole site sitting at 0.87%
// CTR across 687 impressions in positions 8-10 and 1.38% across 650 in 5-7;
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
 * body; a function declared there is invisible to getStaticPaths, which is
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

/** Google renders roughly this many characters of a title. */
export const TITLE_MAX = 60;

const BRAND_SUFFIX = ' | ScholarAB';

/**
 * A listing's page title, with the brand appended only when it fits.
 *
 * 59 of 308 titles ran past the cut, up to 88 characters, and every one of
 * them was paying 12 characters for a suffix that pushed the award's own name
 * out of the SERP. The brand term is already won; the site ranks first for the
 * exact uncorrected query, so the suffix earns nothing on a title being
 * truncated because of it, and the award name is the part a student is
 * scanning for.
 *
 * A name that is already past TITLE_MAX on its own is returned unchanged.
 * Google will truncate it either way, and cutting a proper name mid-word is a
 * worse snippet than a long one that at least starts correctly.
 *
 * Titles stay unique without a corpus pass here: slugs are validated unique in
 * validate-data.ts and derive from the name, so distinct slugs imply distinct
 * names imply distinct titles. meta.test.ts pins that against the real data.
 */
export function brandedTitle(name: string): string {
  const trimmed = name.trim();
  const full = `${trimmed}${BRAND_SUFFIX}`;
  return full.length <= TITLE_MAX ? full : trimmed;
}

/**
 * The award value as a title fragment, or null when there isn't one worth
 * printing.
 *
 * The amount field is free text and 31 of 153 values are not a plain figure:
 * ranges ("$2,000-$8,000"), caps ("up to $20,000"), a per-year-with-a-total
 * ("$5,000/year (up to $20,000)"), an open-ended "$50,000+", and 15 that read
 * "Varies". A short value goes in verbatim, because the provider's own phrasing
 * is the accurate one and paraphrasing it is how a title starts overstating an
 * award. Only a value too long to sit in a title is reduced, and it reduces to
 * the cap rather than the headline figure, so the number shown is never larger
 * than the award. "Varies" earns nothing in a SERP and is dropped.
 */
export function amountFragment(amount: string | null | undefined): string | null {
  const t = amount?.trim();
  if (!t || !/\$\s*\d/.test(t)) return null;
  // Lowercased so it reads as a continuation of the title rather than the
  // start of a new sentence: "Award: up to $6,000", not "Award: Up to $6,000".
  const verbatim = t.replace(/^Up to /, 'up to ');
  if (verbatim.length <= AMOUNT_MAX) return verbatim;
  const figures = t.match(/\$[\d,]+/g);
  if (!figures) return null;
  return `up to ${figures[figures.length - 1]}`;
}

/** The longest amount string that can sit in a title without dominating it. */
const AMOUNT_MAX = 16;

/**
 * A listing title that spends its leftover budget on the award's value.
 *
 * Measured against the 2026-08-25 Search Console export: 60 of 60 sampled
 * listing titles carried neither a figure nor a year, at a median of 49
 * characters against TITLE_MAX, while the site converted page-one positions at
 * 1.45%. The award name alone does not tell a student whether the result is
 * worth the click, and the money is the one fact that does; 138 of 153
 * scholarships carry a usable figure.
 *
 * No year, deliberately. The obvious source is the deadline, and it is wrong
 * here: 117 of 153 scholarships carry a next-cycle deadline in 2027, so a
 * deadline-derived year would print "2027" on pages whose own copy reads
 * "Opens October 1, 2026", and would contradict the openDate outright on the
 * nine listings whose cycle spans a new year. The year-qualified queries in the
 * export ("rbc ignite scholarship 2026") are asking for the current cycle, and
 * no field on a listing records that. A year worth printing needs a field that
 * means the cycle, not one that happens to contain a date.
 *
 * Falls back to brandedTitle exactly when there is no figure, so a listing that
 * gains or loses an amount moves between the two without a special case.
 */
export function listingTitle(name: string, amount?: string | null): string {
  const trimmed = name.trim();
  const fragment = amountFragment(amount);
  if (!fragment) return brandedTitle(trimmed);
  // Two award names already contain a colon ("Keyera Energy: Peter J. Renton
  // Memorial Scholarship"). A second one reads as a fault, so those take the
  // figure as a parenthetical instead.
  const joined = trimmed.includes(':')
    ? `${trimmed} (${fragment})`
    : `${trimmed}: ${fragment}`;
  for (const candidate of [`${joined}${BRAND_SUFFIX}`, joined]) {
    if (candidate.length <= TITLE_MAX) return candidate;
  }
  // The figure did not fit. The name is what the student is scanning for, so
  // it keeps the room, on the same reasoning brandedTitle drops the suffix.
  return brandedTitle(trimmed);
}

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

  // Nothing may keep less than half the room, whatever else recommends it.
  const floor = max * 0.5;

  // The word cut keeps more text than any other option can, because the last
  // space in the window is always past the last punctuation in it. So it is
  // not the last resort; it is the price list. A nicer boundary is worth
  // having when it costs a few characters and not when it costs fifty, and
  // the first version of this only asked whether the boundary cleared the
  // floor. That accepted a full stop at 79 of 155 over a word boundary at
  // 150, which is how 25 program snippets ended up rendering half a snippet
  // out of descriptions holding 169 to 704 characters.
  const word = wordCut(window, t, max, floor);
  const bar = Math.max(floor, word.length - max * BOUNDARY_SLACK);

  // 1. A finished sentence reads as deliberate copy rather than a cut-off.
  const stop = lastIndexOfAny(window, /[.!?](?=\s)/g);
  const sentence = stop >= 0 ? t.slice(0, stop + 1) : '';
  if (sentence.length >= bar && balanced(sentence)) return sentence;

  // 2. Failing that, a clause boundary: "...who qualify for full-time student
  //    aid" beats "...and enrol in an eligible high-demand".
  const clause = lastIndexOfAny(window, /[,;:](?=\s)/g);
  const clipped = clause >= 0 ? t.slice(0, clause) : '';
  if (clipped.length >= bar && balanced(clipped)) return clipped;

  return word;
}

/**
 * What a boundary may cost, as a share of the budget.
 *
 * At META_MAX that is 38 characters: a full stop landing at 112 or later is
 * kept, and one landing earlier loses to the fuller cut. Google appends its
 * own ellipsis to the fuller cut, so the reader loses a period and gains most
 * of a clause.
 */
const BOUNDARY_SLACK = 0.25;

/**
 * The most text the window can keep: a word boundary, backing off any trailing
 * function word so the snippet does not end on "at an" or "for the".
 */
function wordCut(window: string, t: string, max: number, floor: number): string {
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

/**
 * Function words a snippet should never end on.
 *
 * Exported because metaDetail is written against the same rule: a clipped
 * clause ending "...registered in grade 12 attending Louise Dean School in."
 * is the same visible fault in a SERP, whichever side of the append it came
 * from.
 */
export const DANGLING = new Set([
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
  /**
   * An authored clause appended after the derived snippet, when it fits whole.
   *
   * The derived head answers when and how much, which is what most queries are
   * asking; but 14 listings have a thin audience string and land under 100 of
   * the 155 characters Google will print, leaving up to 85 characters of the
   * snippet empty on a page that is already ranking. This is the differentiator
   * that fills them -- the eligibility bar, the number of awards, how to apply.
   *
   * It never displaces the date or the amount: it is appended, not prefixed,
   * and it is dropped whole rather than truncated. Sentence-cased with its own
   * terminal punctuation.
   */
  metaDetail?: string | null;
}

export type ScholarshipMetaStatus = 'active' | 'future' | 'closed';

/**
 * How far ahead an open date may sit and still be worth the opening clause.
 *
 * The 2026-09-01 export found 133 indexable pages whose description began with
 * a date in 2027: 119 reading "Opens March 1, 2027" and 14 "Opens February 1,
 * 2027", all inherited from the two EducationMatters bulk imports, which carry
 * one cycle date across the whole collection. That is ~27% of the corpus
 * spending its first and most-read clause telling a student in September that
 * there is nothing here for six months, on a site whose CTR was falling (1.56%
 * to 1.35%) while impressions grew 48%.
 *
 * A date inside the horizon is a reason to act and still leads. Past it, the
 * date is true but useless as a hook, so it moves to the trail on the same
 * argument UNDATED_TRAIL is already built on: the amount and the audience are
 * what the query was asking, and the tail is where a truncation costs nothing.
 *
 * A quarter is the span over which a student can actually plan around a date.
 */
export const HORIZON_DAYS = 90;

/**
 * Whole days from `from` to `to`, both ISO calendar dates.
 *
 * Built from the date parts rather than Date.parse so it stays a calendar
 * comparison: the repo pins TZ and never serialises date milliseconds, and a
 * UTC-vs-local parse is exactly how an openDate lands a day out.
 */
export function daysBetween(from: string, to: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!a || !b) return null;
  const ms = (m: RegExpExecArray) => Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * "March 2027" from an ISO date, for the trail.
 *
 * Month precision on purpose. The day in a bulk-imported cycle date is the part
 * least likely to be true, and a trail that reads "opens in March 2027" claims
 * only what the data actually supports.
 */
function monthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  return m ? `${MONTHS[+m[2]! - 1]} ${m[1]}` : '';
}

/**
 * The clause that answers "when". Every branch states only what the data
 * actually knows; a null deadline means we have not confirmed one, which is
 * not the same claim as "there is no deadline", so it says so that way.
 */
function whenClause(
  s: ScholarshipMetaInput,
  status: ScholarshipMetaStatus,
  fmt: (iso: string) => string,
  today?: string | null,
): string {
  if (status === 'closed') {
    return s.openDate ? `Closed for this cycle. Reopens ${fmt(s.openDate)}.` : 'Closed for this cycle.';
  }
  // An undated future cycle has no lead worth spending the opening on, and
  // neither does one dated past HORIZON_DAYS; see UNDATED_TRAIL, distantTrail
  // and scholarshipMeta, which move both to the end instead.
  if (status === 'future') {
    if (!s.openDate) return '';
    return distant(s.openDate, today) ? '' : `Opens ${fmt(s.openDate)}.`;
  }
  if (s.deadline) return `Open now, closes ${fmt(s.deadline)}.`;
  // "Open now, with no deadline announced." spent 36 of 155 characters on the
  // absence of a fact, ahead of the amount and the audience, across 16 pages --
  // one of which was the Rutherford listing, whose own guide correctly says
  // there is no closing deadline at all. "Open now." is the actionable half.
  return 'Open now.';
}

/** Whether an open date sits beyond the horizon. Unknown `today` means no. */
function distant(openDate: string, today?: string | null): boolean {
  if (!today) return false;
  const d = daysBetween(today, openDate);
  return d !== null && d > HORIZON_DAYS;
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
  today?: string | null,
): string {
  const when = whenClause(s, status, fmt, today);
  const region = !s.region || s.region === 'National' ? '' : ` (${s.region})`;
  // With no date to lead on, the amount has to be a printable figure or there
  // is nothing to put in front of the audience: "Varies for Alberta golfers"
  // opens a SERP snippet on a word that answers nothing. Everywhere else the
  // raw amount still follows a date clause, where it reads fine, so only the
  // undated branch is filtered.
  // amountFragment lowercases "Up to" for listingTitle, where the fragment
  // continues a title after a colon. Here it opens the sentence instead, so the
  // capital goes back on: four live snippets began "up to $6,000 for ...".
  const fragment = amountFragment(s.amount);
  const money = when
    ? s.amount
    : fragment && fragment.charAt(0).toUpperCase() + fragment.slice(1);
  const head = money ? (when ? `${when} ${money}` : money) : when;
  // The tail that replaces the old "Not open yet." opener, appended at the end
  // where a truncation costs nothing. 73 of 153 listings are curator-closed
  // with no openDate, so that phrase opened 18% of the sampled snippets in the
  // 2026-08-25 export, on a site converting page-one positions at 1.45%. It
  // spent 46 of 155 characters saying the cycle dates are unknown, ahead of the
  // amount and the audience, which are the facts a student is scanning for.
  // Two shapes of future cycle reach here with no lead: one whose dates are
  // genuinely unknown, and one whose date is known but too far out to lead on.
  // They are different claims, so they get different tails.
  const trail =
    when || status !== 'future'
      ? ''
      : s.openDate && distant(s.openDate, today)
        ? `Next cycle opens ${monthYear(s.openDate)}.`
        : UNDATED_TRAIL;
  // Ordered ahead of the trail deliberately: where only one of the two fits,
  // a fact about the award beats a note that its dates are unknown.
  const detail = s.metaDetail?.trim() || '';
  const tails = (body: string) => withTrail(withTrail(body, detail), trail);

  if (!s.audience) return tails(clampMeta(`${head}${region}${money ? '.' : ''}`));

  // The audience clause is the only elastic part, so it absorbs the clamp: the
  // date and the dollar figure are never the words that get dropped. Nothing is
  // reserved for the trail, because reserving it is what makes the audience cut
  // short: budgeting 39 characters for "Next cycle dates are not announced yet"
  // is what turns "...enrol in an eligible high-demand program" into "...an
  // eligible high-demand." The trail is worth less than the clause it would
  // truncate, so it goes on only if the audience survives whole -- the same
  // test the region tag below already applies, for the same reason.
  const prefix = money ? `${head} for ` : head ? `${head} ` : '';
  const room = META_MAX - prefix.length - region.length - 1;
  const audience = room > 12 ? clampMeta(s.audience, room) : '';
  if (!audience) return tails(clampMeta(`${head}${region}${money ? '.' : ''}`));
  // The region tag goes on only when the audience clause survived whole, and
  // only when it isn't already named there. Appended to a clamped clause it
  // reads as a fault ("...enrol in an eligible high-demand (Alberta)."), and
  // most audience strings open with "Alberta students" anyway.
  const whole = audience === s.audience.trim();
  const tag = whole && !audience.includes(region.slice(2, -1)) ? region : '';
  // Both tails ride on the same gate as the region tag: a clause appended to an
  // already-truncated audience reads as a fault, whichever clause it is.
  const body = clampMeta(`${prefix}${audience}${tag}.`);
  return whole ? tails(body) : body;
}

/** What an undated next cycle says, once it is out of the opening position. */
const UNDATED_TRAIL = 'Next cycle dates are not announced yet.';

/** Append `trail` when it fits whole; a half-printed tail is worse than none. */
function withTrail(body: string, trail: string): string {
  if (!trail) return body;
  return body.length + 1 + trail.length <= META_MAX ? `${body} ${trail}` : body;
}

/**
 * As many whole sentences of `text` as fit in `max`, or '' if not even the
 * first one does.
 *
 * Splits only where a terminator is followed by whitespace, so a period inside
 * a token survives: an earlier version matched sentences with a character class
 * and silently dropped "biogenius" out of "biogenius.ca", because the text
 * between two unmatched positions is simply skipped. This one is a split, so
 * every character is accounted for by construction.
 */
export function wholeSentences(text: string, max: number): string {
  let out = '';
  for (const part of text.split(/(?<=[.!?])\s+/)) {
    const sentence = part.trim();
    if (!sentence) continue;
    // A final run with no terminator is a fragment, not a sentence, and adding
    // it is the truncation this exists to avoid.
    if (!/[.!?]$/.test(sentence)) break;
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  return out;
}

/**
 * Meta description for a program detail page.
 *
 * The program corpus is hand-written editorial prose, and clampMeta was tuned
 * against the scholarship corpus, which is assembled fragments. The mismatch
 * showed: 78 of 132 built program snippets (59%) ended mid-clause on the
 * 2026-08-25 build, on "...race miniature compressed-air powered" and
 * "...direct exposure to clinical environments, health administration".
 * clampMeta was not misbehaving. Its sentence branch requires the boundary to
 * land within BOUNDARY_SLACK of the word cut, which is right when a short first
 * sentence is a fragment of a longer assembled string, and wrong here, where it
 * is a finished editorial thought and the word cut is 60 characters further on.
 *
 * So a program prefers whole sentences and only clamps when they will not do,
 * subject to a floor: below it the complete thought is so much thinner than the
 * clamped text that the clamp, ragged ending and all, tells the reader more.
 * Without one, a 174-character description renders as "Discontinued."
 * That moves 8 listings off a ragged ending, to 54 of 124 finishing on a
 * complete thought; the rest still clamp, and
 * validate-data lists them, because the real fix for those is an authored
 * `metaDescription` rather than a cleverer cut.
 */
export function programMeta(
  p: {
    name: string;
    provider?: string | null;
    description?: string | null;
    metaDescription?: string | null;
    deadline?: string | null;
  },
  status: 'active' | 'tba' | 'ongoing' | 'closed',
  fmt: (iso: string) => string,
): string {
  const lead =
    status === 'active' && p.deadline ? `Applications close ${fmt(p.deadline)}. `
    : status === 'ongoing' ? 'Open year-round. '
    : '';
  // An authored snippet is the whole answer and is never second-guessed; it is
  // still clamped, so a long one cannot silently overrun the budget.
  const authored = p.metaDescription?.trim();
  if (authored) return clampMeta(`${lead}${authored}`);

  const body =
    p.description?.trim() ||
    `${p.name} is a research program${p.provider ? ` run by ${p.provider}` : ''} for Alberta high school students.`;
  const whole = wholeSentences(body, META_MAX - lead.length);
  if (whole.length >= SENTENCE_FLOOR) return `${lead}${whole}`;
  return clampMeta(`${lead}${body}`);
}

/**
 * The shortest a whole-sentence snippet may be before clamping wins instead.
 *
 * Tied to the guard meta.test.ts already enforces: a description longer than
 * META_MAX must never render under 100 characters, which is the rule that
 * caught the clamp settling for the first boundary it found. A whole-sentence
 * snippet is subject to it too, so this sits one character above it rather than
 * at a floor of its own. Eleven listings whose first sentence lands in the 78
 * to 100 range clamp because of it; that is the established trade and this is
 * not the place to reopen it.
 */
const SENTENCE_FLOOR = 101;

/**
 * Descriptions for a whole scholarship corpus, parallel to `list`.
 *
 * Dropping the award's own name from the description is what buys the room for
 * the date and the amount, but it assumes the remaining facts identify the
 * page, and five Edmonton Public Schools awards share an amount, an audience
 * and both dates, differing only by name. They generated one byte-identical
 * description five times over, which is a worse signal than the redundancy
 * removing the name avoided. So the name goes back on exactly the listings
 * that need it to be distinguishable, and nowhere else.
 *
 * Corpus-wide, so it belongs to the caller that has the whole list;
 * getStaticPaths; rather than to the per-page render.
 */
export function scholarshipMetas(
  list: (ScholarshipMetaInput & { title: string })[],
  statusOf: (s: ScholarshipMetaInput) => ScholarshipMetaStatus,
  fmt: (iso: string) => string,
  today?: string | null,
): string[] {
  const base = list.map((s) => scholarshipMeta(s, statusOf(s), fmt, today));
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
