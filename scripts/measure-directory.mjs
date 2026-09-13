// Production build, Chromium, 4x CPU, 20 narrow/clear pairs. CDP Paint includes layout.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Edmonton' });
await page.addInitScript(() => {
  const add = document.addEventListener.bind(document);
  document.addEventListener = function(type, fn, options) {
    if (type !== 'input' || typeof fn !== 'function') return add(type, fn, options);
    return add(type, function(event) {
      if (!event.target.matches('[data-dir-search]')) return fn.call(this, event);
      const label = event.target.value ? 'narrow' : 'clear';
      performance.mark(`${label}-start`);
      fn.call(this, event);
      performance.mark(`${label}-end`);
    }, options);
  };
});
await page.goto(new URL('/scholarships/', process.argv[2] ?? 'http://localhost:4321').href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const query = await page.locator('[data-dir-card]').evaluateAll(cards => {
  const unique = cards.find(c => cards.filter(x => x.dataset.search.includes(c.dataset.name.toLowerCase())).length === 1);
  return unique.dataset.name;
});
const input = page.locator('[data-dir-search]');
const client = await page.context().newCDPSession(page);
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await client.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing', transferMode: 'ReturnAsStream' });
for (let i = 0; i < 20; i++) {
  await input.fill(query);
  await page.waitForTimeout(250);
  await input.fill('');
  await page.waitForTimeout(250);
}
const done = new Promise(resolve => client.once('Tracing.tracingComplete', resolve));
await client.send('Tracing.end');
const { stream } = await done;
let raw = '';
for (;;) {
  const chunk = await client.send('IO.read', { handle: stream });
  raw += chunk.data;
  if (chunk.eof) break;
}
await client.send('IO.close', { handle: stream });
const events = JSON.parse(raw).traceEvents;
const samples = [];
for (const start of events.filter(e => e.name === 'clear-start' && e.ph === 'I')) {
  const end = events.find(e => e.name === 'clear-end' && e.ph === 'I' && e.ts >= start.ts);
  const paint = events.find(e => e.name === 'Paint' && e.ts >= end.ts && e.pid === start.pid);
  samples.push({ handler: (end.ts - start.ts) / 1000, nextPaint: (paint.ts - start.ts) / 1000 });
}
const median = values => { const a = values.toSorted((a,b)=>a-b); return (a[9]+a[10])/2; };
if (samples.length !== 20) throw new Error(`Expected 20 clear samples, got ${samples.length}`);
const result = { chromium: browser.version(), query, cpuThrottle: 4, samples, medianHandler: median(samples.map(x=>x.handler)), medianNextPaint: median(samples.map(x=>x.nextPaint)) };
console.log(JSON.stringify(result));
await browser.close();
