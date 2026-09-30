// Search Console access shared by index-status.ts, gsc-months.ts and
// gsc-ctr.ts. Each used to carry its own copy of the credential loader and the
// token exchange; one copy means one place a key-handling rule can live.
//
// Credentials come from private/gsc-service-account.json (gitignored) or the
// GSC_SERVICE_ACCOUNT_JSON env var holding the same JSON. Never commit either:
// the key grants write access to the property, including Removals. See
// docs/seo-index-status.md for the one-time setup.
import { createSign } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

// The property as Search Console names it. A URL-prefix property is identified
// by the exact prefix including the trailing slash; a Domain property would be
// "sc-domain:scholarab.ca" instead, and passing the wrong form 403s.
export const SITE_URL = 'https://www.scholarab.ca/';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
    console.error('Credentials JSON has no client_email/private_key. Is it an API key rather than a service account?');
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
export async function accessToken(): Promise<string> {
  const sa = credentials();
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    // An hour is the maximum Google accepts, and every run is minutes, so the
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

export interface AnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Every Search Analytics row for a query, paged. The API returns at most
 * 25,000 rows per request and says nothing when it stops short, so a caller
 * that asks once gets a silently truncated answer on a large window.
 */
export async function searchAnalytics(token: string, request: Record<string, unknown>): Promise<AnalyticsRow[]> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const PAGE = 25000;
  const rows: AnalyticsRow[] = [];
  for (let startRow = 0; ; startRow += PAGE) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, rowLimit: PAGE, startRow }),
    });
    if (!res.ok) {
      console.error(`Search Analytics query failed (HTTP ${res.status}): ${await res.text()}`);
      process.exit(1);
    }
    const page = ((await res.json()) as { rows?: AnalyticsRow[] }).rows ?? [];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}
