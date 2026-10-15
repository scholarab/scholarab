// @vitest-environment node
import { beforeAll, beforeEach, afterAll, afterEach, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { confirmEmailHtml } from '../../lib/confirm-email';

const state = vi.hoisted(() => ({
  scholarships: [] as Record<string, unknown>[],
  programs: [] as Record<string, unknown>[],
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>>(),
  now: '2026-10-09T18:00:00Z',
}));
vi.mock('@neondatabase/serverless', () => ({
  neon: () => Object.assign(
    (parts: TemplateStringsArray, ...values: unknown[]) =>
      state.query(parts.reduce((s, p, i) => s + (i ? '$' + i : '') + p, ''), values),
    { query: (sql: string, params?: unknown[]) => state.query(sql, params) },
  ),
}));
vi.mock('fs', async (original) => {
  const fs = await original<typeof import('node:fs')>();
  return { ...fs, readFileSync: (...args: Parameters<typeof fs.readFileSync>) => {
    const path = String(args[0]);
    if (path.endsWith('/src/data/scholarships.json')) return JSON.stringify(state.scholarships);
    if (path.endsWith('/src/data/research-programs.json')) return JSON.stringify(state.programs);
    return fs.readFileSync(...args);
  } };
});
let pg: PGlite;
let send: ReturnType<typeof vi.fn>;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
}, 30000);
beforeEach(async () => {
  state.now = '2026-10-09T18:00:00Z';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(state.now));
  state.query.mockReset().mockImplementation(async (sql, params) =>
    (await pg.query(sql.replace(/now\(\)/g, `'${state.now}'::timestamptz`), params)).rows as Record<string, unknown>[]);
  await pg.exec('TRUNCATE subscribers,mail_deliveries,events,confirmation_recipients RESTART IDENTITY CASCADE');
  state.scholarships = [{ id: 1, title: 'Local award', url: 'https://provider.invalid', active: true }];
  state.programs = [{ id: 2, name: 'Local program', url: 'https://provider.invalid', deadline: 'TBA' }];
  send = vi.fn(async () => new Response('{}'));
  vi.stubGlobal('fetch', send);
  vi.stubEnv('DATABASE_URL', 'postgresql://unused.invalid/local');
  vi.stubEnv('RESEND_API_KEY', 'local-fake-key');
  for (const key of ['TEST_DAYS', 'TEST_SUBSCRIPTION_ID', 'CATCH_UP', 'DRY_RUN']) vi.stubEnv(key, undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(`exit:${code}`); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(async () => pg.close());
const run = async () => { vi.resetModules(); await import('../../../scripts/send-alerts'); };
const prune = async () => { vi.resetModules(); await import('../../../scripts/prune-events'); };
async function subscribe(cadence: string, type = 'scholarship', id = 1, confirmed = true) {
  await state.query(`INSERT INTO subscribers(email,item_type,item_id,token,cadence,confirmed_at,created_at)
    VALUES ('student@local.invalid',$1,$2,'local-token',$3,${confirmed ? 'now()' : 'NULL'},now())`, [type, id, cadence]);
}
function setTime(iso: string) { state.now = iso; vi.setSystemTime(new Date(iso)); }
function subject() { return JSON.parse(send.mock.calls.at(-1)![1].body).subject as string; }

it.each(['scholarship', 'program'])('sends the %s opening notice once, then its normal milestones', async (type) => {
  const item = type === 'program' ? state.programs[0]! : state.scholarships[0]!;
  Object.assign(item, { openDate: '2026-10-09', deadline: '2026-11-08' });
  await subscribe('open,30,14,3', type, Number(item.id));
  setTime('2026-10-08T18:00:00Z');
  await run();
  expect(send).not.toHaveBeenCalled();
  setTime('2026-10-09T18:00:00Z');
  await run();
  expect(subject()).toMatch(/opens today/);
  await run();
  expect(send).toHaveBeenCalledOnce(); // coinciding 30-day email is folded into the notice
  setTime('2026-10-25T18:00:00Z');
  await run();
  expect(subject()).toMatch(/^14 days left/);
  expect(send).toHaveBeenCalledTimes(2);
  Object.assign(item, { openDate: '2026-10-26', deadline: '2026-12-01' });
  setTime('2026-10-26T18:00:00Z');
  await run();
  expect(send).toHaveBeenCalledTimes(2); // changed date cannot restart one-time consent
});
it.each(['scholarship', 'program'])('detects a confirmed future %s deadline on the first run and only once', async (type) => {
  const item = type === 'program' ? state.programs[0]! : state.scholarships[0]!;
  await subscribe('posted,30,14,3', type, Number(item.id));
  await run();
  expect(send).not.toHaveBeenCalled();
  Object.assign(item, { deadline: '2026-11-08', deadlineEstimated: true });
  await run();
  expect(send).not.toHaveBeenCalled();
  item.deadlineEstimated = false;
  await run();
  expect(subject()).toMatch(/^Date posted:/);
  await run();
  expect(send).toHaveBeenCalledOnce();
  item.deadline = '2026-11-09';
  setTime('2026-10-10T18:00:00Z');
  await run();
  expect(subject()).toMatch(/^30 days left/);
  expect(send).toHaveBeenCalledTimes(2);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
});
it('never sends a new kind to an unconfirmed email or a legacy numeric subscription', async () => {
  Object.assign(state.scholarships[0]!, { openDate: '2026-10-09', deadline: '2026-12-01' });
  await subscribe('open,30,14,3', 'scholarship', 1, false);
  await state.query('UPDATE subscribers SET confirm_sent_at=now()');
  await run();
  expect(send).not.toHaveBeenCalled();
  await state.query("UPDATE subscribers SET confirmed_at=now(),cadence='30,14,3'");
  await run();
  expect(send).not.toHaveBeenCalled();
});
it('opens without a deadline without inventing one', async () => {
  state.scholarships[0]!.openDate = '2026-10-09';
  await subscribe('open,30,14,3');
  await run();
  expect(subject()).toMatch(/opens today/);
  expect(JSON.parse(send.mock.calls[0]![1].body).html).toContain('The deadline has not been posted yet.');
});
it('gates both first delivery and retries outside Alberta daytime, even after UTC midnight', async () => {
  Object.assign(state.scholarships[0]!, { openDate: '2026-10-09', deadline: '2026-12-01' });
  await subscribe('open,30,14,3');
  setTime('2026-10-09T13:59:59Z');
  state.query.mockClear();
  await expect(run()).rejects.toThrow('exit:0');
  expect(state.query).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  setTime('2026-10-10T01:00:00Z'); // still October 9 in Alberta
  send.mockRejectedValueOnce(new Error('local simulated timeout'));
  await expect(run()).rejects.toThrow('exit:1');
  const body = send.mock.calls[0]![1].body;
  setTime('2026-10-10T02:00:00Z');
  await expect(run()).rejects.toThrow('exit:0');
  expect(send).toHaveBeenCalledOnce();
  setTime('2026-10-10T14:00:00Z');
  await run(); // retry survives the opening day and quiet hours
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1]![1].body).toBe(body);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
});
it('deletes undated sign-ups within a year, preserving newer, estimated and dated rows', async () => {
  await subscribe('posted,30,14,3');
  await state.query("UPDATE subscribers SET created_at=now()-interval '364 days 1 second'");
  state.scholarships.push(
    { id: 3, title: 'Dated', deadline: '2027-01-01', url: 'https://provider.invalid' },
    { id: 4, title: 'Estimated', deadline: '2027-01-01', deadlineEstimated: true, url: 'https://provider.invalid' },
  );
  await state.query(`INSERT INTO subscribers(email,item_type,item_id,token,cadence,confirmed_at,created_at) VALUES
    ('new@local.invalid','program',2,'new','posted,30,14,3',now(),now()-interval '363 days'),
    ('dated@local.invalid','scholarship',3,'dated','open,30,14,3',now(),now()-interval '80 days'),
    ('estimate@local.invalid','scholarship',4,'estimate','posted,30,14,3',now(),now()-interval '59 days 1 second'),
    ('unconfirmed@local.invalid','program',2,'unconfirmed','posted,30,14,3',NULL,now()-interval '29 days 1 second')`);
  await prune();
  expect((await state.query('SELECT token FROM subscribers ORDER BY token')).map(r => r.token)).toEqual(['dated', 'estimate', 'new']);
  expect(send).not.toHaveBeenCalled();
});
it('confirmation describes each waiting request and the following deadlines', () => {
  for (const [kind, words] of [['open', 'when it opens'], ['posted', 'when a confirmed deadline is posted']]) {
    const html = confirmEmailHtml('Award', 'https://example.invalid/api/confirm?token=fake', undefined, `${kind},30,14,3`);
    expect(html).toContain(words);
    expect(html).toContain('30, 14, 3 days before');
    expect(html).toContain('Confirm my reminder');
  }
});
async function subscribeAs(email: string, token: string, type: string, id: number, confirmed = true) {
  await state.query(`INSERT INTO subscribers(email,item_type,item_id,token,cadence,confirmed_at,created_at)
    VALUES ($1,$2,$3,$4,'30,14,3',${confirmed ? 'now()' : 'NULL'},now())`, [email, type, id, token]);
}
const mails = () => send.mock.calls.map(c => JSON.parse(c[1].body) as { to: string[]; subject: string; html: string; headers: Record<string, string> });
it('sends the reminders one address has due on the same day as one email, once', async () => {
  // A combo signed up at once shares deadlines: one email, not one per award.
  state.scholarships[0]!.deadline = '2026-10-12';
  state.scholarships.push({ id: 3, title: 'Second award', deadline: '2026-11-08', url: 'https://provider.invalid' });
  state.programs[0]!.deadline = '2026-10-23';
  await subscribeAs('student@local.invalid', 'tok-a', 'scholarship', 1);
  await subscribeAs('student@local.invalid', 'tok-b', 'scholarship', 3);
  await subscribeAs('student@local.invalid', 'tok-c', 'program', 2);
  await subscribeAs('friend@local.invalid', 'tok-d', 'scholarship', 1);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
  const [bundle] = mails().filter(m => m.to[0] === 'student@local.invalid');
  const [single] = mails().filter(m => m.to[0] === 'friend@local.invalid');
  expect(bundle!.subject).toMatch(/^3 days left.*, plus 2 more$/);
  // Soonest deadline first.
  const at = (label: string) => bundle!.html.indexOf(label);
  expect(at('Local award')).toBeGreaterThan(-1);
  expect(at('Local award')).toBeLessThan(at('Local program'));
  expect(at('Local program')).toBeLessThan(at('Second award'));
  // Unsubscribe under a list stops all of it, by the latest deadlines' tokens.
  expect(bundle!.headers['List-Unsubscribe']).toContain('/api/unsubscribe?scope=all&token=tok-b&token=tok-c&token=tok-a>');
  expect(bundle!.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  expect(bundle!.html).toContain('Unsubscribe stops all of them');
  expect(single!.subject).not.toContain('more');
  expect(single!.headers['List-Unsubscribe']).toContain('/api/unsubscribe?token=tok-d>');
  // Each reminder in the bundle counts as sent on its own subscription.
  const settled = await state.query(`SELECT s.token FROM mail_deliveries d JOIN subscribers s ON s.id=d.subscription_id
    WHERE d.state='sent' ORDER BY s.token`);
  expect(settled.map(r => r.token)).toEqual(['tok-a', 'tok-b', 'tok-b', 'tok-c', 'tok-d']);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
});
it('retries an unsettled reminder alone with its first bytes and bundles only the fresh ones', async () => {
  state.scholarships[0]!.deadline = '2026-10-12';
  state.scholarships.push({ id: 3, title: 'Second award', deadline: '2026-10-12', url: 'https://provider.invalid' });
  state.programs[0]!.deadline = '2026-10-12';
  await subscribeAs('student@local.invalid', 'tok-a', 'scholarship', 1);
  send.mockRejectedValueOnce(new Error('local simulated timeout'));
  await expect(run()).rejects.toThrow('exit:1');
  const first = send.mock.calls[0]![1].body;
  await subscribeAs('student@local.invalid', 'tok-b', 'scholarship', 3);
  await subscribeAs('student@local.invalid', 'tok-c', 'program', 2);
  setTime('2026-10-09T18:05:00Z');
  await run();
  expect(send).toHaveBeenCalledTimes(3);
  expect(send.mock.calls[1]![1].body).toBe(first);
  expect(mails()[2]!.subject).toMatch(/, plus 1 more$/);
  expect(mails()[2]!.html).not.toContain('Local award');
  await run();
  expect(send).toHaveBeenCalledTimes(3);
});
it('asks each address to confirm once, naming every sign-up it is waiting on', async () => {
  state.scholarships.push({ id: 3, title: 'Second award', deadline: '2026-11-08', url: 'https://provider.invalid' });
  await subscribeAs('student@local.invalid', 'tok-a', 'scholarship', 1, false);
  await subscribeAs('student@local.invalid', 'tok-b', 'scholarship', 3, false);
  await subscribeAs('student@local.invalid', 'tok-c', 'program', 2, false);
  await subscribeAs('friend@local.invalid', 'tok-d', 'scholarship', 1, false);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
  const [set] = mails().filter(m => m.to[0] === 'student@local.invalid');
  expect(set!.subject).toBe('Confirm your ScholarAB deadline reminders');
  for (const label of ['Local award', 'Second award', 'Local program']) expect(set!.html).toContain(label);
  expect(set!.html).toContain('/api/confirm?token=tok-a');
  expect(mails().find(m => m.to[0] === 'friend@local.invalid')!.subject).toBe('Confirm your ScholarAB deadline reminder');
  const asked = await state.query('SELECT token FROM subscribers WHERE confirm_sent_at IS NOT NULL ORDER BY token');
  expect(asked.map(r => r.token)).toEqual(['tok-a', 'tok-b', 'tok-c', 'tok-d']);
  setTime('2026-10-11T18:00:00Z');
  await run();
  expect(send).toHaveBeenCalledTimes(2);
});
