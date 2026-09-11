-- Split "what the student pays" from "whether the student gets paid".
--
-- research_programs.paid means the student RECEIVES money. The detail page
-- rendered `paid ? 'Paid' : 'Free'`, so 115 of 129 programs announced
-- "THIS PROGRAM IS Free", at least 21 of which charge a fee (Med YSP ~$1,700,
-- Forum for Young Canadians $995, SHAD's published 2026 fees, and so on).
--
-- Default is 'unconfirmed', not 'free': a row nobody has checked must not be
-- able to claim there is no fee.
ALTER TABLE research_programs ADD COLUMN IF NOT EXISTS cost text DEFAULT 'unconfirmed';
ALTER TABLE research_programs ADD COLUMN IF NOT EXISTS cost_note text;
