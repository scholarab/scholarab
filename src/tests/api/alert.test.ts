// @vitest-environment node
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
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
vi.mock('../../lib/data-loader', () => ({
  loadScholarshipsFromJson: async () => [
    { id: 1, title: 'Example award', active: true, deadline: '2099-10-01' },
    { id: 3, title: 'Retired', active: false, deadline: '2099-10-01' },
    { id: 4, title: 'Expired', active: true, deadline: '2000-01-01' },
  ],
  loadProgramsFromJson: async () => [
    { id: 2, name: 'Example research', deadline: '2099-10-01' },
    { id: 5, name: 'TBA research', deadline: 'TBA' },
  ],
}));
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
  state.db = drizzle(pg);
}, 30000);
beforeEach(async () => {
  state.limited = false;
  state.send.mockClear();
  state.send.mockResolvedValue(true);
  await pg.exec('TRUNCATE subscribers,events CASCADE');
});
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
it.each([3, 4])('rejects closed scholarship %s', async (id) => {
  expect((await call({ ...valid, itemId: id })).status).toBe(400);
});
it('uses JSON program IDs and accepts missing active flag', async () => {
  expect((await call({ ...valid, itemType: 'program', itemId: 2 })).status).toBe(200);
});
it('rejects programs without fixed deadlines', async () => {
  expect((await call({ ...valid, itemType: 'program', itemId: 5 })).status).toBe(400);
});
it('rejects unknown IDs', async () => {
  expect((await call({ ...valid, itemId: 9999 })).status).toBe(404);
});
it('enforces the sender IP limit', async () => {
  state.limited = true;
  expect((await call(valid)).status).toBe(429);
  expect(state.send).not.toHaveBeenCalled();
});
