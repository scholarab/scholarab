#!/usr/bin/env node
/**
 * Search click-through before and after a change, measured the one way that
 * survives a shifting query mix.
 *
 * Sitewide CTR moves with which queries the site happens to show for, so on
 * its own it cannot say whether a snippet rewrite worked (2026-08-19 read:
 * "the metric to watch is CTR within position bands 5-10"). This prints, for
 * two windows pulled the same way from the API:
 *
 *   - totals (every impression, including queries Google anonymises)
 *   - CTR by position band, from query x page rows
 *   - CTR by page type (listing, hub, guide, home, other), from page rows
 *   - paired queries: those at positions 5-10 in both windows, the same
 *     searches compared with themselves
 *
 * Hubs and home had no snippet change, so they are the control for the
 * season (September is back-to-school).
 *
 * Usage:
 *   npm run gsc-ctr -- 2026-07-20:2026-08-16 2026-08-31:2026-09-27
 *
 * Writes private/seo-ctr/<after-end>.json (gitignored). Auth: scripts/lib/gsc.ts.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { accessToken, root, searchAnalytics, SITE_URL, type AnalyticsRow } from './lib/gsc.ts';
import { ALL_PROGRAM_FACETS, SCHOLARSHIP_FACETS } from '../src/lib/facets.ts';

const windows = process.argv.slice(2).map(arg => {
  const m = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(arg);
  if (!m) {
    console.error('Usage: npm run gsc-ctr -- <before-start>:<before-end> <after-start>:<after-end>');
    process.exit(1);
  }
  return { start: m[1]!, end: m[2]! };
});
if (windows.length !== 2) {
  console.error('Pass exactly two windows: before and after.');
  process.exit(1);
}

const BANDS = [[1, 3], [4, 4], [5, 7], [8, 10], [11, 20], [21, Infinity]] as const;
const bandOf = (pos: number) => {
  const p = Math.round(pos);
  const band = BANDS.find(([lo, hi]) => p >= lo && p <= hi)!;
  return band[1] === Infinity ? `${band[0]}+` : band[0] === band[1] ? String(band[0]) : `${band[0]}-${band[1]}`;
};

// Left out of the band and paired figures: one page, a government award that
// Alberta Student Aid answers above us, and a quarter of all impressions at
// under half a percent. With it the 8-10 band reads as a snippet problem the
// rest of the site does not have (src/lib/guides.ts, Rutherford entry).
const ZERO_CLICK = ['/guides/alexander-rutherford-scholarship-guide/'];
const zeroClick = (url: string) => ZERO_CLICK.some(p => url.endsWith(p));

const hubs = new Set([
  ...SCHOLARSHIP_FACETS.map(f => `/scholarships/${f.slug}/`),
  ...ALL_PROGRAM_FACETS.map(f => `/programs/${f.slug}/`),
]);
function section(url: string): string {
  const path = url.startsWith(SITE_URL) ? `/${url.slice(SITE_URL.length)}` : new URL(url).pathname;
  const p = path.endsWith('/') ? path : `${path}/`;
  if (p === '/') return 'home';
  if (p.startsWith('/guides/')) return 'guide';
  if (hubs.has(p) || p === '/scholarships/' || p === '/programs/' || /\/combos\/$/.test(p)) return 'hub';
  if (/^\/(scholarships|programs)\/[^/]+\/$/.test(p)) return 'listing';
  return 'other';
}

interface Tally { clicks: number; impressions: number }
const add = (map: Map<string, Tally>, key: string, row: { clicks: number; impressions: number }) => {
  const t = map.get(key) ?? { clicks: 0, impressions: 0 };
  t.clicks += row.clicks;
  t.impressions += row.impressions;
  map.set(key, t);
};
const ctr = (t: Tally | undefined) => (t && t.impressions ? (100 * t.clicks) / t.impressions : 0);

/** Per-query position, impression-weighted across the pages it showed. */
function byQuery(rows: AnalyticsRow[]) {
  const q = new Map<string, { clicks: number; impressions: number; posSum: number }>();
  for (const r of rows) {
    const t = q.get(r.keys[0]!) ?? { clicks: 0, impressions: 0, posSum: 0 };
    t.clicks += r.clicks;
    t.impressions += r.impressions;
    t.posSum += r.position * r.impressions;
    q.set(r.keys[0]!, t);
  }
  return new Map([...q].map(([k, t]) => [k, { clicks: t.clicks, impressions: t.impressions, position: t.posSum / t.impressions }]));
}

const token = await accessToken();
const results = [];
for (const w of windows) {
  const [total] = await searchAnalytics(token, { startDate: w.start, endDate: w.end });
  const rows = await searchAnalytics(token, { startDate: w.start, endDate: w.end, dimensions: ['query', 'page'] });
  // Page type from page rows, not query x page: grouping by query drops every
  // search Google anonymises, which was 70 to 80% of impressions in 2026.
  const pages = await searchAnalytics(token, { startDate: w.start, endDate: w.end, dimensions: ['page'] });
  const bands = new Map<string, Tally>();
  const sections = new Map<string, Tally>();
  const counted = rows.filter(r => !zeroClick(r.keys[1]!));
  for (const r of counted) add(bands, bandOf(r.position), r);
  for (const r of pages) add(sections, section(r.keys[0]!), r);
  results.push({ ...w, total: { clicks: total?.clicks ?? 0, impressions: total?.impressions ?? 0 }, rows: rows.length, bands, sections, queries: byQuery(counted) });
}

const [before, after] = results as [typeof results[0], typeof results[0]];
const inBand = (p: number) => p >= 4.5 && p < 10.5;
const paired = { before: { clicks: 0, impressions: 0 }, after: { clicks: 0, impressions: 0 }, count: 0 };
for (const [query, b] of before.queries) {
  const a = after.queries.get(query);
  if (!a || !inBand(b.position) || !inBand(a.position)) continue;
  paired.count++;
  paired.before.clicks += b.clicks; paired.before.impressions += b.impressions;
  paired.after.clicks += a.clicks; paired.after.impressions += a.impressions;
}

const fmt = (t: Tally | undefined) => t ? `${ctr(t).toFixed(2)}% (${Math.round(t.clicks)}/${Math.round(t.impressions)})` : '-';
const line = (label: string, b: Tally | undefined, a: Tally | undefined) =>
  console.log(`${label.padEnd(18)}${fmt(b).padEnd(26)}${fmt(a)}`);
console.log(`${''.padEnd(18)}${`${before.start}..${before.end}`.padEnd(26)}${after.start}..${after.end}`);
line('all (with anon)', before.total, after.total);
console.log('position band (query x page rows, Rutherford guide left out)');
for (const band of ['1-3', '4', '5-7', '8-10', '11-20', '21+']) line(`  ${band}`, before.bands.get(band), after.bands.get(band));
console.log('page type (page rows, every impression)');
for (const s of ['listing', 'hub', 'guide', 'home', 'other']) line(`  ${s}`, before.sections.get(s), after.sections.get(s));
line(`paired 5-10 (${paired.count}q)`, paired.before, paired.after);

const outDir = join(root, 'private/seo-ctr');
mkdirSync(outDir, { recursive: true });
const plain = (r: typeof before) => ({
  start: r.start, end: r.end, total: r.total, rows: r.rows,
  bands: Object.fromEntries(r.bands), sections: Object.fromEntries(r.sections),
});
writeFileSync(join(outDir, `${after.end}.json`), JSON.stringify({ before: plain(before), after: plain(after), paired }, null, 2) + '\n');
console.log(`\nWrote private/seo-ctr/${after.end}.json`);
