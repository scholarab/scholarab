import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MatchingReview from '../components/admin/MatchingReview';
import { normalizeOpportunity } from '../lib/matching/normalize';
const preview = normalizeOpportunity(
  { id: 1, title: 'Test award', url: 'https://example.com' },
  'scholarship'
);
const coverage = {
  counts: { scholarship: 1, program: 0 },
  comparison: 'aligned',
  publicationStatus: 'idle',
  records: [],
  legacy: [],
  queue: [
    {
      key: 'scholarship:1',
      kind: 'scholarship',
      id: 1,
      title: 'Test award',
      issues: ['coverage-unreviewed'],
    },
  ],
  drift: [],
  catalogueHash: 'abc',
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('keeps unsaved review fields and revision on conflict', async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT')
      return new Response(
        JSON.stringify({ error: 'This record changed. Refresh and try again.' }),
        { status: 409 }
      );
    return new Response(
      JSON.stringify(
        url.includes('?')
          ? { kind: 'scholarship', id: 1, revision: 7, deleted: false, hasDraft: false, preview }
          : coverage
      )
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<MatchingReview />);
  fireEvent.click(await screen.findByRole('button', { name: /Test award/ }));
  const source = (await screen.findAllByLabelText('Official source URL'))[0]!;
  fireEvent.change(source, { target: { value: 'https://example.com/verified' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reviewed fields as draft' }));
  expect((await screen.findByRole('alert')).textContent).toContain('This record changed');
  expect((source as HTMLInputElement).value).toBe('https://example.com/verified');
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
  expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({
    revision: 7,
    matching: { coverageEvidence: { sourceUrl: 'https://example.com/verified' } },
  });
});
it('does not mark evidence reviewed merely by opening the editor', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('?')
              ? {
                  kind: 'scholarship',
                  id: 1,
                  revision: 1,
                  deleted: false,
                  hasDraft: false,
                  preview,
                }
              : coverage
          )
        )
    )
  );
  render(<MatchingReview />);
  fireEvent.click(await screen.findByRole('button', { name: /Test award/ }));
  await waitFor(() =>
    expect((screen.getByLabelText('Requirement coverage') as HTMLSelectElement).value).toBe(
      'partial'
    )
  );
  expect(
    screen
      .getAllByLabelText('Review status')
      .every((el) => (el as HTMLSelectElement).value === 'legacy-unreviewed')
  ).toBe(true);
});
