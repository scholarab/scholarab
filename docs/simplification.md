# ScholarAB simplification record

## First implemented cuts — September 12, 2026 UTC

This implementation follows the deep audit below, on an isolated branch from `41abc6a`. The shared checkout's reminder changes and desktop audit were left untouched. [Measured build evidence](audit-evidence/first-cuts-2026-09-12.json) records the baseline revision and the exact comparison scope.

### 1. Requirements and student outcomes

| Requirement challenged | Retained outcome | Unnecessary work removed |
| --- | --- | --- |
| Full editorial records in runtime reminder and analytics lookups | Reminders resolve every published ID with its exact label, availability and deadline; analytics names the same records. Drafts stay separate. | Runtime imports of the complete catalogue and its loader. |
| Several analytics initialization functions | Count each consenting visitor's page once and honor a later denial. | Duplicate initial calls and overlapping consent/event paths. |
| Wait for every host in an eight-host batch | Check every distinct URL without concurrent requests to one provider. | The global batch barrier; free slots start the next host immediately. |

### 2. Remove first and record add-backs

The compact catalogue prototype and analytics deletion probe survived the deep audit's retained-behavior checks; this pass integrates them into the real build lifecycle and browser behavior. The host queue removes a scheduling dependency while retaining the same URLs, exclusions, request spacing, retry limit and reports. No public listing, copy, layout, font, saved ID, quiz field, retention operation or publication reconciliation was removed.

The audit experiment pool remains **3 required restorations / 8 attempted removals = 37.5% add-back**. These three implementation cuts needed **0 additional restorations / 3 cuts**; that separate ratio is 0%, not a new claim of meeting the target. Do not invent regressions or count added tests as restored parts. The already demonstrated offline-directory, dependency-compatibility and image-size regressions justify the audit's retained components.

### 3. Repair attempts and final failure behavior

No product repair failed three times in this pass. The first public-output comparison rejected `_routes.json`; inspection proved that only the order of its 38 exclusion entries changed. The revised comparison requires the entire parsed object to match after sorting that one list. It still requires exact HTML bytes after normalizing only the intended analytics asset filename. This is a corrected measurement assumption, not a restored product requirement.

Catalogue generation rejects invalid/truncated inputs before writing generated payloads. Existing publication request identity and the full-catalogue hash remain intact. Link requests retain the existing maximum of three attempts, timeouts and visible final verdicts. Optional-service failure never removes student content.

### 4. Simplify surviving implementations

One generator reads and validates the JSON authority, writes the unchanged legacy quiz shape plus the four-field runtime projection, and stamps the existing publication marker. Build/dev/type-check/test entry points generate these ignored files, including in a clean checkout. One host-worker loop replaces fixed batches. One analytics consent transition handles both navigation and the banner; a previous grant can be disabled without a reload.

### 5. Measure the reduction

| Metric | Before | After | Evidence and limits |
| --- | --- | --- | --- |
| Local Worker output, raw file bytes | 3,827,517 | 2,093,888 | **45.29% smaller**, measured from two production builds on the same revision. Not a request-latency or hosting-cost claim. |
| Initial page-view commands for returning consent | 3 | 1 | **66.67% fewer**. Baseline component model; replacement verified against the built site on desktop and mobile with Google requests intercepted. |
| Link-check completion model, 1 s per request | 398.2 s | 163.0 s | **59.07% shorter projected cycle**, with all 693 eligible unique URLs retained. At 0.25 s and 5 s assumptions, reductions are 56.74% and 60.42%. Real network and hosted timing remain unmeasured. |
| Public output files | 2,549 | 2,549 | 1,213 byte-identical files; 1,334 HTML files differ only in the analytics script fingerprint; one script replaced; routing exclusions identical except ordering. Quiz assets, content, styles, fonts and images remain identical. |
| Published identities | 1,134 scholarships + 129 programs | Same | Projection equality checked for every record. No data deletion. |

The baseline warm local build took 11.48 s; the changed build passed, but no controlled whole-build speedup is claimed. Source/test/documentation lines grow in this pass. A 50% reduction in every metric has not been achieved.

### 6. Automate only what survived

Existing `npm run ci` and browser checks remain the release gates. Added checks cover generated catalogue equality and rejection of truncated input, host concurrency/refill/final failure, and real compiled consent/navigation behavior. No new scheduled job, connector or service was added. Google documents the [tag disable flag](https://developers.google.com/tag-platform/security/guides/privacy) and [consent updates](https://developers.google.com/tag-platform/security/guides/consent); local checks verify the commands and disable state, not Google's internal delivery.

Focused verification passes: 44 unit tests in three files and four desktop/mobile analytics checks. `npm run ship-check -- origin/main` reported `CHANGED 19 file(s)`, `RUN npm run ci` and `RUN npm run test:e2e`, with no FAIL lines. Both required commands pass: lint, **919 unit tests in 47 files**, full catalogue validation/build, Astro checks (184 files, zero errors/warnings; three hints in the historical probe script), scripts type checks, and **38 browser tests with two existing mobile skips**. Browser tests used an isolated local server (`CI=1`); no production API or GA collection traffic was sent by the new tests. Existing adapter deprecation/build warnings remain documented audit findings. This evidence validates the branch locally; it does not claim a main-branch merge or a production deployment.

## Deep reduction audit — September 12, 2026 UTC (isolated prototypes)

The [deep audit](deep-reduction-audit-2026-09-12.md) examines commit `c2d93ad`, with [durable measurements](audit-evidence/reduction-2026-09-12.json). The shared repository advanced during inspection; implementation must be verified against its eventual release revision. This pass adds audit evidence only. It does not alter deployed code, public content/design/fonts, the legacy quiz, live records, or scheduled processes. Existing local reminder edits and prior audit notes remain intact.

**Retained outcomes:** students keep all opportunities and saved identities, exact public presentation, offline directory behavior, private quiz answers, correct availability, consent/unsubscribe, retention promises, and publication reconciliation. Smaller representations and fewer setup/duplicate operations serve those outcomes; a universal percentage is not permission to weaken them.

Eight deletion experiments were attempted on the isolated baseline. **Three required restoration: 3/8 = 37.5% add-back within these experiments.** This is not a count of deployed deletions. Quiz pooling was also deferred for poor compressed savings, but is not counted as a failed-behavior restoration. The link scheduling model is a projection and is not included in this experiment denominator.

| Removal candidate | Experiment result / decision |
| --- | --- |
| All unselected Saved-page cards | Shell plus four unchanged fragments: 140,926 → 7,264 gzip bytes (94.8% less); empty DOM 18,755 → 248 elements. Retain as a candidate; offline/error/interaction parity still required. |
| Full catalogue records in runtime-only consumers | Worker 3,808,965 → 2,090,593 bytes (45.1% less); all 2,525 public output files identical, all 1,251 projected lookup records equal, 26 alert tests pass. Build lifecycle integration remains. |
| Full application installation for retention | 202,504-byte bundled script executes its mocked dry-run without node_modules; only EXPLAIN and count queries. Hosted artifact retrieval and operation timing unmeasured. |
| Duplicate initial GA page-view calls | Component model: three → one initial view; one view per subsequent navigation retained. Existing denial-update defect remains a separate fix. |
| Service-worker page seeds | **Restore:** six → one install requests loses offline scholarship-directory content, returning only the generic fallback. |
| Peer-dependency suppression | **Restore pending compatible upgrade:** strict resolution rejects Astro 6.4.8 with the adapter's declared Astro 5 peer requirement. |
| Custom RGB PNG encoding | **Restore:** native encoding preserves pixels but increases sampled bytes 64.3%. After restoration, level-6 encoding cuts sampled encoding time 65.4% with 6.9% larger images; not a whole-build claim. |
| Repeated quiz eligibility objects | Lossless pooling passes equality, but only 3.6% gzip savings. Defer added format/decoder work; no functional failure counted. |

**Cycle-time evidence:** baseline clean install 16.78 s; cold CI 206.94 s; warm CI 38.92 s; browser suite 20.31 s. These are local samples (Node 24; hosted workflows use Node 22), and cache savings already existed. A sampled hosted email job used 15 of 23 seconds installing dependencies; removal's hosted savings remain a projection after artifact retrieval costs. Replacing the link checker's eight-host batch barrier with a work queue projects 55.9–59.8% less wall time under three uniform-latency assumptions, preserving the same 683 URLs and per-host limits. No live link timing or cost reduction is claimed.

**Repair attempts:** each adverse deletion probe was stopped and its retained implementation restored. Setup failures (local tar API, module resolution, repository selection, preview lifecycle) each received a different one-step correction; no product repair approach failed three times. Existing five-attempt loops and missing transport deadlines are documented for bounded replacements. Failed optional services must preserve content and unresolved publication/delivery state while exposing a final actionable failure.

**Validation:** isolated baseline lint, 915 tests in 46 files, data validation, production build, Astro checks (181 files, zero errors/warnings/hints), and scripts type checks pass; browser suite has 34 passes and two existing mobile skips. Prototypes have only the additional checks explicitly described above. This is an audit, not a ship-ready implementation. Automate surviving replacements only after their behavior/output checks and measurements; reuse `npm run ci` and the release ship-check for any implementation. No new recurring automation was added.

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
