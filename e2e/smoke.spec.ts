import { test, expect } from '@playwright/test';

test('homepage loads with hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ScholarAB/);
  await expect(page.getByRole('heading', { level: 1, name: /student opportunities/i })).toBeVisible();
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
    // Target the answer tiles by their own class. Scoping to '#main-content
    // button' used to pick the mobile menu burger — it is the first button in
    // main, and its label is whitespace, so the Previous filter kept it. On
    // mobile that opened the nav sheet instead of answering; the quiz never
    // advanced and this test failed on every run.
    const tiles = page.locator('.sabm-opt');
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
    await tiles.first().click();
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
  // Skeleton clears and count line is shown (0 items if nothing saved)
  await expect(page.locator('text=/\\d+ item(s)? bookmarked/').first()).toBeVisible({ timeout: 10_000 });
});

// The site header rendered inside <main> on every page for months, which meant
// no page had a banner landmark and "Skip to content" could not point at
// #main-content — it landed the reader above the nav they were skipping. The
// structure is invisible on screen, so it needs a test rather than an eye.
for (const path of ['/', '/scholarships/', '/programs/', '/saved/', '/match/',
                    '/about/', '/educators/', '/updates/', '/guides/',
                    '/scholarships/aaaf-memorial-bursary/']) {
  test(`${path} exposes banner, main and contentinfo landmarks`, async ({ page }) => {
    await page.goto(path);
    // getByRole('banner') only matches a <header> that is NOT inside main —
    // which is exactly the property under test.
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    // By selector, not by role: below 900px the link list is display:none
    // until the sheet opens, so it is legitimately out of the a11y tree there.
    // What matters here is that the nav lives in the banner, labelled.
    await expect(page.locator('header.sabh nav#sabh-links[aria-label="Main"]')).toBeAttached();

    const main = page.locator('main#main-content');
    await expect(main).toHaveCount(1);
    await expect(main.locator('header.sabh')).toHaveCount(0);
    await expect(main.locator('footer.sabf-footer')).toHaveCount(0);

    // The skip link points into main, and main can take focus.
    await expect(page.locator('a[href="#main-content"]').first()).toBeAttached();
    await expect(main).toHaveAttribute('tabindex', '-1');
  });
}
