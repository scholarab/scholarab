-- Deadline-alert cadence: which milestones before a deadline each subscriber
-- wants mailed on. Stored as a comma-separated day list (see src/lib/alerts.ts).
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT WRITES IT. /api/alert falls back to
-- an insert without the column if it is missing, so sign-ups keep working
-- either way, but until this runs every subscriber silently gets the default
-- 30/14/3 and the picker in /app has no effect.
--
--   psql "$DATABASE_URL" -f drizzle/migrations/0008_subscriber_cadence.sql
--
-- The DEFAULT covers every existing row, so no backfill is needed and the
-- statement is safe to re-run.

ALTER TABLE "subscribers"
  ADD COLUMN IF NOT EXISTS "cadence" text NOT NULL DEFAULT '30,14,3';
