import { test, expect } from '@playwright/test';

test('homepage loads with hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ScholarAB/);
  await expect(page.getByRole('heading', { level: 1, name: /Every scholarship/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Browse \d+ scholarships/i })).toBeVisible();
});

test('scholarships page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/scholarships');
  await expect(page).toHaveTitle(/Scholarship/i);
  // React list hydrates and shows the result line
  await expect(page.locator('text=/\\d+ OF \\d+ LISTINGS/i').first()).toBeVisible({ timeout: 10_000 });
});

test('programs page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/programs');
  await expect(page).toHaveTitle(/Program/i);
  // React list hydrates and shows the result line
  await expect(page.locator('text=/\\d+ OF \\d+ PROGRAMS/i').first()).toBeVisible({ timeout: 10_000 });
});

test('match quiz - completes full 6-question flow', async ({ page }) => {
  await page.goto('/match/');
  // Wait for React client:load hydration
  await expect(page.locator('text=Question 1 of 6')).toBeVisible({ timeout: 15_000 });

  for (let i = 0; i < 6; i++) {
    // Scope to main content to avoid nav buttons; skip the Previous back button
    const tile = page.locator('#main-content button').filter({ hasNotText: /^Previous$/ }).first();
    await tile.click();
    // Deterministic step advance — no fixed sleep racing the transition window
    if (i < 5) {
      await expect(page.locator(`text=Question ${i + 2} of 6`)).toBeVisible({ timeout: 10_000 });
    }
  }

  await expect(page.locator('text=/We found/')).toBeVisible({ timeout: 10_000 });
});

test('saved page - hydrates and shows item count', async ({ page }) => {
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible({ timeout: 10_000 });
  // Skeleton clears and count is shown (0 items if nothing saved)
  await expect(page.locator('text=/\\d+ item/').first()).toBeVisible({ timeout: 10_000 });
});
