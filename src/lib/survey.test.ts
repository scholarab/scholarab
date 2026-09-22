import { describe, it, expect } from 'vitest';
import { surveySpan, surveyReach, daysUntil, surveyMark, surveyPlots } from './survey';

describe('surveySpan', () => {
  it('takes its edges from the entries on the sheet, not from the catalogue', () => {
    // The Calgary case: nothing closes for 221 days, so a province-wide
    // 365-day horizon put every open entry in the first fifth of the rail.
    expect(surveySpan([221, 222, 235, 513])).toEqual({ near: 221, far: 513 });
  });

  it('keeps a non-zero width when every deadline falls on one day', () => {
    expect(surveySpan([90, 90, 90])).toEqual({ near: 90, far: 91 });
  });

  it('ignores undated entries', () => {
    expect(surveySpan([NaN, 10, NaN, 40])).toEqual({ near: 10, far: 40 });
  });

  it('survives a sheet with nothing dated on it', () => {
    expect(surveySpan([])).toEqual({ near: 0, far: 1 });
  });

  it('never starts before today', () => {
    expect(surveySpan([-30, 200]).near).toBe(0);
  });
});

describe('surveyReach', () => {
  const span = { near: 221, far: 513 };

  it('reads left to right: the nearest deadline at the near edge', () => {
    expect(surveyReach(221, span)).toBe(0);
    expect(surveyReach(513, span)).toBe(1);
  });

  it('clamps outside the span rather than running off the rail', () => {
    expect(surveyReach(10, span)).toBe(0);
    expect(surveyReach(9000, span)).toBe(1);
  });

  it('is monotonic: a later deadline never reads as nearer', () => {
    for (let d = span.near + 1; d <= span.far; d += 7) {
      expect(surveyReach(d, span)).toBeGreaterThanOrEqual(surveyReach(d - 1, span));
    }
  });

  it('is linear, so equal gaps in time are equal gaps on the rail', () => {
    // A root was tried here and removed: it relocated a cluster without
    // widening it, because a cluster's width is a fact about the catalogue.
    const a = surveyReach(250, span) - surveyReach(221, span);
    const b = surveyReach(400, span) - surveyReach(371, span);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });

  it('places a real hub band where it actually falls on the year', () => {
    // Calgary: nothing plotted before 78 days, nothing after 328, and every
    // open award closing between 221 and 250. The band belongs mid-rail.
    const calgary = { near: 78, far: 328 };
    expect(surveyReach(221, calgary)).toBeGreaterThan(0.5);
    expect(surveyReach(250, calgary)).toBeLessThan(0.75);
  });

  it('does not divide by zero on a degenerate span', () => {
    expect(surveyReach(5, { near: 5, far: 5 })).toBe(0);
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

describe('surveyPlots', () => {
  it('plots everything with a deadline, opened or not', () => {
    expect(surveyPlots('surveyed')).toBe(true);
    expect(surveyPlots('pending')).toBe(true);
  });

  it('plots nothing for an entry with no date to measure', () => {
    expect(surveyPlots('undated')).toBe(false);
    expect(surveyPlots('cancelled')).toBe(false);
  });
});
