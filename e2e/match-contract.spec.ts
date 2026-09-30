import { test, expect, type Page } from '@playwright/test';
import payload from '../src/data/quiz-payload.json' with { type: 'json' };
import { QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, QUIZ_TTL_MS, boardsForCity, schoolsForCity, boardQuestion, schoolQuestion, quizQuestionCeiling, type QuizQuestion } from '../src/lib/quiz';

// Payload fault injection must reach Playwright rather than the service worker.
test.use({ serviceWorkers: 'block' });

const city = QUIZ_QUESTIONS.find(q => q.key === 'city')!.opts.find(o =>
  boardsForCity(payload.scholarships, o.value).length && schoolsForCity(payload.scholarships, o.value).length)!.value;
const board = boardQuestion(boardsForCity(payload.scholarships, city));
// Both mode covers the full branch, including the board-specific school pool.
const questions = [...QUIZ_QUESTIONS, board, schoolQuestion(schoolsForCity(payload.scholarships, city, board.opts[0]!.value))];
const answers = Object.fromEntries(questions.map(q => [q.key,
  q.key === 'city' ? city : q.key === 'searchType' ? 'both' : q.opts[0]!.value]));
const realTiles = (page: Page) => page.locator('.sabm-opt[data-quiz-answer]');
const moreTile = (page: Page) => page.locator('.sabm-opt[data-quiz-more]');
const previousOptions = (page: Page) => page.getByRole('button', { name: 'Previous options', exact: true });
const previousQuestion = (page: Page) => page.getByRole('button', { name: '← Previous', exact: true });
const tileFor = (page: Page, label: string) => realTiles(page).filter({ has: page.getByText(label, { exact: true }) });


async function progress(page: Page) {
  return page.evaluate(key => {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return { step: stored.step, answers: stored.answers };
  }, QUIZ_STORAGE_KEY);
}

async function expectBatchLimit(page: Page) {
  await expect(realTiles(page).first()).toBeVisible();
  const count = await page.locator('.sabm-opt').count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(4);
  if (await moreTile(page).count()) {
    expect(count).toBe(4);
    await expect(realTiles(page)).toHaveCount(3);
    await expect(moreTile(page).locator('.sabm-opt-label')).toHaveText('Other');
  } else {
    expect(await realTiles(page).count()).toBe(count);
  }
}

// Read every batch, so an offscreen option cannot silently disappear. Navigation
// must leave the actual question and persisted matching answers untouched.
async function inspectAllBatches(page: Page, question: QuizQuestion) {
  const seen: string[] = [];
  const seenHints: string[] = [];
  const before = await progress(page);
  const progressText = await page.getByRole('progressbar', { name: 'Quiz progress' }).getAttribute('aria-valuetext');
  for (let guard = 0; guard < 100; guard++) {
    await expectBatchLimit(page);
    const labels = await realTiles(page).locator('.sabm-opt-label').allTextContents();
    seen.push(...labels);
    seenHints.push(...await realTiles(page).locator('.sabm-opt-hint').allTextContents());
    if (!await moreTile(page).count()) {
      const expected = question.opts;
      expect(seen).toEqual(expected.map(o => o.label));
      expect(seenHints).toEqual(expected.flatMap(o => o.hint ? [o.hint] : []));
      expect(new Set(seen).size).toBe(seen.length);
      return;
    }
    await moreTile(page).focus();
    await page.keyboard.press(guard % 2 ? 'Space' : 'Enter');
    await expect(realTiles(page).first().locator('.sabm-opt-label')).not.toHaveText(labels[0]!);
    await expect(page.locator('.sabm-question')).toHaveText(question.q);
    await expect(page.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute('aria-valuetext', progressText!);
    expect(await progress(page)).toEqual(before);
    await expect(previousOptions(page)).toBeVisible();
  }
  throw new Error(`Option batches never ended for ${question.key}`);
}

async function revealAnswer(page: Page, label: string) {
  // inspectAllBatches leaves the final batch open. Go back using its own
  // control, never the Previous-question action beside it.
  for (let guard = 0; await previousOptions(page).isVisible(); guard++) {
    if (guard >= 100) throw new Error('Previous options never reached the first batch');
    await previousOptions(page).click();
  }
  for (let guard = 0; guard < 100; guard++) {
    await expectBatchLimit(page);
    if (await tileFor(page, label).count()) return tileFor(page, label);
    await expect(moreTile(page), `batch containing ${label}`).toBeVisible();
    await moreTile(page).click();
  }
  throw new Error(`Answer never appeared: ${label}`);
}

test('every question has at most four tiles and keeps keyboard navigation, private resume and result focus', async ({ page }) => {
  test.setTimeout(60_000);
  const sent: string[] = [];
  const events: string[] = [];
  page.on('request', r => {
    sent.push(r.url());
    if (r.method() !== 'GET') sent.push(r.postData() ?? '');
    if (new URL(r.url()).pathname === '/api/event') events.push(r.postData() ?? '');
  });
  await page.goto('/match/');
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    await expect(page.locator('.sabm-question')).toHaveText(q.q);
    if (q.key === 'city') await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText(['Calgary', 'Edmonton', 'Red Deer']);
    const eventCount = events.length;
    await inspectAllBatches(page, q);
    expect(events.length, 'option navigation must not send analytics').toBe(eventCount);
    const option = q.opts.find(o => o.value === answers[q.key])!;
    const tile = await revealAnswer(page, option.label);
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
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
  await expect(page.locator('.sabm-results-h1')).toBeFocused();
  await expect(page.locator('.sabm-results-count')).toContainText(/\d/);
  await expect(page.locator('.sabm-row-num, .sabm-count-chips')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const results = await page.locator('.quiz-results-in').innerText();
  for (const ended of payload.scholarships.filter(s => 'concluded' in s && s.concluded)) {
    await expect(page.locator('.sabm-row-name').filter({ hasText: ended.title })).toHaveCount(0);
  }
  await page.reload();
  await expect(page.locator('.sabm-results-h1')).toBeVisible();
  expect(await page.locator('.quiz-results-in').innerText()).toBe(results);
  expect(await page.evaluate(key => localStorage.getItem(key), QUIZ_STORAGE_KEY)).toBeNull();
  // Infrastructure beacons may report timings, but no matching answers.
  for (const body of sent) expect(body).not.toMatch(/(?:"(?:answers|searchType|grade|city|field|average|institution|board|school)"\s*:|[?&](?:answers|searchType|grade|city|field|average|institution|board|school)=)/);
  await page.getByRole('button', { name: 'Retake quiz' }).click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[0]!.q);
  await page.reload();
  await expect(page.locator('.sabm-step-label')).toHaveText(`Question 1 of up to ${quizQuestionCeiling(payload.scholarships)}`);
});

test('320px results wrap long waiting dates without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  // Keep this recorded waiting-date case stable as the calendar advances.
  await page.clock.setFixedTime(new Date('2026-09-30T12:00:00-06:00'));
  const profile = {
    searchType: 'both', grade: '12', city: 'Calgary', field: 'STEM',
    average: '93', institution: 'University of Calgary', board: 'CBE', school: '',
  };
  await page.addInitScript(({ key, profile }) => sessionStorage.setItem(key, JSON.stringify({ version: 2, step: 8, answers: profile, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, profile });
  await page.goto('/match/');
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
  await page.evaluate(() => document.fonts.ready);
  const longDates = page.locator('.sabm-due').filter({ hasText: /date not posted yet, likely around/ });
  // A page with no long date is not a useful regression case for the nowrap bug.
  await expect(longDates.first()).toBeVisible();
  const tags = await longDates.evaluateAll(elements => elements.map(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const bounds = element.getBoundingClientRect();
    return { text: element.textContent, lines: range.getClientRects().length, left: bounds.left, right: bounds.right };
  }));
  expect(tags.some(tag => tag.lines > 1), JSON.stringify(tags)).toBe(true);
  for (const tag of tags) {
    expect(tag.left, tag.text ?? '').toBeGreaterThanOrEqual(-1);
    expect(tag.right, tag.text ?? '').toBeLessThanOrEqual(321);
  }
  // The answer-summary rail intentionally scrolls inside the page gutters.
  // Its wrapper can overflow its own content box without widening the page.
  const widths = await page.evaluate(() => {
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    };
  });
  expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
});

test('the next question opens below the header after answering from the final batch', async ({ page }) => {
  await page.goto('/match/');
  const heading = page.locator('.sabm-question');
  const results = page.locator('.sabm-results-h1');
  for (let i = 0; i < 12; i++) {
    const q = await heading.innerText();
    for (let guard = 0; await moreTile(page).count(); guard++) {
      if (guard >= 100) throw new Error('Option navigation did not terminate');
      await expectBatchLimit(page);
      await moreTile(page).click();
    }
    await expectBatchLimit(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await realTiles(page).last().click();
    await expect(results.or(heading.filter({ hasNotText: q }))).toBeVisible();
    if (await results.isVisible()) break;
    await expect(heading).toBeFocused();
    const room = await heading.evaluate(h => h.getBoundingClientRect().top - parseFloat(getComputedStyle(h).scrollMarginTop));
    expect(room, `heading after answering "${q}"`).toBeGreaterThanOrEqual(-1);
  }
  await expect(results).toHaveText('Your matches');
});

for (const key of ['city', 'institution', 'school'] as const) {
  test(`${key} search reaches the full option pool and retains its fallback`, async ({ page }) => {
    const question = questions.find(q => q.key === key)!;
    const index = questions.indexOf(question);
    const fallback = question.opts.find(o => key === 'city' ? o.value === 'Other Alberta' : o.value === '')!;
    const target = question.opts.filter(o => o !== fallback).at(-1)!;
    await page.addInitScript(({ key, step, answers }) => sessionStorage.setItem(key, JSON.stringify({ version: 2, step, answers, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, step: index, answers: { ...answers, [key]: undefined } });
    await page.goto('/match/');
    await expect(page.locator('.sabm-question')).toHaveText(question.q);
    await page.locator('.sabm-find').fill(target.label);
    await expect(tileFor(page, target.label)).toBeVisible();
    await expect(tileFor(page, fallback.label)).toBeVisible();
    await expectBatchLimit(page);
    await page.locator('.sabm-find').fill(`zzzz-unlisted-${key}`);
    await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText([fallback.label]);
    await expect(moreTile(page)).toHaveCount(0);
    // Enter chooses the real fallback when the full pool has no match.
    await page.locator('.sabm-find').press('Enter');
    await expect.poll(async () => (await progress(page))?.answers[key]).toBe(fallback.value);
    if (key === 'city') expect((await progress(page))?.answers.town).toBe('zzzz-unlisted-city');
  });
}

test('filtered batches have their own back control and clearing search starts at the first batch', async ({ page }) => {
  const question = questions.find(q => q.key === 'city')!;
  await page.addInitScript(({ key, answers }) => sessionStorage.setItem(key, JSON.stringify({ version: 2, step: 2, answers, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, answers: { searchType: 'both', grade: '12' } });
  await page.goto('/match/');
  await page.locator('.sabm-find').fill('a');
  const matches = question.opts.filter(o => o.value === 'Other Alberta' || `${o.label} ${o.hint ?? ''}`.toLowerCase().includes('a'));
  expect(matches.length).toBeGreaterThan(4);
  const first = matches.slice(0, 3).map(o => o.label);
  await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText(first);
  const before = await progress(page);
  await moreTile(page).click();
  await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText(matches.slice(3, 6).map(o => o.label));
  await expect(previousOptions(page)).toBeVisible();
  await expect(previousQuestion(page)).toBeVisible();
  await previousOptions(page).click();
  await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText(first);
  await expect(page.locator('.sabm-find')).toHaveValue('a');
  expect(await progress(page)).toEqual(before);
  await moreTile(page).click();
  await page.locator('.sabm-find').fill('');
  await expect(realTiles(page).locator('.sabm-opt-label')).toHaveText(['Calgary', 'Edmonton', 'Red Deer']);
  await expect(previousOptions(page)).toHaveCount(0);
});

test('Previous question and reload reveal the previously selected city batch', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ version: 2, step: 2, answers: { searchType: 'both', grade: '12' }, savedAt: Date.now() }));
  }, { key: QUIZ_STORAGE_KEY });
  await page.goto('/match/');
  const tile = await revealAnswer(page, 'Wetaskiwin');
  await tile.click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS.find(q => q.key === 'field')!.q);
  await previousQuestion(page).click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS.find(q => q.key === 'city')!.q);
  await expect(tileFor(page, 'Wetaskiwin')).toBeVisible();
  await expect(previousOptions(page)).toBeVisible();
  await page.reload();
  await expect(tileFor(page, 'Wetaskiwin')).toBeVisible();
  expect((await progress(page))?.answers.city).toBe('Wetaskiwin');
  await expectBatchLimit(page);
});

test('programs asks only search type, grade and field before results', async ({ page }) => {
  await page.goto('/match/');
  await tileFor(page, 'Programs').click();
  await expect(page.locator('.sabm-step-label')).toHaveText('Question 2 of 3');
  await tileFor(page, 'Grade 12').click();
  const field = QUIZ_QUESTIONS.find(q => q.key === 'field')!;
  await expect(page.locator('.sabm-question')).toHaveText(field.q);
  await expect(page.locator('.sabm-step-label')).toHaveText('Question 3 of 3');
  await inspectAllBatches(page, field);
  await (await revealAnswer(page, 'Still figuring it out')).click();
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
  await expect(page.locator('.sabm-results-h1')).toBeFocused();
  await expect(page.locator('.sabm-results-count')).toContainText(/program/);
  expect(await progress(page)).toEqual({ step: 3, answers: { searchType: 'programs', grade: '12', field: '' } });
  await page.reload();
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
  await expect(page.locator('.sabm-answers button')).toHaveCount(3);
});

// On a phone the first match started at 499px of a 664px screen and ended
// below it, so no whole result was on the first screen (2026-09-30). Save
// stays above the list; the reminder line, Retake and the city link follow it.
// Desktop keeps them all above.
test('results keep Save above the list and, on a phone, the rest below it', async ({ page }, testInfo) => {
  await page.addInitScript(key => sessionStorage.setItem(key, JSON.stringify({ step: 99, savedAt: Date.now(),
    answers: { searchType: 'scholarships', grade: '12', city: 'Medicine Hat', board: 'MHCBE', school: '', field: '', average: '', institution: '' } })), QUIZ_STORAGE_KEY);
  await page.goto('/match/');
  await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
  const top = (selector: string) => page.locator(selector).first().evaluate(el => el.getBoundingClientRect().top);
  const list = await top('.sabm-table');
  expect(await top('.sabm-results-actions')).toBeLessThan(list);
  for (const after of ['.sabm-results-note', '.sabm-results-more']) {
    if (testInfo.project.name === 'mobile') expect(await top(after), after).toBeGreaterThan(list);
    else expect(await top(after), after).toBeLessThan(list);
  }
  await expect(page.getByRole('button', { name: 'Retake quiz' })).toBeVisible();
});

for (const step of [2, 3, 4, 8]) {
  test(`legacy programs session at step ${step} resumes the relevant three-question position`, async ({ page }) => {
    await page.addInitScript(({ key, step }) => sessionStorage.setItem(key, JSON.stringify({ step, answers: { searchType: 'programs', grade: '12', city: 'Calgary', field: 'STEM' }, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, step });
    await page.goto('/match/');
    if (step < 4) {
      await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS.find(q => q.key === 'field')!.q);
      await expect(page.locator('.sabm-step-label')).toHaveText('Question 3 of 3');
      await expectBatchLimit(page);
    } else {
      await expect(page.locator('.sabm-results-h1')).toHaveText('Your matches');
    }
    expect((await progress(page))?.step).toBe(step < 4 ? 2 : 3);
  });
}

for (const failure of ['network', 'version', 'shape'] as const) {
  test(`quiz data ${failure} failure is visible and manual retry preserves progress`, async ({ page }) => {
    let requests = 0;
    await page.addInitScript(({ key, answers }) => sessionStorage.setItem(key, JSON.stringify({ step: 3, answers, savedAt: Date.now() })), { key: QUIZ_STORAGE_KEY, answers });
    await page.route('**/quiz-payload*.json', async route => {
      requests++;
      if (requests > 1) return route.continue();
      if (failure === 'network') return route.fulfill({ status: 503, body: 'Unavailable' });
      return route.fulfill({ json: failure === 'version' ? { ...payload, version: 2 } : { version: 1 } });
    });
    await page.goto('/match/');
    await expect(page.getByRole('status')).toContainText(failure === 'network' ? 'Unable to load the matching data' : 'Please reload to get the latest quiz');
    expect(requests).toBe(1);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[3]!.q);
    expect(requests).toBe(2);
  });
}

test('client navigation cancels a pending answer and remounts the quiz', async ({ page }) => {
  await page.goto('/match/');
  await realTiles(page).first().waitFor();
  await page.evaluate(() => {
    (document.querySelector('.sabm-opt[data-quiz-answer]') as HTMLButtonElement).click();
    // The router announces departure before the fetch/swap; cleanup must happen here.
    document.dispatchEvent(new Event('astro:before-swap'));
  });
  await page.waitForTimeout(400);
  const stored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), QUIZ_STORAGE_KEY);
  expect(stored.step).toBe(0);
  await page.locator('.sabm-about summary').click();
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
  await realTiles(page).first().click();
  await expect(page.locator('.sabm-question')).toHaveText(QUIZ_QUESTIONS[1]!.q);
});


test('a concluded catalogue award is excluded even when its profile would otherwise match', async ({ page }) => {
  const ended = payload.scholarships.find(s => 'concluded' in s && s.concluded)!;
  expect(ended).toBeTruthy();
  const grade = QUIZ_QUESTIONS.find(q => q.key === 'grade')!.opts.find(o => ended.eligibility?.grades.some(grade => String(grade) === o.value))!.value;
  const profile = { ...answers, grade, city: 'Other Alberta', average: '93', field: '', institution: '', board: '', school: '' };
  let concluded = false;
  await page.route('**/quiz-payload*.json', route => route.fulfill({ json: { version: 1, scholarships: [{ ...ended, concluded }], programs: [] } }));
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
