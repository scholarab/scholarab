import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
