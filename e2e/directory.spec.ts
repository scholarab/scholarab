import { test, expect } from '@playwright/test';
import raw from '../src/data/scholarships.json' with { type: 'json' };
import type { Scholarship } from '../src/lib/data-loader';
import { enrichScholarships } from '../src/lib/enrich';
import type { Page } from '@playwright/test';
import { DEFAULT_SCHOLARSHIP_STATE, DIRECTORY_PAGE_SIZE, filterSortScholarships, getScholarshipStatus, groupRuns, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS, directoryCountLine } from '../src/lib/list-core';
import { normalizeSearchQuery, scholarshipSearchBlob } from '../src/lib/search-text';

const items = filterSortScholarships(enrichScholarships(raw as unknown as Scholarship[]), DEFAULT_SCHOLARSHIP_STATE);
const PAGE = DIRECTORY_PAGE_SIZE;

/** Press "Show more" until the whole filtered list is on screen. */
async function showEverything(page: Page) {
  const btn = page.locator('[data-dir-more-btn]');
  while (await btn.isVisible()) await btn.click();
}

/** On a phone the chips fold behind the Filters button; open it if it is there. */
async function openFilters(page: Page) {
  const btn = page.locator('[data-dir-filters]');
  if (await btn.isVisible() && (await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
}

/** The group headers a reader sees: runs that start inside the revealed cards. */
function shownRuns(visible: typeof items, shown: number) {
  const runs = groupRuns(visible, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS);
  if (runs.length < 2) return [];
  let at = 0;
  return runs.filter(r => { const start = at; at += r.count; return start < shown; }).map(r => `${r.label} ${r.count}`);
}
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
  await openFilters(page);
  const historyLength = await page.evaluate(() => history.length);
  for (const sortBy of ['highest_pay', 'lowest_pay', 'closest_due'] as const) {
    await page.locator(`[data-fkey="sort"][data-fval="${sortBy}"]`).press('Enter');
    for (const searchQuery of [query, '', 'zz-no-matching-student-award']) {
      await page.locator('[data-dir-search]').fill(searchQuery);
      const state = { ...DEFAULT_SCHOLARSHIP_STATE, sortBy, searchQuery };
      const visible = filterSortScholarships(items, state);
      expect(await page.locator('[data-dir-card]:not([hidden])').evaluateAll(els => els.map(e => Number(e.getAttribute('data-id'))))).toEqual(visible.slice(0, PAGE).map(s => s.id));
      // The count line still describes every match, not just the
      // cards revealed so far.
      await expect(page.locator('[data-dir-count]')).toHaveText(directoryCountLine(visible.length, items.length, 'LISTINGS', visible.filter(s => getScholarshipStatus(s) === 'active').length));
      // Label and count only: the bar also carries a Hide/Show word, which is
      // state and not part of what the run is called.
      expect(await page.locator('[data-dir-group]:not([hidden])').evaluateAll(els => els.map(e => `${e.querySelector('.sabl-group-label')!.textContent} ${e.querySelector('.sabl-group-count')!.textContent}`))).toEqual(shownRuns(visible, PAGE));
      const chips = await page.locator('[data-fkey]:has([data-chip-count])').evaluateAll(els => els.map(e => ({ key: e.getAttribute('data-fkey')!, value: e.getAttribute('data-fval')!, count: Number(e.querySelector('[data-chip-count]')!.textContent) })));
      const keys = { category: 'selectedCategory', status: 'statusFilter', region: 'selectedRegion' };
      for (const chip of chips) expect(chip.count).toBe(filterSortScholarships(items, { ...state, [keys[chip.key as keyof typeof keys]]: chip.value || null }).length);
      await expect(page.locator('[data-dir-card]')).toHaveCount(items.length);
    }
  }
  for (const s of items.filter(s => s.concluded)) await expect(page.locator(`[data-dir-card][data-id="${s.id}"] [data-when-main]`)).toHaveText('Closed');
  await expect(page.locator('[data-dir-empty]')).toBeVisible();
  await page.locator('[data-dir-clear]').press('Enter');
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(Math.min(PAGE, items.length));
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

test('hiding the filters widens the grid and survives a reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'the rail is a desktop column');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/scholarships/alberta/');
  const rail = page.locator('.sabl-rail');
  const desc = page.locator('.sabl-desc');
  const grid = page.locator('.sabl-grid');
  await expect(rail).toBeVisible();
  const narrow = (await grid.boundingBox())!.width;

  await page.locator('[data-dir-lean]').click();
  await expect(rail).toBeHidden();
  // Filters only: everything else on the head stays, the standfirst included.
  await expect(desc).toBeVisible();
  await expect(page.locator('.sabl-h1')).toBeVisible();
  await expect(page.locator('[data-dir-search]')).toBeVisible();
  await expect(page.locator('[data-fkey="sort"]').first()).toBeVisible();
  expect((await grid.boundingBox())!.width).toBeGreaterThan(narrow);

  // Set in <head> from localStorage, so the wide layout is in the first paint.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-lean', '');
  await expect(rail).toBeHidden();
  await expect(page.locator('[data-dir-lean]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-dir-lean]').click();
  await expect(rail).toBeVisible();
  expect((await grid.boundingBox())!.width).toBe(narrow);
});

test('the view buttons lay the list out as a grid, columns or gallery, and remember it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Columns is a desktop view');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/scholarships/calgary/');
  const cards = page.locator('[data-dir-card]:visible');
  const pv = page.locator('[data-dir-preview]');
  const title = async (i: number) => (await cards.nth(i).locator('.sabl-name').textContent())!.trim();
  const sideBySide = async () => {
    const a = (await cards.nth(0).boundingBox())!;
    const b = (await cards.nth(1).boundingBox())!;
    return Math.abs(a.y - b.y) < 2 && b.x > a.x;
  };
  await expect(page.locator('[data-dir-view="list"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await sideBySide()).toBe(false);

  await page.locator('[data-dir-view="grid"]').click();
  expect(await sideBySide()).toBe(true);
  // Set in <head> from localStorage, so the chosen view is in the first paint.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-view', 'grid');
  await expect(page.locator('[data-dir-view="grid"]')).toHaveAttribute('aria-pressed', 'true');

  // Columns: a click puts the listing in the preview rather than leaving.
  await page.locator('[data-dir-view="columns"]').click();
  await expect(pv).toBeVisible();
  await expect(pv.locator('.sabl-pv-name')).toHaveText(await title(0));
  await cards.nth(1).locator('.sabl-name').click();
  await expect(page).toHaveURL(/\/scholarships\/calgary\/(\?.*)?$/);
  await expect(pv.locator('.sabl-pv-name')).toHaveText(await title(1));
  await page.keyboard.press('ArrowDown');
  await expect(pv.locator('.sabl-pv-name')).toHaveText(await title(2));
  await pv.locator('[data-dir-step="-1"]').click();
  await expect(pv.locator('.sabl-pv-name')).toHaveText(await title(1));

  // Gallery: the preview on top, every match in one strip under it.
  await page.locator('[data-dir-view="gallery"]').click();
  await expect(pv).toBeVisible();
  expect(await sideBySide()).toBe(true);
  expect((await pv.boundingBox())!.y).toBeLessThan((await cards.nth(0).boundingBox())!.y);

  await page.locator('[data-dir-view="list"]').click();
  await expect(pv).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-view');
  expect(await sideBySide()).toBe(false);
});

test('on a phone, filters fold behind one button that counts them', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the fold is phone-only');
  await page.goto('/scholarships/calgary/?category=Arts');
  const btn = page.locator('[data-dir-filters]');
  await expect(page.locator('.sabl-rail')).toBeHidden();
  await expect(page.locator('[data-fkey="sort"]').first()).toBeHidden();
  await expect(page.locator('[data-dir-filter-n]')).toHaveText('1');
  // The first card is on the first screen.
  await expect(page.locator('[data-dir-card]:visible').first()).toBeInViewport();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.sabl-rail')).toBeVisible();
  await expect(page.locator('[data-fkey="sort"]').first()).toBeVisible();
});

test('the list reveals 24 at a time and Back returns to the same card', async ({ page }) => {
  await page.goto('/scholarships/');
  const cards = page.locator('[data-dir-card]:visible');
  await expect(cards).toHaveCount(PAGE);
  await expect(page.locator('[data-dir-more-line]')).toHaveText(`Showing ${PAGE} of ${items.length.toLocaleString('en-CA')}`);
  await expect(page.locator('[data-dir-more-btn]')).toHaveText(`Show ${PAGE} more`);
  await expect(page.locator('[data-dir-all]')).toHaveText(`Show all ${items.length}`);

  await page.locator('[data-dir-more-btn]').click();
  await page.locator('[data-dir-more-btn]').click();
  await expect(cards).toHaveCount(PAGE * 3);
  await expect(page).toHaveURL(new RegExp(`show=${PAGE * 3}`));

  // Leave from deep in the list, come back, land on the same card.
  const target = items[PAGE * 2 + 5]!;
  const link = page.locator(`[data-dir-card][data-id="${target.id}"] .sabl-name`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/scholarships/${target._slug}/`));
  await page.goBack();
  await expect(cards).toHaveCount(PAGE * 3);
  await expect(page.locator(`[data-dir-card][data-id="${target.id}"]`)).toBeInViewport();

  // A new filter starts the count over and drops ?show.
  await openFilters(page);
  await page.locator('[data-fkey="status"][data-fval="active"]').click();
  expect(await cards.count()).toBeLessThanOrEqual(PAGE);
  await expect(page).not.toHaveURL(/show=/);

  // "Show all" puts the whole filtered list out and hides the block.
  await page.goto('/scholarships/');
  await page.locator('[data-dir-all]').click();
  await expect(cards).toHaveCount(items.length);
  await expect(page.locator('[data-dir-more]')).toBeHidden();
});

test('detail arrows walk the filtered search in both directions', async ({ page }) => {
  const term = unique.title.split(' ').find(word => {
    const n = items.filter(s => scholarshipSearchBlob(s).includes(normalizeSearchQuery(word))).length;
    return n >= 3 && n < items.length;
  })!;
  await page.goto(`/scholarships/?sort=highest_pay&q=${encodeURIComponent(term)}`);
  await expect(page.locator('[data-dir-search]')).toHaveValue(term);
  await showEverything(page);
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

test('program Details links preserve filtered previous and next arrows', async ({ page }) => {
  await page.goto('/programs/');
  const total = await page.locator('[data-dir-card]').count();
  // Any filter that leaves several programs will do; GRADE used to be the one
  // driven here and was deleted on 2026-09-15, so this walks STATUS instead.
  const status = await page.locator('[data-fkey="status"] [data-chip-count]').evaluateAll((slots, total) => {
    const slot = slots.find(slot => Number(slot.textContent) >= 3 && Number(slot.textContent) < total);
    return slot?.closest<HTMLElement>('[data-fkey]')?.dataset.fval;
  }, total);
  expect(status, 'choose a status with multiple results from the rendered data').toBeTruthy();
  await openFilters(page);
  await page.locator(`[data-fkey="status"][data-fval="${status}"]`).click();
  await showEverything(page);
  const paths = await page.locator('[data-dir-card]:not([hidden]) .sabl-name').evaluateAll(links => links.map(link => link.getAttribute('href')!));
  await page.locator('[data-dir-card]:visible .sabl-apply').first().click();
  await expect(page.locator('[data-sabd-position]')).toHaveText(`FILTERED · 1 OF ${paths.length}`);
  await expect(page.locator('[data-sabd-prev]')).toHaveAttribute('href', paths.at(-1)!);
  await expect(page.locator('[data-sabd-next]')).toHaveAttribute('href', paths[1]!);
  await page.locator('[data-sabd-next]').click();
  await expect(page.locator('[data-sabd-position]')).toHaveText(`FILTERED · 2 OF ${paths.length}`);
  await expect(page.locator('[data-sabd-prev]')).toHaveAttribute('href', paths[0]!);
  await expect(page.locator('[data-sabd-next]')).toHaveAttribute('href', paths[2]!);
  await page.locator('[data-sabd-prev]').click();
  await expect(page.locator('[data-sabd-position]')).toHaveText(`FILTERED · 1 OF ${paths.length}`);
});
