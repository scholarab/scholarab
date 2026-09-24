import { test, expect } from '@playwright/test';

// Phase 4 of docs/design-35-plan.md: help and recovery at the moment they are
// needed. Each test is the guard for one fix, read off the built pages.

test('a closed listing page offers three open listings above the fold', async ({ page }) => {
  // 59 is the closed award saved.spec.ts already relies on.
  await page.addInitScript(() => localStorage.setItem('scholarab_saved', '[59]'));
  await page.goto('/saved/');
  const href = await page.locator('[data-type="scholarship"][data-id="59"] a[href^="/scholarships/"]').first().getAttribute('href');
  await page.goto(href!);
  const alts = page.locator('.sabd-alts .sabd-alt');
  await expect(alts).toHaveCount(3);
  const box = await alts.first().boundingBox();
  expect(box!.y).toBeLessThan(page.viewportSize()!.height * 1.6);
  await alts.first().click();
  await expect(page.locator('.sabd-cta-row')).not.toContainText('Closed');
});

test('the reminder form names the problem next to the field, in a readable colour', async ({ page }) => {
  await page.goto('/');
  await page.goto((await page.locator('.sab-biggest .sab-closing-row').first().getAttribute('href'))!);
  const form = page.locator('[data-sabd-alert-form]');
  const input = form.locator('input[name="email"]');
  const msg = page.locator('[data-sabd-alert-msg]');
  await input.fill('studentgmail.com');
  await form.locator('button[type="submit"]').click();
  await expect(msg).toHaveText('Add an @ to your email, like name@gmail.com.');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(await input.getAttribute('aria-describedby')).toBe(await msg.getAttribute('id'));
  // It was rgba(238,241,236,.65) on a white card: there and invisible.
  const [r, g, b] = (await msg.evaluate(el => getComputedStyle(el).color)).match(/\d+/g)!.map(Number);
  expect(r! + g! + b!).toBeLessThan(400);
  await input.fill('student@gmail.com');
  await expect(msg).toBeHidden();
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
});

test('hubs named by a jargon word define it above the results', async ({ page }) => {
  for (const [path, term] of [['/programs/olympiads/', 'Olympiad:'], ['/programs/dual-credit/', 'Dual credit:']] as const) {
    await page.goto(path);
    await expect(page.locator('.sabl-define')).toContainText(term);
  }
  await page.goto('/scholarships/');
  await expect(page.locator('.sabl-status-help dt', { hasText: 'Bursary' })).toHaveCount(1);
});

test('the /deadlines breadcrumb Home link is at least 24px tall', async ({ page }) => {
  await page.goto('/deadlines/');
  const box = await page.locator('.sabl-crumbs a', { hasText: 'Home' }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(24);
  expect(box!.width).toBeGreaterThanOrEqual(24);
});

test('/saved does not move the footer when the list replaces the skeleton', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('scholarab_saved', '[4]');
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver(l => {
      for (const e of l.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>)
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/saved/');
  await expect(page.locator('[data-sv-wrap]')).toHaveCount(1);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.01);
});
