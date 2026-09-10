# Phase 3: adaptive student experience

Implemented September 10, 2026. This is an integrated preview, not the Phase 5 production cutover.

## Run and rollout

`MATCHING_QUIZ_VARIANT=adaptive npm run build` builds the new experience at the existing `/match/` route. Serve `dist` for an isolated static preview. `MATCHING_QUIZ_VARIANT=adaptive npm run dev` also selects it locally. The normal build retains the established quiz. No public alternate quiz route or answer-bearing query parameters were added.

Do not enable the production variant until Phase 4 source review, usability, accessibility and performance gates are addressed. The current catalogue has 1,078 scholarships and 129 programs; all 1,207 are connected, but all eligibility scopes still need source review. No provider evidence was fabricated or promoted to reviewed.

## Student journey

- Three essentials: intent, current education stage, community, with explicit unknown/skip choices for the latter two. Essentials work while catalogue data loads.
- Results start at five, with every listing accessible through paging, title search, kind selection through Edit answers, sorting and an inspectable known-ineligible group. Eligibility and availability remain separate.
- Optional questions come only from supported unresolved checks on plausible, non-closed opportunities. Dates and qualification bases are displayed. Each answer returns to results, below the three-consecutive-question ceiling. A topic is attempted only once unless the student explicitly removes its answer or changes essentials. Personal topics require opt-in; declining suppresses repetition. Precise family income is not collected.
- Essential changes invalidate dependent optional answers. The summary allows optional-answer removal and re-answering. Numeric answers use exact values, with uncertain/declined/not-applicable alternatives; imported legacy numeric approximations are discarded.
- Requirement panels show every check, source status, date and complete listing/source evidence on demand. Legacy notes are distinguished from reviewed quotations.
- Compare up to three listings, including amount, eligibility, timing, unresolved checks and next action.
- Save uses existing numeric scholarship/program IDs and existing trackers. Saved applications provide the existing application checklist and calendar export; listing pages provide available reminder/application options. No duplicate application-state store or subscription submission was introduced.
- Native forms, labels, keyboard controls, focus transfer, responsive single-column layouts, loading/retry states, empty views and directory links without JavaScript are included.

## Privacy

Versioned answers live in memory/sessionStorage with a fixed one-hour expiry, cleared on timer, focus/reactivation or interaction after expiration. No rolling extension. Ending answers keeps saved IDs separate. Catalogue-version changes invalidate stored answers. Legacy teaser intent/grade/community migrate only within their original TTL; numeric approximations and institution plans are not silently reinterpreted. Storage denial keeps the current page usable.

No profile, personal-question identifier or answer is sent to a URL, server or analytics endpoint. Network requests load static catalogue assets, and source details only on expansion. Existing listing/Save navigation retains its established behavior. The privacy page documents the preview explicitly.

## Data connection and efficiency

The generator writes a hashed evaluation projection plus one content-addressed evidence file per published identity. It retains every rule, condition, source status, date, group and identity. Full prose/manual text is lazy; the projection retains only evidence-presence characters and a manual-text character for validation. These are internal evaluation fields and never rendered as quotations. Complete source text is fetched for display.

The build verifies exact identity sets, projection equality, every evidence digest and its complete original content, catalogue versions and all detail routes. The client verifies SHA-256 before parsing fetched assets. Full-catalogue tests compare projected and complete engine outputs, with additional reviewed synthetic-rule cases.

Initial core is 213,526 bytes gzip versus 468,149 for the complete foundation evidence asset, a 54% reduction. This still exceeds the planned ~101 KB HTML/data budget. This is an explicit Phase 4 release gap, not a claimed pass. It includes all 1,207 records and their evidence hashes; no cap was introduced to improve measurements.

The UI compiles the engine once per catalogue and reassesses on profile/sort changes or clock-minute changes. Evidence fetches have a synchronous in-flight guard. An ordering bug found during browser review was fixed: unreviewed listings no longer rise simply because they record fewer requirements. Numeric public ID breaks otherwise equal best-fit ties, avoiding a lexical block of programs ahead of scholarships.

## Verification and next gates

Automated tests cover corpus equivalence, version/identity rejection, useful follow-ups, opt-in/declines, teaser migration, fixed expiry, qualified answers, complete paging, compare limits, loading retry, evidence laziness, ending answers and preserved saves. Browser inspection checks the real 1,207-record journey and evidence expansion on the isolated build.

Phase 4 still requires provider-reviewed judgments, participant usability rounds, device/keyboard/zoom/accessibility review, cold-mobile performance measurements and further asset/bundle optimization. The preview is not a substitute for those external/source validation gates. Phase 5 controls production rollout and retirement of the old quiz.

Measured isolated adaptive build: 432 ms to the initial essentials heading on localhost with Chromium at 390×844 and 4× CPU throttling. This measures initial form readiness, not full assessment readiness. Requested JavaScript was 102,869 bytes gzip, above the 82,390-byte baseline; HTML/data plus JS totaled 326,373 bytes gzip. No network throttling was applied. These results justify retaining the preview gate; reducing the runtime validation bundle and evaluation encoding remains necessary before production cutover.

Validation: 963 tests across 51 files; lint, Astro checks (202 files), script type-check and adaptive build passed. Build verification includes all 1,207 source assets. Browser inspection confirmed essentials, full catalogue results and lazy evidence. The default production variant is also built before delivery.
