import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import MatchingEnginePreview from '../components/admin/MatchingEnginePreview';
import { normalizeOpportunity } from '../lib/matching/normalize';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('keeps synthetic profile edits local and shows legacy uncertainty', () => {
  const network = vi.fn();
  vi.stubGlobal('fetch', network);
  render(
    <MatchingEnginePreview
      opportunity={normalizeOpportunity(
        { id: 1, title: 'Fixture', url: 'https://example.com', eligibility: { minAverage: 85 } },
        'scholarship'
      )}
    />
  );
  fireEvent.click(screen.getByText('Test Phase 2 eligibility engine'));
  fireEvent.click(screen.getByRole('button', { name: 'Load example: 80–89 admission average' }));
  expect(screen.getByRole('status').textContent).toContain('worth checking');
  expect(screen.getByRole('status').textContent).toContain('source verification');
  expect(network).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Synthetic profile JSON'), {
    target: { value: '{"answers":broken}' },
  });
  expect(screen.getByRole('status').textContent).toContain('JSON');
  expect(network).not.toHaveBeenCalled();
});
