#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug } from '../src/lib/generateSlug.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scholarships = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

let failed = false;

function isHttpUrl(u) {
  try {
    const p = new URL(String(u).trim()).protocol;
    return p === 'http:' || p === 'https:';
  } catch {
    return false;
  }
}

const schSlugs = new Map();
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
  schSlugs.get(g).push(s.id);
}
for (const [slug, ids] of schSlugs) {
  if (ids.length > 1) {
    console.error(`Duplicate scholarship slug "${slug}": ids ${ids.join(', ')}`);
    failed = true;
  }
}

const progSlugs = new Map();
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
  progSlugs.get(g).push(p.id);
}
for (const [slug, ids] of progSlugs) {
  if (ids.length > 1) {
    console.error(`Duplicate program slug "${slug}": ids ${ids.join(', ')}`);
    failed = true;
  }
}

for (const s of scholarships) {
  if (!s.url || String(s.url).trim() === '') {
    console.error(`Scholarship [${s.id}] ${s.title}: missing url`);
    failed = true;
  } else if (!isHttpUrl(s.url)) {
    console.error(`Scholarship [${s.id}] ${s.title}: url must be http(s): ${s.url}`);
    failed = true;
  }
}

for (const p of programs) {
  if (!p.url || String(p.url).trim() === '') {
    console.error(`Program [${p.id}] ${p.name}: missing url`);
    failed = true;
  } else if (!isHttpUrl(p.url)) {
    console.error(`Program [${p.id}] ${p.name}: url must be http(s): ${p.url}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`validate-data: OK (${scholarships.length} scholarships, ${programs.length} programs)`);
