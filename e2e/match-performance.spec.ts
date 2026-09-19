import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

// Run after a production build: npm run measure:match.
// MATCH_MEASURE_URL can point at a baseline served with gzip; MATCH_BASELINE=1
// records it without applying the new size budget. Nothing is written to disk.
test('production match startup budget and ten-run median at 4x CPU', async ({ browser }) => {
  test.skip(!process.env.MATCH_MEASURE, 'Opt-in measurement, isolated from concurrent E2E work');
  test.setTimeout(120_000);
  const root = resolve('dist');
  const server = createServer(async (req, res) => {
    try {
      let path = resolve(root, '.' + new URL(req.url!, 'http://localhost').pathname);
      if (!path.startsWith(root + sep)) throw new Error('Outside build');
      if ((await stat(path)).isDirectory()) path += '/index.html';
      const body = gzipSync(await readFile(path));
      const type = ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(path)] ?? 'text/html';
      res.writeHead(200, { 'Content-Type': type, 'Content-Encoding': 'gzip', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address() as { port: number };
  const url = process.env.MATCH_MEASURE_URL ?? `http://127.0.0.1:${address.port}/match/`;
  const runs: Array<{ decoded: number; gzip: number; readyMs: number; inline: number; htmlGzip: number }> = [];
  try {
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, timezoneId: 'America/Edmonton' });
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.setAcceptedEncodings', { encodings: ['gzip'] });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const scripts = new Map<string, { url: string; encoding: string; gzip: number; headers: number }>();
        cdp.on('Network.responseReceived', e => {
          if (e.type === 'Script') scripts.set(e.requestId, { url: e.response.url, encoding: String(e.response.headers['content-encoding'] ?? e.response.headers['Content-Encoding'] ?? ''), gzip: 0, headers: e.response.encodedDataLength });
        });
        // HTTP/2 may report zero per-chunk encoded bytes. The completed
        // transfer minus the response-header bytes gives the actual gzip body.
        cdp.on('Network.loadingFinished', e => { const script = scripts.get(e.requestId); if (script) script.gzip = e.encodedDataLength - script.headers; });
        await page.addInitScript(() => {
          const observer = new MutationObserver(() => {
            const tile = document.querySelector<HTMLButtonElement>('.sabm-opt');
            if (!tile) return;
            observer.disconnect();
            // Probe the installed handler at first render, then require its
            // answer to advance the quiz. Merely seeing SSR HTML is not ready.
            Object.assign(window, { matchProbe: performance.now() });
            tile.click();
          });
          observer.observe(document, { childList: true, subtree: true });
        });
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.sabm-step-label')).toHaveText(/^Question 2 of (up to )?\d+$/);
        const observed = await page.evaluate(() => {
          const readyMs = Number(Reflect.get(window, 'matchProbe'));
          const loaded = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(r => r.responseEnd <= readyMs).map(r => r.name);
          const inline = Array.from(document.scripts).filter(s => !s.src && !['application/ld+json', 'application/json'].includes(s.type)).map(s => s.textContent).join('\n');
          return { readyMs, loaded, inline };
        });
        let decoded = Buffer.byteLength(observed.inline), gzip = 0;
        const modules = [];
        for (const [requestId, script] of scripts) {
          if (!observed.loaded.includes(script.url)) continue;
          expect(script.encoding, script.url).toBe('gzip');
          const transferred = script.gzip;
          expect(transferred, script.url).toBeGreaterThan(0);
          const body = await cdp.send('Network.getResponseBody', { requestId });
          const bytes = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8').length;
          decoded += bytes; gzip += transferred;
          modules.push({ url: script.url, decoded: bytes, gzip: transferred });
        }
        if (i === 0) console.log(JSON.stringify({ modules }));
        runs.push({ decoded, gzip, readyMs: observed.readyMs, inline: Buffer.byteLength(observed.inline), htmlGzip: Number(await response!.headerValue('content-length')) });
      } finally { await context.close(); }
    }
    const median = (key: keyof typeof runs[number]) => { const sorted = runs.map(r => r[key]).sort((a, b) => a - b); return (sorted[4]! + sorted[5]!) / 2; };
    console.log(JSON.stringify({ method: 'Chromium, production, cache disabled, gzip, 4x CPU; decoded includes inline JS, gzip is external JS bodies; inline transfers within HTML', median: { decoded: median('decoded'), gzip: median('gzip'), readyMs: median('readyMs'), inline: median('inline'), htmlGzip: median('htmlGzip') }, runs }));
    if (!process.env.MATCH_BASELINE) expect(Math.max(...runs.map(r => r.decoded))).toBeLessThan(125_000);
  } finally { await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())); }
});
