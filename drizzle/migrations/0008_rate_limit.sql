CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "rate_limit_key_idx" ON "rate_limit" USING btree ("key");
