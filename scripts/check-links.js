#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scholarships = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs = JSON.parse(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

const TIMEOUT_MS = 10_000;

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'ScholarAB-LinkChecker/1.0' },
    });
    clearTimeout(timer);
    return { ok: res.ok && res.status !== 404 && res.status !== 403, status: res.status };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') return { ok: false, status: 'TIMEOUT' };
    if (err.cause?.code === 'ENOTFOUND') return { ok: false, status: 'DNS_FAILURE' };
    return { ok: false, status: err.message.slice(0, 60) };
  }
}

const broken = [];

for (const s of scholarships) {
  if (!s.url) continue;
  process.stdout.write(`Scholarship [${s.id}] ${s.title}... `);
  const { ok, status } = await checkUrl(s.url);
  console.log(ok ? `OK (${status})` : `BROKEN (${status})`);
  if (!ok) broken.push({ kind: 'scholarship', name: s.title, url: s.url, error: String(status) });
}

for (const p of programs) {
  if (!p.url) continue;
  process.stdout.write(`Program [${p.id}] ${p.name}... `);
  const { ok, status } = await checkUrl(p.url);
  console.log(ok ? `OK (${status})` : `BROKEN (${status})`);
  if (!ok) broken.push({ kind: 'program', name: p.name, url: p.url, error: String(status) });
}

if (broken.length === 0) {
  console.log('\nAll links OK.');
  process.exit(0);
}

// Write results to stdout as JSON for the workflow to pick up
console.log('\nBROKEN_LINKS_JSON=' + JSON.stringify(broken));
process.exit(1);
