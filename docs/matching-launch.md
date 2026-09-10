# ScholarAB matching beta rollout

September 10, 2026. The user requested full implementation and previously deferred human testing. The new experience is now selected by default at `/match/`; setting `MATCHING_QUIZ_VARIANT=legacy` builds the previous quiz for rollback. This is a public beta with outstanding validation, not a declaration that every original five-phase gate passed.

## Delivered experience

- Three essentials, community suggestions with free entry/skip, exact homepage handoff, editable answers and optional source-supported refinement.
- Complete scholarship/program connection, explanations, uncertainty, availability, search, ordering, comparison, saves and links into existing application steps/calendar/reminders.
- Explicit opt-in for personal questions, one-hour session expiry and extension, storage-denial fallback, digest validation, retries and catalogue-change handling.
- Public beta copy. Existing listing grade/community values personalize discovery only. They never satisfy an unreviewed requirement or exclude a student. Program venues are not treated as residence requirements. Only explicit supported program grade labels become discovery hints; ages and complex prose remain uninterpreted.
- Listed closing-date ordering includes upcoming unverified dates as sorting hints, visibly labeled as unverified. It never changes availability to open. Past/absent dates sort after upcoming dates.
- Homepage choices replace an earlier matching session and use the canonical `/match/` URL. Session controls remain disabled until initialization, avoiding lost early interactions.
- Versioned aggregate milestones for essentials submitted, results shown, refinement, comparison and save/listing actions. The API rejects any extra fields on these events, including listing IDs, answers and metadata. Admin analytics names these separately from old quiz counts. Counts are deduplicated by event per tab session, not unique students or a person-level funnel.

## Catalogue and evidence

Read-only audit: 1,078 scholarships + 129 programs = 1,207 canonical published identities, aligned with the database; 1,215 legacy rows include eight explicitly archived identities; publication idle. Catalogue hash `5d868656ab7f0d70e6cb1b9e65828dd9cc86a63a035a9537900323bf01c80615`.

Every identity retains full source evidence. Small packs of at most 16 records share one SHA-256 digest, reducing initial random hash overhead. The loader verifies the digest, catalogue version and exact record identity; the build compares every packed record with its original normalized document. Individual version-1 evidence remains readable for rollback compatibility. No source status was upgraded and no database data was edited.

## Performance and beta adjustment

Cold local Chromium, 390x844, 4x CPU, Node gzip:

| Resource | Phase 4 | Beta |
|---|---:|---:|
| Initial catalogue | 128,457 bytes | approximately 88,500 bytes |
| HTML + catalogue | 138,507 bytes | approximately 98,700 bytes |
| JavaScript | 103,428 bytes | approximately 104,000 bytes |
| Total initial HTML/data/JS | 241,935 bytes | approximately 203,000 bytes |

The original approximately 101 KB HTML/data target is reached. CI now enforces 101,000 bytes for HTML/data and 110,000 bytes for JavaScript on the actual full-catalogue browser journey. The 82,390-byte JavaScript aspiration remains unmet; this release explicitly adjusts the beta ceiling to retain runtime validation and the existing React integration. This is a scope adjustment, not a claim of meeting the original JavaScript gate.

A local run with 150ms added latency, 1.6Mbps download, 750kbps upload and 4x CPU recorded essentials at 1,794ms, catalogue readiness at 3,846ms and submission-to-first-result at 156ms. This is a single lab run on the static server, not field INP, a p95 or certification on real mobile hardware. The original p95 recalculation target still needs a dedicated repeated benchmark; submission includes Playwright action/render overhead.

Further efficiency fixes reuse validated timezone names, memoize question discovery and eligibility profiles across session-only updates, and use a key map for card lookup instead of repeated catalogue scans.

## Validation and deliberately pending work

Unit coverage includes source-bounded judgments, unknown/interval/group semantics, complete-catalogue projection equivalence, discovery ordering without eligibility changes, packed-evidence identity checks and strict milestone privacy. Desktop/mobile browser coverage includes homepage navigation, keyboard/axe/reflow, evidence expansion, comparison, save handoff, session extension/expiry, load faults, storage denial, optional refinement and transfer budgets. The public site smoke suite also exercises the new default quiz.

A legacy build was compiled, served locally and confirmed to hydrate at Question 1; the default new build was restored afterward. Keep the legacy implementation for at least one stable release cycle.

Still pending:

1. Full-opportunity provider-source judgments and independent review of ambiguous interpretations. All 1,207 live eligibility scopes remain partial/unreviewed. The 155 source-bounded criterion judgments are not full-catalogue certification.
2. Two student usability rounds, explicitly deferred by the user; manual assistive-technology/browser-zoom checks and representative-device performance validation.
3. A designated-recipient live reminder email and controlled editorial publication exercise, when specifically arranged. Existing handoffs and automated lifecycle tests are available; no real emails or editorial publications were performed as tests.
4. A production observation window before legacy removal. Monitor aggregate events/errors through the existing admin and deployment tooling; no background monitoring automation or external notifications were created.

## Release and rollback operations

Normal deployment: commit/push the default build to `main`; confirm GitHub validate/e2e/matching-e2e and Cloudflare Pages succeed, then verify the public beta, all 1,207 core identities, an evidence pack and save/detail handoff with automated browser analytics suppressed.

Rollback: set the Cloudflare Pages production build variable `MATCHING_QUIZ_VARIANT=legacy` and redeploy the last known-good code, or revert the quiz default selection in a new commit. Retain additive data, public IDs, matching evidence and drafts. Confirm the old quiz hydrates and existing saved IDs remain available. Remove the override to resume the new experience after the defect is fixed.

Rollback triggers: incorrect hard-rule conclusions, personal-answer leakage, widespread catalogue loading failures, or broken saved-list compatibility. Source uncertainty itself remains visible in the beta and is not silently converted into eligibility.

## Local release results

1,146 unit tests across 53 files passed. All 18 adaptive desktop/mobile browser cases passed, including the transfer-budget checks. The public smoke suite passed 32 cases with two desktop-only layout checks intentionally skipped on mobile. Lint, Astro checks (206 files, zero diagnostics), script type-check, data validation and the complete build passed. The database remained aligned. Manual screenshot inspection confirmed the rendered results and explanatory copy; this does not substitute for assistive-technology or student testing.
