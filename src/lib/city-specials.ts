// The two "specials" on a city list's board: the biggest award a student there
// can still go for, and the next one to open. From the listings themselves,
// never written by hand, so they move when the data does.
//
// "Closes next" was the third candidate and is left out: the list is sorted by
// closing date, so it would repeat the first row a few centimetres below.

import type { ScholarshipStatus } from './status';
import { parseAmount } from './utils';

export interface SpecialInput {
  title: string;
  amount: string;
  openDate?: string | null;
}

export interface CitySpecials<T> {
  biggest: T | null;
  nextToOpen: T | null;
}

export function citySpecials<T extends SpecialInput>(
  items: readonly T[],
  statusOf: (item: T) => ScholarshipStatus,
  todayIso: string,
): CitySpecials<T> {
  const live = items.filter(s => statusOf(s) !== 'closed');
  // A figure, not "Amount varies"; ties go to the list's own order.
  const biggest = live.reduce<T | null>((best, s) => {
    const n = parseAmount(s.amount);
    return n > 0 && (!best || n > parseAmount(best.amount)) ? s : best;
  }, null);
  const nextToOpen = live
    .filter(s => s !== biggest && statusOf(s) === 'future' && !!s.openDate && s.openDate > todayIso)
    .sort((a, b) => a.openDate!.localeCompare(b.openDate!))[0] ?? null;
  return { biggest, nextToOpen };
}
