// The single definition of "is this listing open, waiting, or expired".
//
// It lives in its own module, with no imports, because three very different
// callers have to agree on it: the detail page (which noindexes closed
// listings), generate-sitemap.ts, and generate-og-images.ts. Putting it in
// list-core.ts would drag data-loader's `import.meta.env` into the plain tsc
// run the build scripts use; putting it in utils.ts would place it behind the
// `vi.mock('./utils.ts')` boundary the client tests rely on.
//
// `today` is passed in rather than read from the clock so callers keep control
// of it; list-core hands it its own mockable getToday().

// 'active' is open with a real deadline; 'ongoing' is open with none. They are
// separate because "open now" only counts the first (Ilia, 2026-09-23): 460
// undated awards were being counted as open, so the directory said 1,083 open
// where 623 had a date to apply by. Programs already drew the same line.
export type ScholarshipStatus = 'active' | 'ongoing' | 'future' | 'unconfirmed' | 'closed';

export interface StatusInput {
  openDate?: string | null;
  deadline?: string | null;
  active?: boolean;
  /**
   * The provider has ended the program outright, so there is no next cycle to
   * wait for. Distinct from `active: false`, which means "between cycles".
   */
  concluded?: boolean;
  /**
   * The deadline shown is last cycle's, rolled forward because the provider
   * has not posted this cycle's date. See Scholarship.deadlineEstimated.
   */
  deadlineEstimated?: boolean;
}

/** Precomputed ms fields from the directory payload, when the caller has them. */
export interface StatusHints {
  openMs?: number;
  deadlineMs?: number;
}

export function scholarshipStatusOf(
  s: StatusInput,
  today: Date,
  { openMs, deadlineMs }: StatusHints = {},
): ScholarshipStatus {
  // Ended for good, so no date can make it open again. Without this an ended
  // award with no deadline falls through to the `active: false` branch below
  // and renders "OPENING SOON", promising a cycle that will never come.
  if (s.concluded === true) return 'closed';
  const todayMs = today.getTime();
  // `||` on purpose: a deadlineMs of 0 means "no deadline" → Infinity, never a 1970 cutoff
  const dead = deadlineMs || (s.deadline ? new Date(s.deadline + 'T00:00:00').getTime() : Infinity);
  // A guessed date is not an open window. Before this state a rolled-forward
  // deadline read as OPEN NOW with a day count and its money joined "open
  // right now", which is the site asserting a date the provider never gave.
  // Checked ahead of the open date, because a rolled-forward openDate is a
  // guess too; once even the guessed deadline has passed, it is closed.
  if (s.deadlineEstimated === true) return todayMs > dead ? 'closed' : 'unconfirmed';
  const open = openMs ?? new Date((s.openDate || '1970-01-01') + 'T00:00:00').getTime();
  if (todayMs < open) return 'future';
  if (todayMs > dead) return 'closed';
  // Curator-closed (active: false) with a future deadline is a next-cycle
  // listing whose open date isn't known yet, not accepting applications now.
  if (s.active === false) return 'future';
  return dead === Infinity ? 'ongoing' : 'active';
}

/**
 * Whether a student can apply today: open with a deadline or open with none.
 * The Apply-or-Visit label reads this; "open now" counts read 'active' alone.
 */
export function canApplyNow(status: ScholarshipStatus): boolean {
  return status === 'active' || status === 'ongoing';
}

// A row's one action (see list-core's paintRowAction for the repaint).
export interface RowAction {
  href: string;
  label: 'Apply' | 'Details';
  external: boolean;
  aria: string;
}

export function rowAction(canApply: boolean, url: string | null | undefined, detailHref: string, name: string): RowAction {
  return canApply && url
    ? { href: url, label: 'Apply', external: true, aria: `Apply for ${name} on the provider's site (opens in a new tab)` }
    : { href: detailHref, label: 'Details', external: false, aria: `Details for ${name}` };
}

export type ProgramStatus = 'active' | 'tba' | 'ongoing' | 'closed';

export interface ProgramStatusInput {
  deadline?: string | null;
  active?: boolean;
}

/**
 * The program twin of scholarshipStatusOf. Programs have no openDate and no
 * "future" state: between cycles auto-expire rewrites a passed deadline to
 * 'TBA', so a dated deadline in the past only ever means "this cycle closed
 * and today's sync hasn't run yet".
 */
export function programStatusOf(p: ProgramStatusInput, today: Date): ProgramStatus {
  const d = p.deadline;
  if (!d || d === 'TBA') return 'tba';
  if (d === 'Ongoing') return 'ongoing';
  return today.getTime() > new Date(d + 'T00:00:00').getTime() ? 'closed' : 'active';
}

// ── The one definition of "Google may index this detail page" ───────────────
//
// [type]/[slug].astro emits <meta name="robots" content="noindex"> for exactly
// the listings these two return false for, and generate-sitemap.ts lists
// exactly the ones they return true for. Both sides call these, so they cannot
// drift: a sitemap URL that serves a noindex is a Search Console error, and an
// indexable page left out of the sitemap is how 112 live pages went unlisted.

export function scholarshipIsIndexable(s: StatusInput, today: Date, hints: StatusHints = {}): boolean {
  return scholarshipStatusOf(s, today, hints) !== 'closed';
}

/**
 * The one definition of "this program is in the directory", and therefore the
 * one definition of the count the site prints. /programs, the home hero, the
 * nav sheet and /educators each had their own copy of this filter; the
 * /educators copy had drifted to a raw programs.length, so counsellors were
 * told 125 on the page selling them the directory and shown 117 inside it.
 */
export function programIsListed(p: ProgramStatusInput, today: Date): boolean {
  if (p.active === false) return false;
  return programStatusOf(p, today) !== 'closed';
}

export function programIsIndexable(p: ProgramStatusInput, today: Date): boolean {
  // Retired programs (active: false) keep their detail pages so old links stay
  // alive, but programs.astro drops them from the directory and the quiz. An
  // orphan page nothing links to is not a page to send Google to.
  if (p.active === false) return false;
  return programStatusOf(p, today) !== 'closed';
}

// ── The one set of words for a listing that is not open today ──────────────
//
// The quiz said "Opening later", the detail page "Opening soon", /saved
// "Around Jun 15 / not confirmed" and programs "Ongoing" for what was often
// the same award (critique 2026-09-23). Every surface now takes its wording
// from here. `fmt` formats an ISO date the way the caller already prints them,
// which keeps this module free of imports.

export const STATUS_WORDS = {
  future: 'Not open yet',
  unconfirmed: 'Date not confirmed',
  none: 'No fixed deadline',
  closed: 'Closed',
} as const;

/**
 * `main` is the state or its date, `sub` the qualifier a one-line cell prints
 * beside it. Null for an open award: each surface prints its own due date.
 */
export function waitingLabel(
  status: ScholarshipStatus,
  s: { openDate?: string | null; deadline?: string | null },
  fmt: (iso: string) => string,
): { main: string; sub: string } | null {
  if (status === 'closed') return { main: STATUS_WORDS.closed, sub: '' };
  if (status === 'future') {
    if (s.openDate) return { main: `Opens ${fmt(s.openDate)}`, sub: '' };
    // Between cycles with this cycle's deadline known: say both halves.
    return { main: STATUS_WORDS.future, sub: s.deadline ? `due ${fmt(s.deadline)}` : '' };
  }
  // No countdown: counting down to a guessed date is what this state stops.
  if (status === 'unconfirmed') {
    return s.deadline ? { main: `Around ${fmt(s.deadline)}`, sub: 'not confirmed' } : { main: STATUS_WORDS.unconfirmed, sub: '' };
  }
  return null;
}

/** Programs speak the same words: TBA is an unconfirmed date, Ongoing has no deadline. */
export function programUndatedLabel(deadline: string | null | undefined): string {
  return deadline === 'Ongoing' ? STATUS_WORDS.none : STATUS_WORDS.unconfirmed;
}
