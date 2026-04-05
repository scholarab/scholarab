#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import parseJson from 'secure-json-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  id: number | string;
  title: string;
  url?: string;
  [key: string]: unknown;
}

interface Program {
  id: number | string;
  name: string;
  url?: string;
  [key: string]: unknown;
}

interface CheckResult {
  ok: boolean;
  status: number | string;
}

interface BrokenLink {
  kind: 'scholarship' | 'program';
  name: string;
  url: string;
  error: string;
}

const scholarships: Scholarship[] = parseJson(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);
const programs: Program[] = parseJson(
  readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8')
);

const TIMEOUT_MS = 10_000;

async function checkUrl(url: string): Promise<CheckResult> {
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
    const error = err as Error & { cause?: { code?: string } };
    if (error.name === 'AbortError') return { ok: false, status: 'TIMEOUT' };
    if (error.cause?.code === 'ENOTFOUND') return { ok: false, status: 'DNS_FAILURE' };
    return { ok: false, status: error.message.slice(0, 60) };
  }
}

const CONCURRENCY = 10;

// Run async tasks in parallel with a concurrency limit — no extra dependencies needed.
async function checkBatch<T>(items: Array<() => Promise<T>>): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const slice = items.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(slice.map((item) => item()));
    results.push(...batch);
  }
  return results;
}

const schTasks = scholarships
  .filter((s) => s.url)
  .map((s) => async (): Promise<BrokenLink | null> => {
    process.stdout.write(`Scholarship [${s.id}] ${s.title}... `);
    const { ok, status } = await checkUrl(s.url!);
    console.log(ok ? `OK (${status})` : `BROKEN (${status})`);
    return ok ? null : { kind: 'scholarship', name: s.title, url: s.url!, error: String(status) };
  });

const progTasks = programs
  .filter((p) => p.url)
  .map((p) => async (): Promise<BrokenLink | null> => {
    process.stdout.write(`Program [${p.id}] ${p.name}... `);
    const { ok, status } = await checkUrl(p.url!);
    console.log(ok ? `OK (${status})` : `BROKEN (${status})`);
    return ok ? null : { kind: 'program', name: p.name, url: p.url!, error: String(status) };
  });

const results = await checkBatch([...schTasks, ...progTasks]);
const broken = results.filter((r): r is BrokenLink => r !== null);

if (broken.length === 0) {
  console.log('\nAll links OK.');
  process.exit(0);
}

// Write results to stdout as JSON for the workflow to pick up
console.log('\nBROKEN_LINKS_JSON=' + JSON.stringify(broken));
process.exit(1);
