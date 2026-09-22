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

/** The span a sheet is drawn against: its own nearest and furthest deadline. */
export interface SurveySpan {
  /** Days to the nearest deadline on this sheet. Sits at the near edge. */
  near: number;
  /** Days to the furthest. Sits at the origin. */
  far: number;
}

/**
 * The span for one hub, taken from the entries actually on it.
 *
 * This was a fixed 365-day horizon for the catalogue as a whole, and on a city
 * hub that made the graticule useless: Calgary's nearest deadline is 221 days
 * out, so all twenty open entries landed in the first fifth of the rail and the
 * rest of it was empty on every row. A sheet is measured against the ground it
 * covers, not against the province.
 *
 * Taken from every dated entry on the hub rather than from the filtered set, so
 * that filtering the list never slides the ticks under the reader.
 */
export function surveySpan(days: number[]): SurveySpan {
  const dated = days.filter(n => Number.isFinite(n));
  if (dated.length === 0) return { near: 0, far: 1 };
  const near = Math.max(0, Math.min(...dated));
  // A hub whose deadlines all fall on one day still needs a non-zero width, or
  // the division below is undefined and every tick stacks at the origin.
  const far = Math.max(near + 1, Math.max(...dated));
  return { near, far };
}

/**
 * Where a deadline falls on this sheet's graticule: 0 at the near edge, 1 at
 * the far one. Distance reads left to right, like every other measurement.
 *
 * Linear, and deliberately so. A root was tried first, to spend the rail's
 * resolution on the soonest deadlines, and it was the wrong instinct: it moves
 * a cluster to one end without making it any wider, because the width of a
 * cluster is a fact about the catalogue and not about the scale. Calgary's
 * twenty open awards all close inside twenty-nine days of a two-hundred-and
 * -fifty-day sheet, so they occupy twelve per cent of the rail however it is
 * drawn. What the reader needs is where that band sits, and a linear rule is
 * the only one that answers that question honestly. Read down the column, the
 * ticks line up into a vertical band, which is the sheet saying that every
 * award you can apply to today closes in the same fortnight.
 */
export function surveyReach(days: number, span: SurveySpan): number {
  const width = span.far - span.near;
  if (width <= 0) return 0;
  const d = Math.max(span.near, Math.min(span.far, days));
  return +((d - span.near) / width).toFixed(4);
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

/**
 * Whether an entry is plotted at all.
 *
 * Every dated entry gets a tick, including the ones that have not opened yet:
 * their deadlines are the far end of this sheet, and leaving them off left the
 * whole right of the rail blank while their status was already being carried by
 * the mark. Only undated entries have nothing to measure.
 */
export function surveyPlots(mark: SurveyMark): boolean {
  return mark === 'surveyed' || mark === 'pending';
}
