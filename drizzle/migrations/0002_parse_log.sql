CREATE TABLE IF NOT EXISTS "parse_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parse_log_userId_idx" ON "parse_log" USING btree ("user_id");
