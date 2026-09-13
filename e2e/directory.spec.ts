import { test, expect } from '@playwright/test';
import raw from '../src/data/scholarships.json' with { type: 'json' };
import type { Scholarship } from '../src/lib/data-loader';
import { enrichScholarships } from '../src/lib/enrich';
import { DEFAULT_SCHOLARSHIP_STATE, filterSortScholarships, getScholarshipStatus, groupRuns, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS, directoryCountLine } from '../src/lib/list-core';
import { normalizeSearchQuery, scholarshipSearchBlob } from '../src/lib/search-text';

const items = filterSortScholarships(enrichScholarships(raw as unknown as Scholarship[]), DEFAULT_SCHOLARSHIP_STATE);
const unique = items.find(s => items.filter(x => scholarshipSearchBlob(x).includes(normalizeSearchQuery(s.title))).length === 1)!;
const query = unique.title;
test('all listings remain accessible without JavaScript', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(`${baseURL}/scholarships/`);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(items.length);
  await page.close();
});

test('search preserves results, groups, chips, money, closed awards and history', async ({ page }) => {
  await page.goto('/scholarships/');
  const historyLength = await page.evaluate(() => history.length);
  for (const sortBy of ['highest_pay', 'lowest_pay', 'closest_due'] as const) {
    await page.locator(`[data-fkey="sort"][data-fval="${sortBy}"]`).press('Enter');
    for (const searchQuery of [query, '', 'zz-no-matching-student-award']) {
      await page.locator('[data-dir-search]').fill(searchQuery);
      const state = { ...DEFAULT_SCHOLARSHIP_STATE, sortBy, searchQuery };
      const visible = filterSortScholarships(items, state);
      expect(await page.locator('[data-dir-card]:not([hidden])').evaluateAll(els => els.map(e => Number(e.getAttribute('data-id'))))).toEqual(visible.map(s => s.id));
      await expect(page.locator('[data-dir-count]')).toHaveText(directoryCountLine(visible.length, items.length, 'LISTINGS', visible.filter(s => getScholarshipStatus(s) === 'active').length));
      const runs = groupRuns(visible, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS);
      expect(await page.locator('[data-dir-group]:not([hidden])').evaluateAll(els => els.map(e => e.textContent!.replace(/\s+/g, ' ').trim()))).toEqual(runs.length > 1 ? runs.map(r => `${r.label} ${r.count}`) : []);
      const chips = await page.locator('[data-fkey]:has([data-chip-count])').evaluateAll(els => els.map(e => ({ key: e.getAttribute('data-fkey')!, value: e.getAttribute('data-fval')!, count: Number(e.querySelector('[data-chip-count]')!.textContent) })));
      const keys = { category: 'selectedCategory', status: 'statusFilter', region: 'selectedRegion' };
      for (const chip of chips) expect(chip.count).toBe(filterSortScholarships(items, { ...state, [keys[chip.key as keyof typeof keys]]: chip.value || null }).length);
      const money = (status: string) => visible.filter(s => getScholarshipStatus(s) === status).reduce((sum, s) => sum + (s._amount ?? 0), 0);
      await expect(page.locator('[data-dir-stat]')).toHaveText('$' + (money('active') || money('future')).toLocaleString('en-CA'));
      await expect(page.locator('[data-dir-card]')).toHaveCount(items.length);
    }
  }
  for (const s of items.filter(s => s.concluded)) await expect(page.locator(`[data-dir-card][data-id="${s.id}"] [data-days-chip]`)).toHaveText('CLOSED');
  await expect(page.locator('[data-dir-empty]')).toBeVisible();
  await page.locator('[data-dir-clear]').press('Enter');
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(items.length);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.locator(`[data-fkey="category"][data-fval="${unique.category}"]`).press('Enter');
  await page.locator('[data-dir-search]').fill(query);
  await page.locator('[data-dir-card]:visible .sabl-name').press('Enter');
  await expect(page.locator('[data-sabd-position]')).toHaveText('FILTERED · 1 OF 1');
  await page.goBack();
  await expect(page.locator('[data-dir-search]')).toHaveValue(query);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(1);
  await expect(page.locator(`[data-fkey="category"][data-fval="${unique.category}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('[data-dir-search]')).toHaveValue(query);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(1);
});

test('detail arrows walk the filtered search in both directions', async ({ page }) => {
  const term = unique.title.split(' ').find(word => {
    const n = items.filter(s => scholarshipSearchBlob(s).includes(normalizeSearchQuery(word))).length;
    return n >= 3 && n < items.length;
  })!;
  await page.goto(`/scholarships/?sort=highest_pay&q=${encodeURIComponent(term)}`);
  await expect(page.locator('[data-dir-search]')).toHaveValue(term);
  const paths = await page.locator('[data-dir-card]:not([hidden]) .sabl-name').evaluateAll(els => els.map(e => e.getAttribute('href')));
  await page.locator('[data-dir-card]:visible .sabl-name').first().press('Enter');
  for (const index of [0, 1, 2]) {
    await expect(page.locator('[data-sabd-position]')).toHaveText(`FILTERED · ${index + 1} OF ${paths.length}`);
    await expect(page.locator('[data-sabd-prev]')).toHaveAttribute('href', paths[(index + paths.length - 1) % paths.length]!);
    await expect(page.locator('[data-sabd-next]')).toHaveAttribute('href', paths[index + 1]!);
    if (index < 2) await page.locator('[data-sabd-next]').press('Enter');
  }
  await page.locator('[data-sabd-prev]').press('Enter');
  await expect(page).toHaveURL(new RegExp(`${paths[1]}$`));
});
