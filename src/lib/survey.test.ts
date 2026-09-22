import { describe, it, expect } from 'vitest';
import { SURVEY_HORIZON_DAYS, surveyReach, daysUntil, surveyMark } from './survey';

describe('surveyReach', () => {
  it('puts today at the near edge and the horizon at the origin', () => {
    expect(surveyReach(0)).toBe(1);
    expect(surveyReach(SURVEY_HORIZON_DAYS)).toBe(0);
  });

  it('clamps past the horizon rather than going negative', () => {
    expect(surveyReach(900)).toBe(0);
    expect(surveyReach(-40)).toBe(1);
  });

  it('spends its resolution on the deadlines a student can still act on', () => {
    // The point of the root: the first month has to occupy more of the track
    // than the last three, or every actionable award lands in one pile.
    const firstMonth = surveyReach(0) - surveyReach(30);
    const lastQuarter = surveyReach(275) - surveyReach(365);
    expect(firstMonth).toBeGreaterThan(lastQuarter);
  });

  it('is monotonic: a nearer deadline never reads as further away', () => {
    for (let d = 1; d <= 365; d += 7) {
      expect(surveyReach(d)).toBeLessThanOrEqual(surveyReach(d - 1));
    }
  });
});

describe('daysUntil', () => {
  const today = new Date('2026-09-21T00:00:00');

  it('counts whole days forward', () => {
    expect(daysUntil('2026-09-28', today)).toBe(7);
    expect(daysUntil('2026-09-21', today)).toBe(0);
  });

  it('goes negative for a date already past', () => {
    expect(daysUntil('2026-09-14', today)).toBe(-7);
  });
});

describe('surveyMark', () => {
  it('draws a dated open award as surveyed', () => {
    expect(surveyMark('active', '2027-01-15')).toBe('surveyed');
  });

  it('draws an open award with no deadline as undated, not surveyed', () => {
    expect(surveyMark('active', null)).toBe('undated');
  });

  it('draws a not-yet-open award as pending whatever its deadline says', () => {
    expect(surveyMark('future', '2027-03-01')).toBe('pending');
  });

  it('keeps a closed award on the sheet as cancelled', () => {
    expect(surveyMark('closed', '2026-01-01')).toBe('cancelled');
  });
});
