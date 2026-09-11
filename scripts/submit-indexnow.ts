#!/usr/bin/env node
/**
 * Announces changed URLs to IndexNow (Bing, Copilot, Yandex, Naver, Seznam).
 *
 * Google does NOT participate in IndexNow and there is no equivalent for it:
 * its Indexing API is jobs/livestream-only, and the sitemap ping endpoint was
 * retired in 2023. So this speeds up every engine except the one we care about
 * most. It is here because it is free coverage we had none of, and because
 * Copilot/ChatGPT search answers are sourced from the Bing index.
 *
 * What gets submitted: the URLs src/data/lastmod.json stamped with today's
 * date, i.e. exactly the pages whose content actually changed in this build.
 * That is the whole contract of the protocol -- submitting unchanged URLs is
 * how a host gets its quota throttled, so this must never fall back to "send
 * everything" on a normal run. `--all` exists for the one-time first
 * submission and for a manual resend; it is not wired into CI.
 *
 * Runs AFTER the deploy, not before: announcing a URL that Cloudflare has not
 * published yet buys a crawl of the old page.
 *
 * Usage:
 *   npx tsx scripts/submit-indexnow.ts          # today's changed URLs
 *   npx tsx scripts/submit-indexnow.ts --all    # every URL in the sitemap
 *   npx tsx scripts/submit-indexnow.ts --dry-run
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getToday } from '../src/lib/utils.ts';
import { livePublicationMatches } from './live-publication.ts';
import type { LastmodManifest } from '../src/lib/lastmod.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST = 'www.scholarab.ca';
const BASE = `https://${HOST}`;
// Public by design: the key file at keyLocation is what proves we control the
// host, so the key is not a secret and belongs in the repo next to the file.
const KEY = 'd8074d8f2e20640078dee36d99caef2b';
const KEY_LOCATION = `${BASE}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// The protocol's cap is 10,000 per request; the site fits in one request, so a
// batch split would be dead code. Guard instead of silently truncating.
const MAX_URLS = 10_000;

const all = process.argv.includes('--all');
const dryRun = process.argv.includes('--dry-run');

const manifest: LastmodManifest = JSON.parse(
  readFileSync(join(__dirname, '../src/data/lastmod.json'), 'utf8'),
);

// TZ is pinned by the npm script for the same reason generate-sitemap.ts pins
// it: the stamps in lastmod.json are Alberta dates, and a UTC runner after 6pm
// local would ask for tomorrow's and submit nothing.
const todayISO = getToday().toLocaleDateString('en-CA');

const urls = Object.entries(manifest)
  .filter(([, entry]) => all || entry.date === todayISO)
  .map(([path]) => `${BASE}${path}`);

if (urls.length === 0) {
  console.log(`IndexNow: nothing changed on ${todayISO}, skipping.`);
  process.exit(0);
}
if (urls.length > MAX_URLS) {
  console.error(`IndexNow: ${urls.length} URLs exceeds the ${MAX_URLS} per-request cap.`);
  process.exit(1);
}

console.log(`IndexNow: ${urls.length} URL(s)${all ? ' (--all)' : ` changed ${todayISO}`}`);
for (const u of urls) console.log(`  ${u}`);

if (dryRun) {
  console.log('IndexNow: --dry-run, not submitting.');
  process.exit(0);
}

const { catalogueHash } = JSON.parse(readFileSync(join(__dirname, '../public/publication.json'), 'utf8'));
if (typeof catalogueHash !== 'string' || !/^[a-f0-9]{64}$/.test(catalogueHash)) {
  throw new Error('Build a valid publication marker before announcing URLs.');
}
const sitemap = readFileSync(join(__dirname, '../public/sitemap.xml'), 'utf8');
let live = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  if (await livePublicationMatches(catalogueHash, sitemap)) { live = true; break; }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 30_000 * attempt));
}
if (!live) {
  console.error('IndexNow: this snapshot is not confirmed live after three attempts. Rerun after deployment.');
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  signal: AbortSignal.timeout(15_000),
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
});
if (res.ok) {
  console.log(`IndexNow: submitted (HTTP ${res.status}).`);
} else {
  console.error(`IndexNow: submission rejected (HTTP ${res.status}).`);
  process.exitCode = 1;
}
