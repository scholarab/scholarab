// Per-URL lastmod: what changed, and when it actually changed.
//
// The sitemap used to take every listing's lastmod from `lastVerified`, which
// is month precision, so 299 of 308 URLs read 2026-08-01, including five
// listings rewritten on the 23rd, stamped 22 days before the edit. A date that
// cannot move inside a month says nothing about a same-month change, and
// same-month changes are most of what this site does. The other obvious
// option, the build date, is worse: stamping all 308 URLs on every deploy is
// how a crawler learns to ignore the field entirely.
//
// So the date comes from the content. Fingerprint what each page is rendered
// from, and move its date only when the fingerprint moves. That needs the
// previous fingerprint to exist, which is why src/data/lastmod.json is
// committed rather than derived at build time: a build that cannot see the
// previous state cannot tell "changed today" from "seen for the first time".
//
// The fingerprint covers the data a page is rendered from, not the template
// that renders it. A template edit therefore does not move any date, which is
// deliberate: a snippet or layout change touches all 308 pages at once, and
// re-announcing the whole site is exactly the churn this exists to stop.
//
// No imports, same constraint as status.ts and cross-links.ts: the build
// scripts run this under a plain tsc that must not pull in data-loader's
// import.meta.env.

export interface LastmodEntry {
  /** Fingerprint of everything the page renders from. */
  hash: string;
  /** YYYY-MM-DD, the day that fingerprint first appeared. */
  date: string;
}

export type LastmodManifest = Record<string, LastmodEntry>;

/** JSON with object keys in a fixed order, so key order can't fake a change. */
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
}

/** FNV-1a, 32 bits. */
function fnv1a(s: string, basis: number): number {
  let h = basis;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * A short digest of anything: a listing record, or a page's source text.
 *
 * Two FNV passes from different offset bases, because one 32-bit digest across
 * ~300 records is inside birthday range. This is not a security hash and does
 * not need to be; the only cost of a collision is one page not advertising one
 * edit.
 */
export function fingerprint(value: unknown): string {
  const s = typeof value === 'string' ? value : stable(value);
  return (
    fnv1a(s, 0x811c9dc5).toString(16).padStart(8, '0') +
    fnv1a(s, 0x9dc5811c).toString(16).padStart(8, '0')
  );
}

/**
 * Carry forward every unchanged date, stamp `today` on the rest.
 *
 * URLs absent from `entries` are dropped: a listing that was renamed or
 * retired is a URL that no longer exists, and keeping it would grow the file
 * forever. A URL that comes back gets today, which is true; the page did
 * change that day.
 */
export function stampAll(
  prev: LastmodManifest,
  entries: readonly { url: string; hash: string }[],
  today: string,
): LastmodManifest {
  const next: LastmodManifest = {};
  for (const { url, hash } of [...entries].sort((a, b) => a.url.localeCompare(b.url))) {
    const before = prev[url];
    next[url] = before && before.hash === hash ? before : { hash, date: today };
  }
  return next;
}

/** The most recent of a set of dates, or null if there are none. */
export function newest(dates: readonly (string | null | undefined)[]): string | null {
  return dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
}
