-- Phone, tablet or computer, worked out by /api/event from the request's
-- user agent and stored as that one word. The user agent itself is never
-- stored. Null on rows from before 2026-10-14. See src/lib/device-class.ts.
ALTER TABLE events ADD COLUMN IF NOT EXISTS device text;
