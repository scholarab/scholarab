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

// Desktop menus are spacex.com lists (2026-10-03): at most six rows hanging
// under their own label. Off the home page the dark band spans the window.
test('header dropdowns hang under their label, six rows at most', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/about/');
  const width = page.viewportSize()!.width;
  for (const label of ['Scholarships', 'Programs', 'Explore']) {
    // By what it controls: its accessible name flips to "Hide" once open.
    const toggle = page.locator(`[aria-controls="sabh-menu-${label.toLowerCase()}"]`);
    await toggle.focus();
    await toggle.press('Enter');
    const menu = page.locator(`#sabh-menu-${label.toLowerCase()}`);
    await expect(menu).toBeVisible();
    const rows = menu.locator('.sabh-menu-desk li');
    expect(await rows.count()).toBeGreaterThan(1);
    expect(await rows.count()).toBeLessThanOrEqual(6);
    const labelLeft = (await page.locator('.sabh-has-menu .sabh-link-label', { hasText: label }).boundingBox())!.x;
    expect(Math.abs((await rows.first().boundingBox())!.x - labelLeft)).toBeLessThan(2);
    await expect(page.locator('.sabh-drop')).toHaveAttribute('data-on', '');
    expect((await page.locator('.sabh-drop').boundingBox())!.width).toBeGreaterThan(width * 0.9);
    await toggle.press('Enter');
  }
});

// Moving from Scholarships to Programs switches the panel in place: the shared
// background stays open and only the contents change.
// The home bar has no background at all, even with a menu open (Ilia,
// 2026-10-03): the open menu is words over the film, as on spacex.com.
test('home header stays see-through with a menu open', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/');
  await page.locator('.sabh-has-menu .sabh-link').first().hover();
  await expect(page.locator('#sabh-menu-scholarships')).toBeVisible();
  await expect(page.locator('.sabh-drop')).toBeHidden();
  const ground = await page.locator('.sab-hero-band').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(ground).toBe('rgba(0, 0, 0, 0)');
});

test('header dropdown switches without closing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop layout');
  await page.goto('/about/');
  const drop = page.locator('.sabh-drop');
  await page.locator('.sabh-has-menu .sabh-link').first().hover();
  await expect(drop).toHaveAttribute('data-on', '');
  await expect(page.locator('#sabh-menu-scholarships')).toBeVisible();
  // Record every time the background turns off during the move.
  await drop.evaluate(el => {
    (window as unknown as { dropOff: number }).dropOff = 0;
    new MutationObserver(() => { if (!el.hasAttribute('data-on')) (window as unknown as { dropOff: number }).dropOff++; })
      .observe(el, { attributes: true, attributeFilter: ['data-on'] });
  });
  await page.locator('.sabh-has-menu .sabh-link').nth(1).hover();
  await expect(page.locator('#sabh-menu-programs')).toBeVisible();
  await expect(page.locator('#sabh-menu-scholarships')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { dropOff: number }).dropOff)).toBe(0);
  await page.mouse.move(5, 600);
  await expect(drop).not.toHaveAttribute('data-on', '');
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

// Save and Apply share one centre line on every row, and Apply's underline
// sits under its word. The line was the link's bottom border, which lifted the
// word 2px above "Save" and, on a phone that stretched the link to 44px, hung
// 15px below it (reader feedback, 2026-09-29). The shaded rows alternate over
// the rows a search leaves on screen, not over every row in the document.
test('rows: Save and Apply on one line, underline under the word, stripes alternate', async ({ page }) => {
  for (const [path, term] of [['/scholarships/', 'engineering'], ['/programs/', 'math']] as const) {
    await page.goto(path);
    const measure = () => page.locator('[data-dir-card]:visible').evaluateAll(cards => cards.slice(0, 10).map(c => {
      const firstText = (el: Element) => {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.textContent ?? '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
        const r = document.createRange(); r.selectNodeContents(walk.nextNode()!); return r.getBoundingClientRect();
      };
      const save = firstText(c.querySelector('.sabl-save-label')!);
      const apply = c.querySelector('.sabl-apply')!;
      const word = firstText(apply);
      const bar = getComputedStyle(apply, '::before');
      const barTop = apply.getBoundingClientRect().bottom - parseFloat(bar.bottom) - parseFloat(bar.height);
      return {
        off: Math.abs((save.top + save.height / 2) - (word.top + word.height / 2)),
        gap: barTop - word.bottom,
        bg: getComputedStyle(c).backgroundColor,
      };
    }));
    for (const rows of [await measure(), await (async () => {
      await page.locator('[data-dir-search]').fill(term);
      await page.waitForTimeout(400);
      return measure();
    })()]) {
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows) {
        expect(r.off).toBeLessThanOrEqual(1);
        expect(r.gap).toBeGreaterThanOrEqual(0);
        expect(r.gap).toBeLessThanOrEqual(6);
      }
      const shaded = rows.map(r => r.bg !== 'rgba(0, 0, 0, 0)');
      expect(shaded).toEqual(rows.map((_, i) => i % 2 === 1));
    }
  }
});

// A row reads in the order a student decides (critique 2026-09-29): the
// date, a figure down the left edge on every width; then the title with the
// money on its line. The date was 14px on a phone, under the amount.
test('rows lead with a date figure left of the title, money on the title line', async ({ page }, testInfo) => {
  for (const path of ['/scholarships/', '/programs/', '/']) {
    await page.goto(path);
    const rows = await page.locator(path === '/' ? '#closing .sab-closing-row' : '[data-dir-card]:visible').evaluateAll(cards => cards.slice(0, 6).map(c => {
      const date = c.querySelector('[data-when-main]')!;
      const title = c.querySelector('.sabl-name, .sab-row-name')!.getBoundingClientRect();
      const money = c.querySelector('.sabl-amount, .sabl-card-top-left, .sab-row-amount')!.getBoundingClientRect();
      const d = date.getBoundingClientRect();
      return { dateRight: d.right, titleLeft: title.left, size: parseFloat(getComputedStyle(date).fontSize), quiet: !!date.closest('.is-quiet'), moneyTop: money.top, titleTop: title.top, moneyH: money.height };
    }));
    expect(rows.length).toBeGreaterThan(2);
    for (const r of rows) {
      expect(r.dateRight).toBeLessThanOrEqual(r.titleLeft);
      if (!r.quiet) expect(r.size).toBeGreaterThanOrEqual(24);
      // Desktop directory rows carry the money on the title's line.
      if (testInfo.project.name !== 'mobile' && path !== '/' && r.moneyH > 0) expect(Math.abs(r.moneyTop - r.titleTop)).toBeLessThan(14);
    }
  }
});

// A finger landing on a row to scroll is not a pointer resting on it: the
// mint hover tint lit whichever row it touched and jumped from row to row as
// the list moved (Ilia, 2026-10-03). Rows tint under a mouse only.
test('rows tint under a pointer, never under a finger', async ({ page }, testInfo) => {
  for (const [path, row] of [['/', '#closing .sab-closing-row'], ['/scholarships/', '[data-dir-card]:visible']] as const) {
    await page.goto(path);
    const first = page.locator(row).first();
    await first.scrollIntoViewIfNeeded();
    const touch = await page.evaluate(() => matchMedia('(hover: none)').matches);
    expect(touch, 'the mobile project emulates a touch screen').toBe(testInfo.project.name === 'mobile');
    const bg = () => first.evaluate(e => getComputedStyle(e).backgroundColor);
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
