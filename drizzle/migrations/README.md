# Database migrations

Postgres (Neon). `drizzle.config.ts` points `out` here.

## How these are applied

**By hand, one file at a time, not with `drizzle-kit migrate`.**

```bash
psql "$DATABASE_URL" -f drizzle/migrations/0009_subscriber_cadence.sql
```

`psql` is not installed everywhere; the same SQL runs through the driver the app
already depends on:

```js
import { neon } from '@neondatabase/serverless'
await neon(process.env.DATABASE_URL).query(statementText)
```

`DATABASE_URL` lives in `.env` / `.env.local`, not the shell; source it first.

## Do not run `drizzle-kit generate` or `drizzle-kit migrate`

`meta/_journal.json` stops at `0006`, and `meta/` only holds snapshots for
`0000` and `0001`. Everything from `0002` on was written by hand without
updating the journal, so drizzle-kit's view of the schema has been stale for
most of this table's life. Generating against it would produce a migration that
tries to re-create objects that already exist. The journal and snapshots are
kept as history, not as working state.

## Conventions

- **Check the highest number that already exists before naming a new file.**
  `0008` was used twice: `0008_rate_limit.sql` landed first, and a later
  `0008_subscriber_cadence.sql` collided with it and had to be renumbered to
  `0009`. The collision happened because these files were missing from the repo
  at the time; see below.
- **Write them idempotently**: `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, and a `DEFAULT` instead of a backfill where it
  works. Then re-running one is harmless.
- **Make the reading code tolerate the column not being there yet.** Cloudflare
  Pages deploys on every push to `main`, so application code routinely goes live
  before anyone has applied the migration. `/api/alert` and
  `scripts/send-alerts.ts` both catch the missing-column error, log it, and fall
  back; see `src/lib/alerts.ts`.

## Why the history was missing

`6645a4c` ("Share footer/font-preload components; move drizzle migrations out of
src") deleted `src/lib/db/migrations/` without adding the files anywhere else, so
`0000`–`0008` were absent from the repo for a stretch. They were restored here
on 2026-07-31 from `6645a4c^`, which is where that commit meant to put them.
