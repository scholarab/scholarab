-- Additive rollout. Existing catalogue rows and subscriber identities are retained.
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS public_id integer;
ALTER TABLE research_programs ADD COLUMN IF NOT EXISTS public_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS scholarships_public_id_unique ON scholarships(public_id);
CREATE UNIQUE INDEX IF NOT EXISTS research_programs_public_id_unique ON research_programs(public_id);

-- Public identity is explicitly (kind, public_id). Published JSON and edits are
-- separate, so a nightly mirror refresh cannot discard an editor's draft.
CREATE TABLE IF NOT EXISTS catalogue_entries (
  kind text NOT NULL CHECK (kind IN ('scholarship', 'program')),
  public_id integer NOT NULL CHECK (public_id > 0),
  published jsonb,
  draft jsonb,
  draft_base jsonb,
  deleted boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, public_id)
);
CREATE INDEX IF NOT EXISTS catalogue_updated_idx ON catalogue_entries(kind, updated_at DESC, public_id DESC);
CREATE TABLE IF NOT EXISTS publication_requests (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','committed','published','failed')),
  changes jsonb NOT NULL,
  message text,
  commit_sha text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS publication_one_pending ON publication_requests ((true)) WHERE status IN ('queued','processing','committed');

-- Claims limit recipients across Worker and scheduled sender processes.
CREATE TABLE IF NOT EXISTS confirmation_recipients (
  key text PRIMARY KEY,
  claimed_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
CREATE TABLE IF NOT EXISTS mail_deliveries (
  key text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('pending','sent','uncertain')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_deliveries_updated_idx ON mail_deliveries(updated_at);
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_name_unique ON catalogue_entries
  (kind, lower(btrim(coalesce(coalesce(draft,published)->>'title',coalesce(draft,published)->>'name'))))
  WHERE NOT deleted AND coalesce(draft,published) IS NOT NULL;
ALTER TABLE mail_deliveries ADD COLUMN IF NOT EXISTS subscription_id integer REFERENCES subscribers(id) ON DELETE CASCADE;
ALTER TABLE mail_deliveries ADD COLUMN IF NOT EXISTS kind text CHECK (kind IN ('confirm','reminder'));
