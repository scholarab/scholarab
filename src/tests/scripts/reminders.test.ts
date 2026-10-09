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
