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

test('match quiz - answers every question it is asked and reaches results', async ({ page }) => {
  await page.goto('/match/');
  // Wait for React client:load hydration
  await expect(page.locator('text=Question 1 of 6')).toBeVisible({ timeout: 15_000 });

  // The length is not fixed. Answering the city appends a board question, and
  // a school question on top of that where the city has awards tied to named
  // schools, so the counter reads "of 6" until the city is chosen and "of 7"
  // or "of 8" after it. This used to hard-code six and broke at question 4,
  // one step past the city. Read the counter instead of assuming it.
  const counter = page.locator('text=/Question \\d+ of \\d+/');
  for (let guard = 0; guard < 12; guard++) {
    const label = await counter.first().textContent();
    const [, step, total] = /Question (\d+) of (\d+)/.exec(label ?? '') ?? [];
    expect(step, 'the quiz should show a question counter').toBeDefined();

    // Target the answer tiles by their own class. Scoping to '#main-content
    // button' used to pick the mobile menu burger; it is the first button in
    // main, and its label is whitespace, so the Previous filter kept it. On
    // mobile that opened the nav sheet instead of answering; the quiz never
    // advanced and this test failed on every run.
    const tiles = page.locator('.sabm-opt');
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
    await tiles.first().click();

    if (step === total) break;
    // Deterministic step advance; no fixed sleep racing the transition window.
    // Matched on the step alone: answering the city grows the total in the
    // same tick that advances the step.
    await expect(page.locator(`text=/Question ${Number(step) + 1} of \\d+/`))
      .toBeVisible({ timeout: 10_000 });
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
// #main-content; it landed the reader above the nav they were skipping. The
// structure is invisible on screen, so it needs a test rather than an eye.
for (const path of ['/', '/scholarships/', '/programs/', '/saved/', '/match/',
                    '/about/', '/educators/', '/updates/', '/guides/',
                    '/scholarships/aaaf-memorial-bursary/']) {
  test(`${path} exposes banner, main and contentinfo landmarks`, async ({ page }) => {
    await page.goto(path);
    // getByRole('banner') only matches a <header> that is NOT inside main;
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

// Every scope hub is the same page with a different list in it, and a reader
// picking their way across the SCOPE row clicks the same spot three or four
// times running. Two things used to move that spot: the breadcrumb, which only
// hubs carry, and a heading or standfirst long enough to take an extra line.
// Both are reserved or capped now, and this is the test that says so, because
// the property is "the chips are at the same y on all of these" and no unit
// test can see a wrapped line.
const HUBS = [
  '/scholarships/', '/scholarships/medicine-hat/', '/scholarships/edmonton/',
  '/scholarships/calgary/', '/scholarships/red-deer/', '/scholarships/lethbridge/',
  '/scholarships/airdrie/', '/scholarships/alberta/', '/scholarships/national/',
  '/scholarships/indigenous/', '/scholarships/trades/', '/scholarships/arts/',
  '/scholarships/stem/', '/scholarships/community/', '/scholarships/sports/',
  '/programs/', '/programs/research/', '/programs/computing/',
  '/programs/math-physics/', '/programs/social-sciences/', '/programs/health/',
  '/programs/engineering/', '/programs/enrichment/', '/programs/trades/',
];

test('every hub puts its filter chips at the same height', async ({ page }, testInfo) => {
  // Mobile stacks the header and wraps the chips on its own terms; the row a
  // reader clicks across is the desktop one.
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });

  const seen = new Map<string, number>();
  for (const path of HUBS) {
    await page.goto(path);
    // Measured before the webfont lands, the standfirst wraps on fallback
    // metrics and the number is not the one anybody sees.
    await page.evaluate(() => document.fonts.ready);
    const y = await page.evaluate(() => {
      const body = document.querySelector('.sabp-body')!.getBoundingClientRect().top;
      return Math.round(document.querySelector('.sabl-toolbar')!.getBoundingClientRect().top - body);
    });
    seen.set(path, y);
  }
  const heights = [...new Set(seen.values())];
  expect(Object.fromEntries(seen), 'one shared toolbar height').toEqual(
    Object.fromEntries([...seen.keys()].map(k => [k, heights[0]])),
  );
});

// The field hubs carry the FIELD row as navigation, the way the scholarship
// hubs carry SCOPE: every sibling reachable in one click from any of them,
// with the page's own field marked rather than linked to itself.
test('every field hub links to every other field', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });

  const fields = HUBS.filter(p => p.startsWith('/programs/') && p !== '/programs/');
  // /programs itself is in the walk: its FIELD row navigates too, so a reader
  // on the directory opens a field's page rather than filtering in place.
  for (const path of ['/programs/', ...fields]) {
    await page.goto(path);
    const row = page.locator('.sabl-filter-row').first();
    await expect(row.locator('.sabl-row-label')).toHaveText('FIELD');
    const links = await row.locator('a.sabl-chip-link').evaluateAll(
      els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!),
    );
    expect(links, `${path} links every sibling`).toEqual(
      expect.arrayContaining(fields.filter(f => f !== path)),
    );
    expect(links, `${path} does not link to itself`).not.toContain(path);
    // The chip for the page you are on, "All" included, is marked rather than
    // linked, and it is the only one.
    await expect(row.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(row.locator('button')).toHaveCount(0);
  }
});
