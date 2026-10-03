import { test, expect } from '@playwright/test';

// The universities and colleges map (src/pages/map.astro): choosing a place,
// measuring from a town, filtering by kind, and the phone sheet.

test('a place opens in the panel with its schools and their awards', async ({ page }, testInfo) => {
  await page.goto('/map/');
  await expect(page.locator('[data-pin]')).toHaveCount(23);
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: document.documentElement.clientWidth }));
  expect(widths.doc, JSON.stringify(widths)).toBeLessThanOrEqual(widths.view);

  await page.locator('[data-pin="red-deer"]').click();
  await expect(page).toHaveURL(/#red-deer$/);
  const place = page.locator('[data-detail="red-deer"]');
  await expect(place.getByRole('heading', { name: 'Red Deer', level: 2 })).toBeInViewport();
  await expect(place.locator('.am-awards')).toHaveAttribute('href', '/scholarships/university-college-awards/?school=Red%20Deer%20Polytechnic');
  await expect(page.locator('[data-list]')).toBeHidden();
  if (testInfo.project.name === 'mobile') await expect(page.locator('#sab-map')).toHaveAttribute('data-sheet', 'open');

  await place.getByRole('button', { name: 'All places' }).click();
  await expect(page.locator('[data-list]')).toBeVisible();
  await expect(page).toHaveURL(/\/map\/$/);
});

test('a town sorts the places nearest first and draws the way there', async ({ page }) => {
  await page.goto('/map/');
  if (await page.locator('[data-grab]').isVisible()) await page.locator('[data-grab]').click();
  await page.locator('[data-from]').selectOption('lethbridge');
  const first = page.locator('[data-item]:visible').first();
  await expect(first).toHaveAttribute('data-item', 'lethbridge');
  await expect(first.locator('[data-km]')).toHaveText('Here');
  await expect(page.locator('[data-item="edmonton"] [data-km]')).toHaveText(/^4\d\d km$/);
  await page.locator('[data-row="edmonton"]').click();
  await expect(page.locator('[data-detail="edmonton"] [data-km-line]')).toHaveText(/km from Lethbridge, in a straight line/);
  await expect(page.locator('[data-arc-km]')).toBeVisible();
  // Kept for the next visit, on this device only.
  await page.reload();
  await expect(page.locator('[data-from]')).toHaveValue('lethbridge');
});

test('the kind filter leaves only places with that kind of school', async ({ page }) => {
  await page.goto('/map/');
  if (await page.locator('[data-grab]').isVisible()) await page.locator('[data-grab]').click();
  await page.locator('.am-kind[data-kind="polytechnic"]').click();
  const shown = await page.locator('[data-item]:visible').evaluateAll(li => li.map(l => (l as HTMLElement).dataset.item).sort());
  expect(shown).toEqual(['calgary', 'edmonton', 'fairview', 'grande-prairie', 'lethbridge', 'red-deer']);
  await expect(page.locator('[data-pin="banff"]')).toHaveClass(/is-off/);
  await expect(page.locator('[data-pin="edmonton"] [data-pin-count]')).toHaveText('');
  await page.locator('.am-kind[data-kind=""]').click();
  await expect(page.locator('[data-item]:visible')).toHaveCount(23);
});

test('a shared link opens its place without pushing the map off the screen', async ({ page }) => {
  await page.goto('/map/#calgary');
  await expect(page.locator('[data-detail="calgary"]')).toBeVisible();
  await expect(page.locator('[data-pin="calgary"]')).toHaveClass(/is-on/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
