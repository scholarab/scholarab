# ScholarAB whole-site lean audit, 2026-09-29

ScholarAB’s useful core is its specific opportunity information: eligibility, amount or cost, deadline, uncertainty and a direct provider path. Its condensed headings, green actions, ruled rows, Alberta photography and student founder story already provide a recognizable identity. The main opportunity was to remove competing controls, repeated explanations and claims that disagreed with the detailed information.

This audit records the independent baseline review and the subsequent scoped implementation. Baseline public build: `dc0c77b`, served locally at `http://localhost:4332`. Implementation findings below were checked against the working source diff. They are not a deployment claim. Final integrated measurements and checks are recorded below.

## Scope and evidence

The frozen build inventory contains **1,892 public HTML documents**: **1,811 listing details**, **47 hubs**, **two root directories**, **18 guides**, and **14 authored pages**, including the offline fallback. Admin pages, JSON APIs, the search index and service worker are separate interface families, not extra public HTML entries in that count.

- Independent design review used native browser screenshots, rendered DOM and actual interactions. All 47 hubs were navigated and read in desktop DOM; their shared layouts were sampled visually rather than captured 47 times. All 18 guide introductions and headings received first-viewport browser review.
- An independent second pass sampled 15 routes, including desktop directories and menus, mobile details, a long guide and public admin login. Typical viewports were 1440×900 and 390×844, with 320×812 narrow checks. These are emulated viewport checks, not physical-device certification.
- A supplementary source pass read all 18 guide bodies end to end, the guide index, privacy, terms, credits, educators, reference template, offline page, five admin Astro pages, seven admin components and all four public API routes. It also inspected shared status, publication and request code where necessary to understand the interface.
- The catalogue pass read **every published JSON record and all 1,811 corresponding built detail files** with local parsers. This was complete static consistency coverage, **not 1,811 manual browser visits** and not end-to-end interaction testing of each record.
- The deterministic detector scanned 75 markup-bearing source files and returned no findings. Manual review still found the admin label defect. The optional browser overlay was blocked by the existing CSP; it never ran, and the CSP was not weakened.

No provider facts were freshly verified, no external-link liveness crawl was performed, and no private admin data or database records were inspected. No credentials were displayed or copied. No live subscription, confirmation, unsubscribe, erasure, email delivery or admin publication request was performed. Consent transitions and error recovery were checked through source and isolated tests. Local browser saves and a hypothetical quiz profile were used only in the preview.

The assessment does not claim whole-site WCAG conformance, screen-reader coverage, complete zoom coverage, hosted speed improvement or improved conversion. Two sampled text/background combinations exceeded 4.5:1; that is evidence for those combinations only. No horizontal overflow was observed in the sampled viewports or desktop hub reads. Final native visual review by one reviewer was blocked by browser unavailability; the final verification section must distinguish browser evidence from automated interaction checks.

## Five baseline priorities

| Priority | Student outcome | Baseline problem | Chosen direction |
| --- | --- | --- | --- |
| Program navigation that looked like compound filters | Narrow by both format and field without losing a choice | Research format opened a hub; choosing Computing then replaced that hub instead of intersecting the two. | Use actual format and field filters with native selects and accurate option counts. Preserve hubs as navigable pages. |
| Repeated privacy and reminder promises | Understand collection and available reminders accurately | Tour, Saved, About and policy summaries overstated reminder availability or said only email was collected despite the detailed policy. | Remove the tour and inapplicable global instruction; keep precise listing-level availability and one detailed privacy authority. |
| Four directory display modes | Compare eligibility, value and date with fewer setup choices | Grid, List, Columns and Gallery added selection, preview and navigation machinery over the same records. | Keep one responsive list; remove view-specific state and unused presentation. |
| Repeated preambles and tall setup | Reach an opportunity or template sooner | Routine quiz pitches, cycle explanations and template persuasion repeated instructions already expressed elsewhere. | Shorten setup; retain factual context, status help, empty-state recovery and useful links. |
| Stale guide counts and duplicated claims | Trust the guide and find the current catalogue | Three city guides carried counts inconsistent with their hubs; some advice contradicted other site content. | Remove decorative counts, link the current hubs, and make narrow source-grounded corrections. |

These priorities reflect observed friction and contradictions. They do not establish that every optional view was broken or that shorter content is automatically better.

## Implemented outcomes

**Directory comparison.** The source now has one responsive list. `SabViewSwitch.astro`, preview selection, double-click opening, view persistence and associated layout rules were removed. Search, sort, status grouping, Show more, filter clearing, saving, provider/detail links, URL restoration, print behavior and no-JavaScript catalogue access remain requirements. Type/status controls use a shared `SabFilterSelect.astro`. Program format and field now intersect in `list-core.ts`; the already-fixed axis is omitted on a hub, with a route back to all programs. The filter sheet and desktop hide-filters control remain. Header spacing was reduced without changing the existing fonts or visual identity.

**Repeated page setup.** Routine directory quiz pitches and the repeated cycle-tip block were removed. The quiz remains reachable through navigation and relevant editorial/empty-state links. Hidden program descriptions used only by the removed views and duplicate row/save attributes were removed from directory markup; complete descriptions remain on detail pages. Full-catalogue rendering remains, so the large-directory DOM question is only partly addressed.

**Navigation.** The global five-step illustrated walkthrough was removed. Explore now offers its ten retained destinations once, including Closing soon. Scholarship and program menu categories still represent distinct axes and were not indiscriminately collapsed. Existing keyboard focus, Escape, mobile Back and route transitions remain. Historical walkthrough analytics parsing and retention remain interpretable.

**Saved.** Invisible descriptions and unused serialized category fields were removed. Saved program rows now expose eligibility and cost instead of hidden prose. The global instruction to request reminders from every saved listing was removed because near deadlines may have no valid milestone. List/Calendar is hidden only when empty; removal, Undo, calendar and export remain.

**Guides and templates.** The shared automatic quiz pitch was removed from all 18 guides. Body-specific links, sibling reading links and a path to the relevant hub remain. Seventeen bodies received bounded cuts or corrections listed below; the local-odds guide needed no body cut. City count literals were removed, not replaced with fresh literals. The unused `takeaways` field and all 18 metadata arrays were removed after finding no remaining consumer. This eliminates a second set of 54 summary claims to maintain. The four reference-message strings and Copy implementation remain unchanged; their lead-ins are shorter. The template’s Before you send checks now directly cover bracket replacement, referee rules and aiming for three weeks’ notice. A false instruction to turn on reminders through Saved was removed. Edited guide dates use September 29, 2026, while unchanged metadata dates were preserved.

**Trust and consent.** About, Privacy and Terms no longer contradict the collection table with email-only claims. Erasure copy names its actual reminder/address/fingerprint scope rather than promising nothing remains anywhere. Historical walkthrough counts retain their stated 180-day retention. `reminder-page.ts` now owns duplicated confirmation/unsubscribe HTML, token escaping and recovery presentation. Missing or unreadable links/forms return actionable 400 pages; rate limits return 429 recovery instructions. Intentional POST consent, safe scanner GETs, unknown-token response equality, one-click unsubscribe handling and retention/deletion mechanics remain.

**Catalogue copy.** Nine scholarship records received nine field edits: IDs 2, 59, 366, 534, 880, 1051, 1052, 1106 and 1115. Eight notes were shortened or clarified; ID 880’s redundant truncated `metaDetail` was removed. Changes remove internal maintenance history, an internally contradicted award ranking and unsupported participation odds. ID 534 now tells students to ask the guidance office how to submit sensitive information securely. These nine fields went from 861 to 727 whitespace-separated words. Award amounts, fixed dates, provider URLs and eligibility facts were preserved; this was no new provider verification.

**Editor clarity.** Admin save messages name drafts; deletion means removal at publication. Scholarship active state describes the cycle rather than visibility; program active state describes inclusion when published. Existing labels were associated with their fields, selected admin tabs/eligibility chips expose pressed state, and the login error is associated and announced. These are narrow semantic and copy changes, not a completed authenticated accessibility audit.

**Offline and updates.** Worker installation now requests only the self-contained offline fallback rather than prefetching five full public pages. Existing cached visits are preserved; runtime cache bounds and API/admin/write bypass remain. A required fallback-fetch failure rejects installation rather than activating an incomplete replacement. Updates now reads newest month first with every historical entry retained. Offline appearance was left intact because cosmetic changes had less value than the task and trust corrections.

## Complete route-family coverage

### Root directories and all 47 hubs

`/scholarships/` and `/programs/` received desktop/mobile visual and interaction samples, source inspection and built-document inventory checks. Search failure/recovery, menu keyboard behavior and mobile filter opening/Escape were exercised. All hub routes below were navigated and read in desktop browser DOM. The Medicine Hat hub also received desktop/mobile visual samples. This does not mean every hub was tested at every breakpoint or with every filter combination.

| Scholarship hubs, 31 | Program hubs, 16 |
| --- | --- |
| `/scholarships/airdrie/` | `/programs/clubs/` |
| `/scholarships/alberta/` | `/programs/competitions/` |
| `/scholarships/arts/` | `/programs/computing/` |
| `/scholarships/beaumont/` | `/programs/conferences/` |
| `/scholarships/brooks/` | `/programs/dual-credit/` |
| `/scholarships/calgary/` | `/programs/engineering/` |
| `/scholarships/camrose/` | `/programs/enrichment/` |
| `/scholarships/chestermere/` | `/programs/health/` |
| `/scholarships/cochrane/` | `/programs/math-physics/` |
| `/scholarships/cold-lake/` | `/programs/olympiads/` |
| `/scholarships/community/` | `/programs/research-placements/` |
| `/scholarships/edmonton/` | `/programs/research/` |
| `/scholarships/fort-mcmurray/` | `/programs/science-fairs/` |
| `/scholarships/fort-saskatchewan/` | `/programs/social-sciences/` |
| `/scholarships/grande-prairie/` | `/programs/summer-programs/` |
| `/scholarships/indigenous/` | `/programs/trades/` |
| `/scholarships/lacombe/` |  |
| `/scholarships/leduc/` |  |
| `/scholarships/lethbridge/` |  |
| `/scholarships/lloydminster/` |  |
| `/scholarships/medicine-hat/` |  |
| `/scholarships/national/` |  |
| `/scholarships/okotoks/` |  |
| `/scholarships/red-deer/` |  |
| `/scholarships/sherwood-park/` |  |
| `/scholarships/sports/` |  |
| `/scholarships/spruce-grove/` |  |
| `/scholarships/st-albert/` |  |
| `/scholarships/stem/` |  |
| `/scholarships/trades/` |  |
| `/scholarships/wetaskiwin/` |  |

### All 18 guides

Every route below received browser introduction/headings review and a complete source reading of its body, FAQ data and relevant scripts/styles. The essay guide additionally received desktop/mobile visual samples. Shared-shell changes apply to all rows; the outcome column distinguishes body work.

| Route | Individual outcome |
| --- | --- |
| `/guides/alberta-scholarship-deadlines-by-month/` | Dynamic counts, month table and scope caveat retained; direct introduction and fewer transitions. |
| `/guides/alexander-rutherford-scholarship-guide/` | One-application explanation condensed; course tables, residency and postsecondary enrolment requirements retained. |
| `/guides/chemistry-competitions-canada/` | Teacher registration stated directly; ladder and cycle caveats retained. |
| `/guides/dead-scholarships-alberta-counsellor-lists/` | All nine examples and three false-positive cases retained; transitions and repeated site promotion trimmed. |
| `/guides/grade-11-scholarship-timeline/` | Five preparation actions retained; removed promise that next fall’s deadlines will automatically arrive. |
| `/guides/high-school-computing-programs-alberta/` | Removed generic opening and unsupported ranking; registration, costs and grade windows retained. |
| `/guides/high-school-research-programs-alberta/` | Removed a transition; geography, marks, equity caveats and paid-versus-tuition distinctions retained. |
| `/guides/how-to-write-a-scholarship-essay/` | Both examples and full writing schedule retained; false equal-length and three-waiting-steps claims removed in body/FAQ. |
| `/guides/local-scholarships-better-odds/` | No body-specific cut justified; receives the shared repeated-pitch removal only. |
| `/guides/loran-award-guide/` | Removed premature Rutherford instruction and stale five-weeks-out countdown; fixed dates and award/application facts retained. |
| `/guides/medical-experience-high-school-alberta/` | Three routes introduced directly; broad all-free claim removed; age, access and cost caveats retained. |
| `/guides/reference-letters-for-scholarships/` | Duplicate anecdote explanation removed; timing, referee choice and request guidance retained. |
| `/guides/scholarships-for-grade-12-students-alberta/` | Repeated opening odds paragraph removed; sequence and post-graduation Rutherford timing retained. |
| `/guides/scholarships-for-lethbridge-students/` | Stale literal count removed; current hub linked. Local requirements, including 40 hours, and uncertainty retained. |
| `/guides/scholarships-for-medicine-hat-students/` | Stale literal count and unsupported participation claim removed; local award facts and enrolment caveat retained. |
| `/guides/scholarships-for-red-deer-students/` | Stale literal count and unsupported participation claim removed; local distinctions and enrolment caveat retained. |
| `/guides/trades-scholarships-rap-alberta/` | Rhetorical comparisons removed; apprenticeship, RAP, employer and school conditions retained. |
| `/guides/volunteering-alberta-high-school/` | Blanket no-hours claim corrected in body/FAQ; sustained placement advice and recordkeeping retained. |

The temporal follow-up removed only the clearly stale Loran countdown. Fixed dates, accurate total-window descriptions, conditional seasonal advice and meaningful intake uncertainty were retained. There was no broad date or provider-fact refresh.

### All 14 authored pages

The directory roots and individual guides are listed separately above. This inventory grouping includes tools, policy pages and the offline document.

| Route | Evidence | Outcome or boundary |
| --- | --- | --- |
| `/` | Desktop visual/DOM; mobile menu. | Keep Alberta imagery and direct discovery paths; shared navigation simplified. |
| `/404/` | Desktop visual/DOM. | Search and real recovery destinations retained. |
| `/about/` | Desktop visual/DOM; 320px sample. | Founder story and notebook identity retained; privacy summary corrected. |
| `/credits/` | Desktop visual/DOM; full source. | Photo/source attribution retained; no justified content removal. |
| `/deadlines/` | Mobile and 320px samples. | Month navigation, date groups and usable calendar retained. |
| `/educators/` | Desktop visual/DOM; full source. | Handout utility retained; reminders described as milestones still ahead. |
| `/guides/` | Desktop visual/DOM; 320px sample; full source. | Guide order and links retained; defensive introduction trimmed. |
| `/match/` | Full eight-question mobile path, results and reload restoration; 320px initial state. | Legacy matching and answer storage unchanged. Alternate branches and no-results paths were not exhaustively exercised. |
| `/offline.html` | Desktop visual/DOM; full source. | Self-contained fallback retained; appearance unchanged. Worker uses its canonical /offline URL. |
| `/privacy/` | Desktop visual/DOM; full source. | Detailed collection, consent, retention, processors and erasure scope preserved; conflicting summaries removed. |
| `/saved/` | Empty/populated mobile states and calendar DOM; 320px sample. | Save/remove/calendar/export retained; invisible payload and inapplicable reminder instructions removed. |
| `/templates/reference-letter/` | Desktop visual/DOM; 320px sample; full source. | Four template texts retained byte-for-byte; lead-ins shortened. Native Copy/print output was not exercised in the baseline review. |
| `/terms/` | Desktop visual/DOM; full source. | Privacy section points to the detailed authority without restating a false email-only claim. |
| `/updates/` | Desktop visual/DOM. | Existing month sections now newest first; every historical entry retained. |

### All listing details

The shared `/scholarships/{slug}/` and `/programs/{slug}/` template families cover 1,541 scholarships and 270 programs. All 1,811 source records and built detail files passed the following static checks in the supplied build:

- One h1 matching the normalized record title/name, correct production canonical and the exact recorded provider href.
- Robots consistent with the shared status/indexability functions; no missing detail file or slug collision.
- 18,348 main-region internal link references resolved, excluding intentionally empty hidden previous/next placeholders populated by list context.
- No empty main heading, unexpected empty link, missing description, malformed provider URL scheme or visible `NaN`, `lorem ipsum`, `[object Object]` or `Invalid Date` placeholder.

These structural passes did not catch every semantic contradiction. All nine inactive programs, the one explicitly concluded scholarship, both rolling scholarships and all 61 detected no-separate-application records were inspected for state wording. Estimated deadlines and ordinary closed details were sampled statically. All 61 no-application cases omitted an Apply CTA and generic How to apply heading; appropriate award/provider wording remained.

Native browser detail samples were `/scholarships/loran-scholarship/`, `/scholarships/cypress-county-agricultural-service-board-bursary/` and `/programs/fem-engineering-mentorship-program/`. They covered visible amount/cost, eligibility, date, provider action, save and reminder availability. Loran showed a labelled reminder form; near-deadline samples correctly said reminders were too late. No reminder was submitted.

### Admin interfaces

All five Astro pages and seven components were read in source. Only the public login page was viewed in the browser, at a narrow viewport with no credentials. Authenticated states below are source-reviewed possibilities, not completed private workflows.

| Route or shared interface | States reviewed |
| --- | --- |
| `/admin/` | Redirect to the scholarship manager; no duplicate dashboard. |
| `/admin/login/` | Empty password field, submitting, invalid/network failure, successful next-route handling and mobile user-agent redirect. |
| `/admin/scholarships/` | Search/filter/pagination, empty/loading/error rows, create/edit, latest-record fetch, structured eligibility, optional parsing, save/conflict/failure, delete confirmation and draft messages. |
| `/admin/programs/` | Search/filter/pagination, empty/loading/error rows, create/edit, paid stipend versus student fee, save/conflict/failure and deletion. |
| `/admin/analytics/` | Counts, dated Search Console snapshot, missing/error data, historical caveats and sorting controls. No private counts were loaded. |
| `AdminShell` and shared primitives | Draft count, review preview, changed-preview conflict, queued/running/success/failure publication feedback, polling, final failure and explicit retry/run-now paths, dialogs and sign-out. |

Reviewed components: `AdminShell.tsx`, `ScholarshipManager.tsx`, `ProgramManager.tsx`, `AnalyticsPanel.tsx`, `EligibilityEditor.tsx`, `LoginForm.tsx` and `primitives.tsx` under `src/components/admin/`.

### API and support surfaces

| Route family | Scope and retained behavior |
| --- | --- |
| `/api/confirm` | GET confirmation form; intentional POST success; invalid/missing token, unreadable form and rate-limit recovery. Source and isolated tests; no live token. |
| `/api/unsubscribe` | GET choice between one reminder and all reminder data; POST unsubscribe, erasure and one-click fallback; 400/429 recovery; identical unknown-token result. Source and isolated tests. |
| `/api/alert` | JSON validation, published-item lookup, valid future milestones, too-soon/unknown-deadline rejection, token-scoped editing, double opt-in, identical signup response and final storage failure. Source only in this UX review. |
| `/api/event` | JSON validation/error and 204 paths, restricted event metadata, paired positive item identifiers, rate limits and optional analytics failure containment. Source only. |
| `/admin/api/login`, `/admin/api/logout` | Supporting source review of request outcomes: invalid request/credentials, throttling, service unavailable, session creation/clearing. No live auth actions. |
| `/admin/api/scholarships`, `/admin/api/scholarships/{id}`, `/admin/api/programs`, `/admin/api/programs/{id}` | Shared collection/item source: authentication, validation, missing/conflicting record, create/update/delete draft and final failure. Revision protection and publication separation retained; no endpoint exercised with private data. |
| `/admin/api/scholarships/parse-eligibility` | Optional parser error/rate-limit/invalid-output states and preservation of form content. No service invocation. |
| `/admin/api/deploy` | Source-level status/review/queue/error contract; no publication request. Preview hash, validation, safe drafts and reconciliation remain requirements. |
| `/search-index.json` | Lazy directory search fallback from public loaders and deduplicated tokens; source reviewed, no new interface. It is outside the HTML count. |
| Service worker, manifest, robots, sitemap and redirects | Worker behavior received isolated cache/network tests. Other support artifacts are inventory/publication context, not individually browser-reviewed pages. Redirect aliases are not additional authored surfaces or evidence of provider-link liveness. |

## Catalogue uncertainty and remaining proposals

The following are follow-up candidates, not required new work in this audit. Prioritize a demonstrated student or editor failure over another visual rewrite.

| Proposal | Reason and bounded next step | Required protection |
| --- | --- | --- |
| Remove or constrain scholarship edit refetch | `ScholarshipManager.tsx` opens a form, then a late GET can replace typing or reopen a closed modal. Try using the loaded row plus revision conflict handling; if freshness is needed, cancel/bind the request and do not overwrite an edited form. Reproduce with delayed inert fixtures. | Preserve unsaved input, explicit failure and optimistic locking. No private-data reproduction is needed. |
| Share a reliable admin dialog lifecycle | Edit/delete/publication overlays declare modal semantics without full focus containment/restoration; backdrop/Escape can close while a mutation runs. Test a native dialog or small shared primitive with inert data. | Keep delete/publication confirmation and explicit mutation outcome. Test initial focus, Tab, Escape, return focus and in-flight dismissal deliberately. |
| Stop work that polling discards | `AdminShell.tsx` polls every 15 seconds during review even though its result is ignored, and silent failures can continue indefinitely. Pause during review/hidden pages; bound failure retries or expose stale status. | Preserve explicit preview/status refresh and final publication failures. Measure requests avoided locally before claiming hosted savings. |
| Preserve independent analytics data on outage | `AnalyticsPanel.tsx` returns an error panel even when the separately loaded Search Console snapshot exists. Render the snapshot and mark failed event counts unavailable. | Unknown is not zero. Keep snapshot dates and live-reminder versus event distinctions. |
| Simplify analytics caveats and make sorting operable | Remove the obsolete Started Aug 8 clause for the removed metric; use buttons in clickable table headers. | Keep historical measurement breaks and click-versus-view caveats. Verify keyboard behavior with fixtures. |
| Reconsider the mobile admin gate with its layout | `admin/login.astro` redirects mobile/iPad user agents home without explanation. First check the fixed sidebar and tables at narrow widths, then remove or replace the arbitrary gate. | Do not equate viewport support with authentication or remove the gate without making the destination usable. |
| Unify repeated admin wrappers | Four page wrappers repeat document head and dark-root overrides. One small layout can own them when admin layout work is next needed. | Preserve auth middleware, page-specific data loads and required style specificity. No extraction was attempted here. |
| Investigate remaining full-catalogue DOM cost | Baseline scholarship/program directories mounted 33,157/6,913 elements despite an initially short list. View-only markup was removed, but all records remain in HTML. Measure current interaction/parse cost before considering paging or rendering changes. | Retain public JSON authority, no-JavaScript access, search/count correctness, stable routes and crawlable content. Do not delete records for a smaller metric. |

The catalogue has real uncertainty which should remain visible. At the pinned September 29 review date, 132 scholarship deadlines were estimated, two awards were rolling and one was explicitly concluded. Program `active:false` is not a single reason: the nine records include a future seasonal intake, unavailable/conflicting information, a hiatus, discontinued programs, postsecondary-only eligibility, BC-only eligibility and an ended council. A neutral display must not turn all nine into “Ended” or imply all will reopen.

The static scan found two duplicate-description groups across six scholarships and 48 duplicate-note groups across 395 records. Many repeats describe shared applications, required school submission or eligibility conditions. Students may enter directly on any detail, so do not delete useful repeated facts or infer duplicate awards from identical text. Confirm award-specific differences before rewriting the six description records. Program descriptions/notes had no exact duplicates. Long notes and hedging were not treated as filler by themselves.

Guide and listing uncertainty should point to the recorded provider without manufacturing certainty. This review did not establish current provider availability, success odds, live link health or legal compliance. The legacy quiz’s Unpaid label for some fee-based programs and its large result setup remain known presentation candidates; its matching behavior was explicitly preserved. A contents disclosure for unusually long guides is only worth testing if readers still need it after the prose cuts.

## Availability corrections

All nine inactive program details now show “Not currently listed” and omit a misleading deadline row. Their original explanations and provider links remain, preserving the differences between seasonal, uncertain, paused, ended and ineligible programs. Generated metadata no longer adds “Open year-round” to inactive records. Saved retains these bookmarks and the same neutral label.

The concluded TD scholarship now says “Ended” and “This scholarship has ended,” without a TBA deadline or next-cycle promise. Its historical explanation, provider link and open alternatives remain. Both rolling scholarships show “No fixed deadline.” These display changes do not alter shared status algorithms, indexability or legacy quiz matching. The browser clock cannot overwrite curated availability.

Focused compiled-component tests exercise the real route preparation, all nine inactive records, all 61 no-separate-application cases, both rolling records, the concluded record, ordinary closed and estimated states, provider links, saved flags and stale-date repaint. No source catalogue facts were changed to make the UI fit.

An independent final source review caught one removal regression: no-JavaScript program hub navigation disappeared when the old navigation rows became hidden native filters. Compact no-script format/field links were restored, derived from the actual eligible hubs. This is a real partial add-back; the normal JavaScript interface keeps the simpler selects.

## Final integrated evidence

The local build retains all **1,892 HTML documents**, their normalized h1 values and canonicals. The [complete route inventory](audit-evidence/lean-site-2026-09-29-routes.csv) records every route, family and before/after artifact size. The final parser resolved **29,923 main-region internal link references across all public pages**, with no missing targets; this does not check URL fragments or external provider liveness. The catalogue remains 1,541 scholarships and 270 programs. Nine intended scholarship prose fields changed; record IDs, titles, provider URLs, amounts, dates, eligibility fields and program JSON are unchanged.

| Local artifact | Raw HTML before | Raw HTML after | gzip estimate before | gzip estimate after |
| --- | ---: | ---: | ---: | ---: |
| Home | 94,664 | 79,904 | 15,168 | 12,958 |
| Scholarships | 3,437,457 | 3,101,519 | 380,571 | 343,522 |
| Programs | 733,279 | 579,553 | 105,328 | 85,243 |
| Saved | 804,968 | 699,854 | 152,924 | 127,803 |
| Deadlines | 560,356 | 545,596 | 65,878 | 63,634 |

Program HTML is 21.0% smaller and scholarship HTML 9.8% smaller. Saved's inline catalogue alone falls from 753,624 to 663,488 bytes (12.0%), while retaining all 1,811 entries and the nine needed inactive flags. These are local build bytes, not measured hosted transfer or latency. Static parsed element counts fall from 33,159 to 32,924 on scholarships and 6,915 to 6,459 on programs; the latter includes the no-script fallback. The large scholarship DOM remains a follow-up candidate rather than a solved problem.

The existing search benchmark used the same unique query, Chromium 149.0.7827.55, 4x CPU throttle and 20 search/clear samples per run. Median handler time fell from **43.30 to 35.85 ms**; median input-to-next-paint from **92.17 to 77.09 ms**. One local before/after run is evidence of this setup, not a general speed guarantee. At 1440×900, the first scholarship row moved from y=558.89 to y=391.44, about 167 pixels earlier. No student task-completion time was measured.

Worker installation requests fall from six resources to one. Against the baseline artifacts, five unvisited pages total **5,124,876 raw bytes**, or **665,689 gzip-estimated bytes**, avoided per clean install request set. Existing browser caches and hosted compression affect actual transfers. The required 1,222-byte offline page remains, and visited pages still enter the bounded runtime cache. Source removal, guide word counts and unused metadata are maintenance evidence, not performance percentages.

[Raw measurements and methods](audit-evidence/lean-site-2026-09-29-measurements.json) include every search sample and the worker/payload calculations. [Desktop scholarship preview](audit-evidence/lean-scholarships-desktop-2026-09-29.png) and [320px program filters](audit-evidence/lean-program-filters-mobile-2026-09-29.png) show the final local interface.

Validation: `npm run ship-check -- origin/main` passed the detail-URL preservation check and required `npm run ci` plus `npm run test:e2e`. Integrated CI passed with **61 test files / 1,105 unit tests**, a successful production build and bundle-secret check, Astro with zero errors/warnings, and script type checking. Two existing legacy-quiz lint warnings and ten existing analysis hints remain; the legacy quiz was preserved. Full browser checks passed **112 tests**, with **16 existing conditional/opt-in skips**. They cover directory search, accurate counts, combined filters, URL/Back restoration, saving/export, no-JavaScript navigation, keyboard/mobile controls, row geometry, reminder cutoff, privacy opt-in and legacy quiz recovery/results.

Final native browser confirmation covered both desktop directories, program format/field intersection at 320px, Saved eligibility/cost, inactive/concluded/rolling detail states, and representative edited guide/template surfaces. An inert rendering of the shared reminder-error helper showed an actionable mobile 400 page and rate-limit instructions without contacting subscription storage. No private admin session or live email action was needed. These checks supplement the baseline coverage above; they are not a claim that every viewport and record was manually exercised.

The [simplification ledger](simplification.md) records the retained outcomes, failed verification attempts and repairs. **One of 14 removal groups required partial restoration (7.1%)**: no-JavaScript program navigation. This is below the requested 10% target; no additional failure or add-back was manufactured. The remaining proposals above are explicit candidates for later work, not silently dropped requirements or verified provider corrections. Hosted deployment and performance are reported separately from this local evidence.

Evidence used for this synthesis: `.cache/lean-session/assessment-a.md`, `assessment-b.md`, `assessment-c.md`, `implementation-a.md`, `implementation-b.md`, `implementation-c.md`, `catalogue-coverage.md` and `baseline-inventory.json`, plus the working source diff. This document carries their substantive coverage and limitations so the owner does not need the temporary cache to understand the review. Product and preservation rules remain in [PRODUCT.md](../PRODUCT.md) and [AGENTS.md](../AGENTS.md); publication rules remain in [publication-and-operations.md](publication-and-operations.md).
