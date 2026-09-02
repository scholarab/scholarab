#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from scholarships + programs (same slugs as getStaticPaths).
 * Run automatically before astro build via npm run build.
 *
 * npm run build pins TZ=America/Edmonton for this script, not just for `astro
 * build`. Both derive "today" from the local clock, and CI/Cloudflare builders
 * run UTC, whose midnight is 6pm in Alberta, so for six hours a night an
 * unpinned run here would date the sitemap a day ahead of the pages it
 * describes and drop listings on their own deadline day.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug, getToday } from '../src/lib/utils.ts';
import { scholarshipIsIndexable, programIsIndexable } from '../src/lib/status.ts';
import { guides } from '../src/lib/guides.ts';
import { SCHOLARSHIP_FACETS, PROGRAM_FACETS, facetItems, MIN_FACET_ITEMS } from '../src/lib/facets.ts';
import { fingerprint, stampAll, newest, type LastmodManifest } from '../src/lib/lastmod.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  title: string;
  lastVerified?: string | null;
  active?: boolean;
  region?: string | null;
  /** Extra region hubs, beyond `region`. See Scholarship.alsoOpenTo in data-loader.ts. */
  alsoOpenTo?: string[] | null;
  category?: string | null;
  // region/category are declared even though the index signature would cover
  // them, because it would cover them as `unknown` -- and `unknown` is not
  // assignable to facetItems' `string | null | undefined`. Leaving them
  // implicit is what broke the scripts typecheck.
  [key: string]: unknown;
}

interface Program {
  name: string;
  deadline?: string | null;
  lastVerified?: string | null;
  active?: boolean;
  region?: string | null;
  category?: string | null;
  [key: string]: unknown;
}

const BASE = 'https://www.scholarab.ca';

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

// One clock for the whole run, so a build crossing midnight can't classify the
// first half of the list against one date and the rest against the next.
const today = getToday();
// en-CA is YYYY-MM-DD, and npm run build pins TZ, so this is the Alberta date.
const todayISO = today.toLocaleDateString('en-CA');

const scholarshipPath = (s: Scholarship) => `/scholarships/${generateSlug(s.title)}/`;
const programPath = (p: Program) => `/programs/${generateSlug(p.name)}/`;

const indexableScholarships = scholarships.filter((s) => scholarshipIsIndexable(s, today));
const indexablePrograms = programs.filter((p) => programIsIndexable(p, today));

// The pages whose text is written by hand rather than assembled from the data.
// Their source file IS their content, so that is what gets fingerprinted; a
// class rename would move the date a day early, which is the harmless
// direction. Everything else here either lists the corpus (so it moves when
// the corpus moves) or is a listing in it.
const PROSE_PAGES: Record<string, string> = {
  '/about/': 'src/pages/about.astro',
  '/privacy/': 'src/pages/privacy.astro',
  '/terms/': 'src/pages/terms.astro',
  '/templates/reference-letter/': 'src/pages/templates/reference-letter.astro',
};

// lastmod is the day the page's content last changed, carried in
// src/data/lastmod.json. See src/lib/lastmod.ts for why it is neither the
// build date nor lastVerified: the old rule derived it from lastVerified,
// which is month precision, and 299 of 308 URLs read 2026-08-01 as a result.
const MANIFEST_PATH = join(__dirname, '../src/data/lastmod.json');
const previous: LastmodManifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  : {};

const manifest = stampAll(
  previous,
  [
    ...indexableScholarships.map((s) => ({ url: scholarshipPath(s), hash: fingerprint(s) })),
    ...indexablePrograms.map((p) => ({ url: programPath(p), hash: fingerprint(p) })),
    ...Object.entries(PROSE_PAGES).map(([url, file]) => ({
      url,
      hash: fingerprint(readFileSync(join(__dirname, '..', file), 'utf8')),
    })),
  ],
  todayISO,
);
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const modOf = (path: string): string | null => manifest[path]?.date ?? null;

// A page assembled from the whole corpus moves when anything in it moves.
const corpusLastmod = newest([
  ...indexableScholarships.map((s) => modOf(scholarshipPath(s))),
  ...indexablePrograms.map((p) => modOf(programPath(p))),
  ...guides.map((g) => g.dateModified),
]);

function urlEntry(loc: string, priority: string, lastmod: string | null = corpusLastmod): string {
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `  <url><loc>${loc}</loc>${mod}<priority>${priority}</priority></url>`;
}

const lines: string[] = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlEntry(`${BASE}/`, '1.0'),
  urlEntry(`${BASE}/scholarships/`, '0.9'),
  urlEntry(`${BASE}/programs/`, '0.9'),
  // Was 0.9, level with the two directories. It should not be: /match is a
  // tool, not a document. Its useful state is one a crawler can never reach --
  // the results only exist after six answers in a React island -- so what
  // Google indexes is the explainer, not the thing the page is for. 0.5 says
  // that: crawl it, rank it on its own words, do not weigh it against pages
  // that are all content.
  urlEntry(`${BASE}/match/`, '0.5'),
  urlEntry(`${BASE}/about/`, '0.8', modOf('/about/')),
  urlEntry(`${BASE}/educators/`, '0.7'),
  urlEntry(`${BASE}/guides/`, '0.8'),
  // The deadline calendar indexes the same corpus on the one axis the two
  // directories can't express, so it ranks beside them rather than under them.
  urlEntry(`${BASE}/deadlines/`, '0.8'),
  // The reference-letter template: the one page here that is an artefact
  // rather than an explainer, and the one most likely to be linked from
  // outside by a counsellor sending it to a class.
  urlEntry(`${BASE}/templates/reference-letter/`, '0.7', modOf('/templates/reference-letter/')),
  urlEntry(`${BASE}/updates/`, '0.5'),
  // Low priority, but listed: it is a real indexable page, and the sitemap is
  // supposed to be exactly the set of those.
  urlEntry(`${BASE}/privacy/`, '0.3', modOf('/privacy/')),
  urlEntry(`${BASE}/terms/`, '0.3', modOf('/terms/')),
  ...guides.map((g) => urlEntry(`${BASE}/guides/${g.slug}/`, '0.8', g.dateModified)),
  // The sitemap lists exactly the pages we let Google index, so the rule has to
  // be the one [slug].astro noindexes on, which is why both sides import it
  // from status.ts instead of restating it. For scholarships that is
  // status === 'closed'; `active: false` is NOT that rule, because auto-expire
  // sets it the day a deadline passes and the page then renders "OPENS <date>"
  // / "OPENING SOON" for the next cycle. Those are indexable pages answering
  // the site's highest-volume query shape ("when does X open"), and filtering
  // on `active` was hiding 112 of 154 of them. For programs `active: false`
  // does mean retired, and a past dated deadline means the cycle closed before
  // auto-expire rewrote it to TBA; both of those the page noindexes.
  // Facet hubs sit above the individual listings and below the two directory
  // indexes: they are the pages the geo and category queries should land on.
  // The MIN_FACET_ITEMS floor is applied here for the same reason the routes
  // apply it -- a hub too small to build must not be advertised either, or the
  // sitemap points at a 404.
  // A hub is exactly its members, so it is as fresh as the freshest of them.
  ...SCHOLARSHIP_FACETS
    .map((f) => ({ f, items: facetItems(f, scholarships) }))
    .filter(({ items }) => items.length >= MIN_FACET_ITEMS)
    .map(({ f, items }) =>
      urlEntry(`${BASE}/scholarships/${f.slug}/`, '0.8', newest(items.map((s) => modOf(scholarshipPath(s)))))),
  ...PROGRAM_FACETS
    .map((f) => ({ f, items: facetItems(f, indexablePrograms) }))
    .filter(({ items }) => items.length >= MIN_FACET_ITEMS)
    .map(({ f, items }) =>
      urlEntry(`${BASE}/programs/${f.slug}/`, '0.8', newest(items.map((p) => modOf(programPath(p)))))),
  ...indexableScholarships.map((s) => urlEntry(`${BASE}${scholarshipPath(s)}`, '0.85', modOf(scholarshipPath(s)))),
  ...indexablePrograms.map((p) => urlEntry(`${BASE}${programPath(p)}`, '0.85', modOf(programPath(p)))),
  '</urlset>',
];

// Self-check before writing. The sitemap has to list exactly the detail pages
// [slug].astro serves without a noindex; both types: submitting a noindexed
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
