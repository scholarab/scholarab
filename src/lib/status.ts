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
// of it — list-core hands it its own mockable getToday().

export type ScholarshipStatus = 'active' | 'future' | 'closed';

export interface StatusInput {
  openDate?: string | null;
  deadline?: string | null;
  active?: boolean;
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
  const todayMs = today.getTime();
  const open = openMs ?? new Date((s.openDate || '1970-01-01') + 'T00:00:00').getTime();
  if (todayMs < open) return 'future';
  // `||` on purpose: a deadlineMs of 0 means "no deadline" → Infinity, never a 1970 cutoff
  const dead = deadlineMs || (s.deadline ? new Date(s.deadline + 'T00:00:00').getTime() : Infinity);
  if (todayMs > dead) return 'closed';
  // Curator-closed (active: false) with a future deadline is a next-cycle
  // listing whose open date isn't known yet — not accepting applications now.
  if (s.active === false) return 'future';
  return 'active';
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

export function programIsIndexable(p: ProgramStatusInput, today: Date): boolean {
  // Retired programs (active: false) keep their detail pages so old links stay
  // alive, but programs.astro drops them from the directory and the quiz. An
  // orphan page nothing links to is not a page to send Google to.
  if (p.active === false) return false;
  return programStatusOf(p, today) !== 'closed';
}
