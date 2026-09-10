import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MatchExperience from '../components/matching/MatchExperience';
import { normalizeOpportunity } from '../lib/matching/normalize';
import { freshSession, SESSION_KEY } from '../lib/matching/session';
vi.mock('../lib/matching/client-catalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/matching/client-catalogue')>();
  return {
    ...actual,
    verifiedJSON: async (response: Response) => {
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    },
  };
});
const opportunities = Array.from({ length: 7 }, (_, i) =>
  normalizeOpportunity(
    { id: i + 1, title: `Example award ${i + 1}`, url: 'https://example.org', eligibility: {} },
    'scholarship'
  )
);
const catalogue = {
  version: 1,
  catalogueHash: 'test',
  opportunities,
  evidence: Object.fromEntries(opportunities.map((o) => [o.key, 'a'.repeat(64)])),
};
const props = { catalogueHash: 'test', coreHash: 'b'.repeat(64), count: 7 };
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function ready() {
  const s = freshSession('test');
  s.intent = 'both';
  s.stage = '12';
  s.community = 'Calgary';
  s.ready = true;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
it('finishes essentials, pages the whole catalogue, compares and edits without sending answers', async () => {
  const network = vi.fn(async (_url: string) => new Response(JSON.stringify(catalogue)));
  vi.stubGlobal('fetch', network);
  render(<MatchExperience {...props} />);
  fireEvent.change(screen.getByLabelText('1. What are you looking for?'), {
    target: { value: 'both' },
  });
  fireEvent.change(screen.getByLabelText('2. What is your current education stage?'), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText('3. Which community do you currently live in?'), {
    target: { value: 'Calgary' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Show opportunities →' }));
  await screen.findByRole('link', { name: 'Example award 1' });
  expect(screen.getAllByRole('button', { name: 'Compare' })).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Show 20 more' }));
  expect(screen.getAllByRole('button', { name: 'Compare' })).toHaveLength(7);
  for (let i = 0; i < 3; i++)
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare' })[0]!);
  expect(screen.getByRole('heading', { name: 'Compare (3/3)' })).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: 'Compare' }).every((b) => b.hasAttribute('disabled'))
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Edit answers' }));
  expect(
    (screen.getByLabelText('3. Which community do you currently live in?') as HTMLInputElement)
      .value
  ).toBe('Calgary');
  expect(network).toHaveBeenCalledTimes(1);
  expect(network.mock.calls[0]![0]).not.toContain('Calgary');
  fireEvent.click(screen.getByRole('button', { name: 'End answer session' }));
  expect(
    (screen.getByLabelText('3. Which community do you currently live in?') as HTMLInputElement)
      .value
  ).toBe('');
});
it('recovers from loading failures and clears an expired open session on focus', async () => {
  ready();
  const network = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValue(new Response(JSON.stringify(catalogue)));
  vi.stubGlobal('fetch', network);
  render(<MatchExperience {...props} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
  await screen.findByRole('link', { name: 'Example award 1' });
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3600001);
  fireEvent.focus(window);
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Three things to get started.' })).toBeTruthy()
  );
  vi.restoreAllMocks();
});
it('fetches evidence only when requested and preserves saved IDs on ending answers', async () => {
  ready();
  localStorage.setItem('scholarab_saved', '[999]');
  const network = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(catalogue)))
    .mockResolvedValue(
      new Response(
        JSON.stringify({ version: 1, catalogueHash: 'test', opportunity: opportunities[0] })
      )
    );
  vi.stubGlobal('fetch', network);
  render(<MatchExperience {...props} />);
  await screen.findByRole('link', { name: 'Example award 1' });
  expect(network).toHaveBeenCalledTimes(1);
  const details = screen
    .getAllByText('Why this result? Requirements and sources')[0]!
    .closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
  await waitFor(() => expect(network).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'End answer session' }));
  expect(localStorage.getItem('scholarab_saved')).toBe('[999]');
});
