#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug } from '../src/lib/generateSlug.ts';
import parseJson from 'secure-json-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  id?: number | string | null;
  title?: string;
  amount?: string;
  url?: string;
  deadline?: string;
  open_date?: string;
  [key: string]: unknown;
}

interface Program {
  id?: number | string | null;
  name?: string;
  url?: string;
  deadline?: string;
  [key: string]: unknown;
}

const scholarships: Scholarship[] = parseJson(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = parseJson(
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
  schIds.get(s.id)!.push(s.title ?? '');
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
  progIds.get(p.id)!.push(p.name ?? '');
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
  schSlugs.get(g)!.push(s.id!);
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
  progSlugs.get(g)!.push(p.id!);
}
for (const [slug, ids] of progSlugs) {
  if (ids.length > 1) {
    console.error(`Duplicate program slug "${slug}": ids ${ids.join(', ')}`);
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

  if (s.open_date && !isValidDate(s.open_date)) {
    console.error(`${tag}: open_date must be YYYY-MM-DD, got: ${s.open_date}`);
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

if (failed) process.exit(1);
console.log(`validate-data: OK (${scholarships.length} scholarships, ${programs.length} programs)`);
