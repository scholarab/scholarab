import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FieldEvidenceEditor from '../components/admin/FieldEvidenceEditor';
import type { EligibilityEvidence } from '../lib/matching/field-evidence';

afterEach(cleanup);
function Harness({ initial = {}, changed = vi.fn(), validity = vi.fn() }: {
  initial?: EligibilityEvidence;
  changed?: (value: EligibilityEvidence) => void;
  validity?: (value: boolean) => void;
}) {
  const [value, setValue] = useState(initial);
  return <FieldEvidenceEditor value={value} onChange={(next) => { changed(next); setValue(next); }} onValidityChange={validity} />;
}

it('exposes all 17 independent fields and approves only through an explicit review action', () => {
  const changed = vi.fn();
  render(<Harness changed={changed} />);
  expect(screen.getAllByLabelText(/^Edit evidence for /)).toHaveLength(17);
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Edit evidence for Minimum age'));
  fireEvent.change(screen.getByLabelText('Minimum age: value JSON'), { target: { value: '13' } });
  fireEvent.change(screen.getByLabelText('Minimum age: provider quotation (verbatim)'), { target: { value: 'Synthetic quoted age criterion.' } });
  expect(changed.mock.lastCall?.[0]).toMatchObject({ minAge: { value: 13, tier: 'signal', status: 'partial' } });
  expect(Object.keys(changed.mock.lastCall?.[0])).toEqual(['minAge']);
  fireEvent.change(screen.getByLabelText('Minimum age: review status'), { target: { value: 'reviewed' } });
  expect(changed.mock.lastCall?.[0].minAge.status).toBe('reviewed');
  fireEvent.change(screen.getByLabelText('Minimum age: value JSON'), { target: { value: '14' } });
  expect(changed.mock.lastCall?.[0].minAge.status).toBe('partial');
});

it('blocks malformed JSON and recovers without losing evidence on another field', () => {
  const changed = vi.fn(), validity = vi.fn();
  const initial: EligibilityEvidence = {
    citizenship: { value: 'canadian', tier: 'signal', status: 'partial', quote: '', summary: 'Existing proposal', sourceUrl: null, verifiedAt: null },
  };
  render(<Harness initial={initial} changed={changed} validity={validity} />);
  fireEvent.click(screen.getByLabelText('Edit evidence for Fields of study'));
  fireEvent.change(screen.getByLabelText('Fields of study: value JSON'), { target: { value: '["STEM"' } });
  expect(validity).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole('alert').textContent).toContain('Enter valid JSON');
  fireEvent.change(screen.getByLabelText('Fields of study: value JSON'), { target: { value: '["STEM"]' } });
  expect(validity).toHaveBeenLastCalledWith(true);
  expect(changed.mock.lastCall?.[0]).toMatchObject({ citizenship: initial.citizenship, fields: { value: ['STEM'] } });
  fireEvent.change(screen.getByLabelText('Fields of study: value JSON'), { target: { value: '[' } });
  fireEvent.click(screen.getByLabelText('Edit evidence for Fields of study'));
  expect(validity).toHaveBeenLastCalledWith(true);
  expect(changed.mock.lastCall?.[0]).toEqual(initial);
});
