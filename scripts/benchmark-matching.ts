/** Serve dist locally first (for example python3 -m http.server 4322 -d dist).
 * Measures resources actually requested by the current quiz, not all bundles. */
import { chromium } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4322');
if (!['localhost', '127.0.0.1'].includes(base.hostname))
  throw new Error('Benchmark must use a local build');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const resources: Promise<{ path: string; raw: number; gzip: number; type: string }>[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).origin !== base.origin) return;
    const type = response.request().resourceType();
    if (['document', 'script', 'fetch'].includes(type))
      resources.push(
        response
          .body()
          .then((body) => ({
            path: new URL(response.url()).pathname,
            raw: body.length,
            gzip: gzipSync(body).length,
            type,
          }))
      );
  });
  const start = performance.now();
  await page.goto(new URL('/match/', base).href);
  await page.getByText('What are you looking for?', { exact: true }).waitFor();
  const readyMs = performance.now() - start;
  await page.waitForLoadState('networkidle');
  const loaded = await Promise.all(resources);
  const report = {
    measuredAt: new Date().toISOString(),
    conditions:
      'Local static build, cold browser context, Chromium, 390x844, 4x CPU; gzip is Node gzip; no network throttling',
    readyMs: Math.round(readyMs),
    resources: loaded,
    totals: loaded.reduce((a, r) => ({ raw: a.raw + r.raw, gzip: a.gzip + r.gzip }), {
      raw: 0,
      gzip: 0,
    }),
  };
  mkdirSync('.cache', { recursive: true });
  writeFileSync('.cache/matching-browser-baseline.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
