// The hub's measuring scale.
//
// The survey sheet's whole claim is that the grid measures: every entry is
// read against the same graticule rather than carrying its own private chip.
// So "how far away is this deadline" has to be one number, computed the same
// way on the server and in the browser, or the ticks would disagree with the
// text beside them.
//
// No import of data-loader here, same constraint as status.ts and list-core.ts:
// the build scripts run this under a plain tsc.

/** The far edge of the graticule. Past a year out, an entry sits at the origin. */
export const SURVEY_HORIZON_DAYS = 365;

/**
 * Where a deadline falls on the graticule, 0 at the horizon and 1 at today.
 *
 * Square-rooted rather than linear because the distribution is not: 117 of the
 * 153 dated awards in the catalogue fall in the next calendar year, so a linear
 * scale bunches everything a student can still act on into the last tenth of
 * the track and spreads the ones they cannot over the rest. The root spends the
 * resolution where the decisions are.
 */
export function surveyReach(days: number): number {
  const d = Math.max(0, Math.min(SURVEY_HORIZON_DAYS, days));
  return +(1 - Math.sqrt(d / SURVEY_HORIZON_DAYS)).toFixed(4);
}

/** Whole days from `today` to an ISO date, both read as Alberta-local midnight. */
export function daysUntil(iso: string, today: Date): number {
  return Math.round(
    (new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86400000,
  );
}

/**
 * How an entry is drawn on the sheet.
 *
 * These are the survey's own three states, not a colour ramp: land is surveyed,
 * awaiting survey, or cancelled. A cancelled parcel keeps its lines on the
 * sheet; it does not disappear from the map, which is why `cancelled` still
 * renders a track.
 */
export type SurveyMark = 'surveyed' | 'pending' | 'cancelled' | 'undated';

export function surveyMark(
  status: 'active' | 'future' | 'closed',
  deadline: string | null | undefined,
): SurveyMark {
  if (status === 'closed') return 'cancelled';
  if (status === 'future') return 'pending';
  return deadline ? 'surveyed' : 'undated';
}
