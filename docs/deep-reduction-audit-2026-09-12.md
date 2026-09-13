# ScholarAB deep reduction audit: September 12, 2026 UTC

**There are credible reductions above 50% in several expensive operations. There is no evidence that every aspect of ScholarAB can safely be halved.** The highest-value targets are hidden Saved-page cards, installing the whole application for maintenance, link-checker scheduling, duplicate analytics calls, and unnecessarily broad runtime data imports. Cutting listings, protections, or test coverage to reach a percentage would defeat the student outcome.

This is an audit with isolated prototypes, **not a deployed optimization release**. No production records, email deliveries, schedules, dependencies, public content, fonts, layouts, or quiz behavior were changed. Existing working-tree edits were preserved. All measurements refer to commit [`c2d93ad`](https://github.com/scholarab/scholarab/tree/c2d93add997933b467e4c6105a5f5363e6eff9e3); the shared repository advanced to `41abc6a` during the audit. Rebase implementation and repeat affected checks against the eventual release revision.

## Evidence and scope

The audit covered the source tree, lockfile, six GitHub workflows, build generators, generated public artifacts, browser loading/filtering, publication and identity contracts, admin queries, email delivery and retention code, analytics, search/indexing scripts, and existing tests/documentation. It used a clean archive and independent `npm ci`, without copying environment files, private directories, or credentials.

The [measurement record](audit-evidence/reduction-2026-09-12.json) contains artifact sizes, browser resources, timing samples, hosted run metadata, and prototype results. The [safe removal probes](audit-evidence/removal-probes-2026-09-12.mjs) reproduce the analytics and offline models; run from the repository root after installation. These are manual audit evidence, not another scheduled process.

| Baseline | Observed value |
| --- | ---: |
| Catalogue | 1,122 scholarships + 129 programs |
| Generated HTML | 1,323 files; 44,241,766 bytes |
| Complete build output | 2,526 files; 77,329,695 bytes |
| Worker | 3,808,965 bytes |
| Installed dependencies | 681 MiB allocated locally; lockfile has 770 package entries, including platform alternatives |
| Direct dependencies | 11 runtime + 26 development |
| Clean local installation | 16.78 seconds |
| CI with cold OG cache | 206.94 seconds |
| CI with warm OG cache | 38.92 seconds |
| Baseline checks | 915 tests in 46 files; lint, build, script checks pass; Astro: 181 files, zero errors/warnings/hints |
| Browser suite | 34 pass, two existing mobile skips; 20.31 seconds including launcher |

Local runtime: Node 24.14.0, npm 11.9.0, macOS. Hosted workflows specify Node 22. The cold run overlapped small audit probes; timings are observations, not a controlled performance benchmark. Warm/cold differences demonstrate the **existing** cache's importance and are not a new improvement credited to this audit. Adapter startup deprecation/session advisories remain despite clean Astro diagnostics.

Browser measurements used the isolated production build in Chromium. External requests were blocked and service workers disabled for resource/interaction measurements, so they exclude third-party analytics and background precaching. Transfer columns below are local gzip measurements of HTML, not field Core Web Vitals or negotiated CDN traffic.

| Page | HTML bytes | HTML gzip | DOM elements | Loaded local JavaScript, decoded |
| --- | ---: | ---: | ---: | ---: |
| Home | 36,864 | 7,118 | 425 | Not separately sampled |
| Scholarships | 1,994,064 | 248,829 | 16,077 | 40,176 |
| Programs | 279,714 | 46,113 | 2,413 | Not separately sampled |
| Saved, zero bookmarks | 1,666,434 | 140,926 | 18,755 | 42,697 |
| Match | 26,104 | 7,549 | 267 after hydration | 250,060 |
| Example scholarship detail | 26,069 | 5,916 | 298 | Not separately sampled |

## 1. Question the requirements

Implementation requirements must earn their place by protecting an outcome. This register covers the major independently operated parts, rather than treating every function as a product requirement.

| Requirement or assumption | Student/operator outcome to retain | Challenge and decision |
| --- | --- | --- |
| Keep all catalogue records, including inactive history | Existing links, saved identities, and truthful availability survive | Keep. Delete redundant representations, not opportunities. |
| Versioned JSON is publication authority | A reviewed revision produces consistent public pages, quiz inputs, and reminders | Keep. Generated transport projections may be disposable; database drafts must remain separate. |
| Database drafts and revision locking | An editor cannot lose unsaved work or overwrite a concurrent edit | Keep. A second authoritative public database would increase reconciliation work. |
| Publication queue and recovery | A pushed change is acknowledged only after the correct public revision is visible | Keep recovery. Question repeated full setup and dependence on nominal cron timing. |
| Every Saved-page visit needs every card | A student can read their own shortlist and calendar | Reject this implementation assumption. Fetch/cache the selected cards while preserving local-only bookmark storage. |
| Every directory needs every card in the initial DOM | Complete browsing, search, browser find, no-JS access, and stable navigation | Challenge with a prototype, but do not delete the complete fallback. Pagination/virtualization has product tradeoffs. |
| Legacy quiz needs React | Existing questions, matching, progress, results, and anonymity remain exact | Keep for this scope. Rewriting the state machine just to halve framework bytes is not justified by the audit. |
| Quiz needs duplicate eligibility objects | Exactly the same matcher input reaches the browser | Challenge transport duplication; compare compressed bytes and exact decoded equality. |
| All server routes need full catalogue records | Reminders resolve public IDs; analytics displays correct names | Reject. Runtime consumers need a small field projection, not eligibility and editorial prose. |
| Three analytics systems | Reliable operational counts, acquisition information, and page performance | Require an owner/decision for each metric. Cloudflare, GA, and first-party events are not identical; remove duplicate events immediately, assess whole-service removal separately. |
| Consent, unsubscribe, rate limiting, delivery ledger | No unsolicited mail, unauthorized schedule changes, duplicate delivery, or avoidable exposure | Keep. These are not overhead to cut by quota. Repair missing enforcement. |
| Fixed retention windows | Stored data disappears within the stated window | Keep the promise; challenge monthly-only enforcement rather than extending retention. |
| Six-hour reminder attempts | Failed deliveries can retry within provider idempotency limits | Keep until equivalent recovery is proven. Halving runs can leave too few retry opportunities. |
| Full app installation in every maintenance job | The existing maintenance operation runs reproducibly | Reject as a runtime requirement. Build a revision-bound executable artifact once. |
| Full validation on every build | Bad catalogue data never becomes published authority | Keep validation. Remove redundant generation/setup and validate before deployment. |
| Every test needs a browser-like DOM | Tests exercise retained behavior | Challenge environment choice for pure modules; retain tests. Suite time is already a small part of hosted release time. |
| Repeated local/hosted check definitions | Same release criteria everywhere | Already centralized in `npm run ci`; do not recreate a second checklist. |
| Social images for individual listings | Shared links keep their existing title, amount, deadline, fonts, and layout | Keep pixels/content; narrow invalidation and benchmark encoding. |
| Every link host must wait for seven unrelated hosts | All provider links are checked without hammering a host | Reject the batch barrier. Keep per-host serialization, spacing, and bounded retries. |
| Weekly Search Console full census | Coverage changes and stale crawls are observable | Retain a complete census; a half-sized rotating sample changes detection latency. Use existing scripts, not a new connector. |
| Automated social queue every week | The operator receives usable publishing material | Verify actual artifact use before keeping the schedule. Generation is not evidence that a post was published. Keep manual generation capability. |
| Historical DB tables and migrations | Recovery and historical identity remain possible | Do not drop live tables from a source-only audit. Retire recurring legacy mapping only after completeness is independently verified. |
| Fixed public fonts/design/copy | The existing experience remains recognizable and readable | Keep. CSS coverage from one viewport cannot prove a rule or font dispensable. |
| Every dimension must fall 50% | Less work and faster student journeys | Use independent budgets. A smaller raw file, fewer requests, and lower cost are different claims. |

## 2. Delete before optimizing: experiments and restorations

The deletion experiment ledger is in [simplification.md](simplification.md). Restorations are actual adverse results, not invented failures to meet a quota. The experiments were isolated; the production implementation still contains all these parts.

### A. Remove unselected cards from Saved

`SavedDirectory.astro` renders 1,251 hidden card wrappers before knowing whether the browser has any bookmarks. The empty page still parses 18,755 elements.

The prototype removed those wrappers, retained the existing page shell, and reinserted four selected wrappers unchanged. Shell plus four independently compressed fragments measured **7,264 gzip bytes versus 140,926**, a **94.8% reduction in this HTML/card payload**. Empty DOM count fell to 248, a 98.7% reduction. This is not a 94.8% reduction in total page load: existing JavaScript, CSS, fonts, request overhead, and fragment latency remain.

Implementation: generate card fragments from the same authoritative Astro template; load only saved IDs; preserve localStorage identities, removal animation, cross-tab synchronization, calendar/ICS, and exact card markup. Cache the needed representation when saving and retain previously cached data during a failed refresh. Use a catalogue version to prevent mixing fragment revisions. Do not introduce a database request or transmit bookmark IDs to analytics.

Unproven: offline-first visits, fragment failures, stale/deleted IDs, many saved items, and full screenshot/interaction parity. Until these pass, the experiment is a feasibility result, not a finished replacement.

### B. Remove full catalogue payloads from runtime imports

`api/alert.ts` needs IDs, labels, deadline, and active state. `admin/analytics.astro` needs ID-to-title maps. Their imports keep full editorial and eligibility records in the Worker.

The isolated replacement projects those fields from the same JSON. Worker size fell from **3,808,965 to 2,090,593 bytes: 45.1%**. All **2,525 non-Worker build files were byte-identical**. All 1,251 runtime identities/labels/deadlines/active flags matched the original loaders, and all 26 existing alert endpoint tests passed after pointing their loader mock at the replacement module.

A production implementation must generate these projections in the shared build lifecycle and keep full validation/hash generation before projection. They are generated assets, never a second manually edited catalogue. This is the strongest verified server reduction, but **it did not reach 50%**. Do not erase that distinction by minifying whitespace or removing the next safeguard.

### C. Remove full installations from the retention job

Bundling the unchanged retention script produced a **202,504-byte executable, 54,968 bytes gzip**, with only Neon in its dependency graph. It ran in a separate directory without node_modules under a mocked SQL transport with the expected dry-run behavior: EXPLAIN/read-only count queries, no mutations. The sender and link checker also bundled at 233,148 and 1,019,686 bytes respectively, but their complete runtime behavior was not verified by this packaging experiment.

A sampled [hosted email run](https://github.com/scholarab/scholarab/actions/runs/34667208100) spent **15 of its 23 job seconds installing dependencies**, then two seconds sending/checking reminders. Eliminating that install is a **65.2% ceiling on that sampled job's duration before artifact retrieval costs**, not a measured hosted improvement. It is not a comparison of 55 KB with browser traffic or a promise about billed minutes.

Implementation: create the operations artifact once from the checked revision; bind provenance/checksum to that revision; retrieve it without installing the application; read current authoritative JSON deliberately rather than accidentally using stale bundled data. If the matching artifact is unavailable, expose failure or use a bounded verified fallback. Never silently skip retention or discard subscribers. Keep consent and delivery tests on the source implementation; do not commit generated executable copies.

### D. Remove redundant analytics calls

With existing granted consent, the component model records **three initial `page_view` calls**: `apply()` calls `loadGa()` which sends a view, then sends another; the first `astro:page-load` sends a third. Later navigation adds one. Removing duplicate initialization paths yields **one initial call and one per navigation: 66.7% less initial event work**.

This is a local model of the component, not a measurement of GA's ingested or deduplicated reports. Retain explicit grant handling and test first visit, returning consent, navigation, denial, and consent reset. The model also exposes a separate denial defect described below; the duplicate-call patch does not fix it.

### E. Remove proactive service-worker page downloads: restore

Changing six install downloads to `/offline` alone cuts request count 83.3%. But a fresh installed worker that previously served `/scholarships/` offline now returns only the generic fallback. That fails existing behavior, so restore the seeds for now. Reduce the representations/download duplication first; do not call removal of offline directories a transparent optimization.

### F. Remove `legacy-peer-deps`: restore pending compatible versions

An isolated install dry-run without the override fails with `ERESOLVE`: installed `@astrojs/cloudflare@12.6.13` declares `astro@^5.7.0`, while the lockfile contains Astro 6.4.8. Restore the override until the framework/adapter/tooling versions are upgraded together and verified. Do not repeatedly force installation and count that as a repair.

### G. Remove the custom PNG encoder: restore, then benchmark

On 12 distributed card samples, the native renderer encoder preserved pixels but increased total bytes from **300,189 to 493,266, up 64.3%**. Restore the custom RGB encoding because removal worsens the asset-size target.

Only after that deletion failed the size goal, compare compression settings. Level 6 preserved every decoded pixel and reduced measured encode time from **371.8 to 128.6 ms, down 65.4%**, while increasing these image bytes 6.9%. This is a sample of encoding time, not a 65% build-time saving. It is an explicit speed/size tradeoff requiring a larger controlled sample before adoption. Levels 1/3 were also measured and produced substantially larger files.

### H. Remove duplicate quiz eligibility objects: small compressed gain

Pooling 1,122 scholarship eligibility objects into 609 distinct values round-tripped to exactly the original payload. Raw JSON fell from 824,510 to 648,140 bytes, but gzip fell only from **95,228 to 91,813 bytes: 3.6%**, and Brotli from 73,821 to 72,204. Compression already removes most of this repetition. Defer the extra transport/decoder contract at this benefit level; do not describe the 21.4% raw reduction as an equivalent download improvement. No legacy quiz behavior was changed.

## 3. Correctness findings that affect the reduction plan

### High priority: incomplete availability transport

The baseline contains a permanently concluded TD Community Leadership record, ID 59. `status.ts` correctly treats `concluded: true` as closed, but `ScholarshipDirectory.astro` does not serialize/parse that flag. The browser therefore reclassifies it as future. The actual local browser rendered **“OPENING SOON” beside “No longer accepting applications.”** Saved's chip helper also drops the flag; the quiz payload omits it too.

Remove lossy, separately maintained status projections. Carry the retained status inputs through each relevant transport and use the shared status function. Do not remove the historic listing. Acceptance: directory before/after JS, Saved, detail, quiz eligibility policy, sitemap, and social selection agree on concluded/future/current examples. Only the directory contradiction was browser-reproduced in this audit; the other omissions are source findings requiring their own behavior tests.

### High priority: dependency compatibility and advisory debt

Fresh `npm audit` reports **seven affected package entries: one critical, four high, two moderate**. This is inventory, not proof of seven exploitable production vulnerabilities. Two Wrangler/Miniflare/workerd stacks and multiple Vite versions coexist. `tsx`, used throughout npm scripts, arrives only transitively through `drizzle-kit`; deleting that toolkit without declaring the actual runner would break operations.

The [Astro maintainer advisory](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) describes malicious AVIF processing and a fix in Astro 7.2.8. ScholarAB's compile-time image service and SSR Sharp stub affect reachability; this audit did not establish an attacker-controlled AVIF path. Upgrade compatible framework/adapter/preview tooling in isolation, remove obsolete shims and peer suppression only after demonstrated success, and rerun build, browser, auth/origin, and Worker checks. Do not use an unreviewed forced major upgrade.

### High priority: retention cadence does not enforce the displayed promise

The privacy page promises unconfirmed signups are deleted **within 30 days** and event rows retained **180 days**. `prune-events.ts` applies those age thresholds, but its workflow runs monthly. A row crossing the threshold just after a sweep can remain almost another month. This is a code/schedule mismatch; no live rows were inspected to establish an actual over-retention incident.

Remove dependence on a monthly-only age sweep. Reuse a reliable existing execution opportunity or enforce expirations closer to their deadlines, with a visible overdue-cleanup failure. Preserve the existing thresholds and successful-send payload erasure. Halving retention job frequency would worsen this defect.

### High priority: publishing can wait indefinitely behind one request

Thirteen scheduled publisher runs returned by GitHub covered September 10–12. The 12 observed gaps ranged **120.3–285.8 minutes**, median **190.5 minutes**, despite the configured 15-minute schedule. These are observed trigger gaps, **not measured draft-to-live latency**. GitHub itself documents that [scheduled events can be delayed or dropped](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The script selects one oldest queued/processing/committed request. Failed live verification logs a message, leaves it committed, and exits successfully; there is no attempt-age escalation. A persistent mismatch can hold subsequent work behind a green recurring job. Keep the durable request and exact deployment identity, but expose a final “needs reconciliation” condition after three bounded verification attempts. Do not blindly process newer markers in a way that makes older requests impossible to prove. Measure enqueue/commit/live timestamps; use the existing manual workflow dispatch until any more immediate authenticated trigger is available and tested. Removing recovery polling without a replacement is not justified.

### Medium priority: consent denial does not update an already loaded tag

`Analytics.astro`'s denial path stores the choice and hides the banner, but never sends a denied consent update to an already loaded `gtag`. The component probe observes **zero denial updates** after a prior grant. This is especially relevant to the advertised `?ga=ask` path during client-side navigation. It is a source/model finding; live GA behavior was not exercised.

Use one consent transition implementation for both grant and denial and gate future events. Verify that a prior grant followed by denial stops future application-generated tracking, not merely that a fresh denied visit avoids loading the script. Do not remove consent controls to reduce code.

### Medium priority: unbounded/extra retries survive the earlier simplification

`index-status.ts` sets four retries and loops inclusively: five attempts. Fetches have no explicit deadlines, and the final HTTP 429/5xx failure sleeps another 32 seconds before giving up; HTTP-failure backoff totals 62 seconds. `gsc-months.ts` token/query fetches also lack explicit timeouts. Four concurrent requests are not a rate limiter: sufficiently fast responses can exceed a per-minute quota. Current Google limits are [2,000 inspections/day and 600/minute per site](https://developers.google.com/webmaster-tools/limits).

Use three total attempts, per-request deadlines, no wait after the final attempt, and a shared rate budget. Preserve partial results as unknown/error and expose failures; never interpret inspection failure as permission to delete student pages. `admin-crud.ts` also has five ID-allocation attempts; move that to three bounded attempts or an atomic allocator if contention actually warrants replacement.

### Medium priority: validation is not a deployment gate

The committed CI workflow runs on main pushes/schedules/manual dispatch, not pull requests; Cloudflare's independent git build can deploy while GitHub validation is still running. A green workflow after publication is different from validated publication. Add read-only pre-merge validation through the same `npm run ci` and separate authenticated reconciliation steps. Reusing a validated deployment artifact could remove one of two builds, but changing the deployment integration needs a tested recovery path; this audit did not change hosted settings or branch protection.

## 4. Simplify and optimize what survives

### Link checker: remove the batch barrier

After existing URL deduplication and host exclusions, **1,232 listing references map to 683 URLs on 382 hosts**. Deduplication is already in production and is not a new saving. One host has 116 distinct URLs. The current outer loop awaits an entire eight-host batch before starting the next batch, stranding slots behind slow/large hosts.

Use a fixed pool of eight workers drawing hosts from a queue. Keep one in-flight request per host, 400 ms spacing, every URL, every affected listing identity, and three request attempts. A deterministic model using the actual host distribution gives:

| Assumed time per request | Current batches | Queue in current host order | Reduction |
| --- | ---: | ---: | ---: |
| 200 ms | 157.2 s | 69.4 s | 55.9% |
| 1 s | 392.4 s | 163.0 s | 58.5% |
| 5 s | 1,568.4 s | 631.0 s | 59.8% |

These are **projections**, not timings against provider sites. Sorting hosts largest-first adds little in this model; remove the barrier before adding scheduling sophistication. Validate the URL/verdict multiset and maximum per-host concurrency, then measure a real hosted run.

### Directory interaction: remove repeated derivation, then test DOM work

The older audit's sub-100 ms filter finding does not cover the current corpus and clearing path. At 4× CPU throttle, seven synchronous input dispatches measured 16.7–50.9 ms for narrowed queries and **325.9/353.4 ms for clearing**. These are handler durations, not INP, and are single samples.

`ScholarshipDirectory.astro` calls `statMoney` independently for the main statistic, its label, and the upcoming statistic; other paths recompute statuses after building a shared status cache. `directory-client.ts` also performs a selector lookup for every visible card when writing list context. Remove repeated scans/selector work and cache stable paths at card parse time before considering virtualization. Use one per-render aggregate containing status/count/money outputs, retaining the same displayed values. Then profile reorder/style work. Acceptance target: at least 50% lower median clear-handler time over repeated alternating queries, unchanged visible order/counts and keyboard behavior, plus actual browser rendering measurements.

### OG generation: avoid invalidating every image for unrelated changes

The cache key includes the entire dependency lockfile. A test/lint-only dependency update can invalidate all 1,116 generated cards. Scope the rendering identity to the renderer/encoder, their relevant dependency graph, fonts, and render tree. Do not simply remove dependency invalidation: renderer changes must still rebuild images. The existing warm cache reduced local CI from 206.94 to 38.92 seconds; losing it overwhelms smaller optimizations. Hosted Cloudflare cache effectiveness was not inspected.

### Dependencies, database, and source maintenance

Align the two Cloudflare tooling trees during the compatibility upgrade rather than independently updating root Wrangler forever. Declare `tsx` directly before retiring the obsolete Drizzle generator; migration checksum/bootstrap scripts are the current operational path. Preserve migration history. Moving dependency labels between prod/dev without removing installed/runtime work does not count as a saving.

Admin pagination makes three parallel database requests; batching them can reduce **HTTP round trips from three to one**, while retaining the three queries. That is not a 66.7% SQL-cost or latency reduction. The analytics page already batches seven queries. Existing evidence does not justify replacing Neon, the ORM, or schema indexes to hit a quota. `sync-db.ts` repeats legacy-ID matching on every run; retire that recurring step only once explicit mapping completeness and recovery requirements are verified.

Remove truly unused helpers such as `formatVerifiedMonth` only after checking consumers at the implementation revision. Consolidate duplicate stable-JSON helpers only after checking their differing undefined/key-order semantics. Neither is a meaningful path to halving total maintenance effort. Public prose, tests, and explanation comments are not interchangeable with executable complexity.

## 5. The 50% budget, by aspect

| Aspect | Concrete path | Is a 50% cut established? |
| --- | --- | --- |
| Saved HTML/card payload | Selected fragments from one shared template | **94.8% in four-card prototype**; complete journey not implemented |
| Empty Saved DOM | Do not instantiate unsaved cards | **98.7% in prototype** |
| Worker size | Compact runtime projections | **45.1% measured**, short of target |
| Maintenance installation work | Validated executable artifact | Full install removed in retention prototype; **hosted savings unmeasured** |
| Link-check cycle time | Eight independent host workers | **55.9–59.8% projected**, not a hosted benchmark |
| Initial GA event duplication | One initialization/event path | **66.7% in component model** |
| PNG encoding CPU | Level 6 after retaining RGB encoding | **65.4% in sample**, with 6.9% larger image bytes |
| End-to-end release time | Avoid repeated setup/builds; keep validation before deployment | Target not established. Latest sampled CI job was 161 s; 50% budget is 80.5 s |
| Directory HTML and interaction | Remove repeated transport/derivation; investigate complete fallback plus incremental DOM | Target not established; preserve discoverability, browser find and navigation |
| Quiz load | Measure transport pooling before rewriting legacy UI | Target not established for complete compressed load; preserve all questions and matching |
| Fonts, CSS, visual assets | Audit actual consumers; keep specified typography and layout | No demonstrated safe 50% cut |
| Total build output | Remove repeated representations without deleting pages | No demonstrated 50% cut; public HTML alone is 44.2 MB of the 77.3 MB output |
| SQL network work | Batch admin page queries; remove completed legacy reconciliation | Three-to-one request opportunity; whole-database cost unmeasured |
| Retention/privacy | Remove overdue data on time; keep consent and delivery safeguards | Do not halve protections or weaken stated retention |
| Source/dependency count | Retire unused machinery, align tooling, use smaller operations artifacts | No validated whole-codebase/direct-dependency 50% reduction |
| External services and cash cost | Require each service to support a decision; inspect usage/bills before removal | Bills and live usage were not accessed; **no cost percentage claimed** |
| Content maintenance and editorial cycle | Review only changed records; consolidate status and evidence contracts | Time spent by editors was not measured; no percentage claimed |

These percentages must not be added together. They have different denominators, scopes, and levels of evidence.

## 6. Automate last: implementation order and acceptance

1. **Restore trust in the measurements and contracts.** Fix concluded-state transport, GA event duplication/denial, retention cadence, and publication escalation. Upgrade compatible platform tooling in isolation. Use targeted behavior tests; do not deploy a bulk rewrite while these signals are unreliable.
2. **Ship independent small reductions.** Replace the link batch barrier; remove repeated per-render aggregates; narrow OG invalidation. Compare outputs first, then actual cycle times. Each change gets its own rollback and three-attempt repair limit.
3. **Ship the runtime projection.** Derive it in the existing build, verify all lookup fields/IDs and public file parity, and measure Worker startup/transfer separately from raw file size. Keep JSON/hash/queue reconciliation authoritative.
4. **Complete the Saved prototype.** Prove offline/error recovery and exact visual/interaction behavior before eliminating the full-card fallback. Only then change the service worker's download plan.
5. **Package the surviving maintenance operations.** After source behavior passes, automate artifact creation and retrieval from the validated revision. Keep sender deduplication and retention correctness. Do not introduce a second hand-maintained implementation.
6. **Rework release automation only with measurements.** Reuse `npm run ci`, gate publication on the tested revision, preserve reconciliation when a service fails, and record real enqueue-to-live and runner durations. Run `npm run ship-check -- origin/main` and complete its RUN instructions for the actual implementation revision before shipping.

No new automation was installed by this audit. An audit-only document does not establish that its prototypes are ready to deploy.

## Limitations and failed attempts

No live DB contents, billing accounts, subscriber information, provider email sends, real draft publication, Search Console inspections, full live link crawl, Firefox/mobile performance trace, or Cloudflare deployment configuration were exercised. Existing repo/browser tests passing do not cover all findings above. The source-only security and retention findings are not claims of an observed breach or legal conclusion.

Expected deletion failures: offline directory loss; strict peer resolution; larger native PNG output. Each approach was stopped after its demonstrated adverse result. Harness/setup mistakes were corrected once each: unsupported local Python tar API, dependency import from the wrong directory, GitHub CLI invoked outside a git checkout without an explicit repository, and a browser probe aimed at an already stopped test server. None was a failed product repair or grounds for deleting student functionality. No same-problem repair approach was repeated three times.

The isolated workspace and full logs were created at `/var/folders/f1/8wyvbc9d26b8ksr__m502t5r0000gn/T/scholarab-deep-audit-f_dr7815`. Durable selected evidence is linked above; temporary artifacts may be cleaned later. All proposed reductions need verification against the newer shared repository before implementation.
