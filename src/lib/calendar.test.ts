import { it, expect } from 'vitest';
import { albertaDate, calendarDaysUntil, todayDate } from './calendar';
it('keeps Alberta evening on the previous UTC date', () => {
  const now = new Date('2026-09-10T01:00:00Z');
  expect(albertaDate(now)).toBe('2026-09-09');
  expect(calendarDaysUntil('2026-09-10', now)).toBe(1);
  expect(todayDate(now).getDate()).toBe(9);
});
it('counts calendar days across both DST transitions', () => {
  expect(calendarDaysUntil('2026-03-09', new Date('2026-03-08T19:00:00Z'))).toBe(1);
  expect(calendarDaysUntil('2026-11-02', new Date('2026-11-01T19:00:00Z'))).toBe(1);
});
