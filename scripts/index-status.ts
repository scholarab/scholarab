#!/usr/bin/env node
/**
 * Per-URL index status for every page in the sitemap, from the Search Console
 * URL Inspection API.
 *
 * Why this exists: the Page Indexing report gives counts per reason, not URLs,
 * so "90 pages excluded by noindex" had to be reconciled against the built
 * site by hand -- and that reconciliation is what found that only 8 of the 90
 * still serve a noindex. This asks Google the question directly, one URL at a
 * time, and writes the answer next to the sitemap that produced the list.
 *
 * The useful output is the REQUEST INDEXING queue it prints: the indexable
 * pages Google does not have, in the order worth spending the ~10/day manual
 * URL Inspection submissions on.
 *
 * Auth is a Google Cloud service account that has been added to the property
 * in Search Console. Note it must be added as an OWNER, not a full user: the
 * URL Inspection endpoint refuses anything less, with a 403 that says
 * "permission denied" and not why. Setup is in docs/seo-index-status.md.
 *
 * Credentials come from private/gsc-service-account.json (gitignored) or the
 * GSC_SERVICE_ACCOUNT_JSON env var holding the same JSON. Never commit either:
 * the key grants write access to the property, including Removals.
 *
 * Usage:
 *   npm run index-status              # every sitemap URL
 *   npm run index-status -- --limit 20
 */
import { createSign } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// The property as Search Console names it. A URL-prefix property is identified
// by the exact prefix including the trailing slash; a Domain property would be
// "sc-domain:scholarab.ca" instead, and passing the wrong form 403s.
const SITE_URL = 'https://www.scholarab.ca/';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

// Google's published ceilings are 2,000 inspections/day and 600/minute per
// property. The sitemap is ~500 URLs and growing (312 on 2026-08-28, 504 four
// days later), so the daily cap is still not in play, but six parallel requests
// would sit right on the per-minute one; four leaves room for the retries below
// without ever tripping it.
const CONCURRENCY = 4;
const MAX_RETRIES = 4;

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function credentials(): ServiceAccount {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const path = join(root, 'private/gsc-service-account.json');
  const raw = inline ?? (existsSync(path) ? readFileSync(path, 'utf8') : null);
  if (!raw) {
    console.error(
      'No credentials. Put the service-account JSON at private/gsc-service-account.json\n' +
        '(gitignored) or set GSC_SERVICE_ACCOUNT_JSON. See docs/seo-index-status.md.',
    );
    process.exit(1);
  }
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    console.error('Credentials JSON has no client_email/private_key -- is it an API key rather than a service account?');
    process.exit(1);
  }
  return sa;
}

const b64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Signed JWT -> access token, the two-legged OAuth flow for service accounts.
 * Done with node's crypto rather than googleapis because that dependency is
 * ~40MB of client for one POST, and this is the only Google API the repo calls.
 */
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    // An hour is the maximum Google accepts, and the run is minutes, so the
    // token never needs refreshing mid-run.
    exp: now + 3600,
  };
  const body = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(body);
  // JSON string escapes survive a copy-paste out of the console; the PEM parser
  // wants real newlines.
  const jwt = `${body}.${b64url(signer.sign(sa.private_key.replace(/\\n/g, '\n')))}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error(`Token exchange failed (HTTP ${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

interface Status {
  url: string;
  verdict: string;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
}

/**
 * Transport-level failures, counted across the whole run so a throttled or
 * flaky run is visible in the summary rather than only in the noise.
 */
let retries = 0;

async function inspect(url: string, token: string): Promise<Status | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(INSPECT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL, languageCode: 'en-CA' }),
      });
    } catch {
      // fetch rejects rather than resolving for transport faults: ECONNRESET,
      // a DNS blip, a TLS reset. This used to propagate out of the Promise.all
      // below and kill the process, and because the snapshot is only written
      // once every URL is done, a single dropped packet threw away the whole
      // run -- which is exactly what happened to the launchd run on 2026-08-31,
      // ~500 inspections and a quarter of the daily quota in. Treat it as the
      // same class of thing as a 5xx: wait it out, then give up on this URL
      // alone rather than on all of them.
      retries++;
      if (attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }

    // 429 is the per-minute quota, 5xx is Google being Google. Both are worth
    // waiting out; everything else is a request we got wrong and retrying it
    // would just burn the daily quota faster.
    if (res.status === 429 || res.status >= 500) {
      retries++;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) {
      console.error(`  ${url}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const r = (await res.json()) as {
      inspectionResult?: { indexStatusResult?: Record<string, string> };
    };
    const i = r.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      verdict: i.verdict ?? 'UNKNOWN',
      coverageState: i.coverageState ?? 'unknown',
      robotsTxtState: i.robotsTxtState ?? 'unknown',
      indexingState: i.indexingState ?? 'unknown',
      lastCrawlTime: i.lastCrawlTime ?? null,
      googleCanonical: i.googleCanonical ?? null,
    };
  }
  console.error(`  ${url}: gave up after ${MAX_RETRIES} retries`);
  return null;
}

/** Every <loc> in the generated sitemap, which is by definition the set of pages we want indexed. */
function sitemapUrls(): string[] {
  const path = join(root, 'public/sitemap.xml');
  if (!existsSync(path)) {
    console.error('public/sitemap.xml is missing. Run `npm run sitemap` first (it is gitignored and built).');
    process.exit(1);
  }
  return [...readFileSync(path, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
}

const limitArg = process.argv.indexOf('--limit');
// Number(undefined) is NaN and slice(0, NaN) is empty, so a bare --limit used
// to inspect nothing and report a clean run of zero URLs.
let limit = Infinity;
if (limitArg !== -1) {
  limit = Number(process.argv[limitArg + 1]);
  if (!Number.isInteger(limit) || limit < 1) {
    console.error('--limit needs a positive whole number, e.g. --limit 20');
    process.exit(1);
  }
}

const urls = sitemapUrls().slice(0, limit);
const token = await accessToken(credentials());
console.log(`Inspecting ${urls.length} URLs as ${SITE_URL} ...`);

const outDir = join(root, 'private/index-status');
mkdirSync(outDir, { recursive: true });
const today = new Date().toLocaleDateString('en-CA');

// A --limit run is a smoke test, and it must not land on the dated snapshot:
// writing five URLs over a completed 504-URL run silently destroys the baseline
// the next weekly diff reads, and the diff then reports 499 URLs "gone", which
// reads exactly like a mass de-indexing. Suffix it instead.
const stem = limit === Infinity ? today : `${today}-limit${limit}`;

const results: Status[] = [];

/**
 * Write what we have. Called from the finally below as well as on the happy
 * path: an inspection already made is quota already spent, and a half-run
 * snapshot still answers most of what the next run wants to diff against.
 */
function persist(): void {
  results.sort((a, b) => a.url.localeCompare(b.url));
  writeFileSync(join(outDir, `${stem}.json`), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
}

let next = 0;
let done = 0;
try {
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
      while (next < urls.length) {
        const url = urls[next++]!;
        const s = await inspect(url, token);
        if (s) results.push(s);
        if (++done % 25 === 0) console.log(`  ${done}/${urls.length}`);
      }
    }),
  );
} catch (err) {
  // inspect() no longer throws, so reaching here means something outside it
  // did. Keep the quota we spent and re-raise: a silent partial run reported
  // as a clean one is how a shrinking corpus looks like a de-indexing event.
  persist();
  console.error(`\nRun aborted after ${results.length}/${urls.length}; partial snapshot written.`);
  throw err;
}

persist();

// The previous run, if there is one. A single snapshot cannot answer the
// question these runs exist to answer -- "did the Validate Fix actually move
// anything" -- so every run after the first reports the delta as well.
const previous = readdirSync(outDir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f !== `${stem}.json`)
  .sort()
  .pop();

const byState = new Map<string, Status[]>();
for (const r of results) byState.set(r.coverageState, [...(byState.get(r.coverageState) ?? []), r]);

const failed = urls.length - results.length;
// One greppable line, because weekly.log is read by scrolling to the bottom and
// a failed week previously looked like a stack trace rather than a status.
console.log(`\nRESULT: ${failed === 0 ? 'ok' : 'partial'} ${results.length}/${urls.length} inspected, ${failed} failed, ${retries} retries\n`);
console.log('COVERAGE STATE');
for (const [state, rows] of [...byState].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(rows.length).padStart(4)}  ${state}`);
}

// The point of the whole script. PASS means Google has it; anything else is a
// page in the sitemap that Google is not serving, which is what the manual
// ~10/day Request Indexing submissions should be spent on. Never-crawled pages
// go first: a page Google has never fetched is the one submission that
// certainly tells it something new.
const missing = results.filter((r) => r.verdict !== 'PASS');
missing.sort((a, b) => Number(!!a.lastCrawlTime) - Number(!!b.lastCrawlTime) || a.url.localeCompare(b.url));
writeFileSync(join(outDir, `${stem}-request-queue.txt`), `${missing.map((m) => m.url).join('\n')}\n`, 'utf8');

console.log(`\nREQUEST INDEXING QUEUE (${missing.length}) -- oldest/never crawled first`);
for (const m of missing.slice(0, 40)) {
  console.log(`  ${(m.lastCrawlTime?.slice(0, 10) ?? 'never    ').padEnd(10)} ${m.coverageState.slice(0, 42).padEnd(42)} ${m.url}`);
}
if (missing.length > 40) console.log(`  ... ${missing.length - 40} more in ${stem}-request-queue.txt`);
if (previous) {
  const before = new Map(
    (JSON.parse(readFileSync(join(outDir, previous), 'utf8')) as Status[]).map((r) => [r.url, r]),
  );
  const moved = results
    .filter((r) => before.has(r.url) && before.get(r.url)!.coverageState !== r.coverageState)
    .map((r) => ({ url: r.url, from: before.get(r.url)!.coverageState, to: r.coverageState }));
  // URLs absent from one side are renames and retirements, not index changes,
  // so they are counted rather than listed: the sitemap moving is the sitemap's
  // story, and mixing it in here would bury the state changes.
  const added = results.filter((r) => !before.has(r.url)).length;
  const dropped = [...before.keys()].filter((u) => !results.some((r) => r.url === u)).length;

  console.log(`\nSINCE ${previous.replace('.json', '')}  (+${added} new URLs, -${dropped} gone)`);
  if (moved.length === 0) {
    console.log('  no URL changed state');
  }
  for (const m of moved) {
    console.log(`  ${m.url.replace('https://www.scholarab.ca', '')}\n     ${m.from}  ->  ${m.to}`);
  }
}

console.log(`\nWrote private/index-status/${stem}.json`);
