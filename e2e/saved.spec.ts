import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

test('Saved stays small while retaining bookmarks, cross-tab updates and calendar export', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const response = await page.goto('/saved/');
  // Budget the bytes a student downloads (the page is served compressed), not
  // the raw HTML: every listing is inlined so any bookmark renders from the
  // cached page, and the raw size grows with the catalogue while the transfer
  // barely moves. 200 KB still catches a return to rendering every card.
  expect(gzipSync(await response!.text()).length).toBeLessThan(200_000);
  await expect(page.locator('[data-sv-content]')).toBeVisible();
  await expect(page.locator('[data-sv-wrap]')).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem('scholarab_saved', '[4,"59",999999]');
    localStorage.setItem('scholarab_saved_programs', '["1",2]');
  });
  await page.reload();
  await expect(page.locator('[data-sv-count]')).toContainText('4 items');
  await expect(page.locator('[data-sv-wrap]')).toHaveCount(4);
  await expect(page.locator('[data-type="scholarship"][data-id="59"] [data-when-main]')).toHaveText('Closed');
  const dated = await page.locator('[data-sv-wrap] .sabl-card[data-deadline]').evaluateAll(cards => cards.filter(c => !['', 'TBA', 'Ongoing'].includes(c.getAttribute('data-deadline') ?? '')).length);
  await page.locator('[data-sv-view="calendar"]').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-cal-add]').click();
  const calendar = await readFile((await (await download).path())!, 'utf8');
  expect(calendar).toContain('SUMMARY:Deadline: South Country Co-op Scholarship');
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(dated);
  await page.locator('[data-sv-view="list"]').click();
  await page.locator('[data-type="scholarship"][data-id="4"] [data-sv-remove]').click();
  await expect(page.locator('[data-sv-count]')).toContainText('3 items');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('scholarab_saved')!))).toEqual([59, 999999]);
  await page.evaluate(() => {
    localStorage.setItem('scholarab_saved', '[59,4,999999]');
    window.dispatchEvent(new StorageEvent('storage', { key: 'scholarab_saved' }));
  });
  await expect(page.locator('[data-sv-count]')).toContainText('4 items');
  expect(await page.locator('[data-sv-wrap][data-type="scholarship"]').evaluateAll(els => els.map(e => e.getAttribute('data-id')))).toEqual(['4', '59']);
});
