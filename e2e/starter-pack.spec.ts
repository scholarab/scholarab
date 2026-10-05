import { test, expect } from '@playwright/test';
import { STARTER_PACK_IDS } from '../src/lib/starter-pack';

// A first visit puts the starter pack in My combo; removing one keeps it out.
test.use({ storageState: { cookies: [], origins: [] } });

test('a first visit starts My combo with the starter pack, and a removal sticks', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('scholarab_saved') || '[]'))).toEqual([...STARTER_PACK_IDS]);
  await page.goto('/saved/');
  await expect(page.locator('[data-sv-count]')).toContainText('starter pack');
  await expect(page.locator('[data-saved-n]').first()).toHaveText(String(STARTER_PACK_IDS.length));
  await page.evaluate(id => {
    const ids = (JSON.parse(localStorage.getItem('scholarab_saved') || '[]') as number[]).filter(x => x !== id);
    localStorage.setItem('scholarab_saved', JSON.stringify(ids));
  }, STARTER_PACK_IDS[0]);
  await page.goto('/');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('scholarab_saved') || '[]') as number[]);
  expect(saved).not.toContain(STARTER_PACK_IDS[0]);
});
