---
version: 1
slug: "src-pages-admin"
primary_target: "src/pages/admin"
related_targets: ["src/components/admin"]
---

# Admin panel (/admin)

Scope: /admin/scholarships, /admin/programs, /admin/analytics, /admin/login. Mode: Operate. One user (Ilia), laptop only, often late at night in Firefox. Tasks, all frequent: fix or update a listing, read analytics, add listings, review and publish drafts. Constraint: every current function stays (search, region and category filters, add, edit, delete, parse eligibility, drafts, review and publish, analytics tables, sign out). Phone only has to not break.

## Direction contract

THESIS: The admin is ScholarAB's own back office, not a SaaS template. It refuses the generic dark sidebar with teal pills, rounded cards and a big-number card grid. Your numbers ride on top of every page as one scoreboard strip, and the catalogue is worked underneath.

OWN-WORLD: Ink #0B140E ground, paper #EEF1EC text, the real plate logo (scholarab-logo-on-dark.svg), Big Shoulders for headings and every figure, Public Sans for UI text, logo green #4AA873 for the one primary action and focus, deep green #0A5632 for selected states. Hairline rules (paper at 12 percent), 3px corners like the logo plate, no pills, no cards, no shadows except the editor sheet. Status as words with a small square, never colored pills.

STORY: Ilia opens any admin page and sees this month's numbers against last month in one glance, then finds a listing by search or region, edits it in a side sheet, and publishes the drafts from the bar.

FIRST VIEWPORT: A 56px ink bar like the public header: plate logo at left, three tabs (Scholarships, Programs, Analytics), drafts count and Review and publish at right. Under it a full-width scoreboard strip: six figures in Big Shoulders 44px (views, applies, saves, quiz done, Google clicks, people on email), each with a small month label and the change on last month. Then the page title in Big Shoulders, search, region tabs as plain underlined text, and ruled listing rows with the deadline as a figure in the left column.

FORM: Scoreboard, position 7 on the ordered list, seed key b7309f30.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
