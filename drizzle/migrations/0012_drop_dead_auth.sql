-- Drops the tables left behind by better-auth and by the two superseded
-- rate limiters. Nothing in src/ has referenced any of them since the auth
-- library was replaced with the 30-line HMAC cookie in lib/adminAuth.ts.
--
-- This is a security fix, not tidying: `account` still held a live pbkdf2
-- password hash minted 2026-04-04, and `user` the admin address it belonged
-- to. Unreachable by the app, but a credential is a credential; anything
-- that reads this database (a leaked DATABASE_URL, a Neon branch handed to a
-- tool) got an offline-crackable hash for free. All 11 `session` rows had
-- expired by 2026-04-16, so nothing is signed out by this.
--
-- Contents backed up outside the repo before dropping (2026-08-22).
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS "user";

-- Superseded by rate_limit_counter (0011). Row-per-hit tables, unread since.
DROP TABLE IF EXISTS "auth_rate_limit";
DROP TABLE IF EXISTS "rate_limit";
