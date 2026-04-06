#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from scholarships + programs (same slugs as getStaticPaths).
 * Run automatically before astro build via npm run build.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSlug } from '../src/lib/utils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  title: string;
  [key: string]: unknown;
}

interface Program {
  name: string;
  [key: string]: unknown;
}

const BASE = 'https://www.scholarab.ca';
const lastmod = new Date().toISOString().slice(0, 10);

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

function urlEntry(loc: string, priority: string): string {
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`;
}

const lines: string[] = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlEntry(`${BASE}/`, '1.0'),
  urlEntry(`${BASE}/scholarships`, '0.9'),
  urlEntry(`${BASE}/programs`, '0.9'),
  urlEntry(`${BASE}/saved`, '0.7'),
  urlEntry(`${BASE}/about`, '0.8'),
  ...scholarships.map((s) => urlEntry(`${BASE}/scholarships/${generateSlug(s.title)}`, '0.85')),
  ...programs.map((p) => urlEntry(`${BASE}/programs/${generateSlug(p.name)}`, '0.85')),
  '</urlset>',
];

const outPath = join(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
const n = 5 + scholarships.length + programs.length;
console.log(`Wrote ${outPath} (${n} URLs)`);
