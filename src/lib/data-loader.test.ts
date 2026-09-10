import { it, expect, vi, afterEach } from 'vitest';
import {
  loadScholarships,
  loadPrograms,
  loadScholarshipsFromJson,
  loadProgramsFromJson,
} from './data-loader';
vi.mock('./db/client', () => {
  throw new Error('Public loaders must never read the admin database');
});
afterEach(() => vi.unstubAllEnvs());
it('uses identical public data regardless of database configuration', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://invalid');
  expect(await loadScholarships()).toBe(await loadScholarshipsFromJson());
  expect(await loadPrograms()).toBe(await loadProgramsFromJson());
});
it('preserves public IDs, secondary cities, retired listings and JSON-only fields', async () => {
  const rows = await loadScholarships();
  expect(rows.find((s) => s.id === 496)?.alsoOpenTo).toContain('Beaumont');
  expect(rows.some((s) => s.active === false)).toBe(true);
  expect(rows.some((s) => s.metaDetail)).toBe(true);
});
it('normalizes optional program active state and validates eligibility once', async () => {
  expect((await loadPrograms()).every((p) => typeof p.active === 'boolean')).toBe(true);
  expect((await loadScholarships()).find((s) => s.id === 496)?.eligibility?.grades).toContain('12');
});
