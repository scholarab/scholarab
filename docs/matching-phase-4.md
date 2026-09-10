# Phase 4: evaluation, accessibility and performance

Technical work implemented September 10, 2026. Phase 4 remains open; the adaptive quiz is still an isolated preview. The user explicitly deferred human testing. The production build continues to select the established quiz.

## Catalogue connection and source evaluation

The read-only database audit found 1,078 scholarships and 129 programs aligned with committed JSON: 1,207 canonical published identities, 1,215 legacy rows including eight explicitly archived identities, zero drift and an idle publication queue. Catalogue hash: `5d868656ab7f0d70e6cb1b9e65828dd9cc86a63a035a9537900323bf01c80615`. Build verification still checks exact identity sets, every evidence asset and digest, matching projection equivalence and detail routes. No database edits were needed.

The source-bounded reference set contains 155 authored judgments across 12 published identities and all 17 rule fields. Development and held-out sets are separated by provider. Official source URLs, dates, interpretations and expected outcomes are recorded under `src/tests/fixtures/matching/reviewed/`. Tests check criterion outcomes, conservative partial-scope eligibility and full/projection equivalence. TD closure checks retain its existing inactive state.

This is criterion-level coverage, not 155 fully reviewed opportunities or an independent human evaluation. Complex provider rules remain manual. All 1,207 live eligibility scopes still require source review; test fixtures do not upgrade published evidence. The required whole-opportunity release set and independent review of ambiguous interpretations remain open. See the fixture README for the initial unknown-board-alias finding and the precise boundaries of each interpretation.

## Fixes and browser coverage

- Free-text community answers are incomplete facts. A typo or unrecognized community cannot exclude a student.
- Categorical refinement uses listed choices and an explicit “None of these applies to me” action. Unknown and declined answers remain distinct. Empty possible-choice sets are rejected to avoid vacuous truth.
- Essentials remain disabled until hydration completes, preventing an early answer from being overwritten by initialization.
- Low-contrast trust text now meets the automated normal-text contrast check (WCAG 1.4.3).
- Students receive an expiry warning and can explicitly extend by one hour (WCAG 2.2.1). Ordinary activity does not extend the session. Expired answers clear; saved IDs remain separate.
- Desktop and 320px Chromium journeys cover keyboard activation/focus, comparison limits, axe WCAG 2 A/AA and 2.1 AA checks inside the matching region, responsive reflow, local-only answers, saved-page handoff, storage denial, teaser migration, catalogue changes, expiry, retries and digest rejection. Optional refinement/decline uses a clearly isolated synthetic reviewed fixture with a valid content digest.

The reflow test reduces the CSS viewport to represent browser zoom; it is not a manual browser-zoom or screen-reader assessment. Service workers are blocked in this fault-injection suite so intercepted responses cannot be masked by the worker cache. This suite does not certify offline/service-worker behavior. Automated axe results do not establish complete accessibility conformance. Manual assistive-technology checks and student comprehension remain pending.

## Payload and responsiveness

Unreviewed conditions now use an explicit unresolved projection; complete original evidence remains available on demand. Reviewed conditions and excerpts remain intact. Version 2 wire encoding shares repeated matching templates, then clones them on decode so records cannot mutate each other. Version 1 parsing remains compatible. All public identities, rule identities, statuses, dates, source links and evidence digests are retained.

Measured on the local adaptive static build at 390 by 844, cold Chromium, 4x CPU throttling, no network throttling:

| Metric | Phase 3 | Phase 4 |
|---|---:|---:|
| Catalogue core, gzip bytes | 213,526 | 128,457 |
| Requested JavaScript, gzip bytes | 102,869 | 103,428 |
| HTML + catalogue, gzip bytes | 223,504 | 138,507 |
| Total measured HTML/data/JS, gzip bytes | 326,373 | 241,935 |
| Initial essentials heading | 432 ms | 293 ms |
| Complete catalogue ready | not recorded | 908 ms |
| Submit to first result | not recorded | 124 ms |

The core is 40% smaller and total measured transfer is 26% smaller. These are one local run, not field INP, a network-throttled mobile result or a percentile. The ~101 KB HTML/data and 82,390-byte JavaScript budgets are still missed. Further runtime-validation bundle and catalogue representation work is required before cutover. No records were omitted to improve the measurements.

## Open release gates

1. Complete whole-opportunity provider-reviewed reference judgments and independently review ambiguous interpretations; do not treat the criterion fixtures as that gate.
2. Reach the agreed transfer budgets and validate responsiveness on throttled networks and representative devices.
3. Run manual browser zoom and assistive-technology checks.
4. Run two student usability rounds of 5–8 participants after the user resumes human testing. `docs/matching-usability-sessions.md` contains tasks and an anonymous recording template. No participants have been contacted.
5. Only after those gates, use Phase 5 for production rollout and retirement of the old quiz.

The new adaptive browser suite is included in CI alongside the existing production suite. No public cutover, reminder submission or draft publication is part of this change.

## Technical verification

1,120 unit tests across 52 files passed, including all 155 source-bounded judgments. All 14 desktop/mobile adaptive browser tests passed. Data validation, lint, Astro checks (205 files, zero diagnostics), script type-check and both adaptive/default builds passed. Build verification retained all 1,207 identities and complete evidence assets. The normal production quiz remains selected.
