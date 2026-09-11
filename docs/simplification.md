# ScholarAB simplification record

This pass follows the removal of the adaptive quiz in PR #23. The public catalogue, copy, design, layouts, fonts, and legacy quiz remain requirements. The goal is less machinery and work, not a smaller catalogue or fewer tests for retained behavior. A 50% cut in every individual metric is not established by this pass.

## 1. Requirements challenged

| Area | Outcome that justifies keeping it | Decision |
| --- | --- | --- |
| Scholarships, programs, guides, reference data | Students retain the same information and URLs | Preserve authored JSON and public templates. |
| Legacy quiz, saved items, tracker | Keep the existing student journeys | Preserve behavior and browser coverage. Remove the remaining adaptive baseline artifact. |
| Fonts, layouts, social image content | Explicit visual preservation requirement | Preserve font files, card layout and image pixels; avoid loading renderers on a warm cache. |
| Admin drafts, publication queue, JSON mirror | Drafts must not leak into public pages; queued and partially completed publications must recover | Keep the queue and its schedule; skip the full environment setup only after an explicit empty result. |
| AI eligibility parsing | Admin convenience with validation and a spending limit | Keep the model, prompt, authentication, hourly cap and strict output validation. Replace the general SDK with the one HTTP operation used. |
| Email subscriptions and reminders | Retain consent, unsubscribe and delivery behavior | Keep the existing process. Existing local reminder edits are outside this change. |
| Analytics and retention | Maintain existing privacy and operational rules | Keep first-party events, consent behavior and data pruning. Do not add services. |
| Search Console, sitemap, IndexNow | Inspect coverage and announce published changes | Keep existing credentials/scripts. Replace date-only deployment detection and excessive polling. |
| Link checking | Detect broken destinations for every listing | Check each distinct URL once and report every affected listing. Temporary DNS resolution errors remain suspect, not confirmed broken. |
| Social assets, copy checks, outreach checks | Existing publishing and maintenance capabilities | Retain; there is no evidence that removing their output is authorized by the public-content constraint. |
| Validation and release checks | Catch data, script, template and browser regressions before shipping | Keep coverage; remove the duplicate CI command list and repair the checklist paths and redirect check. |

## 2. Delete first; restore requirements demonstrated by experiments

The ten removal candidates below are counted as parts/processes, not individual files or lines. Two were removed in isolated experiments and restored because they failed retained behavior: **2/10 = 20% add-back**. No public site was intentionally broken to reach this number.

| Candidate | Final decision | Evidence |
| --- | --- | --- |
| Adaptive matching baseline report | Delete | Its feature and consumers were already removed in PR #23. |
| Deployment-hook configuration | Delete | Only unused environment declarations remained; publication uses the queue. |
| General Anthropic SDK | Replace | Only one Messages API call was used; transport contract and existing endpoint tests cover the replacement. Six installed packages removed. |
| Repeated checks of identical listing URLs | Delete | 1,188 eligible listing requests refer to 639 unique URLs after host exclusions. Grouping keeps all listing identities. |
| Empty publisher's install and cache setup | Delete | A dependency-free, read-only precheck gates all expensive steps. It includes queued, processing and committed requests. An unknown result fails visibly, never masquerades as an empty queue. |
| Separate local/hosted validation lists | Delete | Both use `npm run ci`; Astro template checks now run alongside script checks. |
| Forty-poll sitemap-date deployment loop | Replace | The script checks catalogue identity and exact sitemap, at most three times; HTTP calls have deadlines. |
| Warm OG cache's eager rendering-engine load | Delete | Dynamic imports occur only on a cache miss. Image layout, fonts and encoder are preserved. |
| AI transport retry behavior | Restore | In the removal experiment, a transient reset followed by a valid response failed the retained success requirement. Keep at most three attempts, each capped at 30 seconds. |
| Deployment identity safeguard | Restore | In the removal experiment, an old catalogue with the same-day sitemap was accepted. Keep both catalogue-hash and sitemap equality checks. |

The isolated removal variants and verification logs were recorded under `/tmp/scholarab-six-rules/`. The shipped regression tests reproduce the retained requirements in `src/tests/maintenance.test.ts`.

## 3. Three attempts, then change the approach

| Operation | Bound / response to failure |
| --- | --- |
| AI transport | At most three attempts for transient transport/408/409/429/5xx errors; permanent failures stop immediately. Each request times out after 30 seconds. No private response body or credential is logged. |
| Publication precheck | At most three attempts with 15-second request deadlines. An exhausted check fails the workflow; the existing schedule supplies the next opportunity. It never abandons a pending publication. |
| IndexNow readiness | Three checks with 30/60-second waits and 15-second HTTP deadlines. Failure is visible and the optional CI step does not block publishing. Rerun after deployment to recover a missed announcement. |
| External links | Existing three-attempt limit retained. Remove repeated checks of the same URL instead of adding more retries. |
| Development repairs | Track failures against the same problem. After three unsuccessful fixes, replace/remove/modify that approach; do not keep rerunning it unchanged. The two failed deletion probes above were each abandoned after one demonstrated regression. The isolated verification checkout failed once with shared, symlinked dependencies; that setup was replaced by a clean lockfile install instead of repeating it. |

This bounds one invocation. The scheduled publisher remains recurring because publication reconciliation is a retained requirement, not a disposable retry loop. No queued work is discarded to satisfy an attempt quota.

## 4–6. Simplify, measure, then automate

The minimal transport, unique-URL grouping and queue check were implemented and tested before updating workflows. The six rules now live in root `AGENTS.md`, and the ship-check skill requires this evidence record for future reductions.

| Metric | Before | After / interpretation |
| --- | --- | --- |
| Eligible link probes before retries | 1,188 | 639: **46.2% less network work**, with every listing retained. |
| Tracked repository files | 299 | 305; small replacement modules, regression tests and the decision record add files. |
| Tracked `src/` + `scripts/` physical code lines | 33,390 | 33,626 (+236), including tests and bounded replacement transports. This pass does not reduce this metric. |
| Direct runtime dependencies | 12 | 11; SDK removal also removes five transitive packages. |
| SDK allocated local size | 8,996 KiB | Removed, plus its exclusive dependencies. This is local disk usage, not browser transfer weight. |
| Empty publisher full installs | One per invocation | Zero after an explicit empty-queue response. A sampled previous run spent 17 seconds installing 666 packages. Hosted savings for the new branch remain unmeasured. |
| IndexNow readiness polling | Up to 40 checks, ten minutes of waits, unbounded individual curl calls | At most 3 checks; 90 seconds of waits plus bounded requests (about 135 seconds maximum readiness work). |
| Warm OG generator, one local sample | 0.43 seconds | 0.31 seconds; small local timing, not a hosted benchmark. |
| Local/hosted check definitions | Two lists to keep synchronized | One `npm run ci` definition. Astro checking adds useful coverage; a shorter verification time is not claimed. |
| Public content and presentation | Existing site and legacy quiz | Protected-file fingerprints and browser verification must remain unchanged/passing. |

Do not treat fewer dependency files, cache cleanup, reduced request counts, source lines and page download size as interchangeable percentages. Test and evidence code can grow while operational work shrinks.

## Verification

Validation of the isolated committed code passed: lint, all 911 unit tests in 46 files, data validation, production build, Astro checks (zero errors/warnings/hints), and script type checks. The new maintenance regression file passes all 14 tests. Browser checks passed 34 tests with two existing mobile skips. All 1,279 HTML pages remain. All 72 protected authored-data, public-template/component/style and font files match their pre-change SHA-256 fingerprints; unrelated reminder edits also match their saved originals. Workflow YAML parses successfully. No database mutation, paid AI request, IndexNow submission or production deployment is needed to validate this pass. The only live database probe is the read-only queue existence check.

Protocol references: [Claude API overview](https://platform.claude.com/docs/en/api/overview) and the installed `@neondatabase/serverless` 1.0.2 HTTP implementation. The precheck uses the same Neon endpoint, headers and boolean representation, and has been exercised with the existing connection without exposing credentials.
