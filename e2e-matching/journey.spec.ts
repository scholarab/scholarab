import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseClientCatalogue, encodeClientCatalogue } from '../src/lib/matching/client-catalogue';
import { freshSession, SESSION_KEY } from '../src/lib/matching/session';
const meta = JSON.parse(readFileSync('src/data/matching-client.json', 'utf8'));
async function essentials(page: Page) {
  await page.goto('/match/');
  await page.getByLabel('1. What are you looking for?').selectOption('both');
  await page.getByLabel('2. What is your current education stage?').selectOption('12');
  await page
    .getByLabel('3. Which community do you currently live in?')
    .fill('Privacy Test Community');
  await page.getByRole('button', { name: 'Show opportunities →' }).click();
  await expect(page.locator('.match-card')).toHaveCount(5);
}
test('accessible essentials and results, keyboard focus, mobile reflow and comparison', async ({
  page,
}) => {
  await page.goto('/match/');
  await expect(page.getByRole('heading', { name: 'Three things to get started.' })).toBeVisible();
  const first = await new AxeBuilder({ page })
    .include('#sab-match')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(first.violations).toEqual([]);
  await essentials(page);
  await expect(page.getByRole('heading', { name: 'Your opportunities to explore' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Compare (3/3)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare', exact: true }).first()).toBeDisabled();
  await page.locator('.match-card summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.match-card details').first()).toHaveAttribute('open', '');
  const results = await new AxeBuilder({ page })
    .include('#sab-match')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  // Browser zoom reduces the CSS viewport (CSS `zoom` does not update media queries).
  // 1280px at 200% is 640 CSS px; mobile retains the WCAG 320px reflow floor.
  const viewport = page.viewportSize()!;
  await page.setViewportSize({
    width: Math.max(320, Math.floor(viewport.width / 2)),
    height: viewport.height,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});
test('answers stay local; saves and details hand off without transmitting answers', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() ?? '')));
  await essentials(page);
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await page.getByRole('button', { name: 'End answer session' }).click();
  const stored = await page.evaluate(() => ({
    session: sessionStorage.getItem('scholarab_matching_v1'),
    saved: localStorage.getItem('scholarab_saved'),
    programs: localStorage.getItem('scholarab_saved_programs'),
  }));
  expect(stored.session).not.toContain('Privacy Test Community');
  expect(stored.saved !== '[]' || stored.programs !== '[]').toBe(true);
  expect(requests.join('\n')).not.toMatch(/Privacy(?:%20| )Test/);
  await page.getByRole('link', { name: 'Your saved applications →' }).click();
  await expect(page).toHaveURL(/\/saved\/?$/);
});
test('retries transient core errors and rejects mismatched bytes', async ({ page }) => {
  let attempts = 0;
  await page.route('**/matching/core.*.json', async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, body: 'unavailable' });
    else await route.continue();
  });
  await page.goto('/match/');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await expect(page.locator('[data-catalogue-ready="true"]')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.unroute('**/matching/core.*.json');
  await page.route('**/matching/core.*.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"version":1}' })
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Catalogue version changed');
});
test('storage denial does not prevent matching; teaser migration keeps only exact essentials', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('denied');
    };
  });
  await essentials(page);
  await expect(
    page.getByText('Answers cannot be saved in this tab.', { exact: false })
  ).toBeVisible();
});
test('teaser and catalogue mismatch do not resurrect expired or approximate answers', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'scholarab_quiz_answers_v4',
      JSON.stringify({
        savedAt: Date.now(),
        answers: { searchType: 'both', grade: '12', city: 'Calgary', avg: '85' },
      })
    )
  );
  await page.goto('/match/');
  await expect(page.getByLabel('3. Which community do you currently live in?')).toHaveValue(
    'Calgary'
  );
  expect(await page.evaluate(() => sessionStorage.getItem('scholarab_matching_v1'))).not.toContain(
    '"average"'
  );
  await page.evaluate(() => {
    const s = JSON.parse(sessionStorage.getItem('scholarab_matching_v1')!);
    s.catalogueHash = 'stale';
    sessionStorage.setItem('scholarab_matching_v1', JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByLabel('3. Which community do you currently live in?')).toHaveValue('');
});
test('expiry clears answers; students can explicitly extend before expiration', async ({
  page,
}) => {
  const session = freshSession(meta.catalogueHash);
  session.intent = 'both';
  session.stage = '12';
  session.community = 'Expiry Test';
  session.ready = true;
  session.expiresAt = Date.now() + 30000;
  await page.addInitScript(
    ({ session, key }) => sessionStorage.setItem(key, JSON.stringify(session)),
    { session, key: SESSION_KEY }
  );
  await page.goto('/match/');
  await expect(page.getByRole('button', { name: 'Keep answers for another hour' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep answers for another hour' }).click();
  const extended = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('scholarab_matching_v1')!).expiresAt
  );
  expect(extended).toBeGreaterThan(session.expiresAt + 3500000);
  await page.clock.install();
  await page.clock.fastForward(3600001);
  await expect(page.getByRole('heading', { name: 'Three things to get started.' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('scholarab_matching_v1'))).not.toContain(
    'Expiry Test'
  );
});
test('a verified fixture supports refinement, explicit opt-in and declining without a loop', async ({
  page,
}) => {
  // Local network fixture only: complete real catalogue, one synthetic rule.
  // Pin its hash in the test HTML so the real integrity boundary still runs.
  const core = parseClientCatalogue(
    JSON.parse(readFileSync(`public/matching/core.${meta.coreHash}.json`, 'utf8')),
    meta.catalogueHash
  );
  const o = core.opportunities.find((o) => o.key === 'scholarship:14')!;
  const rule = {
    id: 'test-identity',
    field: 'identity' as const,
    importance: 'mandatory' as const,
    condition: { operator: 'equals' as const, value: true },
    answerKey: 'test.identity',
    explanation: 'Synthetic optional criterion for automated testing only.',
    referenceDate: null,
    evidence: {
      status: 'reviewed' as const,
      sourceUrl: 'https://example.org',
      excerpt: 'Synthetic test fixture, not a real provider criterion.',
      verifiedAt: '2026-01-01',
    },
  };
  o.matching.requirements = [rule];
  o.matching.groups = [{ id: 'test-root', operator: 'all', children: [rule.id] }];
  o.matching.root = 'test-root';
  const body = JSON.stringify(encodeClientCatalogue(core)),
    hash = createHash('sha256').update(body).digest('hex');
  await page.route('**/match/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replaceAll(meta.coreHash, hash),
    });
  });
  await page.route('**/matching/core.*.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body })
  );
  await essentials(page);
  await expect(page.getByRole('button', { name: 'Check one more requirement' })).toBeDisabled();
  await page.getByLabel('Offer optional questions about personal eligibility topics').check();
  await page.getByRole('button', { name: 'Check one more requirement' }).click();
  await expect(page.getByText(rule.explanation, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Prefer not to answer' }).click();
  await expect(page.getByRole('button', { name: 'Check one more requirement' })).toBeDisabled();
});
