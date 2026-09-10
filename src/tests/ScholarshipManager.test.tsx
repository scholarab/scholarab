import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ScholarshipManager from '../components/admin/ScholarshipManager';
const mocks = vi.hoisted(() => ({ setItems: vi.fn(), error: vi.fn(), success: vi.fn() }));
const record = {
  id: 1,
  title: 'Test award',
  amount: '$1,000',
  url: 'https://example.com',
  audience: 'Grade 12',
  eligibility: null,
  revision: 7,
  updatedAt: '2026-09-09T00:00:00Z',
};
vi.mock('../lib/use-admin-list', () => ({
  useAdminList: () => ({
    items: [record],
    setItems: mocks.setItems,
    total: 1,
    counts: { All: 1 },
    refresh: vi.fn(),
    error: '',
  }),
}));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it('does not mark a successful parse as saved when its PUT fails', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ eligibility: { grades: ['12'] } })))
    .mockResolvedValueOnce(new Response('{}', { status: 500 }));
  vi.stubGlobal('fetch', fetcher);
  render(
    <ScholarshipManager initialData={{ items: [], total: 0, counts: {}, page: 0, pageSize: 25 }} />
  );
  fireEvent.click(screen.getByRole('button', { name: /Parse untagged on this page/ }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('1 failed'))
  );
  expect(mocks.setItems).not.toHaveBeenCalled();
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({ revision: 7 });
});
it('uses the saved server row and its new revision', async () => {
  const saved = { ...record, revision: 8, eligibility: { grades: ['12'] } };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ eligibility: saved.eligibility })))
      .mockResolvedValueOnce(new Response(JSON.stringify(saved)))
  );
  render(
    <ScholarshipManager initialData={{ items: [], total: 0, counts: {}, page: 0, pageSize: 25 }} />
  );
  fireEvent.click(screen.getByRole('button', { name: /Parse untagged on this page/ }));
  await waitFor(() => expect(mocks.setItems).toHaveBeenCalledOnce());
  expect(mocks.setItems.mock.calls[0]![0]([record])).toEqual([saved]);
});
