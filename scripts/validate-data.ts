#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug } from '../src/lib/utils.ts';
import { programMeta, scholarshipMetas, formatListingDate, META_MAX } from '../src/lib/meta.ts';
import { scholarshipStatusOf } from '../src/lib/status.ts';
import {
  RESERVED_SCHOLARSHIP_SLUGS,
  RESERVED_PROGRAM_SLUGS,
  SCHOLARSHIP_CATEGORIES,
  PROGRAM_CATEGORIES,
  SCHOLARSHIP_FACETS,
  PROGRAM_FACETS,
  facetItems,
  MIN_FACET_ITEMS,
} from '../src/lib/facets.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  id?: number | string | null;
  title?: string;
  amount?: string;
  url?: string;
  deadline?: string;
  openDate?: string;
  description?: string;
  notes?: string | null;
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
  id?: number | string | null;
  name?: string;
  url?: string;
  deadline?: string;
  description?: string;
  /** An authored meta description, overriding whatever programMeta derives. */
  metaDescription?: string;
  region?: string | null;
  category?: string | null;
  [key: string]: unknown;
}

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

let failed = false;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isHttpUrl(u: unknown): boolean {
  try {
    const p = new URL(String(u).trim()).protocol;
    return p === 'http:' || p === 'https:';
  } catch {
    return false;
  }
}

function isValidDate(str: string): boolean {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
}

// ── Scholarship IDs must be unique ──────────────────────────────────────────
const schIds = new Map<number | string, string[]>();
for (const s of scholarships) {
  if (s.id === undefined || s.id === null) {
    console.error(`Scholarship "${s.title}": missing id`);
    failed = true;
    continue;
  }
  if (!schIds.has(s.id)) schIds.set(s.id, []);
  (schIds.get(s.id) ?? []).push(s.title ?? '');
}
for (const [id, titles] of schIds) {
  if (titles.length > 1) {
    console.error(`Duplicate scholarship id ${id}: "${titles.join('", "')}"`);
    failed = true;
  }
}

// ── Program IDs must be unique ───────────────────────────────────────────────
const progIds = new Map<number | string, string[]>();
for (const p of programs) {
  if (p.id === undefined || p.id === null) {
    console.error(`Program "${p.name}": missing id`);
    failed = true;
    continue;
  }
  if (!progIds.has(p.id)) progIds.set(p.id, []);
  (progIds.get(p.id) ?? []).push(p.name ?? '');
}
for (const [id, names] of progIds) {
  if (names.length > 1) {
    console.error(`Duplicate program id ${id}: "${names.join('", "')}"`);
    failed = true;
  }
}

// ── Scholarship slugs must be unique ────────────────────────────────────────
const schSlugs = new Map<string, Array<number | string>>();
for (const s of scholarships) {
  if (!s.title || String(s.title).trim() === '') {
    console.error(`Scholarship [${s.id}]: missing title`);
    failed = true;
    continue;
  }
  const g = generateSlug(s.title);
  if (!g) {
    console.error(`Scholarship [${s.id}] "${s.title}": slug is empty after normalization`);
    failed = true;
    continue;
  }
  if (!schSlugs.has(g)) schSlugs.set(g, []);
  (schSlugs.get(g) ?? []).push(s.id!);
}
for (const [slug, ids] of schSlugs) {
  if (ids.length > 1) {
    console.error(`Duplicate scholarship slug "${slug}": ids ${ids.join(', ')}`);
    failed = true;
  }
}

// ── Program slugs must be unique ────────────────────────────────────────────
const progSlugs = new Map<string, Array<number | string>>();
for (const p of programs) {
  if (!p.name || String(p.name).trim() === '') {
    console.error(`Program [${p.id}]: missing name`);
    failed = true;
    continue;
  }
  const g = generateSlug(p.name);
  if (!g) {
    console.error(`Program [${p.id}] "${p.name}": slug is empty after normalization`);
    failed = true;
    continue;
  }
  if (!progSlugs.has(g)) progSlugs.set(g, []);
  (progSlugs.get(g) ?? []).push(p.id!);
}
for (const [slug, ids] of progSlugs) {
  if (ids.length > 1) {
    console.error(`Duplicate program slug "${slug}": ids ${ids.join(', ')}`);
    failed = true;
  }
}

// ── The same thing must not be listed on both sides ─────────────────────────
//
// Each dataset checked its own slugs and neither looked across, so Breakthrough
// Junior Challenge lived as both a scholarship and a program: two indexable
// pages, one provider URL, one deadline, splitting the same query between them
// at positions 6.9 and 7.7, with descriptions that disagreed on the video
// length. Resolving it cost a deleted listing and a permanent redirect, which
// is the expensive version of a check that costs nothing here.
//
// Slug collision rather than exact-name, so "CyberTitan" and "Cybertitan" trip
// it too. The fix is a curation decision, which side the listing belongs on;
// so this names both ids and leaves the choice to a human.
for (const [slug, schIds] of schSlugs) {
  const progIds = progSlugs.get(slug);
  if (progIds?.length) {
    console.error(
      `"${slug}" is listed as both a scholarship (id ${schIds.join(', ')}) and a program ` +
      `(id ${progIds.join(', ')}). Two indexable pages for one thing compete with each other. ` +
      `keep one and add a 301 from the other (both slash forms).`
    );
    failed = true;
  }
}

// ── Scholarship field checks ─────────────────────────────────────────────────
for (const s of scholarships) {
  const tag = `Scholarship [${s.id}] "${s.title}"`;

  if (!s.amount || String(s.amount).trim() === '') {
    console.error(`${tag}: missing amount`);
    failed = true;
  }

  if (!s.url || String(s.url).trim() === '') {
    console.error(`${tag}: missing url`);
    failed = true;
  } else if (!isHttpUrl(s.url)) {
    console.error(`${tag}: url must be http(s): ${s.url}`);
    failed = true;
  }

  if (s.deadline && !isValidDate(s.deadline)) {
    console.error(`${tag}: deadline must be YYYY-MM-DD, got: ${s.deadline}`);
    failed = true;
  }

  if (s.openDate && !isValidDate(s.openDate)) {
    console.error(`${tag}: openDate must be YYYY-MM-DD, got: ${s.openDate}`);
    failed = true;
  }

  // An openDate later than the deadline is always a leftover from a corrected
  // cycle, and it is invisible without this check: scholarshipStatusOf tests
  // openDate first, so the listing reports "future" forever and the detail page
  // prints "Opens <spring date>" directly beneath an earlier deadline. That is
  // exactly how the Cypress County bursary hid a deadline 27 days out. Fix it by
  // dropping the openDate, never by inventing a new one.
  if (s.openDate && s.deadline && isValidDate(s.openDate) && isValidDate(s.deadline) && s.openDate > s.deadline) {
    console.error(`${tag}: openDate ${s.openDate} is after deadline ${s.deadline}`);
    failed = true;
  }
}

// ── Program field checks ─────────────────────────────────────────────────────
for (const p of programs) {
  const tag = `Program [${p.id}] "${p.name}"`;

  if (!p.url || String(p.url).trim() === '') {
    console.error(`${tag}: missing url`);
    failed = true;
  } else if (!isHttpUrl(p.url)) {
    console.error(`${tag}: url must be http(s): ${p.url}`);
    failed = true;
  }

  if (p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' && !isValidDate(p.deadline)) {
    console.error(`${tag}: deadline must be YYYY-MM-DD (or "TBA"/"Ongoing"), got: ${p.deadline}`);
    failed = true;
  }
}

// ── a category must be one somebody declared ────────────────────────────────
// The chip rows and the hubs are both facet-driven, so a listing filed under a
// category that is not in the vocabulary is not merely untidy: it draws no
// chip, belongs to no hub, gets no breadcrumb, and can only be found by
// scrolling the directory or guessing its name in the search box. It is also
// exactly what the admin panel's own dropdown invites, offering nine
// categories this project has never used. Fail here rather than ship a listing
// nothing links to.
const schCategories = new Set<string>(SCHOLARSHIP_CATEGORIES);
for (const s of scholarships) {
  if (!s.category || !schCategories.has(String(s.category))) {
    console.error(
      `Scholarship [${s.id}] "${s.title}": category ${JSON.stringify(s.category)} is not one of ` +
        `${SCHOLARSHIP_CATEGORIES.join(', ')}`,
    );
    failed = true;
  }
}
const progCategories = new Set<string>(PROGRAM_CATEGORIES);
for (const p of programs) {
  if (!p.category || !progCategories.has(String(p.category))) {
    console.error(
      `Program [${p.id}] "${p.name}": category ${JSON.stringify(p.category)} is not one of ` +
        `${PROGRAM_CATEGORIES.join(', ')}`,
    );
    failed = true;
  }
}

// ── public/_redirects ────────────────────────────────────────────────────────
// Renames are the only reason a detail URL ever moves, so this file is the
// site's whole memory of its own history. Four ways it silently rots, each of
// which cost real indexed URLs before this check existed:
//
//  1. A target that no longer exists; the rename gets renamed again, and the
//     301 lands on a 404.
//  2. A target that is a bare directory. Google reads a redirect onto a
//     category page as a Soft 404 and drops it, so it buys nothing a real 404
//     doesn't. Delete the rule and let 404.astro do its job.
//  3. Only one of the two slash forms. Cloudflare Pages 308-normalises a bare
//     path only when the slashed page exists as a built asset, and a renamed
//     slug has no asset, so /old-slug hard-404s while /old-slug/ redirects.
//  4. A source that is also a live page, which shadows the real listing.
const STATIC_ROUTES = new Set([
  '/', '/scholarships/', '/programs/', '/match/', '/about/', '/educators/',
  '/guides/', '/updates/', '/saved/', '/deadlines/', '/templates/reference-letter/',
]);
const livePaths = new Set([
  ...scholarships.map((s) => `/scholarships/${generateSlug(String(s.title))}/`),
  ...programs.map((p) => `/programs/${generateSlug(String(p.name))}/`),
  // The facet hubs are live pages too, and a guide linking one is the whole
  // point of the `guide` pairing in the registry. They are built subject to
  // MIN_FACET_ITEMS, so the same floor is applied here: a link to a hub too
  // small to build has to fail exactly as loudly as a link to a dead listing.
  ...SCHOLARSHIP_FACETS
    .filter((f) => facetItems(f, scholarships).length >= MIN_FACET_ITEMS)
    .map((f) => `/scholarships/${f.slug}/`),
  ...PROGRAM_FACETS
    .filter((f) => facetItems(f, programs).length >= MIN_FACET_ITEMS)
    .map((f) => `/programs/${f.slug}/`),
]);

const redirectsPath = join(__dirname, '../public/_redirects');
const rules = readFileSync(redirectsPath, 'utf8')
  .split('\n')
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter((r) => r.line !== '' && !r.line.startsWith('#'))
  .map((r) => {
    const [from, to, code] = r.line.split(/\s+/);
    return { ...r, from: from ?? '', to: to ?? '', code: code ?? '' };
  });

const sources = new Set(rules.map((r) => r.from));
for (const r of rules) {
  const tag = `_redirects:${r.n}`;

  if (r.to.startsWith('/') && !r.to.startsWith('/guides/')) {
    if (STATIC_ROUTES.has(r.to) && (r.to === '/scholarships/' || r.to === '/programs/')) {
      console.error(`${tag}: ${r.from} redirects to the ${r.to} index. Google logs that as a Soft 404. Drop the rule and let it 404.`);
      failed = true;
    } else if (!livePaths.has(r.to) && !STATIC_ROUTES.has(r.to)) {
      console.error(`${tag}: ${r.from} redirects to ${r.to}, which is not a page any more`);
      failed = true;
    }
  }

  const twin = r.from.endsWith('/') ? r.from.slice(0, -1) : `${r.from}/`;
  if (!sources.has(twin)) {
    console.error(`${tag}: ${r.from} has no ${r.from.endsWith('/') ? 'no-slash' : 'trailing-slash'} twin, so half of this rename 404s`);
    failed = true;
  }

  const asPage = r.from.endsWith('/') ? r.from : `${r.from}/`;
  if (livePaths.has(asPage)) {
    console.error(`${tag}: ${r.from} is a live listing. This rule shadows its own page`);
    failed = true;
  }

  if (r.code !== '301') {
    console.error(`${tag}: ${r.from} is a ${r.code || 'missing'} redirect; renames should be 301 so the target inherits the ranking`);
    failed = true;
  }
}

// ── notes must add to the description, not repeat it ─────────────────────────
// Both render as adjacent paragraphs under "ABOUT THIS SCHOLARSHIP". The
// descriptions were rewritten into prose at some point and absorbed what the
// notes said, but the notes stayed, so 17 listings printed the same sentence
// twice, a few lines apart. A sentence is a repeat when nearly every word it
// carries already appears in one description sentence.
const NOISE = new Set(
  "a an the of to and or in for from with on at by is are be as this that their they you your it its must apply applicants students student who".split(' '),
);
const sentencesOf = (t: string): string[] =>
  t.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const contentWords = (t: string): Set<string> =>
  new Set((t.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(w => !NOISE.has(w)));

for (const s of scholarships) {
  if (!s.notes || !s.description) continue;
  const descSentences = sentencesOf(s.description).map(contentWords);
  for (const sentence of sentencesOf(s.notes)) {
    const words = contentWords(sentence);
    if (words.size === 0) continue;
    const covered = Math.max(
      0,
      ...descSentences.map(d => [...words].filter(w => d.has(w)).length / words.size),
    );
    if (covered >= 0.7) {
      console.error(
        `notes: "${s.title}" repeats its description: "${sentence}" is ${Math.round(covered * 100)}% already said above`,
      );
      failed = true;
    }
  }
}

// ── a listing slug may not collide with a facet hub slug ────────────────────
//
// src/pages/scholarships/[facet].astro sits at /scholarships/<x>/, the same
// shape as the detail route, and wins route precedence over it. So a listing
// that slugged to 'trades' would not merely be confusing; its detail page
// would stop being built at all, silently, and the sitemap would keep pointing
// at the URL the hub had taken over.
//
// Verified by building a stub hub before the real one: the hub renders and the
// detail pages survive, which is exactly why nothing would look wrong.
for (const s of scholarships) {
  const slug = generateSlug(String(s.title));
  if (RESERVED_SCHOLARSHIP_SLUGS.has(slug)) {
    console.error(
      `Scholarship [${s.id}] "${s.title}": slug "${slug}" is a facet hub URL. The hub would shadow this listing's page. Rename the listing.`,
    );
    failed = true;
  }
}
for (const p of programs) {
  const slug = generateSlug(String(p.name));
  if (RESERVED_PROGRAM_SLUGS.has(slug)) {
    console.error(
      `Program [${p.id}] "${p.name}": slug "${slug}" is a facet hub URL. The hub would shadow this listing's page. Rename the program.`,
    );
    failed = true;
  }
}

// ── guide prose must not link at a listing that no longer exists ─────────────
//
// The guides now cite awards by name and link them, which is the point: a guide
// about Medicine Hat that never sends you to a Medicine Hat award is a dead end.
// But those hrefs are hand-written, and a listing rename turns one into a 404
// silently; the guide still builds, still reads fine, and quietly wastes the
// click. The _redirects block above already fails the build on a rule pointing
// at a page that isn't there; this is the same check aimed at guide prose.
//
// A rename is still allowed, it just has to be finished: either update the
// guide, or add the 301 that keeps the old path alive.
const redirectedFrom = new Set(rules.map((r) => (r.from.endsWith('/') ? r.from : `${r.from}/`)));
const guideDir = join(__dirname, '../src/pages/guides');
for (const file of readdirSync(guideDir).filter((f) => f.endsWith('.astro'))) {
  const src = readFileSync(join(guideDir, file), 'utf8');
  for (const m of src.matchAll(/href="(\/(?:scholarships|programs)\/[^"]+)"/g)) {
    const href = m[1]!;
    // Query-string links (?category=Trades) are directory filters, not listing
    // paths; they resolve to a real page and have no slug to go stale.
    if (href.includes('?') || href.includes('#')) continue;
    // The directory indexes themselves are fine; only listing paths are checked.
    if (STATIC_ROUTES.has(href)) continue;
    if (!livePaths.has(href) && !redirectedFrom.has(href)) {
      console.error(
        `guides/${file}: links to ${href}, which is not a live listing. Fix the link or add a 301.`,
      );
      failed = true;
    }
  }
}

// ── Program snippets that still end mid-clause ───────────────────────────────
//
// A warning, not an error: nothing here is broken, and failing the build on it
// would block every commit until 58 descriptions get rewritten. programMeta
// prefers whole sentences and falls back to clamping, and a clamped snippet
// ends on a whole word but not on a finished thought -- "...direct exposure to
// clinical environments, health administration" is what Google renders. The
// fix for each is an authored `metaDescription`, so the list is the backlog:
// add one and the entry drops off. Counting it here rather than in a vitest
// file keeps it in front of whoever is editing the data.
const ragged = programs.filter((p) => {
  const status = !p.deadline || p.deadline === 'TBA' ? 'tba'
    : p.deadline === 'Ongoing' ? 'ongoing' : 'active';
  const out = programMeta(
    { name: String(p.name), description: p.description, metaDescription: p.metaDescription, deadline: p.deadline },
    status,
    formatListingDate,
  );
  return !/[.!?]$/.test(out);
});
if (ragged.length) {
  console.warn(
    `validate-data: ${ragged.length} program snippet(s) still end mid-clause and want an authored metaDescription:\n  ${ragged
      .map((p) => p.name)
      .join('\n  ')}`,
  );
}

// -- Scholarship snippets leaving half the budget unspent ---------------------
//
// The mirror of the check above, on the corpus the derived template serves.
// scholarshipMeta builds the snippet from the date, the amount and the
// audience, so a listing with a terse audience string lands correct but short
// -- one came in at 70 of the 155 characters Google prints, on a page that is
// already ranking. Waste, not a fault, so this warns too. The fix is a
// `metaDetail`: an authored clause appended after the derived head. One
// listing has nothing non-redundant to add and stays on this list on purpose;
// the number is what to watch, not the presence of a name.
const today = new Date();
// The ISO form too: scholarshipMetas needs it to apply the open-date horizon,
// and without it this check measures a different string than the build emits.
const todayIso = today.toLocaleDateString('en-CA');
const shortMetas = scholarshipMetas(
  scholarships as Parameters<typeof scholarshipMetas>[0],
  (s) => scholarshipStatusOf(s, today),
  formatListingDate,
  todayIso,
)
  .map((d, i) => ({ title: String(scholarships[i]!.title), len: d.length }))
  .filter((x) => x.len < 100);
if (shortMetas.length) {
  console.warn(
    `validate-data: ${shortMetas.length} scholarship snippet(s) under 100 of ${META_MAX} characters; a metaDetail would fill them:\n  ${shortMetas
      .map((x) => `${x.title} (${x.len})`)
      .join('\n  ')}`,
  );
}

// -- No em dashes, anywhere in src, scripts or workflows --------------------
//
// Standing rule: the em dash never appears in ScholarAB copy, data or code.
// It has been swept out of the repo twice; both times it came back through new
// prose, so the rule is enforced here instead of remembered. The allowances
// are `src/lib/meta.ts`, `scripts/check-copies.ts` and this file, which need
// the literal character to strip, normalise and detect it. Use a period, comma, colon, semicolon
// or parentheses instead.
//
// HTML entities count. Four `&mdash;` sat in .astro prose for months because
// this check only looked for the literal character; they rendered as em dashes
// on the live site all the same.
const EM_DASH_ALLOWED = new Set([
  'src/lib/meta.ts',
  'scripts/check-copies.ts',
  'scripts/validate-data.ts',
]);
const EM_DASH_PATTERN = /\u2014|&mdash;|&#(?:8212|x2014);/i;
// Workflow comments and script output are read by people too, and the same
// rule was quietly broken in both while only src/ was being checked.
const EM_DASH_ROOTS = ['src', 'scripts', '.github'];
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}
const emDashHits = EM_DASH_ROOTS.flatMap((r) => walk(join(__dirname, '..', r)))
  .map((f) => ({ rel: f.slice(join(__dirname, '..').length + 1).split('\\').join('/'), full: f }))
  .filter((f) => !EM_DASH_ALLOWED.has(f.rel))
  .flatMap(({ rel, full }) =>
    readFileSync(full, 'utf-8')
      .split('\n')
      .map((line, i) => ({ rel, line: i + 1, text: line }))
      .filter((x) => EM_DASH_PATTERN.test(x.text)),
  );
if (emDashHits.length) {
  console.error(
    `validate-data: ${emDashHits.length} em dash(es); use a period, comma, colon, semicolon or parentheses:\n  ${emDashHits
      .map((h) => `${h.rel}:${h.line}`)
      .join('\n  ')}`,
  );
  failed = true;
}

if (failed) process.exit(1);
console.log(`validate-data: OK (${scholarships.length} scholarships, ${programs.length} programs, ${rules.length} redirects)`);
