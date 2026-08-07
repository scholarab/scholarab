#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from scholarships + programs (same slugs as getStaticPaths).
 * Run automatically before astro build via npm run build.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug, getToday } from '../src/lib/utils.ts';
import { scholarshipStatusOf } from '../src/lib/status.ts';
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

/** Scholarships the detail page will serve without a noindex — see the note below. */
function isIndexable(items: Scholarship[]): Scholarship[] {
  return items.filter(
    (s) => scholarshipStatusOf(s, getToday()) !== 'closed'
  );
}

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
  // be the one [slug].astro noindexes on: status === 'closed'. `active: false`
  // is NOT that rule — auto-expire sets it the day a deadline passes, and the
  // page then renders "OPENS <date>" / "OPENING SOON" for the next cycle. Those
  // are indexable pages answering the site's highest-volume query shape ("when
  // does X open"), and filtering on `active` was hiding 112 of 154 of them.
  // Only a past deadline with no future openDate is a genuine expired offer,
  // which is the Soft 404 case this filter exists to keep out.
  ...isIndexable(scholarships).map((s) => urlEntry(`${BASE}/scholarships/${generateSlug(s.title)}/`, '0.85', toLastmod(s.lastVerified) ?? siteLastmod)),
  ...programs.filter((p) => p.active !== false).map((p) => urlEntry(`${BASE}/programs/${generateSlug(p.name)}/`, '0.85', toLastmod(p.lastVerified) ?? siteLastmod)),
  '</urlset>',
];

const outPath = join(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
const n = lines.length - 3; // minus XML declaration and urlset open/close
console.log(`Wrote ${outPath} (${n} URLs)`);
