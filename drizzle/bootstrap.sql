-- Current baseline for EMPTY databases only. Historic auth migrations are not
-- replayed: they predate manually-created subscribers/events and were retired.
CREATE TABLE scholarships (
 id serial PRIMARY KEY,title text NOT NULL,amount text NOT NULL,deadline text,open_date text,audience text,url text NOT NULL,
 category text,last_verified text,region text,notes text,apply_via_guidance boolean DEFAULT false,active boolean DEFAULT true,
 eligibility jsonb,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX scholarships_title_unique ON scholarships(title);
CREATE INDEX scholarships_active_idx ON scholarships(active);
CREATE INDEX scholarships_region_idx ON scholarships(region);
CREATE INDEX scholarships_category_idx ON scholarships(category);
CREATE TABLE research_programs (
 id serial PRIMARY KEY,name text NOT NULL,emoji text,category text,provider text,grades text,duration text,paid boolean DEFAULT false,
 stipend text,location text,eligibility text,deadline text,url text NOT NULL,description text,last_verified text,
 active boolean NOT NULL DEFAULT true,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now()
);
CREATE INDEX research_programs_active_idx ON research_programs(active);
CREATE INDEX research_programs_category_idx ON research_programs(category);
CREATE TABLE subscribers (
 id serial PRIMARY KEY,email text NOT NULL,item_type text NOT NULL DEFAULT 'scholarship',item_id integer NOT NULL,token text NOT NULL,
 cadence text NOT NULL DEFAULT '30,14,3',confirmed_at timestamptz,confirm_sent_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscribers_email_item_unique ON subscribers(email,item_type,item_id);
CREATE UNIQUE INDEX subscribers_token_unique ON subscribers(token);
CREATE INDEX subscribers_item_idx ON subscribers(item_type,item_id);
CREATE INDEX subscribers_unconfirmed_idx ON subscribers(confirmed_at) WHERE confirmed_at IS NULL;
CREATE TABLE events (id serial PRIMARY KEY,ts timestamp NOT NULL DEFAULT now(),event text NOT NULL,item_type text,item_id integer,meta text);
CREATE INDEX events_event_ts_idx ON events(event,ts);
CREATE TABLE parse_log (id serial PRIMARY KEY,user_id text NOT NULL,created_at timestamp NOT NULL DEFAULT now());
CREATE INDEX "parse_log_userId_idx" ON parse_log(user_id);
CREATE TABLE rate_limit_counter (key text NOT NULL,window_start timestamp NOT NULL,hits integer NOT NULL DEFAULT 0,PRIMARY KEY(key,window_start));
CREATE INDEX rate_limit_counter_window_idx ON rate_limit_counter(window_start);
