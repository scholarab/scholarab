import { test, expect } from '@playwright/test';

// Serve the checked local build under its allowed origin. Every request is
// intercepted: no real analytics or production API receives test traffic.
test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.scholarab.ca' && !url.pathname.startsWith('/api/')) {
      const response = await page.request.get(new URL(url.pathname + url.search, baseURL).href);
      await route.fulfill({ response });
    } else if (url.hostname === 'www.googletagmanager.com') {
      await route.fulfill({ contentType: 'application/javascript', body: '' });
    } else {
      await route.fulfill({ status: 204, body: '' });
    }
  });
});

test('returning consent sends one view per navigation and can be revoked without reloading', async ({ page }) => {
  let tagLoads = 0;
  page.on('request', request => { if (request.url().includes('googletagmanager.com/gtag/js')) tagLoads++; });
  await page.addInitScript(() => localStorage.setItem('sa_consent', 'granted'));
  await page.goto('https://www.scholarab.ca/');
  const views = () => page.evaluate(() => {
    const layer = (window as unknown as { dataLayer: IArguments[] }).dataLayer;
    return layer.filter(args => args[0] === 'event' && args[1] === 'page_view').length;
  });
  await expect.poll(views).toBe(1);
  await page.locator('footer a[href="/about/"]').first().click();
  await expect(page).toHaveURL('https://www.scholarab.ca/about/');
  await expect.poll(views).toBe(2);
  expect(tagLoads).toBe(1);

  // Request the documented reset through ClientRouter, preserving the loaded tag.
  await page.locator('footer a[href="/privacy/"]').first().evaluate(el => el.setAttribute('href', '/privacy/?ga=ask'));
  await page.locator('footer a[href="/privacy/?ga=ask"]').first().click();
  await expect(page.locator('#sab-consent')).toBeVisible();
  await page.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.locator('#sab-consent')).toBeHidden();
  expect(await page.evaluate(() => {
    const w = window as unknown as { __sabGaId: string; dataLayer: IArguments[]; [key: string]: unknown };
    return {
      disabled: w[`ga-disable-${w.__sabGaId}`],
      denial: w.dataLayer.some(args => args[0] === 'consent' && args[1] === 'update'
        && (args[2] as { analytics_storage: string }).analytics_storage === 'denied'),
    };
  })).toEqual({ disabled: true, denial: true });
  await page.locator('footer a[href="/about/"]').first().click();
  await expect(page).toHaveURL('https://www.scholarab.ca/about/');
  expect(await views()).toBe(2);
});

test('a fresh visitor loads no tag until granting, and an opt-out still outranks a grant', async ({ page }) => {
  await page.goto('https://www.scholarab.ca/');
  await expect(page.locator('#sab-consent')).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { dataLayer: IArguments[] }).dataLayer
    .filter(args => args[0] === 'event' && args[1] === 'page_view').length)).toBe(1);
  await page.evaluate(() => localStorage.setItem('sa_no_track', '1'));
  await page.locator('footer a[href="/about/"]').first().click();
  await expect(page).toHaveURL('https://www.scholarab.ca/about/');
  expect(await page.evaluate(() => {
    const w = window as unknown as { __sabGaId: string; [key: string]: unknown };
    return w[`ga-disable-${w.__sabGaId}`];
  })).toBe(true);
});
