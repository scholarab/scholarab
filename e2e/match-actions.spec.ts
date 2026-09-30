import { test, expect, type Locator, type Page } from '@playwright/test';
import payload from '../src/data/quiz-payload.json' with { type: 'json' };
import { QUIZ_STORAGE_KEY } from '../src/lib/quiz';

test.use({ serviceWorkers: 'block' });

async function inspectActions(row: Locator, state: string) {
  await row.evaluate(element => element.scrollIntoView({ block: 'center' }));
  const geometry = await row.evaluate(element => {
    const save = element.querySelector<HTMLElement>('.sabl-save')!;
    const action = element.querySelector<HTMLElement>('.sabl-apply')!;
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const target = (node: HTMLElement) => {
      const rect = box(node);
      const style = getComputedStyle(node);
      const after = getComputedStyle(node, '::after');
      const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(after.left);
      const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(after.right);
      const top = rect.top + parseFloat(style.borderTopWidth) + parseFloat(after.top);
      const bottom = rect.bottom - parseFloat(style.borderBottomWidth) - parseFloat(after.bottom);
      const points = [
        { x: (left + right) / 2, y: top + 1 },
        { x: (left + right) / 2, y: bottom - 1 },
        { x: left + 1, y: (top + bottom) / 2 },
        { x: right - 1, y: (top + bottom) / 2 },
      ];
      return {
        left, right, top, bottom, width: right - left, height: bottom - top, points,
        hits: points.map(point => document.elementFromPoint(point.x, point.y)?.closest('.sabl-save, .sabl-apply') === node),
      };
    };
    return {
      save: box(save), icon: box(save.querySelector('svg')!),
      wrapper: box(save.querySelector('.sabm-save-ico')!), label: box(save.querySelector('.sabl-save-label')!),
      action: box(action), saveTarget: target(save), actionTarget: target(action),
      viewport: document.documentElement.clientWidth,
    };
  });
  const evidence = `${state}: ${JSON.stringify(geometry)}`;
  // The painted button must contain both words and icon, even when Saved grows.
  for (const content of [geometry.icon, geometry.wrapper, geometry.label]) {
    expect(content.left, evidence).toBeGreaterThanOrEqual(geometry.save.left - 0.5);
    expect(content.right, evidence).toBeLessThanOrEqual(geometry.save.right + 0.5);
    expect(content.top, evidence).toBeGreaterThanOrEqual(geometry.save.top - 0.5);
    expect(content.bottom, evidence).toBeLessThanOrEqual(geometry.save.bottom + 0.5);
  }
  expect(geometry.label.left - geometry.icon.right, evidence).toBeGreaterThanOrEqual(2);
  expect(Math.abs((geometry.icon.top + geometry.icon.bottom - geometry.save.top - geometry.save.bottom) / 2), evidence).toBeLessThanOrEqual(1);
  for (const target of [geometry.saveTarget, geometry.actionTarget]) {
    expect(target.width, evidence).toBeGreaterThanOrEqual(44);
    expect(target.height, evidence).toBeGreaterThanOrEqual(44);
    expect(target.left, evidence).toBeGreaterThanOrEqual(0);
    expect(target.right, evidence).toBeLessThanOrEqual(geometry.viewport);
    expect(target.hits, `expanded pointer targets: ${evidence}`).toEqual([true, true, true, true]);
  }
  const overlapWidth = Math.min(geometry.saveTarget.right, geometry.actionTarget.right) - Math.max(geometry.saveTarget.left, geometry.actionTarget.left);
  const overlapHeight = Math.min(geometry.saveTarget.bottom, geometry.actionTarget.bottom) - Math.max(geometry.saveTarget.top, geometry.actionTarget.top);
  expect(overlapWidth <= 0 || overlapHeight <= 0, `Save and Apply/Details pointer areas overlap: ${evidence}`).toBe(true);
  return geometry;
}

async function expectSaved(page: Page, save: Locator, title: string, key: string, id: number, saved: boolean) {
  await expect(save).toHaveAttribute('aria-pressed', String(saved));
  await expect(save).toHaveAccessibleName(`${saved ? 'Remove from saved' : 'Save'}: ${title}`);
  await expect(save.locator('.sabl-save-label')).toHaveText(saved ? 'Saved' : 'Save');
  await expect.poll(() => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) || '[]').includes(id), { key, id })).toBe(saved);
}

for (const width of [1440, 1024, 320]) {
  test(`real result Save and Saved controls stay contained and independently clickable at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== (width === 320 ? 'mobile' : 'chromium'), 'One appropriate desktop or phone context per viewport');
    await page.setViewportSize({ width, height: 900 });
    // Exercise real Apply and Details states without depending on today's date.
    await page.clock.setFixedTime(new Date('2026-09-30T12:00:00-06:00'));
    const profile = {
      searchType: 'both', grade: '12', city: 'Calgary', field: 'STEM',
      average: '93', institution: 'University of Calgary', board: 'CBE', school: '',
    };
    await page.addInitScript(({ key, profile }) => sessionStorage.setItem(key, JSON.stringify({ version: 2, step: 8, answers: profile, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, profile });
    await page.goto('/match/');
    await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
    await page.evaluate(() => document.fonts.ready);
    const showAll = page.getByRole('button', { name: /^Show all \d+ matches$/ });
    if (await showAll.isVisible()) await showAll.click();

    for (const kind of ['scholarships', 'programs'] as const) {
      for (const actionName of ['Apply', 'Details']) {
        await test.step(`${kind}: ${actionName}, Save, Saved, hover and keyboard focus`, async () => {
          const row = page.locator('.sabm-row')
            .filter({ has: page.locator(`.sabm-row-name[href^="/${kind}/"]`) })
            .filter({ has: page.locator('.sabl-apply').filter({ hasText: new RegExp(`^${actionName}`) }) }).first();
          await expect(row, `real ${kind} result with ${actionName}`).toBeVisible();
          const title = (await row.locator('.sabm-row-name').innerText()).trim();
          const record = kind === 'scholarships'
            ? payload.scholarships.find(item => item.title === title)
            : payload.programs.find(item => item.name === title);
          expect(record, `published catalogue record: ${title}`).toBeDefined();
          const key = kind === 'scholarships' ? 'scholarab_saved' : 'scholarab_saved_programs';
          const otherKey = kind === 'scholarships' ? 'scholarab_saved_programs' : 'scholarab_saved';
          const save = row.locator('.sabl-save');
          await expectSaved(page, save, title, key, record!.id, false);
          await inspectActions(row, `${kind} ${actionName} Save`);
          await save.hover();
          await inspectActions(row, `${kind} ${actionName} Save hover`);

          await row.locator('.sabm-row-name').focus();
          await page.keyboard.press('Tab');
          await expect(save).toBeFocused();
          expect(await save.evaluate(element => element.matches(':focus-visible'))).toBe(true);
          await inspectActions(row, `${kind} ${actionName} Save keyboard focus`);
          await page.keyboard.press('Space');
          await expectSaved(page, save, title, key, record!.id, true);
          await inspectActions(row, `${kind} ${actionName} Saved keyboard focus`);
          await page.keyboard.press('Tab');
          await expect(row.locator('.sabl-apply')).toBeFocused();
          await save.hover();
          const saved = await inspectActions(row, `${kind} ${actionName} Saved hover`);
          // The label's final letter must be part of the actual clickable button.
          await page.mouse.click(saved.label.right - 1, (saved.label.top + saved.label.bottom) / 2);
          await expectSaved(page, save, title, key, record!.id, false);

          const unsaved = await inspectActions(row, `${kind} ${actionName} Save after removal`);
          // Click beyond the drawn background to verify the expanded target works.
          const extended = unsaved.saveTarget.points[1]!;
          expect(extended.y).toBeGreaterThan(unsaved.save.bottom);
          await page.mouse.click(extended.x, extended.y);
          await expectSaved(page, save, title, key, record!.id, true);
          await save.click();
          await expectSaved(page, save, title, key, record!.id, false);
          expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), otherKey)).toEqual([]);
        });
      }
    }
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
    expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
  });
}
