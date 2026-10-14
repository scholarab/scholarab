import { test, expect } from '@playwright/test';

// Dark mode follows the system until the visitor picks, and the pick sticks
// across reloads and ClientRouter navigations without a light first paint.
test.use({ storageState: { cookies: [], origins: [] } });

test('the system setting decides the theme before the first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/about/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(13, 20, 16)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('the gear switch picks dark, and the pick survives a reload and a navigation', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'the gear is the desktop header; phones use the menu row');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/scholarships/');
  await page.locator('.sabh-gear-btn').click();
  const sw = page.locator('.sabh-gear-switch');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('a[href="/about/"]').first().click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('print stays light in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
  await page.goto('/about/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');
});

test('the phone menu row switches the theme and reports its state', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the menu row is the phone control');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/about/');
  await page.locator('#sabh-burger').click();
  const row = page.locator('.sabh-theme-row');
  await expect(row).toHaveAttribute('aria-checked', 'false');
  await row.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(row).toHaveAttribute('aria-checked', 'true');
  await row.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('sa_theme'))).toBe('light');
});

test('the gear opens on hover, stays open on the way to the panel, and closes when the mouse leaves', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'hover is the desktop gear');
  await page.goto('/about/');
  const gear = page.locator('[data-sabh-gear]');
  const panel = page.locator('#sabh-gear-panel');
  await page.locator('.sabh-gear-btn').hover();
  await expect(panel).toBeVisible();
  await expect(page.locator('.sabh-gear-btn')).toHaveAttribute('aria-expanded', 'true');
  const btn = (await page.locator('.sabh-gear-btn').boundingBox())!;
  const box = (await panel.boundingBox())!;
  // Straight down from the gear, across the gap, into the panel's first row.
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height + 5, { steps: 3 });
  await page.mouse.move(btn.x + btn.width / 2, box.y + 20, { steps: 3 });
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();
  await page.locator('.sabh-gear-btn').click();
  await expect(panel).toBeVisible();
  await page.mouse.move(10, 600);
  await expect(gear).not.toHaveAttribute('data-open');
});
