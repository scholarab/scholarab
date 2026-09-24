import { test, expect, type Page } from '@playwright/test';

// Numbers read off the built pages, compared across the pages that state them.
// The unit tests prove the counting functions agree; this proves the markup
// uses them. Every critique since 2026-09-19 found two pages disagreeing
// (Medicine Hat 22 vs 20, 926 vs 932, 1008 vs 1,002, Competitions 8 open vs 3),
// each fixed where it was found while the next surface computed its own.

const num = (s: string | null | undefined) => Number((s ?? '').replace(/[^\d]/g, '') || 0);

async function chip(page: Page, fval: string): Promise<number> {
  const el = page.locator(`[data-fkey="status"][data-fval="${fval}"] [data-chip-count]`).first();
  return (await el.count()) ? num(await el.textContent()) : 0;
}

test('home photo slides state the same counts as the hubs they link to', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'same markup at every width');
  test.setTimeout(120_000);
  await page.goto('/');
  const slides = await page.locator('[data-scope-card]').evaluateAll(cards => cards.map(c => {
    const subs = [...c.querySelectorAll('.sab-scope-sub')].map(e => e.textContent ?? '');
    return {
      name: c.querySelector('.sab-scope-name')?.textContent?.trim() ?? '',
      href: c.querySelector<HTMLAnchorElement>('.sab-scope-btn-solid')!.getAttribute('href')!,
      total: c.querySelector('.sab-scope-btn-solid')!.textContent ?? '',
      open: subs.find(t => /open right now/.test(t)) ?? '',
      ongoing: subs.find(t => /no fixed deadline/.test(t)) ?? '',
    };
  }));
  expect(slides.length).toBeGreaterThanOrEqual(18);
  for (const s of slides) {
    await page.goto(s.href);
    const hub = { total: await chip(page, 'all'), open: await chip(page, 'active'), ongoing: await chip(page, 'ongoing') };
    expect.soft({ slide: s.name, total: num(s.total), open: num(s.open), ongoing: num(s.ongoing) })
      .toEqual({ slide: s.name, ...hub });
  }
});

test('the deadlines guide and the deadline calendar count the same scholarships', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'same markup at every width');
  await page.goto('/deadlines/');
  const stats = await page.locator('.sabcal-stats').textContent();
  const calendar = num(stats?.match(/\(([\d,]+) scholarships/)?.[1]);
  await page.goto('/guides/alberta-scholarship-deadlines-by-month/');
  const body = await page.locator('main').textContent();
  const guide = num(body?.match(/Of the ([\d,]+) dated scholarship deadlines/)?.[1]);
  expect(calendar).toBeGreaterThan(0);
  expect(guide).toBe(calendar);
});

test('every count on the fixed critique pages is grouped (1,542, never 1542)', async ({ page }) => {
  for (const path of ['/', '/scholarships/', '/scholarships/calgary/', '/programs/', '/programs/competitions/', '/deadlines/']) {
    await page.goto(path);
    const raw = await page.locator('[class*="count"], [class*="-num"], [class*="stat"]').evaluateAll(els =>
      els.map(e => e.textContent ?? '').filter(t => /(?<![\d,.])\d{4,}(?![\d,])/.test(t.replace(/\b(19|20)\d\d\b/g, ''))));
    expect.soft(raw, path).toEqual([]);
  }
});
