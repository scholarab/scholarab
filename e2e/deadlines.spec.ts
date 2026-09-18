import { test, expect } from '@playwright/test';
import scholarships from '../src/data/scholarships.json' with { type: 'json' };
import programs from '../src/data/research-programs.json' with { type: 'json' };
import { todayDate } from '../src/lib/calendar';
import { programIsListed, scholarshipStatusOf } from '../src/lib/status';
import { generateSlug } from '../src/lib/utils';
import { formatListingDate } from '../src/lib/meta';

test.use({ javaScriptEnabled: false });

test('every real upcoming deadline keeps its month, name, amount, status and listing link', async ({ page }) => {
  const today = todayDate();
  const upcoming = (date: string | null | undefined) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date + 'T00:00:00') >= today;
  const expected = [
    ...scholarships.filter(s => upcoming(s.deadline)).map(s => ({
      name: s.title, href: `/scholarships/${generateSlug(s.title)}/`, date: s.deadline!, meta: s.amount || 'Varies',
      state: scholarshipStatusOf(s, today) === 'active' ? 'Open now' : s.openDate ? `Opens ${formatListingDate(s.openDate)}` : 'Not open yet',
    })),
    ...programs.filter(p => programIsListed(p, today) && upcoming(p.deadline)).map(p => ({
      name: p.name, href: `/programs/${generateSlug(p.name)}/`, date: p.deadline!, meta: p.paid ? 'Paid' : (p.grades || 'Program'), state: 'Open now',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  await page.goto('/deadlines/');
  const actual = await page.locator('.sabcal-rows > li').evaluateAll(rows => rows.map(row => {
    const link = row.querySelector('a')!;
    return { name: link.firstChild!.textContent!.trim(), href: link.getAttribute('href'),
      date: row.closest('section')!.id + '-' + row.children[0]!.textContent!.trim().padStart(2, '0'),
      meta: row.children[2]!.textContent!.trim(), state: row.querySelector('small')!.textContent!.trim() };
  }));
  expect(actual).toEqual(expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
