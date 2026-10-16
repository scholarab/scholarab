#!/usr/bin/env node
/**
 * PageSpeed scores for every page in the sitemap, mobile and desktop.
 *
 * The bar is 95+ in every category on every page. Checking that by hand in the
 * PageSpeed Insights website covers a handful of URLs; the sitemap is ~2,800.
 * This asks for all of them and prints only the pages under the bar, with the
 * audits that cost them points.
 *
 * Two engines, one report:
 *   live   (default) the PageSpeed Insights API against https://www.scholarab.ca,
 *          the same Lighthouse run and Chrome as pagespeed.web.dev. Shows what
 *          is deployed, so it says nothing about an unpushed change.
 *   local  (--local) Lighthouse 13.5.0, the version PSI runs, against dist/
 *          served with brotli by the server below. Use it before pushing.
 *          Performance is off unless --perf: three Chromes in parallel dropped
 *          hub scores from 96-99 to 88-91 on 2026-10-14, so --perf runs one page
 *          at a time; give it the pages a change touched. The other four
 *          categories do not depend on timing and run in parallel.
 *
 * Live auth is the Search Console service account (scripts/lib/gsc.ts). The
 * keyless API shares one anonymous quota with the world and answers 429. The
 * PageSpeed Insights API must be enabled once on the account's Cloud project;
 * see docs/seo-index-status.md. Quota is 25,000 runs/day, so a full live pass
 * (2 runs per page) fits about four times a day. The per-minute limit is lower
 * than published; the pace below adapts to it.
 *
 * Usage:
 *   npm run pagespeed                          # every live page, both strategies
 *   npm run pagespeed -- /match/ /saved/       # just these paths
 *   npm run pagespeed -- --strategy mobile
 *   npm run pagespeed -- --local               # every built page, 4 categories
 *   npm run pagespeed -- --local --perf /map/  # adds performance, serially
 *   npm run pagespeed -- --local --resume      # finish a stopped run
 *
 * Writes private/pagespeed/<engine>-<stamp>.jsonl (one row per page and
 * strategy) and exits 1 when a page is under 95 or a run errored three times.
 */
import { execFile, fork, type ChildProcess } from 'child_process';
import {
  appendFileSync, constants as fsc, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'fs';
import { createServer, type Server } from 'http';
import { cpus, tmpdir } from 'os';
import { dirname, extname, join, normalize } from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import { brotliCompressSync, constants as zlib } from 'zlib';
import { chromium } from '@playwright/test';
import { accessToken, root, SITE_URL } from './lib/gsc.ts';

const BAR = 95;
const LIGHTHOUSE = 'lighthouse@13.5.0';
const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// The published 400 per 100 seconds is not what the project gets: one start
// every 300ms with 24 in flight drew 2,624 HTTP 429s and 2,071 HTML error pages
// in 5,592 runs on 2026-10-15. The live pace starts at PSI_INTERVAL_MS and
// stretches on each refusal, so a pass settles under whatever the limit is.
const PSI_INTERVAL_MS = 300;
const PSI_MAX_INTERVAL_MS = 10_000;
const PSI_CONCURRENCY = 24;
const MAX_ATTEMPTS = 3;

type Strategy = 'mobile' | 'desktop';
interface Row {
  path: string;
  strategy: Strategy;
  scores: Record<string, number | null>;
  /** Audit ids under full marks in each category under the bar. */
  losses: Record<string, string[]>;
  error?: string;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const local = flag('--local');
const perf = !local || flag('--perf');
const strategyArg = option('--strategy');
const strategies: Strategy[] = strategyArg ? [strategyArg as Strategy] : ['mobile', 'desktop'];
const valued = new Set(['--strategy', '--concurrency'].map(o => option(o)));
const only = args.filter(a => a.startsWith('/') && !valued.has(a));
if (strategies.some(s => s !== 'mobile' && s !== 'desktop')) {
  console.error('--strategy is mobile or desktop');
  process.exit(2);
}

// ── page list ────────────────────────────────────────────────────────────────
// The sitemap is the list of pages meant to be found. Noindex pages (the /all/
// directory copies, closed listings, the 404) are left out of it on purpose
// and are exempt from the bar by design.
async function sitemapPaths(): Promise<string[]> {
  const xml = snapshot
    ? readFileSync(join(snapshot, 'sitemap.xml'), 'utf8')
    : await (await fetch(`${SITE_URL}sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]!).pathname);
  if (paths.length === 0) throw new Error('sitemap has no <loc> entries');
  return [...new Set(paths)];
}

// ── result shape ─────────────────────────────────────────────────────────────
interface LhCategory { score: number | null; auditRefs: { id: string; weight: number }[] }
interface LhResult {
  categories: Record<string, LhCategory>;
  audits: Record<string, { score: number | null }>;
  runtimeError?: { code: string; message: string };
}

function toRow(path: string, strategy: Strategy, lh: LhResult): Row {
  if (lh.runtimeError) return { path, strategy, scores: {}, losses: {}, error: lh.runtimeError.code };
  const scores: Row['scores'] = {};
  const losses: Row['losses'] = {};
  for (const [id, cat] of Object.entries(lh.categories)) {
    scores[id] = cat.score === null ? null : Math.round(cat.score * 100);
    if (scores[id] !== null && scores[id]! < BAR) {
      losses[id] = cat.auditRefs
        .filter(ref => ref.weight > 0 && (lh.audits[ref.id]?.score ?? 1) < 1)
        .sort((a, b) => b.weight - a.weight)
        .map(ref => ref.id);
    }
  }
  return { path, strategy, scores, losses };
}

// ── live engine ──────────────────────────────────────────────────────────────
let nextStart = 0;
let interval = PSI_INTERVAL_MS;
async function slot(): Promise<void> {
  const wait = Math.max(0, nextStart - Date.now());
  nextStart = Math.max(Date.now(), nextStart) + interval;
  if (wait) await new Promise(r => setTimeout(r, wait));
}
// A refusal means the pace is over the limit: stretch it for the rest of the
// pass and hold every start for a minute so the per-minute window drains.
function backOff(): void {
  const before = interval;
  interval = Math.min(PSI_MAX_INTERVAL_MS, Math.round(interval * 1.5));
  nextStart = Math.max(nextStart, Date.now() + 60_000);
  if (interval !== before) console.log(`  refused, now one start every ${(interval / 1000).toFixed(1)}s`);
}

async function runLive(path: string, strategy: Strategy): Promise<Row> {
  const url = new URL(PSI_URL);
  url.searchParams.set('url', new URL(path, SITE_URL).href);
  url.searchParams.set('strategy', strategy);
  for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) url.searchParams.append('category', c);
  let message = '';
  for (let tries = 0; tries < 5; tries++) {
    await slot();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    const text = await res.text();
    let body: { lighthouseResult?: LhResult; error?: { status?: string; message?: string } } = {};
    try {
      body = JSON.parse(text);
    } catch {
      // Google's front end answers some refusals with an HTML page, not JSON.
      message = `HTTP ${res.status} non-JSON ${text.match(/<title>([^<]*)/)?.[1] ?? ''}`.trim();
    }
    if (res.ok && body.lighthouseResult) return toRow(path, strategy, body.lighthouseResult);
    if (body.error) message = `HTTP ${res.status} ${body.error.status ?? ''} ${body.error.message ?? ''}`.trim();
    // Not enabled, or no access: every other run would say the same, so stop
    // here instead of spending a few thousand requests on the same refusal.
    if (res.status === 403) {
      console.error(message);
      process.exit(1);
    }
    if (res.status !== 429 && res.status < 500) break;
    backOff();
  }
  return { path, strategy, scores: {}, losses: {}, error: message.slice(0, 200) };
}

// ── local engine ─────────────────────────────────────────────────────────────
// Cloudflare serves every text response brotli-compressed; python http.server
// does not, which is why performance measured against it read low, and its
// connection handling produced ERRORED_DOCUMENT_REQUEST flakes on 2026-10-14.
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

// Other sessions build in this checkout, and a build empties dist/ before
// refilling it: on 2026-10-15 every run of a test pass 404'd or lost Chrome
// partway through one. The pass reads a snapshot taken at the start instead, a
// copy-on-write clone where the filesystem has them.
function snapshotDist(): string {
  const source = join(root, 'dist/client');
  if (!existsSync(join(source, 'sitemap.xml')) || !existsSync(join(source, '404.html'))) {
    console.error('dist/client is missing or mid-build. Run npm run build first.');
    process.exit(2);
  }
  const dir = mkdtempSync(join(tmpdir(), 'pagespeed-'));
  cpSync(source, dir, { recursive: true, mode: fsc.COPYFILE_FICLONE });
  return dir;
}

function serveDist(dir: string): Promise<{ server: Server; origin: string }> {
  const cache = new Map<string, Buffer>();
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(dir, pathname));
    if (!file.startsWith(dir)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const status = existsSync(file) ? 200 : 404;
    if (status === 404) file = join(dir, '404.html');
    const ext = extname(file);
    let body: Buffer = readFileSync(file);
    const headers: Record<string, string> = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
    if (COMPRESS.has(ext) && /\bbr\b/.test(String(req.headers['accept-encoding']))) {
      body = cache.get(file) ?? brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } });
      cache.set(file, body);
      headers['Content-Encoding'] = 'br';
    }
    res.writeHead(status, headers).end(body);
  });
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}` });
    }),
  );
}

const exec = promisify(execFile);
type Lighthouse = (url: string, flags: Record<string, unknown>, config?: unknown) => Promise<{ lhr: LhResult } | undefined>;
interface Chrome { port: number; kill(): void }

// Lighthouse is not a dependency: CI never runs it, and npm ci would install
// its whole tree on every hosted check for one local command. npx keeps the
// pinned copy in its cache; this finds it there and loads the Node API, so a
// worker reuses one Chrome instead of paying a Chrome launch and a Lighthouse
// start (about 4 of the 6.5 seconds a CLI run took) for every page.
async function loadLighthouse() {
  const { stdout } = await exec('npx', ['-y', '-p', LIGHTHOUSE, 'sh', '-c', 'realpath "$(command -v lighthouse)"']);
  const pkg = join(dirname(stdout.trim()), '..');
  const load = async (file: string) => (await import(pathToFileURL(join(pkg, file)).href)) as Record<string, unknown>;
  const launcher = await load('../chrome-launcher/dist/index.js');
  // Chrome 155 stable closed Lighthouse's tab on every run on this Mac
  // (2026-10-15). Playwright's Chrome for Testing is 153, the version PSI runs.
  const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
  return {
    lighthouse: (await load('core/index.js')).default as Lighthouse,
    desktop: (await load('core/config/desktop-config.js')).default,
    launch: () => (launcher.launch as (o: object) => Promise<Chrome>)({ chromePath, chromeFlags: ['--headless=new'] }),
  };
}

// Lighthouse keeps run timing in process-wide marks, so two runs in one
// process break each other ("performance mark has not been set", 2026-10-15).
// Each worker is a child process of this script with one Chrome of its own.
interface Job { origin: string; path: string; strategy: Strategy }
async function serveJobs(): Promise<void> {
  const api = await loadLighthouse();
  let chrome: Chrome | null = null;
  process.on('message', async (job: Job) => {
    try {
      chrome ??= await api.launch();
      const result = await api.lighthouse(
        job.origin + job.path,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['accessibility', 'best-practices', 'seo', 'agentic-browsing', ...(perf ? ['performance'] : [])],
          // Leave throttling on its default, simulate, as PSI does. It loads
          // the page unthrottled and models the timings. 'provided' forces
          // 5.25s settle waits that were 11 of the 15 seconds a page took.
          // Unscored, and over a second a page.
          disableFullPageScreenshot: true,
        },
        job.strategy === 'desktop' ? api.desktop : undefined,
      );
      if (!result) throw new Error('Lighthouse returned no result');
      process.send!(toRow(job.path, job.strategy, result.lhr));
    } catch (e) {
      // A Chrome that lost its tab tends to lose the next one too.
      chrome?.kill();
      chrome = null;
      process.send!({ ...job, scores: {}, losses: {}, error: String((e as Error).message).split('\n')[0]!.slice(0, 200) });
    }
  });
  // A stuck worker is killed with SIGTERM, which chrome-launcher does not
  // catch, so close Chrome here or it outlives the run.
  for (const event of ['disconnect', 'SIGTERM'] as const) {
    process.on(event, () => {
      chrome?.kill();
      process.exit(0);
    });
  }
}

const idle: ChildProcess[] = [];
const workers = new Set<ChildProcess>();
function runLocal(origin: string, path: string, strategy: Strategy): Promise<Row> {
  const child = idle.pop() ?? fork(process.argv[1]!, args, { env: { ...process.env, PAGESPEED_WORKER: '1' } });
  workers.add(child);
  return new Promise((resolve, reject) => {
    const fail = (reason: string) => {
      clearTimeout(timer);
      child.off('message', reply);
      child.kill();
      workers.delete(child);
      reject(new Error(reason));
    };
    const reply = (row: Row) => {
      clearTimeout(timer);
      child.off('exit', died);
      idle.push(child);
      resolve(row);
    };
    const died = () => fail('worker exited mid-run');
    const timer = setTimeout(() => fail('no result in 3 minutes'), 180_000);
    child.once('message', reply);
    child.once('exit', died);
    child.send({ origin, path, strategy } satisfies Job);
  });
}

// ── run ──────────────────────────────────────────────────────────────────────
async function pool<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) await work(items[i++]!);
  }));
}

let snapshot: string | null = null;
async function main(): Promise<void> {
  snapshot = local ? snapshotDist() : null;
  const paths = only.length ? only : await sitemapPaths();
  const jobs = paths.flatMap(path => strategies.map(strategy => ({ path, strategy })));
  const served = snapshot ? await serveDist(snapshot) : null;
  const run = (job: { path: string; strategy: Strategy }) =>
    served ? runLocal(served.origin, job.path, job.strategy) : runLive(job.path, job.strategy);
  const concurrency = Number(option('--concurrency')) ||
    (!local ? PSI_CONCURRENCY : perf ? 1 : Math.max(1, Math.min(6, Math.floor(cpus().length / 2))));

  // Rows are appended as they land, so a run that is stopped or killed (one
  // died silently 2,500 pages into a 53-minute pass on 2026-10-15) keeps what
  // it measured, and --resume measures only what is missing from the newest
  // file of the same engine.
  const engine = local ? 'local' : 'live';
  const outDir = join(root, 'private/pagespeed');
  mkdirSync(outDir, { recursive: true });
  const previous = readdirSync(outDir)
    .filter(f => f.startsWith(`${engine}-`) && f.endsWith('.jsonl'))
    .sort((a, b) => statSync(join(outDir, a)).mtimeMs - statSync(join(outDir, b)).mtimeMs)
    .at(-1);
  const now = new Date();
  const stamp = `${now.toLocaleDateString('en-CA')}-${now.toTimeString().slice(0, 8).replace(/:/g, '')}`;
  const outFile = join(outDir, flag('--resume') && previous ? previous : `${engine}-${stamp}.jsonl`);
  const key = (r: { path: string; strategy: Strategy }) => `${r.strategy} ${r.path}`;
  const kept = new Map<string, Row>();
  if (flag('--resume') && previous) {
    for (const line of readFileSync(outFile, 'utf8').split('\n').filter(Boolean)) {
      const row = JSON.parse(line) as Row;
      if (!row.error) kept.set(key(row), row);
    }
  }
  const wanted = new Set(jobs.map(key));
  const rows: Row[] = [...kept.values()].filter(r => wanted.has(key(r)));
  const todo = jobs.filter(job => !kept.has(key(job)));

  const started = Date.now();
  console.log(`PageSpeed ${local ? 'local (dist/)' : 'live'}: ${paths.length} pages x ${strategies.join('+')}, ${todo.length} runs${rows.length ? ` (${rows.length} kept from ${previous})` : ''}, ${concurrency} at a time`);
  let done = 0;
  const cleanup = () => {
    served?.server.close();
    // A worker closes its Chrome when the channel closes; a kill would orphan it.
    for (const child of workers) if (child.connected) child.disconnect();
    if (snapshot) rmSync(snapshot, { recursive: true, force: true });
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      cleanup();
      console.error(`\nStopped at ${done}/${todo.length}. Rows so far: ${outFile.replace(root + '/', '')}. Add --resume to continue.`);
      process.exit(130);
    });
  }
  const attempt = async (job: { path: string; strategy: Strategy }): Promise<Row> => {
    let row: Row;
    try {
      row = await run(job);
    } catch (e) {
      row = { ...job, scores: {}, losses: {}, error: String((e as Error).message).split('\n')[0]!.slice(0, 200) };
    }
    appendFileSync(outFile, JSON.stringify(row) + '\n');
    return row;
  };
  await pool(todo, concurrency, async job => {
    rows.push(await attempt(job));
    if (++done % 100 === 0) console.log(`  ${done}/${todo.length}`);
  });
  // A failed run is usually the runner, not the page: load flakes cleared on a
  // one-at-a-time rerun every time on 2026-10-14. Retry errors, serially for
  // the local engine and at the paced rate for the live one, up to MAX_ATTEMPTS
  // in total, and report what still fails.
  for (let pass = 2; pass <= MAX_ATTEMPTS; pass++) {
    const failed = rows.filter(r => r.error);
    if (!failed.length) break;
    console.log(`  retrying ${failed.length} errored run(s), attempt ${pass}`);
    await pool(failed, local ? 1 : concurrency, async row => {
      Object.assign(row, await attempt(row));
    });
  }
  cleanup();

  // ── report ───────────────────────────────────────────────────────────────────
  // The appended log becomes one sorted row per page and strategy.
  rows.sort((a, b) => a.path.localeCompare(b.path) || a.strategy.localeCompare(b.strategy));
  writeFileSync(outFile, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  const errors = rows.filter(r => r.error);
  const under = rows.filter(r => !r.error && Object.keys(r.losses).length);
  const categories = [...new Set(rows.flatMap(r => Object.keys(r.scores)))].sort();
  console.log(`\n${rows.length - errors.length} of ${rows.length} runs measured in ${minutes} min`);
  for (const strategy of strategies) {
    for (const cat of categories) {
      const s = rows.filter(r => r.strategy === strategy && typeof r.scores[cat] === 'number').map(r => r.scores[cat]!).sort((a, b) => a - b);
      if (!s.length) continue;
      const below = s.filter(v => v < BAR).length;
      console.log(`  ${strategy.padEnd(7)} ${cat.padEnd(16)} min ${String(s[0]).padStart(3)}  median ${String(s[Math.floor(s.length / 2)]).padStart(3)}  under ${BAR}: ${below}`);
    }
  }
  if (under.length) {
    console.log(`\nUNDER ${BAR} (${under.length})`);
    for (const r of under) {
      for (const [cat, audits] of Object.entries(r.losses)) {
        console.log(`  ${r.path} ${r.strategy} ${cat} ${r.scores[cat]}: ${audits.slice(0, 5).join(', ')}`);
      }
    }
  }
  if (errors.length) {
    console.log(`\nERRORED after ${MAX_ATTEMPTS} attempts (${errors.length})`);
    for (const r of errors) console.log(`  ${r.path} ${r.strategy}: ${r.error}`);
  }
  console.log(`\n${under.length || errors.length ? 'FAIL' : 'PASS'} every measured page ${under.length || errors.length ? 'is not' : 'is'} ${BAR}+. Rows: ${outFile.replace(root + '/', '')}`);
  process.exitCode = under.length || errors.length ? 1 : 0;
}

await (process.env.PAGESPEED_WORKER ? serveJobs() : main());
