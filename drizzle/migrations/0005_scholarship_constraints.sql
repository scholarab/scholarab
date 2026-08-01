CREATE UNIQUE INDEX IF NOT EXISTS "scholarships_title_unique" ON "scholarships" ("title");
CREATE INDEX IF NOT EXISTS "scholarships_active_idx" ON "scholarships" USING btree ("active");
CREATE INDEX IF NOT EXISTS "scholarships_region_idx" ON "scholarships" USING btree ("region");
CREATE INDEX IF NOT EXISTS "scholarships_category_idx" ON "scholarships" USING btree ("category");
CREATE INDEX IF NOT EXISTS "research_programs_active_idx" ON "research_programs" USING btree ("active");
CREATE INDEX IF NOT EXISTS "research_programs_category_idx" ON "research_programs" USING btree ("category");
