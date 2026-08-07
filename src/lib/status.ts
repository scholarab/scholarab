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
