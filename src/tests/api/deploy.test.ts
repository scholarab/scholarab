// @vitest-environment node
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { GET, POST } from '../../pages/admin/api/deploy';
import { verifyPublication } from '../../lib/publication-signature';
const state = vi.hoisted(() => ({ db: null as any, admin: true }));
vi.mock('../../lib/db/client', () => ({ db: new Proxy({}, { get: (_, key) => state.db[key] }) }));
vi.mock('../../lib/adminAuth', () => ({ isAdminRequest: async () => state.admin }));
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0015_publication_signature.sql', 'utf8'));
  state.db = drizzle(pg);
}, 30000);
const KEY = 'test-signing-key-0123456789abcdef';
beforeEach(async () => {
  state.admin = true;
  vi.stubEnv('PUBLICATION_SIGNING_KEY', KEY);
  await pg.exec('TRUNCATE catalogue_entries,publication_requests');
});
afterAll(async () => pg.close());
const call = async (route: any, method = 'POST', hash?: string) => {
  let previewHash = hash;
  if (method === 'POST' && previewHash === undefined) {
    const state = await GET({ request: new Request('http://localhost/admin/api/deploy') } as any);
    previewHash = (await state.json()).previewHash;
  }
  return route({
    request: new Request('http://localhost/admin/api/deploy', {
      method,
      body: method === 'POST' ? JSON.stringify({ previewHash }) : undefined,
    }),
  }) as Promise<Response>;
};
it('requires admin access', async () => {
  state.admin = false;
  expect((await call(POST)).status).toBe(401);
  expect((await call(GET, 'GET')).status).toBe(401);
});
it('does not report success with nothing to publish', async () => {
  expect((await call(POST)).status).toBe(409);
});
it('freezes exact requested draft revisions and queues only once', async () => {
  await pg.exec(
    `INSERT INTO catalogue_entries(kind,public_id,draft,revision) VALUES ('program',20,'{"id":20,"name":"Draft"}',3)`
  );
  expect((await call(POST)).status).toBe(202);
  await pg.exec(`UPDATE catalogue_entries SET draft='{"id":20,"name":"Later"}',revision=4`);
  const r = await pg.query('SELECT changes FROM publication_requests');
  expect(r.rows[0]).toMatchObject({
    changes: [{ publicId: 20, revision: 3, value: { name: 'Draft' } }],
  });
  expect((await call(POST)).status).toBe(409);
  expect(await (await call(GET, 'GET')).json()).toMatchObject({ status: 'queued' });
});

it('rejects a stale review snapshot', async () => {
  await pg.exec(
    `INSERT INTO catalogue_entries(kind,public_id,draft) VALUES ('program',1,'{"id":1,"name":"First"}')`
  );
  const response = await call(GET, 'GET');
  const { previewHash } = await response.json();
  await pg.exec(`UPDATE catalogue_entries SET draft='{"id":1,"name":"Later"}',revision=2`);
  expect((await call(POST, 'POST', previewHash)).status).toBe(409);
});

it('signs the stored request so the publisher can verify it after the jsonb round trip', async () => {
  await pg.exec(
    `INSERT INTO catalogue_entries(kind,public_id,draft,draft_base,revision) VALUES ('scholarship',7,'{"url":"https://a.example","title":"T","id":7,"amount":1.50}','{"id":7,"title":"Old"}',2)`
  );
  expect((await call(POST)).status).toBe(202);
  const [row] = (await pg.query<{ id: string; changes: unknown; signature: string }>('SELECT id,changes,signature FROM publication_requests')).rows;
  expect(await verifyPublication(KEY, row!.id, row!.changes, row!.signature)).toBe(true);
  // What a leaked DATABASE_URL could do: rewrite the queued changes.
  await pg.exec(`UPDATE publication_requests SET changes = jsonb_set(changes, '{0,value,url}', '"https://evil.example"')`);
  const [tampered] = (await pg.query<{ changes: unknown }>('SELECT changes FROM publication_requests')).rows;
  expect(await verifyPublication(KEY, row!.id, tampered!.changes, row!.signature)).toBe(false);
});

it('refuses to queue an unsigned request when no signing key is configured', async () => {
  vi.stubEnv('PUBLICATION_SIGNING_KEY', '');
  await pg.exec(`INSERT INTO catalogue_entries(kind,public_id,draft) VALUES ('program',3,'{"id":3,"name":"D"}')`);
  expect((await call(POST)).status).toBe(503);
  expect((await pg.query('SELECT 1 FROM publication_requests')).rows).toHaveLength(0);
});
