# Matching unification

Do not change `MATCHING_QUIZ_VARIANT` or the production default without explicit user approval. Keep both matching files and the admin panel. Only a human may promote proposed provider evidence to reviewed. Unknown answers and unverified evidence must never exclude a student.

## Ordered delivery

1. Use the shared scholarship status in matching; commit and push before step 2.
2. Add the school counsellor outcome for `applyViaGuidance` scholarships.
3. Add field evidence, distinguish quotations from summaries, and enforce no quote, no gate.
4. Classify every legacy disqualifier with a written rationale.
5. Reuse legacy confidence signals inside the evidence-aware engine, with zero false exclusions in CI.
6. Prepare the top 50 detail records by 90-day Search Console impressions for human evidence approval.

Steps are independently committed and pushed. Evidence awaiting human review stays partial; completing engineering does not certify provider criteria or substitute for student testing.

## Status audit, 2026-09-10

The quiz now calls `scholarshipStatusOf` for scholarships, using the same active flag, opening date and deadline as the site. A past deadline is closed; inactive records without a past deadline are future, with no invented opening date. Programs keep their separate retirement policy. An active listing alone cannot establish an open application window.

The 10 TD availability fixtures now expect the shared future state, rather than the quiz's former closed state. This is not a claim that TD will reopen: the record remains inactive and no next opening is confirmed. Unknown availability and future/closed listing status are separate from student eligibility.

The expiration job runs at 00:00 UTC in `.github/workflows/ci.yml`, as well as on pushes. `auto-expire.ts` edits JSON; CI validates, mirrors JSON to the admin DB, builds matching assets and pushes data changes. Cloudflare rebuilds the catalogue on that data commit. The public build reads repository JSON, never DB drafts. There is no separate DB-only expiration path. The job already requires a valid current/future deadline before reopening an inactive scholarship, so a stale opening date cannot revive TD or other inactive undated records.

A remaining publication risk is the DB sync occurring before tests, build and push. If a later step fails, the admin mirror may temporarily run ahead of Git. Move the mirror after a validated successful data push and check repository freshness. This is separate from the immediate status fix.

## Homepage audit of 19260ec

The 59 changed diff lines were 28 additions and 31 deletions in the quiz teaser and its handoff. The change replaced grade/region/interests with intent/stage/community, added postsecondary and uncertain options, cleared an old adaptive session after explicit teaser submission, stored the three essentials, and navigated to `/match/`. The adaptive quiz became responsible for its versioned start event. These changes let the homepage populate the new quiz's actual essentials.

The commit did not change hero content, listing counts, SEO metadata, closing-soon logic, layout or CSS. Existing smoke tests cover homepage content, and adaptive journey tests cover the teaser handoff. The unconditional handoff needs a legacy-variant regression: legacy does not offer the uncertain values and can miss its start event when entering at step 3. Keep any fix limited to the teaser, with the production variant unchanged.

## Deferred human validation

The user has kept human testing pending. Two real Grade 12 students should complete the quiz while observed, including explaining what uncertainty means to them and locating the next action for a school-managed award. No invitation or email to students or counsellors is authorized by this brief.

## School-managed outcome

All 542 `applyViaGuidance` scholarships receive `school_decides` rather than a student eligibility verdict. They remain connected to their detail pages, evidence and saved list. The card directs the student to their counsellor without presenting ranking confidence, and these records do not generate follow-up questions. Source-rule tests still test each individual condition, while whole-record judgments respect the school's decision process.

## Evidence boundary

Each of the 17 structured eligibility fields can now carry its own value, gate/signal tier, quotation, summary, source URL, verification date, and review status. Provider-specific question keys, qualification bases and age reference dates are explicit. A proposed gate can stay partial while a human reviews it. A reviewed individual field can establish a failed requirement even when the rest of the record remains partial; reviewing one field does not certify the entire listing.

`validate-data` rejects declared field gates without a quotation, source URL or verification date. It also rejects reviewed automatic mandatory matching rules without those items. Runtime parsing accepts older structurally valid assets but treats missing quotes as unreviewed; an old `excerpt` is converted only to `summary`. Result cards show the provider quotation for verified exclusions. Optional questions cannot be activated by a paraphrase.

Evidence becomes unusable after an explicit `expiresOn`, or after the 365-day review cap, whichever comes first. The cap is a maximum review interval, not an assertion that every provider has an annual cycle. Authors must enter an earlier expiration for a shorter known cycle. Future verification dates are unusable. Stale field values remain available as discovery signals when the two-tier ranking is connected in step 5.

The two previously published matching documents were automatically authored from paraphrases. Their prose is now explicitly a summary, their evidence is partial, and their quotes are empty. This removes automatic eligibility/window claims until a human approves exact provider evidence. It preserves both records, their individual conditions and manual checks. The separate reference tests simulate approval only within tests; they do not certify production records.

Three unsupported `genderRequired: "male"` values were cleared to null: Ryan Burak Memorial Award (446), Scarborough Trophy (864), and Johnathan Doody Memorial Scholarship (885). Their other criteria and narrative text are retained. The schema now accepts only `female` or null, as required; null does not prove an absence of provider restrictions.

## CI repair before step 3

Both 610f897 and d62871e failed the first opt-in fixture assertion, before any decline. The fixture mixed its single synthetic personal rule with two newly published, nonpersonal Breakthrough age rules. The old availability function and the corrected shared-status function produced the same two candidates. The isolation assumption was wrong; declining did not cause a loop.

ffa6b08 preserves both original disabled assertions, controls the fixture's policy rules, and adds a mixed-question regression. That regression proves a declined personal question does not repeat while an unrelated school question remains available, then verifies no questions remain after both are declined and the page reloads. All 20 matching browser tests, public browser tests, validation and Cloudflare passed before step 3 resumed.

## Generated evidence budget

The measured baseline is 79 generated files and 16,861,527 bytes, including 76 evidence packs. The largest pack is 131,100 bytes. Build limits are 128 files, 24 MiB total generated matching output, and 256 KiB per evidence pack. Both generation and deployed-output verification check the exact expected file inventory, including stale files. Exceeding a limit fails the build; no record or evidence is truncated to fit. Initial transfer budgets remain separate and unchanged.
