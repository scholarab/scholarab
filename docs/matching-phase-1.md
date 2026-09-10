# Matching rewrite: Phase 1 delivery

Implemented the complete-catalogue connection and data foundation. The existing public quiz continues to run its current engine; recommendation behavior changes belong to Phase 2 and the redesigned experience to Phase 3.

## What is connected

The generated manifest contains every published identity: **1,078 scholarships and 129 programs (1,207 total)**. Closed, future, undated, and incomplete-criteria listings are included. The build verifies exact identity sets and record/input hashes, checks the current quiz payload against that set, and verifies every generated detail page exists. Counts are computed from the catalogue on every build, never hardcoded as a limit.

A read-only, repeatable-read database audit accounted for **1,207 canonical records and 1,215 legacy rows**. All published content matched the repository snapshot, with zero unexplained drift. The eight unmatched historical scholarship rows remain explicitly archived in `src/data/matching-legacy-dispositions.json`. Archival preserves the prior publication boundary; it does not assert the provider's opportunity no longer exists. Restoring a row requires editorial source review and a canonical public identity.

Draft-only, published, pending deletion, and archived canonical states are distinguished. In-flight publication differences are reported separately from structural identity failures. CI runs the reconciliation after catalogue sync. Publication completion additionally verifies the live matching manifest against its expected version.

No live database rows were changed during this phase. Existing JSONB draft storage supports the additive matching fields; no SQL migration was required.

## Data and editorial tools

- `src/lib/matching/schema.ts`: versioned typed conditions, mandatory/preference/unknown classification, ALL/ANY groups, complete graph validation, evidence, coverage, and application-window contracts. Reviewed evidence requires an official source, excerpt, and exact verification date; reviewed age rules also require a reference date.
- `normalize.ts`: allowlisted public representation for both catalogue kinds, stable `(kind, public_id)` keys, explicit manual checks for legacy text and unsupported clues, and active/opening/deadline preservation. False/default legacy values never certify the absence of restrictions.
- `aliases.ts`: exact normalization of existing curated school-board labels/codes. Ambiguous or partial names stay unresolved; schools/institutions must acquire reviewed aliases rather than fuzzy guesses.
- `/admin/matching`: authenticated full-catalogue review queue, database/publication comparison, archive accounting, and revisioned draft preview. Editors can record sources, excerpts, dates, and requirement strength. Advanced condition/group/application-date editing uses validated JSON. Saves use the existing optimistic-locking and reviewed-publication workflow.

**Connection is complete; source verification is not.** All 1,207 imported opportunities are deliberately marked partial/unreviewed under the new contract. Their existing published content is preserved. This is a new evidence standard, not a claim that every listing was previously inaccurate. The editor must verify provider semantics before changing that status.

The public foundation asset is approximately 7.31 MB raw / 468 KB gzip because it includes source text and explicit review metadata. It is generated and published for validation and future integration, but **the current quiz does not download it**. Phase 2/3 must split and compact runtime rule data from lazily loaded evidence before connecting the new UI; the existing performance target still applies. Coverage must never be reduced to meet that budget.

## Baseline and evaluation inputs

The reproducible baseline is in `matching-phase-1-baseline.json`. With a local static build, Chromium at 390×844, 4× CPU throttle, a cold browser context, and no network throttle:

| Resource | Raw bytes | Node gzip bytes |
|---|---:|---:|
| Quiz HTML | 29,935 | 9,000 |
| Existing quiz data | 795,491 | 91,636 |
| Requested JavaScript modules | 246,907 | 82,390 |
| Total measured HTML/data/JS | 1,072,333 | 183,026 |

The initial question appeared in 613 ms in this single run. This is a reproducible starting observation, not p95, field interaction latency, or a bandwidth-constrained phone result. CSS, fonts, and images are outside the listed totals. Future JavaScript should stay at or below the measured 82,390-byte gzip baseline unless an explicit measured tradeoff is recorded; HTML plus initial matching data retain the approximately 101 KB gzip budget from the plan.

Thirty synthetic profiles cover all intended education stages, rural/unlisted communities, secondary-city eligibility, mark/age intervals, uncertain answers, and declined personal topics. `src/tests/fixtures/matching/README.md` records initial regression judgments and the separate source-review requirement. These are inputs and regression expectations, not the 100 independently provider-reviewed judgments required before final launch.

## Validation

- 909 tests passed across 47 files, including full-corpus normalization, every age-restricted record, duplicate/missing IDs, tampered content, group validation, exact aliases, archival accounting, draft conflicts, and field preservation through publication/sync.
- Astro check: 188 files, zero errors/warnings/hints. ESLint and scripts type checking passed.
- Full build validated 1,207 generated detail pages and all manifest/current-quiz connections.
- Desktop/mobile smoke suite: 32 passed, two pre-existing mobile skips.
- New admin browser smoke test used a local test credential and mocked APIs: editor loaded without browser errors, and a simulated HTTP 409 preserved unsaved evidence. No real draft or subscriber was modified by that test.
- Live database reconciliation: aligned, no drift. No emails were sent.

## Commands and handoff

```sh
npm run matching:generate
# DATABASE_URL must be loaded; this command runs SELECTs only:
npm run matching:audit-db
npm run matching:audit-db -- --details
npm run build
# In another terminal, serve the built dist directory locally:
python3 -m http.server 4322 -d dist
npm run matching:benchmark
```

Generated files live under `public/matching/`, `src/data/matching-manifest.json`, and `.cache/`; they are not committed. `manifest.json` references the content-addressed opportunity asset by `assetHash`. These are public listing fields only, with no credentials, subscriber records, internal editorial fields, or student answers.

Phase 2 can now implement rule evaluation and ordering against the shared contract. Keep legacy-unreviewed/manual requirements unresolved. Phase 3 connects the new UI after the rule engine and compact runtime assets are ready. Human source judgments, student recruitment, and live reminder tests remain later-phase work as specified in the plan.
