// @vitest-environment node
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { claimRecipient, deliverMail, mailKey, type MailPayload } from './mail-delivery';
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
}, 30000);
beforeEach(async () => {
  await pg.exec(
    "TRUNCATE confirmation_recipients,subscribers,mail_deliveries RESTART IDENTITY CASCADE; INSERT INTO subscribers(email,item_id,token) VALUES ('test@example.org',1,'test')"
  );
});
afterAll(async () => pg.close());
const query = async (text: string, params?: unknown[]) =>
  (await pg.query(text, params)).rows as Record<string, unknown>[];
const payload: MailPayload = {
  from: 'ScholarAB <alerts@example.org>',
  to: ['test@example.org'],
  reply_to: 'reply@example.org',
  subject: 'Test',
  html: '<p>Test</p>',
  headers: {},
};
it('atomically permits one recipient claim across 20 concurrent callers', async () => {
  const values = await Promise.all(
    Array.from({ length: 20 }, () => claimRecipient(query, ' Test@Example.org '))
  );
  expect(values.filter(Boolean)).toHaveLength(1);
});
it('caps recipient attempts across listings and a rolling 24h window', async () => {
  for (let i = 0; i < 5; i++) {
    expect(await claimRecipient(query, 'test@example.org')).toBe(true);
    await pg.exec("UPDATE confirmation_recipients SET claimed_at=now()-interval '16 minutes'");
  }
  expect(await claimRecipient(query, 'test@example.org')).toBe(false);
  await pg.exec("UPDATE confirmation_recipients SET window_start=now()-interval '25 hours'");
  expect(await claimRecipient(query, 'test@example.org')).toBe(true);
});
it('overlapping and repeated deliveries call the provider once', async () => {
  const send = vi.fn(
    async (_url: unknown, _init: RequestInit) => new Response('{}', { status: 200 })
  );
  const run = () =>
    deliverMail(query, 'stable', 1, 'reminder', payload, 'fake', send as typeof fetch);
  await Promise.all([run(), run()]);
  await run();
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0]![1]).toMatchObject({ headers: { 'Idempotency-Key': 'stable' } });
  expect((await query('SELECT state,payload FROM mail_deliveries'))[0]).toEqual({
    state: 'sent',
    payload: null,
  });
});
it('retries an ambiguous outcome with the original payload and key', async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error('Timeout'))
    .mockResolvedValue(new Response('{}'));
  await expect(deliverMail(query, 'stable', 1, 'reminder', payload, 'fake', send)).rejects.toThrow(
    'Timeout'
  );
  await pg.exec("UPDATE mail_deliveries SET updated_at=now()-interval '3 minutes'");
  await deliverMail(
    query,
    'stable',
    1,
    'reminder',
    { ...payload, subject: 'Changed' },
    'fake',
    send
  );
  expect(send.mock.calls[1]![1].body).toBe(send.mock.calls[0]![1].body);
});
it('never blindly retries an ambiguous send outside provider retention', async () => {
  await query(
    "INSERT INTO mail_deliveries(key,subscription_id,kind,state,payload,created_at,updated_at) VALUES ('old',1,'reminder','uncertain',$1,now()-interval '25 hours',now()-interval '25 hours')",
    [JSON.stringify(payload)]
  );
  const send = vi.fn();
  expect(await deliverMail(query, 'old', 1, 'reminder', payload, 'fake', send)).toBe('skipped');
  expect(send).not.toHaveBeenCalled();
});
it('unsubscribe removes pending payloads and prevents a new delivery claim', async () => {
  await query(
    "INSERT INTO mail_deliveries(key,subscription_id,kind,state,payload) VALUES ('pending',1,'reminder','pending',$1)",
    [JSON.stringify(payload)]
  );
  await pg.exec('DELETE FROM subscribers');
  expect(await query('SELECT * FROM mail_deliveries')).toHaveLength(0);
  const send = vi.fn();
  expect(await deliverMail(query, 'new', 1, 'reminder', payload, 'fake', send)).toBe('skipped');
  expect(send).not.toHaveBeenCalled();
});
it('keys are deterministic and do not expose credentials', async () => {
  expect(await mailKey('token')).toMatch(/^[a-f0-9]{64}$/);
  expect(await mailKey('token')).toBe(await mailKey('token'));
});
it('the additive migration can be reapplied without data loss', async () => {
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
  expect((await query('SELECT count(*)::int AS n FROM subscribers'))[0]!.n).toBe(1);
});
