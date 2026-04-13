// ── Data freshness ────────────────────────────────────────────────────────────
/** How long DB results are cached in memory between requests (ms). */
export const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

// ── Pagination ────────────────────────────────────────────────────────────────
/** Items per page on public scholarship/program listing pages. */
export const PUBLIC_PAGE_SIZE = 16;

/** Items per page in admin tables. */
export const ADMIN_PAGE_SIZE = 25;

// ── Scholarship deadlines ─────────────────────────────────────────────────────
/** Window used to determine "closing soon" on the home page (ms). */
export const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Rate limits ───────────────────────────────────────────────────────────────
/** Max sign-in attempts per IP before lockout. */
export const SIGN_IN_ATTEMPT_LIMIT = 10;

/** Sign-in rate-limit window (ms). */
export const SIGN_IN_WINDOW_MS = 15 * 60_000; // 15 minutes

/** Max admin mutations (POST/PUT/DELETE) per user per window. */
export const ADMIN_MUTATION_LIMIT = 100;

/** Admin mutation rate-limit window (ms). */
export const ADMIN_MUTATION_WINDOW_MS = 5 * 60_000; // 5 minutes

/** Max AI eligibility parses per user per hour. */
export const AI_PARSE_LIMIT = 150;

/** AI parse rate-limit window (ms). */
export const AI_PARSE_WINDOW_MS = 60 * 60_000; // 1 hour
