CREATE TABLE "deploy_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"triggered_by" text,
	"trigger_reason" text,
	"vercel_response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"category" text,
	"provider" text,
	"grades" text,
	"duration" text,
	"paid" boolean DEFAULT false,
	"stipend" text,
	"location" text,
	"eligibility" text,
	"deadline" text,
	"url" text NOT NULL,
	"description" text,
	"last_verified" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" text NOT NULL,
	"deadline" text,
	"open_date" text,
	"audience" text,
	"url" text NOT NULL,
	"category" text,
	"last_verified" text,
	"region" text,
	"notes" text,
	"apply_via_guidance" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
