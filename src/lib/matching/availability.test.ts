// @vitest-environment node
import { expect, it } from 'vitest';
import { normalizeOpportunity } from './normalize';
import { evaluateAvailability } from './availability';
import { scholarshipStatusOf } from '../status';

const now = new Date('2026-09-10T05:59:00Z'); // September 9 in Alberta
it.each([
  { active: false, deadline: '2026-10-01' },
  { active: false, deadline: null },
  { active: false, deadline: null, openDate: '2025-09-01' },
  { active: false, deadline: '2026-09-08' },
  { active: true, deadline: '2026-09-09' },
  { active: true, deadline: null },
  { active: true, openDate: '2026-09-15', deadline: '2026-10-01' },
])('uses the shared scholarship status for %j', (input) => {
  const opportunity = normalizeOpportunity(
    { id: 1, title: 'Status fixture', url: 'https://example.test', ...input },
    'scholarship'
  );
  const shared = scholarshipStatusOf(input, new Date('2026-09-09T00:00:00'));
  expect(evaluateAvailability(opportunity, now).status).toBe(
    shared === 'closed' ? 'closed' : shared === 'future' ? 'opens_later' : 'unknown'
  );
});

it('does not imply a known opening date for an inactive undated scholarship', () => {
  const opportunity = normalizeOpportunity(
    { id: 1, title: 'Retired fixture', url: 'https://example.test', active: false },
    'scholarship'
  );
  expect(evaluateAvailability(opportunity, now)).toMatchObject({
    status: 'opens_later',
    opensOn: null,
    verified: false,
    note: 'This listing is between cycles; the next opening date is not confirmed.',
  });
});

it('keeps an explicitly retired program closed under the program policy', () => {
  const opportunity = normalizeOpportunity(
    { id: 1, name: 'Retired program', url: 'https://example.test', active: false, deadline: 'TBA' },
    'program'
  );
  expect(evaluateAvailability(opportunity, now).status).toBe('closed');
});
