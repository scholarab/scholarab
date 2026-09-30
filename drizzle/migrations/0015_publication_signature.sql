-- HMAC over (id, changes) made by the admin API with PUBLICATION_SIGNING_KEY,
-- which the database never holds. publish-drafts.ts refuses a request whose
-- signature does not verify, so write access to this table alone can no longer
-- publish to the live site. See src/lib/publication-signature.ts.
ALTER TABLE publication_requests ADD COLUMN IF NOT EXISTS signature text;
