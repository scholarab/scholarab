// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ send: vi.fn(async () => 'sent'), queries: [] as string[] }));
vi.mock('@neondatabase/serverless', () => ({ neon: () => Object.assign(async (strings: TemplateStringsArray) => {
  const query = strings.join('?'); state.queries.push(query);
  if (query.includes('SELECT DISTINCT ON')) throw new Error('Test must never run confirmation sweep');
  if (query.includes('SELECT id,email,token')) return [
    { id: 50, email: 'designated@example.test', token: 'a'.repeat(48), cadence: '3', item_type: 'program', item_id: 44 },
    // Defence in depth: even an unexpectedly broad DB result cannot mail this row.
    { id: 51, email: 'unrelated@example.test', token: 'b'.repeat(48), cadence: '3', item_type: 'program', item_id: 44 },
  ];
  if (query.includes('SELECT d.key')) return [{ key: 'unrelated-retry', subscription_id: 51, kind: 'reminder', payload: {}, email: 'unrelated@example.test' }];
  if (query.includes('count(*)')) return [{ n: 0 }];
  return [];
}, { query: vi.fn(async () => []) }) }));
vi.mock('../lib/mail-delivery', () => ({ claimRecipient: vi.fn(), mailKey: async (key: string) => key, deliverMail: (...args: unknown[]) => state.send(...args as []) }));
vi.mock('../lib/calendar', () => ({ calendarDaysUntil: () => 6 }));
// The script's own fixture, not the live catalogue. This test used to lean on
// real program 44 (Breakthrough Junior Challenge) having a dated deadline, and
// CI runs auto-expire before the tests: the day after that deadline, 44 read
// "TBA", the script rightly skipped it, and the test failed on a push that
// touched nothing but CSS (2026-09-16). Every listing's deadline passes
// eventually, so no real id is safe to pin here.
vi.mock('fs', async importOriginal => {
  const fs = await importOriginal<typeof import('fs')>();
  const fixtures: Record<string, unknown[]> = {
    'scholarships.json': [],
    'research-programs.json': [{ id: 44, name: 'Fixture Program', deadline: '2099-01-01', url: 'https://example.test/program' }],
  };
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    const name = Object.keys(fixtures).find(f => String(path).endsWith(f));
    return name ? JSON.stringify(fixtures[name]) : (fs.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof fs.readFileSync;
  return { ...fs, default: { ...fs, readFileSync }, readFileSync };
});
beforeEach(() => {
  vi.resetModules(); state.send.mockClear(); state.queries.length = 0;
  vi.stubEnv('DATABASE_URL', 'test-only'); vi.stubEnv('RESEND_API_KEY', 'test-only');
  vi.stubEnv('TEST_SUBSCRIPTION_ID', '50'); vi.stubEnv('DRY_RUN', ''); vi.stubEnv('CATCH_UP', '');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('sends only to the designated confirmed subscription, never a sweep or unrelated retry', async () => {
  await import('../../scripts/send-alerts');
  expect(state.send).toHaveBeenCalledTimes(1);
  const call = state.send.mock.calls[0] as unknown as unknown[];
  expect(call[2]).toBe(50);
  expect(call[3]).toBe('reminder');
  expect(call[4]).toMatchObject({ to: ['designated@example.test'], subject: expect.stringContaining('[TEST]') });
  expect(String(call[1])).toContain('designated-test');
  expect(state.queries.some(q => q.includes('SELECT DISTINCT ON'))).toBe(false);
  expect(state.queries.some(q => q.includes('SELECT d.key'))).toBe(false);
  expect(state.queries.find(q => q.includes('SELECT id,email,token'))).toContain('id =');
});
it('rejects malformed test scope before touching delivery data', async () => {
  vi.stubEnv('TEST_SUBSCRIPTION_ID', '50 OR 1=1');
  await expect(import('../../scripts/send-alerts')).rejects.toThrow('positive integer');
  expect(state.send).not.toHaveBeenCalled();
  expect(state.queries).toHaveLength(0);
});
