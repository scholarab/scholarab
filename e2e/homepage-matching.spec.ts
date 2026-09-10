import { test, expect } from '@playwright/test';

const legacy = process.env.MATCHING_QUIZ_VARIANT === 'legacy';

// Run against each corresponding build. This checks the entire handoff,
// including the destination's interpretation of the stored answer values.
test('homepage teaser hands its selections to the configured quiz', async ({ page }) => {
  await page.goto('/');
  const teaser = page.locator('#match-teaser');
  await expect(teaser).toHaveAttribute('data-quiz-variant', legacy ? 'legacy' : 'adaptive');
  const cta = teaser.getByRole('button', { name: 'Pick 3 more to see matches' });
  await expect(cta).toBeDisabled();
  await expect(teaser.locator('[data-match-group]')).toHaveCount(3);
  await page.evaluate(() => sessionStorage.setItem('scholarab_matching_v1', '{"stale":true}'));

  const selections = legacy
    ? { grade: '12', city: 'Calgary', field: 'STEM' }
    : { searchType: 'programs', grade: 'post-secondary', city: 'Calgary' };
  for (const [key, value] of Object.entries(selections)) {
    await teaser.locator(`[data-match-group="${key}"] [data-value="${value}"]`).click();
  }
  await teaser.getByRole('button', { name: 'Show my matches →' }).click();
  await expect(page).toHaveURL(/\/match\//);

  if (legacy) {
    await expect(page.getByRole('heading', { name: "What's your academic average?" })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('scholarab_quiz_answers_v4')!));
    expect(saved.answers).toEqual({ searchType: 'both', ...selections });
    expect(saved.step).toBe(4);
    expect(await page.evaluate(() => sessionStorage.getItem('scholarab_matching_v1'))).toBeNull();
  } else {
    await expect(page.getByLabel('1. What are you looking for?')).toHaveValue('programs');
    await expect(page.getByLabel('2. What is your current education stage?')).toHaveValue('post-secondary');
    await expect(page.getByLabel('3. Which community do you currently live in?')).toHaveValue('Calgary');
    await page.getByRole('button', { name: 'Show opportunities →' }).click();
    await expect(page.locator('.match-card').first()).toBeVisible();
  }
});
