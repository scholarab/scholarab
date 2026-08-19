#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug } from '../src/lib/utils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  id?: number | string | null;
  title?: string;
  amount?: string;
  url?: string;
  deadline?: string;
  openDate?: string;
  [key: string]: unknown;
}

interface Program {
  id?: number | string | null;
  name?: string;
  url?: string;
  deadline?: string;
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
// it too. The fix is a curation decision — which side the listing belongs on —
// so this names both ids and leaves the choice to a human.
for (const [slug, schIds] of schSlugs) {
  const progIds = progSlugs.get(slug);
  if (progIds?.length) {
    console.error(
      `"${slug}" is listed as both a scholarship (id ${schIds.join(', ')}) and a program ` +
      `(id ${progIds.join(', ')}). Two indexable pages for one thing compete with each other — ` +
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

// ── public/_redirects ────────────────────────────────────────────────────────
// Renames are the only reason a detail URL ever moves, so this file is the
// site's whole memory of its own history. Four ways it silently rots, each of
// which cost real indexed URLs before this check existed:
//
//  1. A target that no longer exists — the rename gets renamed again, and the
//     301 lands on a 404.
//  2. A target that is a bare directory. Google reads a redirect onto a
//     category page as a Soft 404 and drops it, so it buys nothing a real 404
//     doesn't. Delete the rule and let 404.astro do its job.
//  3. Only one of the two slash forms. Cloudflare Pages 308-normalises a bare
//     path only when the slashed page exists as a built asset, and a renamed
//     slug has no asset — so /old-slug hard-404s while /old-slug/ redirects.
//  4. A source that is also a live page, which shadows the real listing.
const STATIC_ROUTES = new Set([
  '/', '/scholarships/', '/programs/', '/match/', '/about/', '/educators/',
  '/guides/', '/updates/', '/saved/',
]);
const livePaths = new Set([
  ...scholarships.map((s) => `/scholarships/${generateSlug(String(s.title))}/`),
  ...programs.map((p) => `/programs/${generateSlug(String(p.name))}/`),
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
      console.error(`${tag}: ${r.from} redirects to the ${r.to} index — Google logs that as a Soft 404. Drop the rule and let it 404.`);
      failed = true;
    } else if (!livePaths.has(r.to) && !STATIC_ROUTES.has(r.to)) {
      console.error(`${tag}: ${r.from} redirects to ${r.to}, which is not a page any more`);
      failed = true;
    }
  }

  const twin = r.from.endsWith('/') ? r.from.slice(0, -1) : `${r.from}/`;
  if (!sources.has(twin)) {
    console.error(`${tag}: ${r.from} has no ${r.from.endsWith('/') ? 'no-slash' : 'trailing-slash'} twin — half of this rename 404s`);
    failed = true;
  }

  const asPage = r.from.endsWith('/') ? r.from : `${r.from}/`;
  if (livePaths.has(asPage)) {
    console.error(`${tag}: ${r.from} is a live listing — this rule shadows its own page`);
    failed = true;
  }

  if (r.code !== '301') {
    console.error(`${tag}: ${r.from} is a ${r.code || 'missing'} redirect; renames should be 301 so the target inherits the ranking`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`validate-data: OK (${scholarships.length} scholarships, ${programs.length} programs, ${rules.length} redirects)`);
