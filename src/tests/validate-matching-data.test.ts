// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ patch: {} as Record<string, unknown> }));
// Mutate only the in-memory input to the real validation script, never live data.
vi.mock('fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('fs')>();
  return { ...fs, readFileSync: (...args: Parameters<typeof fs.readFileSync>) => {
    const contents = fs.readFileSync(...args);
    if (!String(args[0]).endsWith('/scholarships.json') && !String(args[0]).endsWith('/research-programs.json')) return contents;
    const rows = JSON.parse(String(contents));
    rows[0].eligibilityEvidence = { minAge: {
      value: 18, tier: 'gate', status: 'partial', quote: 'Synthetic criterion.',
      sourceUrl: 'https://example.test/rules', verifiedAt: '2026-09-10',
      referenceDate: '2027-01-01', ...fixture.patch,
    } };
    return JSON.stringify(rows);
  } };
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-10T18:00:00Z'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(`Validation exit ${code}`); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it.each([
  { patch: { sourceUrl: '' }, field: 'sourceUrl' },
  { patch: { verifiedAt: '2027-01-01' }, field: 'verifiedAt' },
])('reports record identity and $field before exiting cleanly', async ({ patch, field }) => {
  fixture.patch = patch;
  await expect(import('../../scripts/validate-data')).rejects.toThrow('Validation exit 1');
  const messages = vi.mocked(console.error).mock.calls.flat().join('\n');
  for (const kind of ['scholarship', 'program'])
    expect(messages).toMatch(new RegExp(`${kind}:\\d+ .+ eligibilityEvidence.minAge.${field}:`));
  expect(messages).not.toContain('ERR_INVALID_URL');
});
