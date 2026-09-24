// The one place a page counts what is open. Every "N open" on the site reads
// this, so the home slides, the hub chips, the directory count line and the
// guide cards cannot disagree again (critique 2026-09-23: home said
// "Competitions 8 open", the hub said 3, because home counted year-round
// programs as open and the hub did not).
//
// "Open" means a real deadline that has not passed (status 'active'). Open
// with no deadline is its own count, 'ongoing', and is never folded in.

export interface OpenCounts {
  /** Open now, with a deadline to apply by. */
  open: number;
  /** Open, with no fixed deadline. */
  ongoing: number;
}

export function openCounts<T>(items: readonly T[], statusOf: (item: T) => string): OpenCounts {
  let open = 0;
  let ongoing = 0;
  for (const it of items) {
    const st = statusOf(it);
    if (st === 'active') open++;
    else if (st === 'ongoing') ongoing++;
  }
  return { open, ongoing };
}
