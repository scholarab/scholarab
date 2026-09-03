export const CACHE_TTL_MS = 5 * 60_000
export const ADMIN_PAGE_SIZE = 25
export const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000
export const AI_PARSE_LIMIT = 150
export const AI_PARSE_WINDOW_MS = 60 * 60_000

/**
 * The GA4 measurement ID, committed rather than read from the environment.
 *
 * It lived in PUBLIC_GA_ID first, so that a fork of this repo could not report
 * into our property. That could not work here: this project manages plain
 * variables through wrangler.toml, so the Cloudflare dashboard will only
 * accept encrypted secrets, and a Pages secret is exposed to the Functions
 * runtime, not to the build. Astro inlines `import.meta.env` during `astro
 * build`, so the value was never there to inline and the tag never shipped.
 *
 * Committing it costs nothing: a measurement ID is public by design and is
 * visible in the page source of every page that loads the tag. The fork
 * concern is handled by GA_HOSTS in consent.ts instead, which is the more
 * honest guard anyway, since it also keeps preview deployments out.
 *
 * PUBLIC_GA_ID still wins if it is ever set, so a fork can point at its own
 * property without editing this file.
 */
export const GA_MEASUREMENT_ID = 'G-TKZJVK6DYR'
