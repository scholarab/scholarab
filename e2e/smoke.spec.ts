import { test, expect } from '@playwright/test';

test('homepage loads with hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ScholarAB/);
  await expect(page.getByRole('heading', { level: 1, name: /Scholarships for Alberta high school students/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Browse [\d,]+ scholarships/i })).toBeVisible();
});

test('scholarships page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/scholarships');
  await expect(page).toHaveTitle(/Scholarship/i);
  // React list hydrates and shows the result line
  await expect(page.locator('text=/[\\d,]+ OF [\\d,]+ LISTINGS/i').first()).toBeVisible({ timeout: 10_000 });
});

test('programs page - list hydrates and shows count', async ({ page }) => {
  await page.goto('/programs');
  await expect(page).toHaveTitle(/Program/i);
  // React list hydrates and shows the result line
  await expect(page.locator('text=/[\\d,]+ OF [\\d,]+ PROGRAMS/i').first()).toBeVisible({ timeout: 10_000 });
});

test('match quiz reaches results', async ({ page }) => {
  await page.goto('/match/');
    // Wait for the matching payload and live answer controls.
    await expect(page.locator('text=/Question 1 of up to \\d+/')).toBeVisible({ timeout: 15_000 });

    // The length is not fixed. Answering the city appends a board question, and
    // a school question on top of that where the city has awards tied to named
    // schools, so the counter reads "of up to 8" until the city is chosen and
    // the real total after it. This used to hard-code six and broke at question 4,
    // one step past the city. Read the counter instead of assuming it.
    const counter = page.locator('text=/Question \\d+ of (up to )?\\d+/');
    for (let guard = 0; guard < 12; guard++) {
      const label = await counter.first().textContent();
      const [, step, total] = /Question (\d+) of (?:up to )?(\d+)/.exec(label ?? '') ?? [];
      expect(step, 'the quiz should show a question counter').toBeDefined();

      // Target the answer tiles by their own class. Scoping to '#main-content
      // button' used to pick the mobile menu burger; it is the first button in
      // main, and its label is whitespace, so the Previous filter kept it. On
      // mobile that opened the nav sheet instead of answering; the quiz never
      // advanced and this test failed on every run.
      const tiles = page.locator('.sabm-opt[data-quiz-answer]');
      await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
      expect(await page.locator('.sabm-opt').count()).toBeLessThanOrEqual(4);
      await tiles.first().click();
      // The institution question takes several answers; Continue commits them.
      const go = page.locator('.sabm-pick-go');
      const moved = page.locator(`text=/Question ${Number(step) + 1} of (up to )?\\d+/`).or(page.locator('.sabm-results-h1'));
      await expect(moved.or(go).first()).toBeVisible({ timeout: 10_000 });
      if (await go.isVisible()) await go.click();

      if (step === total) break;
      // Deterministic step advance; no fixed sleep racing the transition window.
      // Matched on the step alone: answering the city grows the total in the
      // same tick that advances the step.
      await expect(page.locator(`text=/Question ${Number(step) + 1} of (up to )?\\d+/`))
        .toBeVisible({ timeout: 10_000 });
    }

    await expect(page.locator('.sabm-results-h1')).toHaveText('Your combo', { timeout: 10_000 });
    await expect(page.locator('.sabm-results-count')).toContainText(/\d/);
});

test('saved page - hydrates and shows item count', async ({ page }) => {
  await page.goto('/saved');
  // The page title, "My combo" since Build my combo (2026-10-04).
  await expect(page.getByRole('heading', { name: 'My combo', exact: true })).toBeVisible({ timeout: 10_000 });
  // Skeleton clears and the count line is shown (only the device note at zero)
  await expect(page.locator('text=/saved on this device/').first()).toBeVisible({ timeout: 10_000 });
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
  '/scholarships/central-alberta/', '/scholarships/alberta/', '/scholarships/national/',
  '/scholarships/indigenous/', '/scholarships/trades/', '/scholarships/arts/',
  '/scholarships/stem/', '/scholarships/community/', '/scholarships/sports/',
  '/programs/', '/programs/research/', '/programs/computing/',
  '/programs/math-physics/', '/programs/social-sciences/', '/programs/health/',
  '/programs/engineering/', '/programs/enrichment/', '/programs/trades/',
  // The FORMAT axis (2026-09-15): the same hub template on the other axis.
  '/programs/summer-programs/', '/programs/competitions/', '/programs/olympiads/',
  '/programs/science-fairs/', '/programs/research-placements/', '/programs/dual-credit/',
  '/programs/clubs/', '/programs/conferences/',
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
    seen.set(path, await page.evaluate(() => {
      const body = document.querySelector('.sabp-body')!.getBoundingClientRect().top;
      return Math.round(document.querySelector('.sabl-bar')!.getBoundingClientRect().top - body);
    }));
  }
  const first = [...seen.values()][0];
  expect(Object.fromEntries(seen)).toEqual(Object.fromEntries([...seen.keys()].map(k => [k, first])));
});

// The SCOPE row left the scholarship hubs on 2026-09-15 (a reader who picked
// Calgary in the header menu does not need eighteen chips offering to take them
// somewhere else), which makes the hub footer the only path from one hub to the
// next, for a reader and for a crawler. So the property that used to be true of
// the row has to be true of the footer instead.
test('every scholarship hub links to every other hub of its kind', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  const kinds = [
    ['/scholarships/medicine-hat/', '/scholarships/edmonton/', '/scholarships/calgary/',
     '/scholarships/red-deer/', '/scholarships/lethbridge/', '/scholarships/central-alberta/',
     '/scholarships/alberta/', '/scholarships/national/'],
    ['/scholarships/indigenous/', '/scholarships/trades/', '/scholarships/arts/',
     '/scholarships/stem/', '/scholarships/community/', '/scholarships/sports/'],
  ];
  for (const kind of kinds) {
    for (const path of kind) {
      await page.goto(path);
      const links = await page.locator('.sabl-hublinks a').evaluateAll(
        els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!),
      );
      expect(links, `${path} links every sibling`).toEqual(
        expect.arrayContaining(kind.filter(f => f !== path)),
      );
      expect(links, `${path} does not link to itself`).not.toContain(path);
      expect(links, `${path} links back to the directory`).toContain('/scholarships/');
      // WHERE YOU LIVE (was SCOPE) is gone from the rail; TYPE and STATUS are what is left.
      await expect(page.locator('.sabl-row-label', { hasText: /^where you live$/i })).toHaveCount(0);
    }
  }
});

// Category navigation belongs in the header and hub footer. The compact
// directory controls filter in place; every authored hub remains reachable.
test('every format hub links to every other format', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });

  const formats = [
    '/programs/summer-programs/', '/programs/competitions/', '/programs/olympiads/',
    '/programs/science-fairs/', '/programs/research-placements/', '/programs/dual-credit/',
    '/programs/clubs/', '/programs/conferences/',
  ];
  for (const path of ['/programs/', ...formats]) {
    await page.goto(path);
    const navigation = page.locator(path === '/programs/' ? '#sabh-menu-programs' : '.sabl-hublinks');
    const links = await navigation.locator('a[href]').evaluateAll(
      els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!),
    );
    expect(links, `${path} links every sibling`).toEqual(
      expect.arrayContaining(formats.filter(f => f !== path)),
    );
    if (path !== '/programs/') {
      expect(links, `${path} does not link to itself`).not.toContain(path);
      expect(links).toContain('/programs/');
    }
  }
});

test('every field hub links to every other field', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });

  const fields = [
    '/programs/research/', '/programs/computing/', '/programs/math-physics/',
    '/programs/social-sciences/', '/programs/health/', '/programs/engineering/',
    '/programs/enrichment/', '/programs/trades/',
  ];
  // The root's header keeps every field hub; each hub footer links siblings.
  for (const path of ['/programs/', ...fields]) {
    await page.goto(path);
    const navigation = page.locator(path === '/programs/' ? '#sabh-menu-programs' : '.sabl-hublinks');
    const links = await navigation.locator('a[href]').evaluateAll(
      els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!),
    );
    expect(links, `${path} links every sibling`).toEqual(
      expect.arrayContaining(fields.filter(f => f !== path)),
    );
    if (path !== '/programs/') {
      expect(links, `${path} does not link to itself`).not.toContain(path);
      expect(links).toContain('/programs/');
    }
  }
});

// Desktop menus are spacex.com lists (2026-10-03): at most five rows hanging
// under their own label. Off the home page the dark band spans the window.
test('header dropdowns hang under their label, five rows at most', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/about/');
  for (const label of ['Scholarships', 'Programs', 'Explore']) {
    // The label itself is the toggle (2026-10-12).
    const toggle = page.locator(`[aria-controls="sabh-menu-${label.toLowerCase()}"]`);
    await toggle.focus();
    await toggle.press('Enter');
    const menu = page.locator(`#sabh-menu-${label.toLowerCase()}`);
    await expect(menu).toBeVisible();
    const rows = menu.locator('.sabh-menu-desk li');
    expect(await rows.count()).toBeGreaterThan(1);
    expect(await rows.count()).toBeLessThanOrEqual(5);
    const labelLeft = (await page.locator('.sabh-has-menu .sabh-link-label', { hasText: label }).boundingBox())!.x;
    expect(Math.abs((await rows.first().boundingBox())!.x - labelLeft)).toBeLessThan(2);
    // Words over the page, as on home: no panel behind the list (2026-10-12).
    expect(await menu.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await toggle.press('Enter');
  }
});

// Scholarships, Programs and Explore only open their lists (Ilia, 2026-10-12,
// after spacex.com); the first row in each goes where the label used to.
test('clicking a menu label opens its list and stays on the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/about/');
  for (const label of ['Scholarships', 'Programs', 'Explore']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator(`#sabh-menu-${label.toLowerCase()}`)).toBeVisible();
    await expect(page).toHaveURL(/\/about\/$/);
  }
});

// The home bar has no background at all, even with a menu open (Ilia,
// 2026-10-03): the open menu is words over the film, as on spacex.com.
test('home header stays see-through with a menu open', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/');
  await page.locator('.sabh-has-menu .sabh-link').first().hover();
  await expect(page.locator('#sabh-menu-scholarships')).toBeVisible();
  const ground = await page.locator('.sab-hero-band').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(ground).toBe('rgba(0, 0, 0, 0)');
});

// Moving from Scholarships to Programs switches the list in place: the fade
// behind it stays on and only the words change.
test('header dropdown switches without closing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/about/');
  await page.locator('.sabh-has-menu .sabh-link').first().hover();
  await expect(page.locator('html')).toHaveAttribute('data-sab-menu', '');
  await expect(page.locator('#sabh-menu-scholarships')).toBeVisible();
  // Record every time the page's fade behind the menu turns off during the move.
  await page.evaluate(() => {
    (window as unknown as { dropOff: number }).dropOff = 0;
    const el = document.documentElement;
    new MutationObserver(() => { if (!el.hasAttribute('data-sab-menu')) (window as unknown as { dropOff: number }).dropOff++; })
      .observe(el, { attributes: true, attributeFilter: ['data-sab-menu'] });
  });
  await page.locator('.sabh-has-menu .sabh-link').nth(1).hover();
  await expect(page.locator('#sabh-menu-programs')).toBeVisible();
  await expect(page.locator('#sabh-menu-scholarships')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { dropOff: number }).dropOff)).toBe(0);
  await page.mouse.move(5, 600);
  await expect(page.locator('html')).not.toHaveAttribute('data-sab-menu', '');
});

// The scope carousel under the hero: one photo card per scope with a hub
// photo, each linking to its hub, and arrows that step one card at a time.
test('home scope carousel links every card to its hub and steps with the arrows', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'arrows are desktop only');
  await page.goto('/');
  const root = page.locator('[data-scopes="scholarships"]');
  const cards = root.locator('[data-scope-card]');
  // One card per header-menu scope (MENU_SCOPES), not one per photo.
  await expect(cards).toHaveCount(9);
  // CC BY and CC BY-SA photos carry their credit, linked to the source page.
  for (const href of await root.locator('.sab-scope-credit').evaluateAll(els => els.map(e => e.getAttribute('href')))) {
    expect(href).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  }
  await expect(root.locator('.sab-scope-credit')).not.toHaveCount(0);
  for (const href of await cards.locator('.sab-scope-btn-solid').evaluateAll(els => els.map(e => e.getAttribute('href')))) {
    expect(href).toMatch(/^\/scholarships\/[a-z-]+\/$/);
  }
  const track = root.locator('[data-scopes-track]');
  await expect(root.locator('[data-scopes-prev]')).toBeHidden();
  await root.locator('[data-scopes-next]').click();
  await expect(root.locator('.sab-scopes-dot').nth(1)).toHaveAttribute('aria-current', 'true');
  const step = await cards.nth(1).evaluate(el => (el as HTMLElement).offsetLeft - (el.previousElementSibling as HTMLElement).offsetLeft);
  await expect.poll(() => track.evaluate(el => Math.round(el.scrollLeft))).toBe(step);
  await expect(root.locator('[data-scopes-prev]')).toBeVisible();
});

// Only the photo in view and the one beside it download; the next arrives as
// the strip moves. `loading="lazy"` alone fetched five on a Pixel 7
// (1,725 KB for one photo on screen, 2026-09-30).
test('home carousel downloads the photo in view and its neighbour, not the whole strip', async ({ page }) => {
  const photos = new Set<string>();
  page.on('request', r => { if (/\/photos\/backdrops\/.*-(tall|wide)-/.test(r.url())) photos.add(new URL(r.url()).pathname); });
  await page.goto('/');
  const root = page.locator('[data-scopes="scholarships"]');
  await root.scrollIntoViewIfNeeded();
  const cards = root.locator('[data-scope-card] img');
  await expect.poll(() => cards.nth(1).evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await page.waitForTimeout(500);
  expect(photos.size).toBe(2);
  expect(await cards.nth(2).getAttribute('src')).toBeNull();
  await root.locator('[data-scopes-track]').evaluate(el => { el.scrollLeft = el.clientWidth; });
  await expect.poll(() => cards.nth(2).evaluate(img => (img as HTMLImageElement).currentSrc)).toMatch(/\/photos\/backdrops\//);
});

// The program carousel below it: one card per format hub, and its arrows move
// its own track, not the scholarship one above.
test('home program carousel links every card to its format hub', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'arrows are desktop only');
  await page.goto('/');
  const root = page.locator('[data-scopes="programs"]');
  const cards = root.locator('[data-scope-card]');
  await expect(cards).toHaveCount(8);
  for (const href of await cards.locator('.sab-scope-btn-solid').evaluateAll(els => els.map(e => e.getAttribute('href')))) {
    expect(href).toMatch(/^\/programs\/[a-z-]+\/$/);
  }
  const other = page.locator('[data-scopes="scholarships"] [data-scopes-track]');
  // One carousel since 2026-09-24: the programs set sits behind its tab.
  await expect(root).toBeHidden();
  await page.locator('[data-scopes-tab="programs"]').click();
  await expect(root).toBeVisible();
  await expect(page.locator('[data-scopes="scholarships"]')).toBeHidden();
  await root.scrollIntoViewIfNeeded();
  await root.locator('[data-scopes-next]').click();
  await expect(root.locator('.sab-scopes-dot').nth(1)).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => root.locator('[data-scopes-track]').evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(await other.evaluate(el => el.scrollLeft)).toBe(0);
});

// Safari zooms the page into any field under 16px that takes focus, and sizes
// a native <select> itself: the 44px picker on /deadlines drew 29px tall on an
// iPhone. Neither shows in Chromium, so the rule is read off the styles: 16px
// text, and pickers that draw their own box (critique 2026-09-27).
test('on a phone, no field makes Safari zoom and every picker draws its own box', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the 16px rule is phone-only');
  await page.goto('/deadlines/');
  // An open award with a date still to come carries the reminder form.
  const listing = await page.locator('details.sabcal-month .sabcal-row[data-open] .sabcal-name a').first().getAttribute('href');
  const seen: string[] = [];
  const problems: string[] = [];
  for (const path of ['/deadlines/', '/', '/scholarships/', '/programs/', listing!, '/this-page-does-not-exist/']) {
    if (path !== '/deadlines/') await page.goto(path);
    const fields = await page.locator('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea').evaluateAll(all => all.map(f => {
      const s = getComputedStyle(f);
      return { name: f.className || f.tagName.toLowerCase(), size: parseFloat(s.fontSize), select: f.tagName === 'SELECT', appearance: s.appearance };
    }));
    for (const f of fields) {
      seen.push(f.name);
      if (f.size < 16) problems.push(`${path} ${f.name}: ${f.size}px text`);
      if (f.select && f.appearance !== 'none') problems.push(`${path} ${f.name}: native ${f.appearance}`);
    }
  }
  expect(seen.join(' ')).toContain('sabd-remind-input');
  expect(problems).toEqual([]);
});

// The directories are a grid of cards (Ilia, 2026-10-13, ledger cards
// after the polymarket.com copy was dropped): each card hangs from an ink
// rule, Save and Apply are worded links sharing one centre line at the foot,
// before and after a search, and no card is striped the way the rows were.
test('cards: an ink rule on top, Save and Apply on one line, no stripes', async ({ page }) => {
  for (const [path, term] of [['/scholarships/', 'engineering'], ['/programs/', 'math']] as const) {
    await page.goto(path);
    const measure = () => page.locator('[data-dir-card]:visible').evaluateAll(cards => cards.slice(0, 10).map(c => {
      const save = c.querySelector('.sabl-save')!.getBoundingClientRect();
      const apply = c.querySelector('.sabl-apply')!.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return { mid: Math.abs((save.top + save.bottom) / 2 - (apply.top + apply.bottom) / 2), order: apply.left > save.right, rule: parseFloat(cs.borderTopWidth), bg: cs.backgroundColor };
    }));
    for (const cards of [await measure(), await (async () => {
      await page.locator('[data-dir-search-btn]').click();
      await page.locator('[data-dir-search]').fill(term);
      await page.waitForTimeout(400);
      return measure();
    })()]) {
      expect(cards.length).toBeGreaterThan(3);
      for (const c of cards) {
        expect(c.mid).toBeLessThanOrEqual(2);
        expect(c.order).toBe(true);
        expect(c.rule).toBeGreaterThanOrEqual(2);
      }
      expect(new Set(cards.map(c => c.bg)).size).toBe(1);
    }
  }
});

// A card reads top to bottom: the date as its figure, then the name, then
// the money at the foot, with the provider's picture left of it on a
// scholarship. On a laptop the cards sit side by side; on a phone they stack.
test('cards: date first, then the name, then picture and money at the foot', async ({ page }, testInfo) => {
  for (const path of ['/scholarships/', '/programs/']) {
    await page.goto(path);
    const cards = await page.locator('[data-dir-card]:visible').evaluateAll(cs => cs.slice(0, 6).map(c => {
      const date = c.querySelector('[data-when-main]')!;
      const d = date.getBoundingClientRect();
      const title = c.querySelector('.sabl-name')!.getBoundingClientRect();
      const money = c.querySelector('.sabl-amount, .sabl-card-top-left')!.getBoundingClientRect();
      const logo = c.querySelector('.sabl-logo')?.getBoundingClientRect();
      const box = c.getBoundingClientRect();
      return { top: box.top, titleTop: title.top, titleBottom: title.bottom, dateBottom: d.bottom, size: parseFloat(getComputedStyle(date).fontSize), quiet: !!date.closest('.is-quiet'), moneyTop: money.top, moneyLeft: money.left, moneyH: money.height, logoRight: logo && logo.width ? logo.right : null, logoTop: logo && logo.width ? logo.top : null };
    }));
    expect(cards.length).toBeGreaterThan(2);
    for (const c of cards) {
      expect(c.dateBottom).toBeLessThanOrEqual(c.titleTop);
      if (!c.quiet) expect(c.size).toBeGreaterThanOrEqual(20);
      if (c.moneyH > 0) expect(c.moneyTop).toBeGreaterThan(c.titleBottom);
      if (c.logoRight !== null) {
        expect(c.logoTop!).toBeGreaterThan(c.titleBottom);
        if (c.moneyH > 0) expect(c.logoRight).toBeLessThanOrEqual(c.moneyLeft);
      }
    }
    if (path === '/scholarships/') expect(cards.some(c => c.logoRight !== null)).toBe(true);
    if (testInfo.project.name === 'mobile') expect(cards[1]!.top).toBeGreaterThan(cards[0]!.top);
    else expect(cards[1]!.top).toBe(cards[0]!.top);
  }
});

// The home page's closing list keeps the row: the date, a figure down the
// left edge, then the title (critique 2026-09-29).
test('home closing rows lead with a date figure left of the title', async ({ page }) => {
  await page.goto('/');
  const rows = await page.locator('#closing .sab-closing-row').evaluateAll(cs => cs.slice(0, 6).map(c => {
    const date = c.querySelector('[data-when-main]')!;
    return { dateRight: date.getBoundingClientRect().right, titleLeft: c.querySelector('.sab-row-name')!.getBoundingClientRect().left, size: parseFloat(getComputedStyle(date).fontSize), quiet: !!date.closest('.is-quiet') };
  }));
  expect(rows.length).toBeGreaterThan(2);
  for (const r of rows) {
    expect(r.dateRight).toBeLessThanOrEqual(r.titleLeft);
    if (!r.quiet) expect(r.size).toBeGreaterThanOrEqual(24);
  }
});

// A finger landing on a row to scroll is not a pointer resting on it: the
// mint hover tint lit whichever row it touched and jumped from row to row as
// the list moved (Ilia, 2026-10-03). Rows tint under a mouse only. A
// directory card has no fill to tint, so its name turns green instead.
test('rows tint under a pointer, never under a finger', async ({ page }, testInfo) => {
  for (const [path, row, prop] of [['/', '#closing .sab-closing-row', 'backgroundColor'], ['/scholarships/', '[data-dir-card]:visible', 'color']] as const) {
    await page.goto(path);
    const first = page.locator(row).first();
    await first.scrollIntoViewIfNeeded();
    const touch = await page.evaluate(() => matchMedia('(hover: none)').matches);
    expect(touch, 'the mobile project emulates a touch screen').toBe(testInfo.project.name === 'mobile');
    const bg = () => first.evaluate((e, p) => getComputedStyle(p === 'color' ? e.querySelector('.sabl-name')! : e)[p], prop);
    const resting = await bg();
    await first.hover();
    await expect.poll(bg).not.toBe(touch ? '' : resting);
    if (touch) expect(await bg()).toBe(resting);
  }
});

// The disclosure under the reminder form opens where it is. It was a link to
// /privacy/, which took a reader off the listing halfway through signing up.
// A listing a week or more out, so the form (not the late line) is showing.
async function listingDaysOut(page: import('@playwright/test').Page, min: number, max: number) {
  await page.goto('/deadlines/');
  return page.evaluate(({ lo, hi }) => {
    const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton' }).format(new Date()) + 'T00:00:00').getTime();
    for (const li of document.querySelectorAll<HTMLElement>('.sabcal-row[data-open][data-deadline]')) {
      const days = Math.round((new Date(li.dataset.deadline + 'T00:00:00').getTime() - today) / 86400000);
      if (days >= lo && days <= hi) return { href: li.querySelector('.sabcal-name a')!.getAttribute('href')!, deadline: li.dataset.deadline! };
    }
    return null;
  }, { lo: min, hi: max });
}

test('What we keep opens beside the reminder form, on the same page', async ({ page }) => {
  const listing = await listingDaysOut(page, 7, 400);
  expect(listing).not.toBeNull();
  await page.goto(listing!.href);
  const how = page.locator('.sabd-remind-how');
  await expect(how).not.toHaveAttribute('open', '');
  await how.locator('summary').click();
  await expect(how).toHaveAttribute('open', '');
  await expect(how.locator('a[href="/privacy/"]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(listing!.href);
  const tall = await how.locator('summary').evaluate(s => s.getBoundingClientRect().height);
  expect(tall).toBeGreaterThanOrEqual(24);
});

// The mailer sends at exactly 30, 14 and 3 days out. The form promised all
// three on an award closing tomorrow (critique 2026-09-29), so it names only
// the reminders ahead, and gives way to a closing line when none are.
test('the reminder form promises only reminders that can still arrive', async ({ page }) => {
  const listing = await listingDaysOut(page, 7, 400);
  expect(listing).not.toBeNull();
  const at = (daysBefore: number) => new Date(new Date(listing!.deadline + 'T12:00:00-06:00').getTime() - daysBefore * 86400000);

  await page.clock.setFixedTime(at(10));
  await page.goto(listing!.href);
  await expect(page.locator('[data-remind-when]')).toHaveText('3 days');
  await expect(page.locator('[data-remind-late]')).toBeHidden();

  await page.clock.setFixedTime(at(1));
  await page.goto(listing!.href);
  await expect(page.locator('[data-remind-open]')).toBeHidden();
  await expect(page.locator('[data-remind-late]')).toContainText('Closes tomorrow');
});

// The place tabs (2026-10-12, after polymarket.com): one line of every
// scholarship hub, this page's lit, and each one a page that exists.
test('scholarship pages light their own place tab and every tab is a page', async ({ page, request }) => {
  await page.goto('/scholarships/calgary/');
  const tabs = page.locator('.sabl-tab');
  await expect(page.locator('.sabl-tab[aria-current="page"]')).toHaveText('Calgary area');
  await expect(page.locator('.sabl-rail .sabl-scope-select')).toHaveCount(0);
  const hrefs = await tabs.evaluateAll(as => as.map(a => a.getAttribute('href')!));
  expect(hrefs[0]).toBe('/scholarships/');
  expect(hrefs.length).toBeGreaterThan(10);
  for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
  await page.goto('/scholarships/');
  await expect(page.locator('.sabl-tab[aria-current="page"]')).toHaveText('All');
});
