import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planSetReminder, setCandidate } from '../src/lib/set-reminder';
import { todayDate } from '../src/lib/calendar';
import { QUIZ_STORAGE_KEY } from '../src/lib/quiz';
import type { StatusInput } from '../src/lib/status';
import type { ItemType } from '../src/lib/alerts';

// Find fixtures in the actual build, never the database-backed dev server.
function listing(type: 'scholarships' | 'programs', state: 'open' | 'posted') {
  const base = join('dist', 'client', type);
  for (const slug of readdirSync(base)) {
    const file = join(base, slug, 'index.html');
    let html: string;
    try { html = readFileSync(file, 'utf8'); } catch { continue; }
    if (html.includes(`data-reminder-state="${state}"`)) return `/${type}/${slug}/`;
  }
  throw new Error(`Build has no ${type} fixture for ${state}`);
}
for (const type of ['scholarships', 'programs'] as const) {
  for (const [state, heading, button] of [
    ['open', 'Email me when it opens', 'When it opens'],
    ['posted', 'Email me when the date is posted', 'When posted'],
  ] as const) {
    test(`${type} ${state} form keeps the existing confirmation flow`, async ({ page }) => {
      // Browser time is fixed independently of the hour CI runs.
      await page.clock.setFixedTime(new Date('2026-10-09T18:00:00Z'));
      let fail = true;
      let body: Record<string, unknown> | undefined;
      await page.route('**/api/alert', async route => {
        body = route.request().postDataJSON();
        await route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json',
          body: JSON.stringify(fail ? { error: 'Please try again.' } : { ok: true }) });
      });
      await page.goto(listing(type, state));
      const box = page.locator('[data-remind]');
      await expect(box).toHaveAttribute('data-reminder-state', state);
      await expect(box.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      const form = box.locator('[data-sabd-alert-form]');
      await expect(form).toBeVisible();
      await expect(box.getByText('What we keep', { exact: true })).toBeVisible();
      await form.locator('input').fill('student@example.org');
      await form.getByRole('button', { name: button, exact: true }).click();
      await expect(box.locator('[data-sabd-alert-msg]')).toHaveText('Please try again.');
      await expect(form.getByRole('button', { name: button, exact: true })).toBeEnabled();
      fail = false;
      await form.getByRole('button', { name: button, exact: true }).click();
      await expect(box.locator('[data-sabd-alert-msg]')).toHaveText('Request received. If confirmation is needed, check your inbox. Existing reminders stay unchanged.');
      expect(body).toMatchObject({ email: 'student@example.org', itemType: type === 'programs' ? 'program' : 'scholarship' });
      await expect(form).toBeHidden();
    });
  }
}

// One sign-up for a whole set: My combo and the quiz results.
type Row = StatusInput & { type: ItemType; id: number };
const DONE_ALL = (n: number) => `Request received for all ${n}. If confirmation is needed, check your inbox for one email. Existing reminders stay unchanged.`;

test('My combo asks once for every saved listing that can take a reminder', async ({ page }) => {
  const now = new Date('2026-10-14T18:00:00Z');
  await page.clock.setFixedTime(now);
  const today = todayDate(now);
  const rows = (JSON.parse(readFileSync(join('dist', 'client', 'saved-items.json'), 'utf8')) as Row[])
    .filter(r => r.type === 'scholarship');
  const takes = (r: Row) => planSetReminder([setCandidate(r.type, r)], today) !== null;
  const [a, b] = rows.filter(takes);
  const closed = rows.find(r => !takes(r) && r.concluded !== true && r.deadline);
  expect(a && b && closed, 'build has two remindable scholarships and one that is not').toBeTruthy();
  const expected = planSetReminder([a!, b!, closed!].map(r => setCandidate(r.type, r)), today)!;

  let body: Record<string, unknown> | undefined;
  let calls = 0;
  await page.route('**/api/alert', async route => {
    calls++;
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, covered: 2 }) });
  });
  await page.goto('/saved/');
  await page.evaluate(id => localStorage.setItem('scholarab_saved', JSON.stringify([id])), closed!.id);
  await page.reload();
  await expect(page.locator('[data-sv-wrap]')).toHaveCount(1);
  // Nothing on the list can take a reminder, so there is no ask.
  const wrap = page.locator('[data-set-remind]');
  await expect(wrap).toBeHidden();

  // It follows the list as it changes, without a reload.
  await page.evaluate(ids => {
    localStorage.setItem('scholarab_saved', JSON.stringify(ids));
    window.dispatchEvent(new StorageEvent('storage', { key: 'scholarab_saved' }));
  }, [a!.id, b!.id, closed!.id]);
  const open = wrap.locator('[data-set-remind-open]');
  await expect(open).toBeVisible();
  await expect(open).toHaveText('Email me before these close');
  const box = wrap.locator('[data-set-remind-box]');
  await expect(box).toBeHidden();
  await open.click();
  await expect(box).toBeVisible();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  const input = box.locator('input[name="email"]');
  await expect(input).toBeFocused();
  await expect(box.getByRole('heading', { level: 2 })).toHaveText(expected.heading);
  await expect(box.locator('[data-set-remind-sub]')).toHaveText([expected.sub, expected.note].filter(Boolean).join(' '));

  // A bad address never leaves the page.
  await box.getByRole('button', { name: 'Remind me', exact: true }).click();
  await expect(box.locator('[data-set-remind-msg]')).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(calls).toBe(0);

  await input.fill('student@example.org');
  await box.getByRole('button', { name: 'Remind me', exact: true }).click();
  await expect(box.locator('[data-set-remind-msg]')).toHaveText(DONE_ALL(2));
  await expect(box.locator('[data-set-remind-form]')).toBeHidden();
  expect(calls).toBe(1);
  expect(body).toMatchObject({ email: 'student@example.org', place: 'saved' });
  expect((body!.items as { itemId: number }[]).map(i => i.itemId).sort((x, y) => x - y))
    .toEqual([a!.id, b!.id].sort((x, y) => x - y));
  expect(body!.items).toEqual(expect.arrayContaining([{ itemType: 'scholarship', itemId: a!.id }]));
  await expect(page).toHaveURL(/\/saved\/$/);
});

test('the quiz results ask once for the listings on screen', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-30T12:00:00-06:00'));
  const profile = {
    searchType: 'both', city: 'Calgary', field: 'STEM',
    average: '93', institution: 'University of Calgary', board: 'CBE', school: '',
  };
  await page.addInitScript(({ key, profile }) => sessionStorage.setItem(key, JSON.stringify({ version: 3, step: 7, answers: profile, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, profile });
  let body: { email: string; items: { itemType: string; itemId: number }[]; place: string } | undefined;
  await page.route('**/api/alert', async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, covered: body!.items.length }) });
  });
  await page.goto('/match/');
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your combo');
  const open = page.locator('.sabm-results-actions [aria-controls="sabm-remind"]');
  await expect(open).toHaveText('Email me before these close');
  const box = page.locator('#sabm-remind');
  await expect(box).toBeHidden();
  await open.click();
  await expect(box).toBeVisible();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  const input = box.locator('input[name="email"]');
  await expect(input).toBeFocused();
  const heading = await box.getByRole('heading', { level: 2 }).innerText();
  const count = Number(/^Email me before these (\d+) close$/.exec(heading)?.[1]);
  expect(count, heading).toBeGreaterThan(1);
  expect(count).toBeLessThanOrEqual(50);

  await input.fill('student@example.org');
  await box.getByRole('button', { name: 'Remind me', exact: true }).click();
  await expect(box.getByRole('status')).toHaveText(DONE_ALL(count));
  await expect(box.locator('form')).toHaveCount(0);
  expect(body!.place).toBe('match');
  expect(body!.items).toHaveLength(count);
  expect(new Set(body!.items.map(i => `${i.itemType}:${i.itemId}`)).size).toBe(count);
  for (const item of body!.items) {
    expect(['scholarship', 'program']).toContain(item.itemType);
    expect(Number.isInteger(item.itemId)).toBe(true);
  }
  await expect(page).toHaveURL(/\/match\/$/);
  // The button closes it again.
  await open.click();
  await expect(box).toBeHidden();
});
