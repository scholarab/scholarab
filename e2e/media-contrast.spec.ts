import { test, expect } from '@playwright/test';

// White type over the home photo slides, measured against the pixels behind
// it. A CSS contrast check reads background colours and is blind to a photo,
// which is how the slide kicker shipped at 3.3 to 4.5:1 over bright skies
// (critique 2026-09-23). The text is hidden, the backdrop is captured, and the
// median luminance under each line must give white 4.5:1. Text shadows are
// ignored, so the check is pessimistic.

const TAB = '.sab-scopes-tab[aria-selected="true"]';
const LINES = [TAB, '.sab-scope-kicker', '.sab-scope-sub'];

test('text over every home photo slide holds 4.5:1 against its photo', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const sections = page.locator('[data-scopes]');
  const failures: string[] = [];
  for (let s = 0; s < await sections.count(); s++) {
    const section = sections.nth(s);
    // One carousel, two sets behind tabs: show this set first.
    await page.locator(`[data-scopes-tab="${await section.getAttribute('data-scopes')}"]`).click();
    const cards = section.locator('[data-scope-card]');
    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i);
      await section.evaluate((el, idx) => {
        const track = el.querySelector<HTMLElement>('[data-scopes-track]')!;
        track.scrollLeft = idx * track.clientWidth;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
      }, i);
      await card.locator('img').evaluate(img => (img as HTMLImageElement).decode().catch(() => {}));
      const name = (await card.locator('.sab-scope-name').textContent())?.trim();
      const boxes = await section.evaluate((el, [idx, sels]) => {
        const c = el.querySelectorAll<HTMLElement>('[data-scope-card]')[idx as number]!;
        const out: Array<{ sel: string; x: number; y: number; w: number; h: number }> = [];
        for (const sel of sels as string[]) {
          const nodes = sel.startsWith('.sab-scopes-tab') ? [document.querySelector<HTMLElement>(sel)!] : [...c.querySelectorAll<HTMLElement>(sel)];
          for (const n of nodes) {
            const r = n.getBoundingClientRect();
            if (r.width && r.height) out.push({ sel, x: r.x, y: r.y, w: r.width, h: r.height });
            n.style.color = 'transparent';
            n.style.textShadow = 'none';
            n.style.textDecorationColor = 'transparent';
          }
        }
        return out;
      }, [i, LINES]);
      for (const b of boxes) {
        const png = await page.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
        const ratio = await page.evaluate(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const ctx = cv.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
          const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
          const lum: number[] = [];
          for (let p = 0; p < d.length; p += 4) lum.push(0.2126 * lin(d[p]!) + 0.7152 * lin(d[p + 1]!) + 0.0722 * lin(d[p + 2]!));
          lum.sort((a, b) => a - b);
          return 1.05 / (lum[Math.floor(lum.length / 2)]! + 0.05);
        }, `data:image/png;base64,${png.toString('base64')}`);
        if (ratio < 4.5) failures.push(`${name} ${b.sel} ${ratio.toFixed(2)}:1 (${testInfo.project.name})`);
      }
      await section.evaluate(el => [...el.querySelectorAll<HTMLElement>('[style]'), ...document.querySelectorAll<HTMLElement>('.sab-scopes-tab[style]')].forEach(n => {
        if (n.matches('.sab-scopes-tab, .sab-scope-kicker, .sab-scope-sub')) n.removeAttribute('style');
      }));
    }
  }
  expect(failures).toEqual([]);
});
