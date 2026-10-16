#!/usr/bin/env node
/**
 * Monthly traffic totals, committed as docs/traffic-months.json so the site's
 * history outlives the services that hold it.
 *
 * Why this exists: a sponsor or buyer will ask for month-by-month numbers,
 * and the raw data does not keep. The events table is pruned at 180 days
 * (scripts/prune-events.ts, a promise on /privacy), so July 2026 starts
 * disappearing in January 2027. Cloudflare Web Analytics only looks back a
 * limited window. A committed file is dated by git, which a third party can
 * check, and costs nothing to keep.
 *
 * Search Console is not repeated here. src/data/search-months.json already
 * holds it (npm run gsc-months).
 *
 * Merge rule: a month a source still returns in full is rewritten. A month it
 * no longer covers (pruned, or past its retention) keeps the stored value, so
 * running this late never erases history. A source that fails is reported and
 * the run exits 1, but the sources that worked are still written.
 *
 *   npm run traffic-months
 *
 * Needs DATABASE_URL (.env.local), the GSC service account (scripts/lib/gsc.ts,
 * which also reads GA4), and a Cloudflare token: CLOUDFLARE_API_TOKEN, or the
 * OAuth token `wrangler login` stores. Tokens are read, never printed.
 * Run it in the first days of each month; prune-events.ts fails its job when a
 * month is about to be pruned without a complete record here.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { accessToken, root } from './lib/gsc.ts';

const TRAFFIC_FILE = join(root, 'docs/traffic-months.json');

const GA_PROPERTY = '552662118';
// GA4 was created on 2026-09-02 and Cloudflare's beacon first counted on
// 2026-09-13, so nothing earlier exists in either.
const GA_START = '2026-09-02';
const CF_START = '2026-09';

interface Month {
  month: string;
  /** Edmonton date the event counts were last taken. A record is complete once this is past the month. */
  eventsRecorded?: string;
  events?: Record<string, number>;
  ga4?: { users: number; sessions: number; views: number };
  cloudflare?: { visits: number; pageViews: number };
}

interface TrafficFile {
  generated: string;
  notes: string[];
  months: Month[];
}

const NOTES = [
  'events: first-party counts from the events table, per tab session, not raw hits. The table starts 2026-07-17. September 2026 is short by about 798 rows a since-removed prune step deleted (most on 2026-10-01).',
  'ga4: consent-gated, so it sees roughly one arrival in six. Use it for engagement and trends, never as a total.',
  'cloudflare: cookieless page loads across the account (one site), from adaptive sampling, so totals are estimates rounded to tens. Starts 2026-09-13. Page views before 2026-09-14 are inflated by scroll-position history updates (fixed in c280c59).',
  'Search Console clicks and impressions are in src/data/search-months.json.',
];

function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** The UTC instant of midnight on the first of a month in Edmonton (MST or MDT). */
function edmontonMonthStart(month: string): Date {
  const [y, m] = month.split('-').map(Number) as [number, number];
  for (const offset of [6, 7]) {
    const t = new Date(Date.UTC(y, m - 1, 1, offset));
    const hour = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', hourCycle: 'h23' }).format(t);
    if (hour === '00') return t;
  }
  throw new Error(`No Edmonton midnight found for ${month}`);
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function load(): TrafficFile {
  if (!existsSync(TRAFFIC_FILE)) return { generated: '', notes: NOTES, months: [] };
  return JSON.parse(readFileSync(TRAFFIC_FILE, 'utf8')) as TrafficFile;
}

/** Month -> event -> count, and the first day the table still holds. */
async function events(): Promise<{ first: string; counts: Map<string, Record<string, number>> }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (node reads it from .env.local)');
  const sql = neon(url);
  // events.ts is a UTC wall-clock timestamp; convert it to Edmonton inside SQL,
  // because the driver would read it as this machine's local time.
  const rows = (await sql`
    select to_char(ts at time zone 'UTC' at time zone 'America/Edmonton', 'YYYY-MM') as month,
      event, count(*)::int as n
    from events group by 1, 2 order by 1, 2
  `) as { month: string; event: string; n: number }[];
  const [first] = (await sql`
    select min(ts at time zone 'UTC' at time zone 'America/Edmonton')::date::text as d from events
  `) as { d: string | null }[];
  const counts = new Map<string, Record<string, number>>();
  for (const r of rows) counts.set(r.month, { ...counts.get(r.month), [r.event]: r.n });
  return { first: first?.d ?? today(), counts };
}

async function ga4(): Promise<Map<string, NonNullable<Month['ga4']>>> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: GA_START, endDate: 'today' }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    }),
  });
  if (!res.ok) throw new Error(`GA4 runReport HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
  const out = new Map<string, NonNullable<Month['ga4']>>();
  for (const r of json.rows ?? []) {
    const ym = r.dimensionValues[0]!.value;
    const [users, sessions, views] = r.metricValues.map(v => Number(v.value)) as [number, number, number];
    out.set(`${ym.slice(0, 4)}-${ym.slice(4, 6)}`, { users, sessions, views });
  }
  return out;
}

function cloudflareToken(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const path = join(homedir(), 'Library/Preferences/.wrangler/config/default.toml');
  const read = () => (existsSync(path) ? readFileSync(path, 'utf8') : '');
  // Wrangler's OAuth token lasts an hour and only wrangler renews it. Any
  // authenticated wrangler command does, so whoami runs (silently, it prints
  // the account email) when the stored token is expired or about to be.
  const expires = read().match(/expiration_time\s*=\s*"([^"]+)"/)?.[1];
  if (!expires || Date.parse(expires) - Date.now() < 5 * 60 * 1000) {
    execFileSync('npx', ['wrangler', 'whoami'], { cwd: root, stdio: 'ignore', timeout: 60_000 });
  }
  const token = read().match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  if (!token) throw new Error('No Cloudflare token. Set CLOUDFLARE_API_TOKEN or run `npx wrangler login`.');
  return token;
}

/** Visits and page loads per Edmonton month. A month Cloudflare refuses is left out, not zeroed. */
async function cloudflare(months: string[]): Promise<Map<string, NonNullable<Month['cloudflare']>>> {
  const token = cloudflareToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const accounts = (await (await fetch('https://api.cloudflare.com/client/v4/accounts', { headers })).json()) as {
    success: boolean; result?: { id: string }[];
  };
  const account = accounts.result?.[0]?.id;
  // A refresh token wrangler could not renew lands here.
  if (!accounts.success || !account) throw new Error('Cloudflare rejected the token. Run `npx wrangler login`.');

  const query = `query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){
    rumPageloadEventsAdaptiveGroups(limit:1, filter:{datetime_geq:$s, datetime_lt:$e}){count sum{visits}}
  }}}`;
  const out = new Map<string, NonNullable<Month['cloudflare']>>();
  for (const month of months) {
    const end = new Date(Math.min(edmontonMonthStart(nextMonth(month)).getTime(), Date.now()));
    const res = (await (await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables: { a: account, s: edmontonMonthStart(month).toISOString(), e: end.toISOString() } }),
    })).json()) as {
      errors?: { message: string }[] | null;
      data?: { viewer: { accounts: { rumPageloadEventsAdaptiveGroups: { count: number; sum: { visits: number } }[] }[] } };
    };
    if (res.errors?.length) {
      console.warn(`  cloudflare ${month}: ${res.errors[0]!.message.slice(0, 160)} (kept what was stored)`);
      continue;
    }
    const group = res.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups[0];
    if (group) out.set(month, { visits: group.sum.visits, pageViews: group.count });
  }
  return out;
}

async function main(): Promise<void> {
  const file = load();
  const byMonth = new Map(file.months.map(m => [m.month, m]));
  const at = (month: string): Month => {
    const m = byMonth.get(month) ?? { month };
    byMonth.set(month, m);
    return m;
  };
  const current = today().slice(0, 7);
  const failed: string[] = [];

  try {
    const { first, counts } = await events();
    for (const [month, c] of counts) {
      const m = at(month);
      // The table no longer holds all of this month, so the stored record is
      // the better one. The month the table began in is the exception until
      // it has been recorded once.
      const pruned = first > `${month}-01` && first.slice(0, 7) === month;
      if (pruned && m.events) continue;
      m.events = c;
      m.eventsRecorded = today();
    }
    console.log(`events: ${counts.size} months, table starts ${first}`);
  } catch (e) {
    failed.push(`events (${(e as Error).message})`);
  }

  try {
    const rows = await ga4();
    for (const [month, v] of rows) at(month).ga4 = v;
    console.log(`ga4: ${rows.size} months`);
  } catch (e) {
    failed.push(`ga4 (${(e as Error).message})`);
  }

  try {
    const months: string[] = [];
    for (let m = CF_START; m <= current; m = nextMonth(m)) months.push(m);
    const rows = await cloudflare(months);
    for (const [month, v] of rows) {
      const m = at(month);
      // A shorter retention window returns a smaller partial total for an old
      // month rather than an error, so a closed month only ever grows.
      if (month < current && m.cloudflare && v.visits < m.cloudflare.visits) continue;
      m.cloudflare = v;
    }
    console.log(`cloudflare: ${rows.size} months`);
  } catch (e) {
    failed.push(`cloudflare (${(e as Error).message})`);
  }

  const out: TrafficFile = {
    generated: today(),
    notes: NOTES,
    months: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
  writeFileSync(TRAFFIC_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${out.months.length} months to docs/traffic-months.json`);
  for (const m of out.months) {
    const ev = m.events ? Object.values(m.events).reduce((a, b) => a + b, 0) : '-';
    console.log(`  ${m.month}  events ${String(ev).padStart(6)}  ga4 users ${String(m.ga4?.users ?? '-').padStart(5)}  cf visits ${String(m.cloudflare?.visits ?? '-').padStart(6)}`);
  }

  if (failed.length) {
    console.error(`\nNot updated: ${failed.join('; ')}`);
    process.exitCode = 1;
  }
}

void main();
