// The one place a page counts what is open. Every "N open" on the site reads
// this, so the home slides, the hub chips, the directory count line and the
// guide cards cannot disagree again (critique 2026-09-23: home said
// "Competitions 8 open", the hub said 3, because home counted year-round
// programs as open and the hub did not).
//
// "Open" means a student can apply today: a deadline that has not passed
// ('active') or no deadline at all ('ongoing'). Since 2026-10-01 the two are
// one count, the same set the directories' "Open now" chip and run hold.

export interface OpenCounts {
  /** Open now, with or without a deadline. */
  open: number;
}

export function openCounts<T>(items: readonly T[], statusOf: (item: T) => string): OpenCounts {
  let open = 0;
  for (const it of items) {
    const st = statusOf(it);
    if (st === 'active' || st === 'ongoing') open++;
  }
  return { open };
}
