import { test, expect } from '@playwright/test';

test('homepage teaser hands its selections to the legacy quiz', async ({ page }) => {
  await page.goto('/');
  const teaser = page.locator('#match-teaser');
  await expect(teaser).toHaveAttribute('data-quiz-variant', 'legacy');
  const cta = teaser.getByRole('button', { name: 'Pick 3 more to see matches' });
  await expect(cta).toBeDisabled();
  await expect(teaser.locator('[data-match-group]')).toHaveCount(3);
  await page.evaluate(() => sessionStorage.setItem('scholarab_matching_v1', '{"stale":true}'));

  const selections = { grade: '12', city: 'Calgary', field: 'STEM' };
  for (const [key, value] of Object.entries(selections)) {
    await teaser.locator(`[data-match-group="${key}"] [data-value="${value}"]`).click();
  }
  await teaser.getByRole('button', { name: 'Show my matches →' }).click();
  await expect(page).toHaveURL(/\/match\//);

    await expect(page.getByRole('heading', { name: "What's your academic average?" })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('scholarab_quiz_answers_v4')!));
    expect(saved.answers).toEqual({ searchType: 'both', ...selections });
    expect(saved.step).toBe(4);
    expect(await page.evaluate(() => sessionStorage.getItem('scholarab_matching_v1'))).toBeNull();
});
