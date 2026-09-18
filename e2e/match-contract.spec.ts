import { test, expect } from '@playwright/test';
import transport from '../src/data/quiz-payload.json' with { type: 'json' };
import { QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, QUIZ_TTL_MS, boardsForCity, schoolsForCity, boardQuestion, schoolQuestion } from '../src/lib/quiz';

import { readQuizPayload } from '../src/lib/quiz-payload';
const payload = readQuizPayload(transport);

// Payload fault injection must reach Playwright rather than the service worker.
test.use({ serviceWorkers: 'block' });

const city = QUIZ_QUESTIONS.find(q => q.key === 'city')!.opts.find(o =>
  boardsForCity(payload.scholarships, o.value).length && schoolsForCity(payload.scholarships, o.value).length)!.value;
const questions = [...QUIZ_QUESTIONS, boardQuestion(boardsForCity(payload.scholarships, city)), schoolQuestion(schoolsForCity(payload.scholarships, city))];
const answers = Object.fromEntries(questions.map(q => [q.key,
  q.key === 'city' ? city : q.key === 'searchType' ? 'both' : q.opts[0]!.value]));

test('catalogue questions keep their order, keyboard navigation, private resume and result focus', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', r => { sent.push(r.url()); if (r.method() !== 'GET') sent.push(r.postData() ?? ''); });
  await page.goto('/match/');
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    await expect(page.locator('.sabm-question')).toHaveText(q.q);
    await expect(page.locator('.sabm-opt-label')).toHaveText(q.opts.map(o => o.label));
    await expect(page.locator('.sabm-opt-hint')).toHaveText(q.opts.map(o => o.hint));
    const tile = page.locator('.sabm-opt').nth(q.opts.findIndex(o => o.value === answers[q.key]));
    await tile.focus();
    if (i === questions.length - 1) await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
    if (i < questions.length - 1) {
      await expect(page.locator('.sabm-question')).toHaveText(questions[i + 1]!.q);
      await expect(page.locator('.sabm-question')).toBeFocused();
    }
    if (i === 2) {
      await page.reload();
      await expect(page.locator('.sabm-question')).toHaveText(questions[i + 1]!.q);
    }
  }
  await expect(page.locator('.sabm-results-h1')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const results = await page.locator('.quiz-results-in').innerText();
  for (const ended of payload.scholarships.filter(s => 'concluded' in s && s.concluded)) {
    await expect(page.locator('.sabm-row-name').filter({ hasText: ended.title })).toHaveCount(0);
  }
  await page.reload();
  await expect(page.locator('.sabm-results-h1')).toBeVisible();
  expect(await page.locator('.quiz-results-in').innerText()).toBe(results);
  expect(await page.evaluate(key => localStorage.getItem(key), QUIZ_STORAGE_KEY)).toBeNull();
  // Infrastructure beacons may report page timings, but no answer fields.
  for (const body of sent) expect(body).not.toMatch(/(?:"(?:answers|searchType|grade|city|field|average|institution|board|school)"\s*:|[?&](?:answers|searchType|grade|city|field|average|institution|board|school)=)/);
  await page.getByRole('button', { name: 'Retake quiz' }).click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[0]!.q);
  await page.reload();
  await expect(page.locator('.sabm-step-label')).toHaveText('Question 1 of 6');
});

for (const failure of ['network', 'version', 'shape'] as const) {
  test(`quiz data ${failure} failure is visible and manual retry preserves progress`, async ({ page }) => {
    let requests = 0;
    await page.addInitScript(({ key, answers }) => sessionStorage.setItem(key, JSON.stringify({ step: 3, answers, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, answers });
    await page.route('**/quiz-payload*.json', async route => {
      requests++;
      if (requests > 1) return route.continue();
      if (failure === 'network') return route.fulfill({ status: 503, body: 'Unavailable' });
      return route.fulfill({ json: failure === 'version' ? { ...transport, version: 3 } : { version: 2 } });
    });
    await page.goto('/match/');
    await expect(page.getByRole('status')).toContainText(failure === 'network' ? 'Unable to load the matching data' : 'Please reload to get the latest quiz');
    expect(requests).toBe(1);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[3]!.q);
    expect(requests).toBe(2);
  });
}

test('leaving cancels a pending answer and Back remounts the quiz', async ({ page }) => {
  await page.goto('/match/');
  await page.locator('.sabm-opt').first().waitFor();
  await page.evaluate(() => {
    (document.querySelector('.sabm-opt') as HTMLButtonElement).click();
    // A cached document must not finish a pending transition while away.
    window.dispatchEvent(new Event('pagehide'));
  });
  await page.waitForTimeout(400);
  const stored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), QUIZ_STORAGE_KEY);
  expect(stored.step).toBe(0);
  await page.locator('.sabm-about a[href="/scholarships/"]').first().click();
  await expect(page).toHaveURL(/\/scholarships\//);
  await page.goBack();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[0]!.q);
});

test('expired and corrupt sessions reset, storage denial still permits answering', async ({ page }) => {
  for (const value of ['{broken', JSON.stringify({ step: 3, answers, savedAt: Date.now() - QUIZ_TTL_MS - 10000 })]) {
    await page.goto('/match/');
    await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: QUIZ_STORAGE_KEY, value });
    await page.reload();
    await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[0]!.q);
  }
  await page.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = Storage.prototype.removeItem = () => { throw new Error('Storage blocked'); };
  });
  await page.reload();
  await page.locator('.sabm-opt').first().click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[1]!.q);
});


test('a concluded catalogue award is excluded even when its profile would otherwise match', async ({ page }) => {
  const ended = payload.scholarships.find(s => 'concluded' in s && s.concluded)!;
  expect(ended).toBeTruthy();
  const grade = QUIZ_QUESTIONS.find(q => q.key === 'grade')!.opts.find(o => ended.eligibility?.grades.some(grade => String(grade) === o.value))!.value;
  const profile = { ...answers, grade, city: 'Other Alberta', average: '93', field: '', institution: '', board: '', school: '' };
  let concluded = false;
  await page.route('**/quiz-payload*.json', route => route.fulfill({ json: { version: 2, scholarships: [{ ...ended, concluded }], programs: [] } }));
  await page.addInitScript(({ key, profile }) => sessionStorage.setItem(key, JSON.stringify({ step: 8, answers: profile, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, profile });
  await page.goto('/match/');
  await expect(page.locator('.sabm-row-name')).toHaveText(ended.title);
  concluded = true;
  await page.reload();
  await expect(page.locator('.sabl-empty-title')).toHaveText('No matches found for your profile.');
  await expect(page.locator('.sabm-row-name')).toHaveCount(0);
});

test('rapid manual retries share one pending load', async ({ page }) => {
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>(done => { release = done; });
  await page.route('**/quiz-payload*.json', async route => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, body: 'Unavailable' });
    await gate;
    return route.fulfill({ json: payload });
  });
  try {
    await page.goto('/match/');
    await page.getByRole('button', { name: 'Try again' }).evaluate(button => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect.poll(() => requests).toBe(2);
    release();
    await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[0]!.q);
  } finally { release(); }
});
