import { test, expect } from '@playwright/test';
import raw from '../src/data/scholarships.json' with { type: 'json' };
import type { Scholarship } from '../src/lib/data-loader';
import { enrichScholarships } from '../src/lib/enrich';
import type { Page } from '@playwright/test';
import { DEFAULT_SCHOLARSHIP_STATE, DIRECTORY_PAGE_SIZE, filterSortScholarships, groupRuns, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS, SCHOLARSHIP_SHUT_GROUPS, directoryCountLine, isAfterHighSchool, openNowCount, showingLine } from '../src/lib/list-core';
import { normalizeSearchQuery, scholarshipSearchBlob } from '../src/lib/search-text';

const items = filterSortScholarships(enrichScholarships(raw as unknown as Scholarship[]), DEFAULT_SCHOLARSHIP_STATE);
const PAGE = DIRECTORY_PAGE_SIZE;
/** "Opens later, date not posted" and Closed load shut: heading and count, no cards. */
const SHUT = new Set(SCHOLARSHIP_SHUT_GROUPS);
const open = items.filter(s => !SHUT.has(scholarshipGroupKey(s)));

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

/** On a phone the open filters are a sheet over the list; put it away. */
async function closeFilters(page: Page) {
  const done = page.locator('[data-dir-filters-done]');
  if (await done.isVisible()) await done.click();
}

/** The group headers a reader sees: runs that start inside the revealed
 *  cards, plus every shut run, whose heading is the only way to open it. */
function shownRuns(visible: typeof items, shown: number) {
  const runs = groupRuns(visible, scholarshipGroupKey, SCHOLARSHIP_GROUP_LABELS);
  if (runs.length < 2) return [];
  let at = 0;
  return runs.filter(r => {
    if (SHUT.has(r.key)) return true;
    const start = at; at += r.count; return start < shown;
  }).map(r => `${r.label} ${r.count}`);
}
const unique = items.find(s => items.filter(x => scholarshipSearchBlob(x).includes(normalizeSearchQuery(s.title))).length === 1)!;
const query = unique.title;
test('all listings and program hub navigation remain accessible without JavaScript', async ({ browser, baseURL, viewport }) => {
  const page = await browser.newPage({ javaScriptEnabled: false, viewport });
  await page.goto(`${baseURL}/scholarships/`);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(items.length);

  await page.goto(`${baseURL}/programs/`);
  const browse = page.locator('.sabl-noscript-browse');
  await browse.locator('summary').click();
  await expect(browse.getByRole('heading', { name: 'Format', exact: true })).toBeVisible();
  await expect(browse.getByRole('heading', { name: 'Field', exact: true })).toBeVisible();
  const rootLinks = await browse.getByRole('link').evaluateAll(links => links.map(a => a.getAttribute('href')));
  expect(rootLinks).toContain('/programs/research/');
  expect(rootLinks).toContain('/programs/summer-programs/');
  await browse.locator('a[href="/programs/research/"]').click();
  await expect(page).toHaveURL(/\/programs\/research\/$/);
  await expect(page.locator('[data-dir-card]:visible').first()).toBeVisible();
  await browse.locator('summary').click();
  expect(await browse.getByRole('link').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(rootLinks);
  await expect(browse.locator('a[href="/programs/research/"]')).toHaveAttribute('aria-current', 'page');
  await browse.locator('a[href="/programs/summer-programs/"]').click();
  await expect(page).toHaveURL(/\/programs\/summer-programs\/$/);
  await expect(page.locator('[data-dir-card]:visible').first()).toBeVisible();
  await page.getByRole('link', { name: 'Browse all programs', exact: true }).click();
  await expect(page).toHaveURL(/\/programs\/$/);
  await page.close();
});

test('search preserves results, groups, chips, money, closed awards and history', async ({ page }) => {
  await page.goto('/scholarships/');
  await openFilters(page);
  const historyLength = await page.evaluate(() => history.length);
  for (const sortBy of ['highest_pay', 'lowest_pay', 'closest_due'] as const) {
    await openFilters(page);
    await page.locator('[data-fselect="sort"]:visible').selectOption(sortBy);
    // On a phone the sheet holds the sort and the page behind it is inert.
    await closeFilters(page);
    for (const searchQuery of [query, '', 'zz-no-matching-student-award']) {
      await page.locator('[data-dir-search]').fill(searchQuery);
      const state = { ...DEFAULT_SCHOLARSHIP_STATE, sortBy, searchQuery };
      const visible = filterSortScholarships(items, state);
      expect(await page.locator('[data-dir-card]:not([hidden])').evaluateAll(els => els.map(e => Number(e.getAttribute('data-id'))))).toEqual(visible.slice(0, PAGE).map(s => s.id));
      // The count line still describes every match, not just the
      // cards revealed so far.
      await expect(page.locator('[data-dir-count]')).toHaveText(directoryCountLine(visible.length, items.length, 'LISTINGS', openNowCount(visible)));
      // Label and count only: the bar also carries a Hide/Show word, which is
      // state and not part of what the run is called.
      expect(await page.locator('[data-dir-group]:not([hidden])').evaluateAll(els => els.map(e => `${e.querySelector('.sabl-group-label')!.textContent} ${e.querySelector('.sabl-group-count')!.textContent}`))).toEqual(shownRuns(visible, PAGE));
      const chips = await page.locator('option[data-filter-label]').evaluateAll(els => els.map(e => ({ key: e.parentElement!.getAttribute('data-fselect')!, value: (e as HTMLOptionElement).value, count: Number(e.textContent!.match(/\(([\d,]+)\)$/)![1]!.replace(/,/g, '')) })));
      expect(chips.length).toBeGreaterThan(5);
      const keys = { category: 'selectedCategory', status: 'statusFilter', region: 'selectedRegion' };
      // A status chip counts its run, which leaves out the after-high-school
      // run: "Open now" and the OPEN NOW heading state the same number.
      for (const chip of chips) {
        const hit = filterSortScholarships(items, { ...state, [keys[chip.key as keyof typeof keys]]: chip.value || null });
        expect(chip.count).toBe(chip.key === 'status' && chip.value !== 'all' ? hit.filter(s => !isAfterHighSchool(s)).length : hit.length);
      }
      await expect(page.locator('[data-dir-card]')).toHaveCount(items.length);
    }
  }
  for (const s of items.filter(s => s.concluded)) await expect(page.locator(`[data-dir-card][data-id="${s.id}"] [data-when-main]`)).toHaveText('Closed');
  await expect(page.locator('[data-dir-empty]')).toBeVisible();
  await page.locator('[data-dir-clear]').press('Enter');
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(Math.min(PAGE, items.length));
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await openFilters(page);
  await page.locator('[data-fselect="category"]').selectOption(unique.category!);
  await closeFilters(page);
  await page.locator('[data-dir-search]').fill(query);
  await page.locator('[data-dir-card]:visible .sabl-name').press('Enter');
  await expect(page.locator('[data-sabd-position]')).toHaveText('FILTERED · 1 OF 1');
  await page.goBack();
  await expect(page.locator('[data-dir-search]')).toHaveValue(query);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(1);
  await expect(page.locator('[data-fselect="category"]')).toHaveValue(unique.category!);
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
  await expect(page.locator('[data-fselect="sort"]').first()).toBeVisible();
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

test('one responsive list keeps facts and direct navigation even with an old view preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sa_view', 'gallery'));
  await page.goto('/scholarships/calgary/');
  const cards = page.locator('[data-dir-card]:visible');
  const first = cards.first();
  const second = cards.nth(1);
  expect((await second.boundingBox())!.y).toBeGreaterThan((await first.boundingBox())!.y);
  await expect(first.locator('.sabl-amount')).toBeVisible();
  await expect(first.locator('[data-when]')).toBeVisible();
  const title = await first.locator('.sabl-name').textContent();
  const save = first.locator('[data-dir-save]');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveAttribute('aria-label', `Remove ${title} from saved`);
  await page.reload();
  await expect(first.locator('[data-dir-save]')).toHaveAttribute('aria-pressed', 'true');
  const href = await first.locator('.sabl-name').getAttribute('href');
  await first.locator('.sabl-name').click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('on a phone, filters fold behind one button that counts them', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the fold is phone-only');
  await page.goto('/scholarships/calgary/?category=Arts');
  const btn = page.locator('[data-dir-filters]');
  await expect(page.locator('.sabl-rail')).toBeHidden();
  await expect(page.locator('[data-fselect="sort"]:visible')).toHaveCount(0);
  await expect(page.locator('[data-dir-filter-n]')).toHaveText('1');
  // The first card is on the first screen.
  await expect(page.locator('[data-dir-card]:visible').first()).toBeInViewport();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.sabl-rail')).toBeVisible();
  // A sheet over the page, holding the sort; focus goes into it, and Escape
  // or the scrim puts it away and hands focus back.
  await expect(page.locator('.sabl-rail [data-fselect="sort"]')).toBeFocused();
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.sabl-rail'))).toBe(true);
  expect(await page.locator('.sabl-rail').evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sabl-rail')).toBeHidden();
  await expect(btn).toBeFocused();
  await btn.click();
  await page.mouse.click(10, 120);
  await expect(page.locator('.sabl-rail')).toBeHidden();
});

test('the list reveals 24 at a time and Back returns to the same card', async ({ page }) => {
  await page.goto('/scholarships/');
  const cards = page.locator('[data-dir-card]:visible');
  await expect(cards).toHaveCount(PAGE);
  // Counted within the section the button sits in (OPEN NOW), not all three
  await expect(page.locator('[data-dir-more-line]')).toHaveText(showingLine(open.slice(0, PAGE), open, scholarshipGroupKey, k => SCHOLARSHIP_GROUP_LABELS[k]!));
  await expect(page.locator('[data-dir-more-btn]')).toHaveText(`Show ${PAGE} more`);
  await expect(page.locator('[data-dir-all]')).toHaveText('Show all');

  await page.locator('[data-dir-more-btn]').click();
  await page.locator('[data-dir-more-btn]').click();
  await expect(cards).toHaveCount(PAGE * 3);
  await expect(page).toHaveURL(new RegExp(`show=${PAGE * 3}`));

  // Leave from deep in the list, come back, land on the same card.
  const target = open[PAGE * 2 + 5]!;
  const link = page.locator(`[data-dir-card][data-id="${target.id}"] .sabl-name`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/scholarships/${target._slug}/`));
  await page.goBack();
  await expect(cards).toHaveCount(PAGE * 3);
  await expect(page.locator(`[data-dir-card][data-id="${target.id}"]`)).toBeInViewport();

  // A new filter starts the count over and drops ?show.
  await openFilters(page);
  await page.locator('[data-fselect="status"]').selectOption('active');
  expect(await cards.count()).toBeLessThanOrEqual(PAGE);
  await expect(page).not.toHaveURL(/show=/);

  // "Show all" puts the whole filtered list out and hides the block.
  await page.goto('/scholarships/');
  await page.locator('[data-dir-all]').click();
  await expect(cards).toHaveCount(open.length);
  // A shut section opens from its heading.
  await page.locator('[data-dir-group="closed"] .sabl-group').click();
  await expect(cards).toHaveCount(open.length + items.filter(s => scholarshipGroupKey(s) === 'closed').length);
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
  const status = await page.locator('[data-fselect="status"] option').evaluateAll((options, total) => {
    const option = options.find(o => {
      const n = Number(o.textContent!.match(/\(([\d,]+)\)$/)?.[1]?.replace(/,/g, ''));
      return n >= 3 && n < total;
    });
    return (option as HTMLOptionElement | undefined)?.value;
  }, total);
  expect(status, 'choose a status with multiple results from the rendered data').toBeTruthy();
  await openFilters(page);
  await page.locator('[data-fselect="status"]').selectOption(status!);
  await closeFilters(page);
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

test('program format and field intersect and survive reload and a detail visit', async ({ page }) => {
  await page.goto('/programs/');
  const pair = await page.locator('[data-dir-card]').evaluateAll(cards => {
    const found = cards.find(c => c.getAttribute('data-category') === 'Computing' && c.getAttribute('data-format') === 'research');
    if (!found) throw new Error('Expected a computing research program in the published fixture');
    return { category: found.getAttribute('data-category')!, format: found.getAttribute('data-format')! };
  });
  await openFilters(page);
  await page.locator('[data-fselect="format"]').selectOption(pair.format);
  await page.locator('[data-fselect="category"]').selectOption(pair.category);
  await closeFilters(page);
  await expect(page).toHaveURL(/format=research/);
  await expect(page).toHaveURL(/category=Computing/);
  const expected = await page.locator(`[data-dir-card][data-format="${pair.format}"][data-category="${pair.category}"]`).count();
  expect(expected).toBeGreaterThan(0);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(expected);
  await page.reload();
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(expected);
  const first = page.locator('[data-dir-card]:visible .sabl-name').first();
  const detailHref = await first.getAttribute('href');
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${detailHref}$`));
  await page.goBack();
  await expect(page.locator('[data-fselect="format"]')).toHaveValue(pair.format);
  await expect(page.locator('[data-fselect="category"]')).toHaveValue(pair.category);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(expected);

  // On a format hub the remaining Field filter refines that hub in place.
  await page.goto('/programs/research-placements/');
  await openFilters(page);
  await page.locator('[data-fselect="category"]').selectOption(pair.category);
  await closeFilters(page);
  await expect(page).toHaveURL(/programs\/research-placements\/\?category=Computing/);
  await expect(page.locator('[data-dir-card]:visible')).toHaveCount(expected);
});
