---
version: 1
slug: "src-pages-scholarships-facet-astro"
primary_target: "src/pages/scholarships/[facet].astro"
related_targets: ["src/components/sab/ScholarshipDirectory.astro"]
---

Scope: the scholarship city and scope hubs, decided on /scholarships/calgary/. Visitor mode: Operate.

Audience: an Alberta Grade 12 student on a phone in the evening with a deadline days away, who arrived from search rather than the homepage. Job: decide which of 159 awards are worth the effort, from the amount, the days left, and whether they qualify. Constraints: JSON is the build source of truth; React only on /match and /admin, so this is server-rendered HTML plus the existing vanilla directory controller; one fixed palette and no theme system; WCAG 2.2 AA; no ads, no account, no invented facts.

Unresolved: whether the world extends to /match and the guides, and whether the header dropdown's photo tiles survive it.

## Direction contract

THESIS: Alberta is graph paper from the air because one survey drew it, and this catalogue is already organised by that same geography: city hubs, county bursaries, school divisions. The hub is drawn as a survey sheet, so the grid is the data's own drawing system rather than a style laid over it. It refuses the cream card grid this category always ships and the stark mono table that is its predictable opposite.

OWN-WORLD: Deep ink ground #0E1411. Fine survey lines in #2FD3A0, the pinned brand green, promoted from accent to the page's ruling colour. Bone #E6E9E2 for prose, marginal grey #5E6B60 for survey annotation. One heavy off-centre meridian. Marginal range numbering in tiny letterspaced caps. A legend block instead of a filter panel. No rounded cards, no pills, no drop shadows, no photographs.

STORY: The student understands within one screen that this is a surveyed register of a specific place, believes it because the sheet shows its own upkeep, and acts by reading the amount and the days left off a fixed column.

FIRST VIEWPORT: Ink field ruled in green. Calgary in the top margin as a coordinate with its live count. The meridian runs off-centre down the page; everything registers to it. Awards plot as ruled entries, amount and days remaining at the same fixed column on every one. The legend block is the filter rail. Primary action is the award title; the whole entry is the target.

FORM: The Survey Grid, candidate 6 of my ordered grounded list, seed key 75c83193, re-roll round 1, steered to carry #2FD3A0. Raises: the grid measures rather than decorates (from the oscilloscope); one control restructures the whole field (from the cape); deadline proximity reads as a progression across the sheet (from the cyclorama); closed awards visibly deplete the sheet rather than silently vanishing (from the calendar pad).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
