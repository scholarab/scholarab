#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from scholarships + programs (same slugs as getStaticPaths).
 * Run automatically before astro build via npm run build.
 *
 * npm run build pins TZ=America/Edmonton for this script, not just for `astro
 * build`. Both derive "today" from the local clock, and CI/Cloudflare builders
 * run UTC — whose midnight is 6pm in Alberta, so for six hours a night an
 * unpinned run here would date the sitemap a day ahead of the pages it
 * describes and drop listings on their own deadline day.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug, getToday } from '../src/lib/utils.ts';
import { scholarshipIsIndexable, programIsIndexable } from '../src/lib/status.ts';
import { guides } from '../src/lib/guides.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  title: string;
  lastVerified?: string | null;
  active?: boolean;
  [key: string]: unknown;
}

interface Program {
  name: string;
  deadline?: string | null;
  lastVerified?: string | null;
  active?: boolean;
  [key: string]: unknown;
}

const BASE = 'https://www.scholarab.ca';

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

// lastmod comes from the data, not the build date — stamping every URL with
// "today" on each deploy teaches crawlers to ignore it (and churns the diff).
// lastVerified is month precision (YYYY-MM), so pin to the 1st.
function toLastmod(lastVerified: string | null | undefined): string | null {
  if (!lastVerified) return null;
  return /^\d{4}-\d{2}$/.test(lastVerified) ? `${lastVerified}-01` : lastVerified;
}

const siteLastmod = toLastmod(
  [...scholarships, ...programs].map(x => x.lastVerified).filter(Boolean).sort().at(-1)
);

// One clock for the whole run, so a build crossing midnight can't classify the
// first half of the list against one date and the rest against the next.
const today = getToday();

function urlEntry(loc: string, priority: string, lastmod: string | null = siteLastmod): string {
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `  <url><loc>${loc}</loc>${mod}<priority>${priority}</priority></url>`;
}

const lines: string[] = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlEntry(`${BASE}/`, '1.0'),
  urlEntry(`${BASE}/scholarships/`, '0.9'),
  urlEntry(`${BASE}/programs/`, '0.9'),
  urlEntry(`${BASE}/match/`, '0.9'),
  urlEntry(`${BASE}/about/`, '0.8'),
  urlEntry(`${BASE}/educators/`, '0.7'),
  urlEntry(`${BASE}/guides/`, '0.8'),
  urlEntry(`${BASE}/updates/`, '0.5'),
  ...guides.map((g) => urlEntry(`${BASE}/guides/${g.slug}/`, '0.8', g.dateModified)),
  // The sitemap lists exactly the pages we let Google index, so the rule has to
  // be the one [slug].astro noindexes on — which is why both sides import it
  // from status.ts instead of restating it. For scholarships that is
  // status === 'closed'; `active: false` is NOT that rule, because auto-expire
  // sets it the day a deadline passes and the page then renders "OPENS <date>"
  // / "OPENING SOON" for the next cycle. Those are indexable pages answering
  // the site's highest-volume query shape ("when does X open"), and filtering
  // on `active` was hiding 112 of 154 of them. For programs `active: false`
  // does mean retired, and a past dated deadline means the cycle closed before
  // auto-expire rewrote it to TBA — both of those the page noindexes.
  ...scholarships.filter((s) => scholarshipIsIndexable(s, today)).map((s) => urlEntry(`${BASE}/scholarships/${generateSlug(s.title)}/`, '0.85', toLastmod(s.lastVerified) ?? siteLastmod)),
  ...programs.filter((p) => programIsIndexable(p, today)).map((p) => urlEntry(`${BASE}/programs/${generateSlug(p.name)}/`, '0.85', toLastmod(p.lastVerified) ?? siteLastmod)),
  '</urlset>',
];

// Self-check before writing. The sitemap has to list exactly the detail pages
// [slug].astro serves without a noindex — both types: submitting a noindexed
// URL is the "Excluded by 'noindex' tag" error Search Console emails about,
// and omitting an indexable one is how 112 live pages went unlisted for
// months. Programs were only ever checked in the first direction, by a filter
// that didn't match the page's rule. This belongs here rather than in a vitest
// file because the thing being checked is the generated artifact, which is
// gitignored and does not exist until this script runs.
const emitted = new Set(lines.flatMap((l) => [...l.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)));
const audit = <T>(items: T[], indexable: (x: T) => boolean, url: (x: T) => string, label: (x: T) => string) => ({
  missing: items.filter((x) => indexable(x) && !emitted.has(url(x))).map(label),
  noindexed: items.filter((x) => !indexable(x) && emitted.has(url(x))).map(label),
});
const s = audit(scholarships, (x) => scholarshipIsIndexable(x, today), (x) => `${BASE}/scholarships/${generateSlug(x.title)}/`, (x) => x.title);
const p = audit(programs, (x) => programIsIndexable(x, today), (x) => `${BASE}/programs/${generateSlug(x.name)}/`, (x) => x.name);
const missing = [...s.missing, ...p.missing];
const noindexed = [...s.noindexed, ...p.noindexed];
if (missing.length || noindexed.length) {
  if (missing.length) console.error(`Indexable but missing from the sitemap:\n  ${missing.join('\n  ')}`);
  if (noindexed.length) console.error(`Noindexed but listed in the sitemap:\n  ${noindexed.join('\n  ')}`);
  process.exit(1);
}

const outPath = join(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
const n = lines.length - 3; // minus XML declaration and urlset open/close
console.log(`Wrote ${outPath} (${n} URLs, sitemap/noindex invariant checked)`);
