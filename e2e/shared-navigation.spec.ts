import { expect, test } from '@playwright/test';

test('Explore keeps every tool reachable by keyboard and phone menu', async ({ page }, testInfo) => {
  await page.goto('/about/');
  const mobile = testInfo.project.name === 'mobile';
  const toggle = page.locator('[aria-controls="sabh-menu-explore"]');
  const open = async () => {
    if (mobile) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('link', { name: 'Explore', exact: true }).click();
    } else {
      await toggle.focus();
      await toggle.press('Enter');
    }
  };
  await open();
  const menu = page.locator('#sabh-menu-explore');
  await expect(menu).toBeVisible();
  const links = menu.getByRole('link');
  const hrefs = await links.evaluateAll(all => all.map(a => a.getAttribute('href')));
  expect(hrefs).toEqual([
    '/match/', '/#closing', '/deadlines/', '/combos/', '/guides/',
    '/guides/alexander-rutherford-scholarship-guide/',
    '/guides/how-to-write-a-scholarship-essay/',
    '/guides/grade-11-scholarship-timeline/',
    '/templates/reference-letter/', '/educators/', '/updates/',
  ]);
  for (const link of await links.all()) await expect(link).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Find my scholarships', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  if (mobile) {
    await expect(page.getByRole('link', { name: 'Explore', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  } else {
    await expect(toggle).toBeFocused();
  }
  await open();
  await menu.getByRole('link', { name: 'Reference letter template' }).click();
  await expect(page).toHaveURL(/\/templates\/reference-letter\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(menu).toBeHidden();
});

// Home was the one page whose header scrolled away: a scoped
// `position: relative` left over from a transparent hero bar beat the sticky
// rule (audit 2026-09-27). Checked on a directory page too, so the test fails
// on the rule, not on one page's layout.
for (const path of ['/', '/scholarships/']) {
  test(`the header stays pinned after scrolling ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect.poll(() => page.locator('[data-sab-header]').evaluate(h => Math.round(h.getBoundingClientRect().top))).toBe(0);
  });
}
