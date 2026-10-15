// @vitest-environment node
import { beforeAll, beforeEach, afterAll, afterEach, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { POST } from '../../pages/api/alert';
const state = vi.hoisted(() => ({
  db: null as any,
  limited: false,
  send: vi.fn(async (..._args: unknown[]) => true),
}));
vi.mock('../../lib/db/client', () => ({ db: new Proxy({}, { get: (_, key) => state.db[key] }) }));
vi.mock('../../lib/rate-limit', () => ({
  getClientIp: () => 'test',
  hitRateLimit: async () => state.limited,
}));
vi.mock('../../lib/confirm-email', () => ({
  sendConfirmEmail: (...args: unknown[]) => state.send(...args),
}));
vi.mock('../../data/runtime-catalogue.json', () => ({ default: {
  scholarships: [
    { id: 1, title: 'Example award', active: true, deadline: '2099-10-01' },
    { id: 3, title: 'Retired', active: false, deadline: '2099-10-01' },
    { id: 4, title: 'Expired', active: true, deadline: '2000-01-01' },
    // Fixed Alberta dates; these cases never depend on the time of the test run.
    { id: 6, title: 'Closes in two days', active: true, deadline: '2026-10-11' },
    { id: 7, title: 'Closes in ten days', active: true, deadline: '2026-10-19' },
    { id: 9, title: 'Opens later', openDate: '2026-11-01', deadline: '2026-12-01' },
    { id: 10, title: 'No date yet' },
    { id: 11, title: 'Concluded', concluded: true },
    { id: 12, title: 'Rolling', rolling: true },
    { id: 8, title: 'Rolled forward', active: true, deadline: '2099-10-01', deadlineEstimated: true },
  ],
  programs: [
    { id: 2, name: 'Example research', deadline: '2099-10-01' },
    { id: 5, name: 'TBA research', deadline: 'TBA' },
  ],
} }));
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  // Every maintained migration, as migrate-db applies them, so a column the
  // schema gains (events.device in 0016) exists here too.
  for (const f of readdirSync('drizzle/migrations').filter(f => /^\d{4}.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= 13).sort())
    await pg.exec(readFileSync(`drizzle/migrations/${f}`, 'utf8'));
  state.db = drizzle(pg);
}, 30000);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T18:00:00Z'));
  state.limited = false;
  state.send.mockClear();
  state.send.mockResolvedValue(true);
  await pg.exec('TRUNCATE subscribers,events CASCADE');
});
afterEach(() => vi.useRealTimers());
afterAll(async () => pg.close());
const valid = { email: 'student@example.org', itemType: 'scholarship', itemId: 1, days: [14, 3] };
const call = (body: unknown) =>
  POST({
    request: new Request('https://www.scholarab.ca/api/alert', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  } as any);
it('saves public JSON identity and exact schedule, then asks for confirmation', async () => {
  const res = await call({ ...valid, email: ' Student@Example.org ' });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  const rows = await pg.query<Record<string, unknown>>(
    'SELECT email,item_id,cadence,confirmed_at,confirm_sent_at FROM subscribers'
  );
  expect(rows.rows[0]).toMatchObject({
    email: 'student@example.org',
    item_id: 1,
    cadence: '14,3',
    confirmed_at: null,
  });
  expect(rows.rows[0]!.confirm_sent_at).not.toBeNull();
  expect(state.send).toHaveBeenCalledOnce();
});
it('does not leak confirmation or overwrite confirmed settings on anonymous resubmission', async () => {
  await call(valid);
  await pg.exec('UPDATE subscribers SET confirmed_at=now()');
  const res = await call({ ...valid, days: [30] });
  expect(await res.json()).toEqual({ ok: true });
  const rows = await pg.query<Record<string, unknown>>('SELECT cadence FROM subscribers');
  expect(rows.rows[0]!.cadence).toBe('14,3');
  expect(state.send).toHaveBeenCalledOnce();
});
it('does not overwrite pending settings either', async () => {
  await call(valid);
  await call({ ...valid, days: [30] });
  expect(
    (await pg.query<Record<string, unknown>>('SELECT cadence FROM subscribers')).rows[0]!.cadence
  ).toBe('14,3');
});
it('allows only the matching token to edit settings', async () => {
  await call(valid);
  const rows = await pg.query<Record<string, unknown>>('SELECT token FROM subscribers');
  const token = rows.rows[0]!.token;
  await call({ ...valid, days: [30], token: 'a'.repeat(48) });
  expect(
    (await pg.query<Record<string, unknown>>('SELECT cadence FROM subscribers')).rows[0]!.cadence
  ).toBe('14,3');
  await call({ ...valid, days: [30], token });
  expect(
    (await pg.query<Record<string, unknown>>('SELECT cadence FROM subscribers')).rows[0]!.cadence
  ).toBe('30');
});
it('concurrent repeated signup produces only one subscription and one confirmation call', async () => {
  await Promise.all(Array.from({ length: 10 }, () => call(valid)));
  expect(
    (await pg.query<Record<string, unknown>>('SELECT count(*)::int AS n FROM subscribers')).rows[0]!
      .n
  ).toBe(1);
  expect(state.send).toHaveBeenCalledOnce();
});
it('provider unavailability leaves a pending signup for the sweep', async () => {
  state.send.mockResolvedValue(false);
  expect((await call(valid)).status).toBe(200);
  expect(
    (await pg.query<Record<string, unknown>>('SELECT confirm_sent_at FROM subscribers')).rows[0]!
      .confirm_sent_at
  ).toBeNull();
});
it.each([
  null,
  [],
  false,
  123,
  'text',
  {},
  { ...valid, email: 'invalid' },
  { ...valid, email: 'a'.repeat(255) + '@b.ca' },
  { ...valid, itemType: 'unknown' },
  { ...valid, itemId: 1.5 },
  { ...valid, itemId: 0 },
  { ...valid, days: [] },
  { ...valid, days: [7] },
  { ...valid, token: 'invalid' },
])('rejects malformed input %j', async (body) => {
  expect((await call(body)).status).toBe(400);
});
it.each([3, 4, 11, 12])('rejects closed scholarship %s', async (id) => {
  expect((await call({ ...valid, itemId: id })).status).toBe(400);
});
it('uses JSON program IDs and accepts missing active flag', async () => {
  expect((await call({ ...valid, itemType: 'program', itemId: 2 })).status).toBe(200);
});
it('offers date-posted reminders for TBA programs', async () => {
  expect((await call({ ...valid, itemType: 'program', itemId: 5 })).status).toBe(200);
});
it('rejects unknown IDs', async () => {
  expect((await call({ ...valid, itemId: 9999 })).status).toBe(404);
});
it('enforces the sender IP limit', async () => {
  state.limited = true;
  expect((await call(valid)).status).toBe(429);
  expect(state.send).not.toHaveBeenCalled();
});
it('refuses a sign-up no reminder can reach in time', async () => {
  const res = await call({ ...valid, itemId: 6, days: undefined });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatch(/too soon/);
  expect(state.send).not.toHaveBeenCalled();
});
it('stores only the milestones still ahead', async () => {
  const res = await call({ ...valid, itemId: 7, days: undefined });
  expect(res.status).toBe(200);
  const rows = await pg.query<Record<string, unknown>>('SELECT cadence FROM subscribers');
  expect(rows.rows[0]!.cadence).toBe('3');
  expect(state.send.mock.calls[0]![3]).toBe('3');
});
it.each([[8, 'posted,14,3'], [9, 'open,14,3'], [10, 'posted,14,3']])('stores the state-specific request for %s with double opt-in', async (itemId, cadence) => {
  expect((await call({ ...valid, itemId })).status).toBe(200);
  expect((await pg.query('SELECT cadence,confirmed_at FROM subscribers')).rows).toEqual([{ cadence, confirmed_at: null }]);
  expect(state.send.mock.calls[0]![3]).toBe(cadence);
  // The device class is recorded like every client event; no user agent reads as a computer
  expect((await pg.query("SELECT device FROM events WHERE event='alert_subscribe'")).rows).toEqual([{ device: 'computer' }]);
});
// One sign-up for a set: My combo or the quiz results.
const s = (itemId: number) => ({ itemType: 'scholarship', itemId });
const p = (itemId: number) => ({ itemType: 'program', itemId });
const set = (items: unknown, place: unknown = 'saved') => call({ email: 'student@example.org', items, place });
const subscribed = async () => (await pg.query<Record<string, unknown>>(
  'SELECT item_type,item_id,cadence,confirmed_at,confirm_sent_at,token FROM subscribers ORDER BY id')).rows;
it('signs a set up in one request: a row per listing and one confirmation naming them all', async () => {
  const res = await set([s(1), p(2), s(9), s(7)]);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, covered: 4 });
  const rows = await subscribed();
  // Each row is what its own listing form would store by default.
  expect(rows.map(r => [r.item_type, r.item_id, r.cadence, r.confirmed_at])).toEqual([
    ['scholarship', 1, '30,14,3', null],
    ['program', 2, '30,14,3', null],
    ['scholarship', 9, 'open,30,14,3', null],
    ['scholarship', 7, '3', null],
  ]);
  expect(rows.every(r => r.confirm_sent_at !== null)).toBe(true);
  expect(state.send).toHaveBeenCalledOnce();
  const [to, labels, confirmUrl, cadence, id] = state.send.mock.calls[0]!;
  expect(to).toBe('student@example.org');
  expect(labels).toEqual(['Example award', 'Example research', 'Opens later', 'Closes in ten days']);
  expect(confirmUrl).toBe(`https://www.scholarab.ca/api/confirm?token=${rows[0]!.token}`);
  expect(cadence).toBe('30,14,3');
  expect(typeof id).toBe('number');
  // A server-side count per new row, with where it came from and nothing else.
  expect((await pg.query('SELECT event,item_type,item_id,meta,device FROM events ORDER BY id')).rows).toEqual([
    { event: 'alert_subscribe', item_type: 'scholarship', item_id: 1, meta: 'saved', device: 'computer' },
    { event: 'alert_subscribe', item_type: 'program', item_id: 2, meta: 'saved', device: 'computer' },
    { event: 'alert_subscribe', item_type: 'scholarship', item_id: 9, meta: 'saved', device: 'computer' },
    { event: 'alert_subscribe', item_type: 'scholarship', item_id: 7, meta: 'saved', device: 'computer' },
  ]);
});
it('skips what takes no reminder and answers with how many it covered', async () => {
  // Too soon, retired, unknown: the rest still go through.
  const res = await set([s(6), s(1), s(3), s(9999), p(5)], 'match');
  expect(await res.json()).toEqual({ ok: true, covered: 2 });
  expect((await subscribed()).map(r => [r.item_id, r.cadence])).toEqual([[1, '30,14,3'], [5, 'posted,30,14,3']]);
  expect(state.send.mock.calls[0]![1]).toEqual(['Example award', 'TBA research']);
  expect((await pg.query('SELECT DISTINCT meta FROM events')).rows).toEqual([{ meta: 'match' }]);
});
it('refuses a set where nothing can take a reminder', async () => {
  const res = await set([s(6), s(3), s(11), s(9999)]);
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('None of these can take a reminder right now');
  expect(await subscribed()).toEqual([]);
  expect(state.send).not.toHaveBeenCalled();
});
it('names the listings in the order the page shows them and links the first', async () => {
  await set([s(7), s(1)]);
  const rows = await subscribed();
  const [, labels, confirmUrl, cadence, id] = state.send.mock.calls[0]!;
  expect(labels).toEqual(['Closes in ten days', 'Example award']);
  expect(confirmUrl).toContain(`token=${rows.find(r => r.item_id === 7)!.token}`);
  expect(cadence).toBe('3');
  expect(id).toBe((await pg.query<{ id: number }>('SELECT id FROM subscribers WHERE item_id=7')).rows[0]!.id);
});
it('asks again only for what is new, and the answer never says which were', async () => {
  await set([s(1), p(2)]);
  await pg.exec('UPDATE subscribers SET confirmed_at=now()');
  const res = await set([s(1), p(2), s(7)]);
  expect(await res.json()).toEqual({ ok: true, covered: 3 });
  expect(state.send).toHaveBeenCalledTimes(2);
  expect(state.send.mock.calls[1]![1]).toEqual(['Closes in ten days']);
  const again = await set([s(1), p(2), s(7)]);
  expect(await again.json()).toEqual({ ok: true, covered: 3 });
  expect(state.send).toHaveBeenCalledTimes(2);
  expect((await pg.query('SELECT count(*)::int AS n FROM events')).rows[0]).toEqual({ n: 3 });
  // Confirmed settings are never touched by a set either.
  expect((await subscribed()).filter(r => r.confirmed_at !== null)).toHaveLength(2);
});
it('stores one row for a listing sent twice', async () => {
  expect(await (await set([s(1), s(1), p(2), p(2)])).json()).toEqual({ ok: true, covered: 2 });
  expect(await subscribed()).toHaveLength(2);
});
it('takes up to the set limit in one request', async () => {
  const fifty = [s(1), ...Array.from({ length: 49 }, (_, n) => s(1000 + n))];
  expect(await (await set(fifty)).json()).toEqual({ ok: true, covered: 1 });
  expect((await set([...fifty, s(2000)])).status).toBe(400);
});
it('stores where a set came from only as one of its two words', async () => {
  await set([s(1)], '<b>elsewhere</b>');
  await call({ email: 'student@example.org', items: [p(2)] });
  expect((await pg.query('SELECT meta FROM events')).rows).toEqual([{ meta: null }, { meta: null }]);
});
it('leaves a set pending for the sweep when the provider is down', async () => {
  state.send.mockResolvedValue(false);
  expect((await set([s(1), p(2)])).status).toBe(200);
  expect((await subscribed()).map(r => r.confirm_sent_at)).toEqual([null, null]);
});
it('counts a set once against the sender IP limit', async () => {
  state.limited = true;
  expect((await set([s(1), p(2)])).status).toBe(429);
  expect(await subscribed()).toEqual([]);
  expect(state.send).not.toHaveBeenCalled();
});
it.each([
  { items: 'all' },
  { items: {} },
  { items: [] },
  { items: [null] },
  { items: [{ itemType: 'event', itemId: 1 }] },
  { items: [{ itemType: 'scholarship', itemId: 0 }] },
  { items: [{ itemType: 'scholarship', itemId: 1.5 }] },
  { items: [{ itemType: 'scholarship', itemId: '1' }] },
  { items: [{ itemType: 'scholarship', itemId: 1 }], itemId: 1 },
  { items: [{ itemType: 'scholarship', itemId: 1 }], days: [14] },
  { items: [{ itemType: 'scholarship', itemId: 1 }], token: 'a'.repeat(48) },
  { items: [{ itemType: 'scholarship', itemId: 1 }], email: 'invalid' },
])('rejects a malformed set %j', async (body) => {
  expect((await call({ email: 'student@example.org', ...body })).status).toBe(400);
  expect(state.send).not.toHaveBeenCalled();
});
