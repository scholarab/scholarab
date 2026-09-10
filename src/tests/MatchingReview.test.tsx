import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MatchingReview from '../components/admin/MatchingReview';
import { normalizeOpportunity } from '../lib/matching/normalize';
import type { EligibilityEvidence } from '../lib/matching/field-evidence';
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
          ? { kind: 'scholarship', id: 1, revision: 7, deleted: false, hasDraft: false, preview, editableMatching: preview.matching, eligibilityEvidence: {} }
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
                  editableMatching: preview.matching,
                  eligibilityEvidence: {},
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

it('saves the editable base separately from field gates across a save and reload', async () => {
  const base = structuredClone(preview.matching);
  let record = {
    id: 1, title: 'Test award', url: 'https://example.com', matching: base,
    eligibilityEvidence: {
      minAge: {
        value: 13, tier: 'gate', status: 'partial', sourceUrl: 'https://example.com/rules',
        quote: 'Synthetic test source: minimum age is thirteen.', summary: 'Fixture only.',
        verifiedAt: '2026-09-10', referenceDate: '2026-10-01',
      },
    } as EligibilityEvidence,
  };
  let revision = 7;
  const writes: Array<Record<string, unknown>> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      writes.push(body);
      record = { ...record, matching: body.matching, eligibilityEvidence: body.eligibilityEvidence };
      return new Response(JSON.stringify({ revision: ++revision }));
    }
    return new Response(JSON.stringify(url.includes('?') ? {
      kind: 'scholarship', id: 1, revision, deleted: false, hasDraft: revision > 7,
      preview: normalizeOpportunity(record, 'scholarship'), editableMatching: record.matching,
      eligibilityEvidence: record.eligibilityEvidence,
    } : coverage));
  }));
  render(<MatchingReview />);
  fireEvent.click(await screen.findByRole('button', { name: /Test award/ }));
  fireEvent.change(await screen.findByLabelText('Minimum age: value JSON'), { target: { value: '14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reviewed fields as draft' }));
  await screen.findByText('Saved as a draft. Review and publish when ready.');
  expect(writes[0]).toMatchObject({ revision: 7, matching: base, eligibilityEvidence: { minAge: { value: 14, status: 'partial' } } });
  expect(writes[0]?.matching).toEqual(base);

  fireEvent.click(screen.getByRole('button', { name: 'Back to coverage (discard unsaved changes)' }));
  fireEvent.click(await screen.findByRole('button', { name: /Test award/ }));
  await screen.findByLabelText('Minimum age: value JSON');
  fireEvent.click(screen.getByRole('button', { name: 'Save reviewed fields as draft' }));
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]?.revision).toBe(8);
  expect(writes[1]?.matching).toEqual(base);
  const generated = normalizeOpportunity(record, 'scholarship').matching;
  expect(generated.requirements.filter((r) => r.id === 'eligibility-evidence-minAge')).toHaveLength(1);
  expect(generated.groups.filter((g) => g.id === 'eligibility-evidence-root')).toHaveLength(1);
});
