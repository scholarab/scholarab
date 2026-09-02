#!/usr/bin/env node
/**
 * Monthly Google Search Console totals, committed as JSON for the admin
 * analytics panel.
 *
 * Why this exists: the first-party events table only starts on 2026-07-17
 * (the table shipped 2026-07-07 and was wiped on the 16th), so Apr, May, Jun
 * and the first half of July are blank in the panel. Search Console keeps 16
 * months of clicks and impressions for the same period, which is measured
 * data rather than a reconstruction, so those months can be filled honestly.
 * It is a different metric from the event counts and is presented as one:
 * clicks are Google search visits, not detail views.
 *
 * The API is not called at request time. The key is a gitignored
 * service-account file that must never reach the Worker, and the numbers only
 * change once a day, so this writes a snapshot the page imports at build time.
 * Run it whenever the panel should catch up:
 *
 *   npm run gsc-months
 *
 * Auth and credential handling are the same as scripts/index-status.ts; see
 * the header there and docs/seo-index-status.md.
 */
import { createSign } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SITE_URL = 'https://www.scholarab.ca/';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OUT = join(root, 'src/data/search-months.json');

// The site's first day in Search Console. Anything earlier returns nothing,
// and the property itself only goes back 16 months, so this is a floor rather
// than a guess about what is available.
const START = '2026-03-01';

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
    console.error('Credentials JSON has no client_email/private_key.');
    process.exit(1);
  }
  return sa;
}

const b64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  };
  const body = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(body);
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

/** Today in Alberta, which is the same clock the panel buckets events by. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function main(): Promise<void> {
  const token = await accessToken(credentials());
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;

  // By date, not by month: the API has no month dimension, and daily rows also
  // reveal how many days each month actually reported, which is what makes a
  // partial first or last month legible rather than a dip.
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: START,
      endDate: today(),
      dimensions: ['date'],
      rowLimit: 1000,
    }),
  });
  if (!res.ok) {
    console.error(`Search Analytics query failed (HTTP ${res.status}): ${await res.text()}`);
    process.exit(1);
  }

  const { rows = [] } = (await res.json()) as {
    rows?: { keys: string[]; clicks: number; impressions: number; position: number }[];
  };

  const buckets = new Map<string, { clicks: number; impressions: number; posSum: number; days: number }>();
  for (const row of rows) {
    const month = (row.keys[0] ?? '').slice(0, 7);
    if (!month) continue;
    const b = buckets.get(month) ?? { clicks: 0, impressions: 0, posSum: 0, days: 0 };
    b.clicks += row.clicks;
    b.impressions += row.impressions;
    // Weighted by impressions, because an average of daily averages would let
    // a quiet day with one lucky impression outvote a busy one.
    b.posSum += row.position * row.impressions;
    b.days += 1;
    buckets.set(month, b);
  }

  const months = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      clicks: Math.round(b.clicks),
      impressions: Math.round(b.impressions),
      position: b.impressions > 0 ? Number((b.posSum / b.impressions).toFixed(1)) : null,
      days: b.days,
    }));

  writeFileSync(OUT, JSON.stringify({ generated: today(), months }, null, 2) + '\n');

  console.log(`Wrote ${months.length} months to src/data/search-months.json`);
  for (const m of months) {
    console.log(`  ${m.month}  ${String(m.clicks).padStart(5)} clicks  ${String(m.impressions).padStart(7)} impressions  pos ${m.position ?? '-'}  (${m.days} days)`);
  }
}

void main();
