// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import * as schema from '../../lib/db/schema';
import { legacyMatching } from '../../lib/matching/normalize';
import { applyPublication } from '../../lib/catalogue';
import { makeAdminCollectionRoutes, makeAdminItemRoutes } from '../../lib/admin-crud';
import {
  scholarshipCreateSchema,
  scholarshipUpdateSchema,
  programCreateSchema,
  programUpdateSchema,
} from '../../lib/admin-schemas';
const state = vi.hoisted(() => ({ db: null as any, admin: true }));
vi.mock('../../lib/db/client', () => ({ db: new Proxy({}, { get: (_, key) => state.db[key] }) }));
vi.mock('../../lib/adminAuth', () => ({ isAdminRequest: async () => state.admin }));
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'));
  await pg.exec(readFileSync('drizzle/migrations/0013_catalogue_and_delivery.sql', 'utf8'));
  state.db = drizzle(pg, { schema });
}, 30000);
beforeEach(async () => {
  state.admin = true;
  await pg.exec('TRUNCATE catalogue_entries,publication_requests');
});
afterAll(async () => {
  await pg.close();
});
function call(route: any, method: string, body?: unknown, id = '1', query = '') {
  return route({
    request: new Request('http://localhost/admin/api/catalogue' + query, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    params: { id },
  }) as Promise<Response>;
}
for (const kind of ['scholarship', 'program'] as const)
  describe(`${kind} draft CRUD on PostgreSQL`, () => {
    const cfg = {
      kind,
      createSchema: kind === 'scholarship' ? scholarshipCreateSchema : programCreateSchema,
      updateSchema: kind === 'scholarship' ? scholarshipUpdateSchema : programUpdateSchema,
    };
    const collection = makeAdminCollectionRoutes(cfg),
      item = makeAdminItemRoutes(cfg);
    const title = kind === 'scholarship' ? 'title' : 'name';
    const valid = { [title]: 'Test award', amount: '$1,000', url: 'https://example.com' };
    async function seed() {
      await pg.query('INSERT INTO catalogue_entries(kind,public_id,published) VALUES ($1,1,$2)', [
        kind,
        JSON.stringify({ ...valid, id: 1, alsoOpenTo: ['Beaumont'], metaDetail: 'Preserve this' }),
      ]);
    }
    it('round trips matching evidence through draft save, read, and publication without touching the published baseline', async () => {
      await seed();
      const original = { ...valid, id: 1, alsoOpenTo: ['Beaumont'], metaDetail: 'Preserve this' };
      const matching = legacyMatching(original, kind);
      const saved = await call(item.PUT, 'PUT', { revision: 1, matching });
      expect(saved.status).toBe(200);
      const document = await saved.json();
      expect(document.matching).toEqual(matching);
      expect((await (await call(item.GET, 'GET')).json()).matching).toEqual(matching);
      const result = await pg.query(
        'SELECT published,draft,draft_base,revision FROM catalogue_entries WHERE kind=$1',
        [kind]
      );
      const row = result.rows[0] as any;
      expect(row.published).toEqual(original);
      const merged = applyPublication(
        [original],
        [{ kind, publicId: 1, base: row.draft_base, value: row.draft, revision: row.revision }],
        kind
      );
      expect(merged[0]?.matching).toEqual(matching);
      expect(merged[0]?.metaDetail).toBe('Preserve this');
      expect(
        (await call(item.PUT, 'PUT', { revision: document.revision, matching: { version: 99 } }))
          .status
      ).toBe(400);
      expect((await call(item.PUT, 'PUT', { revision: 1, matching })).status).toBe(409);
    });
    it('rejects every unauthorized operation', async () => {
      state.admin = false;
      for (const [route, method] of [
        [collection.GET, 'GET'],
        [collection.POST, 'POST'],
        [item.GET, 'GET'],
        [item.PUT, 'PUT'],
        [item.DELETE, 'DELETE'],
      ] as const)
        expect((await call(route, method, method === 'GET' ? undefined : valid)).status).toBe(401);
    });
    it('creates an unpublished record with a public ID and revision', async () => {
      const res = await call(collection.POST, 'POST', valid);
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ id: 1, revision: 1, unpublished: true });
      const rows = await pg.query('SELECT published,draft FROM catalogue_entries');
      expect(rows.rows[0]).toMatchObject({ published: null, draft: { id: 1 } });
    });
    it.each([
      null,
      [],
      false,
      {},
      { url: 'http://example.com' },
      { [title]: '', url: 'https://example.com' },
    ])('rejects invalid create data %j', async (data) => {
      expect((await call(collection.POST, 'POST', data)).status).toBe(400);
    });
    it('enforces duplicate names at the database boundary', async () => {
      expect((await call(collection.POST, 'POST', valid)).status).toBe(201);
      expect(
        (await call(collection.POST, 'POST', { ...valid, [title]: ' test AWARD ' })).status
      ).toBe(409);
    });
    it('reads public IDs and preserves JSON-only fields on edit', async () => {
      await seed();
      const res = await call(item.PUT, 'PUT', { revision: 1, [title]: 'Renamed' });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        id: 1,
        revision: 2,
        alsoOpenTo: ['Beaumont'],
        metaDetail: 'Preserve this',
      });
      const rows = await pg.query('SELECT published,draft_base FROM catalogue_entries');
      expect(rows.rows[0]).toMatchObject({
        published: { [title]: 'Test award' },
        draft_base: { [title]: 'Test award' },
      });
    });
    it('one of two simultaneous saves wins', async () => {
      await seed();
      const results = await Promise.all([
        call(item.PUT, 'PUT', { revision: 1, [title]: 'A' }),
        call(item.PUT, 'PUT', { revision: 1, [title]: 'B' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });
    it('preserves an unchanged vetted HTTP URL but rejects a new HTTP URL', async () => {
      await seed();
      await pg.query(
        `UPDATE catalogue_entries SET published=jsonb_set(published,'{url}','"http://legacy.example.org"')`
      );
      expect(
        (
          await call(item.PUT, 'PUT', {
            revision: 1,
            [title]: 'Edited',
            url: 'http://legacy.example.org',
          })
        ).status
      ).toBe(200);
      expect(
        (await call(item.PUT, 'PUT', { revision: 2, url: 'http://different.example.org' })).status
      ).toBe(400);
    });
    it('requires revisions for update and delete', async () => {
      await seed();
      expect((await call(item.PUT, 'PUT', { [title]: 'A' })).status).toBe(400);
      expect((await call(item.DELETE, 'DELETE', {})).status).toBe(400);
    });
    it('deletion is a reversible unpublished tombstone', async () => {
      await seed();
      expect((await call(item.DELETE, 'DELETE', { revision: 1 })).status).toBe(204);
      expect((await call(item.GET, 'GET')).status).toBe(404);
      const result = await pg.query('SELECT published,deleted FROM catalogue_entries');
      expect(result.rows[0]).toMatchObject({ published: { id: 1 }, deleted: true });
    });
    it.each(['1x', '0', '-1', '1.1', '2147483648', 'NaN'])(
      'rejects ambiguous path ID %s',
      async (id) => {
        expect((await call(item.GET, 'GET', undefined, id)).status).toBe(400);
      }
    );
    it('returns 404 for absent rows', async () => {
      expect((await call(item.GET, 'GET')).status).toBe(404);
      expect((await call(item.PUT, 'PUT', { revision: 1 })).status).toBe(404);
    });
    it('paginates every row beyond 1000 with stable order and complete search', async () => {
      await pg.query(
        `INSERT INTO catalogue_entries(kind,public_id,published) SELECT $1,n,jsonb_build_object('id',n,$2::text,'Award '||n,'url','https://example.com') FROM generate_series(1,1086) n`,
        [kind, title]
      );
      const seen: number[] = [];
      for (let page = 0; page < 44; page++) {
        const res = await call(collection.GET, 'GET', undefined, '1', `?page=${page}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.total).toBe(1086);
        seen.push(...data.items.map((x: { id: number }) => x.id));
      }
      expect(new Set(seen).size).toBe(1086);
      expect(seen[0]).toBe(1086);
      expect(seen.at(-1)).toBe(1);
      const filtered = await (
        await call(collection.GET, 'GET', undefined, '1', '?q=Award%201086')
      ).json();
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].id).toBe(1086);
    });
    it('validates pagination parameters', async () => {
      expect((await call(collection.GET, 'GET', undefined, '1', '?page=-1')).status).toBe(400);
    });
  });
