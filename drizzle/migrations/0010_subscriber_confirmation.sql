-- Double opt-in for deadline reminders.
--
-- /api/alert is a public JSON endpoint: anyone could POST any well-formed
-- address and start ScholarAB mailing a person who never asked. CASL wants
-- consent you can demonstrate, and "our own form posted it" is not that when
-- the endpoint is open to anything that can send JSON.
--
-- confirmed_at    when the subscriber clicked the confirm button (not merely
--                 when a mail scanner fetched the link; confirming is a POST)
-- confirm_sent_at when the confirmation email went out, so the daily job does
--                 not re-send it every morning to someone who is ignoring it
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirmed_at    timestamptz;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirm_sent_at timestamptz;

-- Existing rows are grandfathered as confirmed. They were all typed into the
-- reminder form on a listing page by someone asking to be reminded about that
-- listing, which is the consent this column exists to record. Marking them
-- unconfirmed instead would silently stop reminders for students who did opt
-- in, to protect against a hole that closes here anyway.
UPDATE subscribers SET confirmed_at = created_at WHERE confirmed_at IS NULL;

-- Unconfirmed rows are swept by the daily job; this is what it scans on.
CREATE INDEX IF NOT EXISTS subscribers_unconfirmed_idx
  ON subscribers (confirmed_at) WHERE confirmed_at IS NULL;
