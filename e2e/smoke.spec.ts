import { test, expect } from '@playwright/test';

test('homepage loads with hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ScholarAB/);
  // Hero tagline is a <p>, not <h1>
  await expect(page.locator("text=Alberta's student opportunity directory.")).toBeVisible();
  await expect(page.getByRole('link', { name: /Find Scholarships/i })).toBeVisible();
});

test('scholarships page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/scholarships');
  await expect(page).toHaveTitle(/Scholarship/i);
  // React list hydrates and shows count
  await expect(page.locator('text=/\\d+ scholarship/').first()).toBeVisible({ timeout: 10_000 });
});

test('programs page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/programs');
  await expect(page).toHaveTitle(/Program/i);
  await expect(page.locator('text=/\\d+ program/').first()).toBeVisible({ timeout: 10_000 });
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
