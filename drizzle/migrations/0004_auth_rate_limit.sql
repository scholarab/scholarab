CREATE TABLE IF NOT EXISTS "auth_rate_limit" (
  "id" serial PRIMARY KEY NOT NULL,
  "ip" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_rate_limit_ip_idx" ON "auth_rate_limit" USING btree ("ip");
