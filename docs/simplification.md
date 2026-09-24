# ScholarAB simplification record

## Critique third pass: September 23, 2026

From the re-run critique (27/40, `.impeccable/critique/2026-09-23T23-26-22Z__src-pages.md`):
the quiz had lost its only home-page link, four surfaces named the same status
four ways, and the detail card was first on screen but last in the source.
Local measurements against `dist/`, not hosted.

| Candidate | Outcome |
| --- | --- |
| Four status vocabularies (quiz "Opening later", detail "Opening soon", programs "Ongoing" / "Deadline TBA" / "Deadline not posted") | One set in `STATUS_WORDS` + `waitingLabel` in `lib/status.ts`; list-core, the quiz, the detail page (server and client repaint) and related rows all read it. A "What these mean" note under each Status filter. |
| Programs "Closed 0" chip | Hidden while its count is 0 (programs are only listed while open), shown if a stale cycle ever puts one there. |
| "Has school-only awards" under each of up to 67 school tiles | Removed; being on the list is what it meant. |
| /saved empty: "0 items bookmarked" over "Nothing saved yet"; programs button | Count line keeps only the device note at zero; buttons are the quiz and scholarships. |
| Quiz reachable only from a zero-results state | Nav "Find my scholarships", one line under the hero buttons, one line under each directory standfirst, the /saved empty state. A row inside the grid (as the critique proposed) was not built: paging and the view switcher own that grid. |
| Quiz results: undated #1, exit link as the loudest button, "Save these 4" | Open, dated awards first within each tier (stable sort, test added); save is the accent button and names the tier; hub link is text. Save buttons carry the award name. |
| Progress bar drew 6 segments under "of up to 8" | Draws the ceiling, the conditional two outlined; `role=progressbar` with the same text. Placeholder copy changed with it. |
| Detail card lifted by CSS `order` | First in the source with a hidden heading; grid areas on desktop. The rail is no longer sticky (card and rail are separate grid rows now), and its sticky offset rule in global.css is deleted. |
| Handwriting face on "Worth knowing" | Body face on the ruled paper; Patrick Hand no longer loads on detail pages (still on /about). |
| 3,084 inline SVG icon copies on /scholarships | One `<symbol>` sprite, `<use>` per row (both directories). /saved and the quiz keep the inline strings. |
| `data-search` blobs (599 KB) | Kept: rebuilding them client-side would split the one normalizer the index and analytics depend on. |
| Shipping 24 rows and fetching the rest | Not done: rows are the client's data source and the no-JS/crawler contract. Needs its own decision. |
| Home 8px carousel dots, 14px credits, 23px "Next deadlines", 22px row titles | 24px hit areas, drawn size unchanged; row titles 30px with negative margin. Left-side scrim for the hero byline. |

Repair attempts: the directory quiz line wrapped on /programs and moved every
program hub's toolbar (e2e hub-height test); fixed on the first retry by one
shorter sentence for both directories.

Add-back fraction: 0 of 13. Nothing removed had to be restored.

| Metric | Before | After |
| --- | --- | --- |
| /scholarships HTML, raw | 3,670,566 B | 3,219,289 B (-12.3%) |
| /scholarships HTML, gzip -6 | 365,929 B | 360,387 B (-1.5%) |
| /scholarships DOM elements | 32,786 | 31,274 (-4.6%) |
| Unit tests | 974 | 975 (1 ranking test added) |
| E2E | | 76 passed |

## AI-look audit, second pass: September 23, 2026

From the re-run critique (28/40, `.impeccable/critique/2026-09-23T21-27-54Z__src-pages.md`),
which found no hover lifts left and named the remaining tell as density:
uppercase label-face overlines, card grids, pill clouds, dark stat and capture
cards. Local measurements against `dist/`, not hosted.

| Candidate | Outcome |
| --- | --- |
| Detail page type and topic pills, uppercase subline, uppercase section heads, COPY LINK / VISIT OFFICIAL SITE / READ THE GUIDE, uppercase status pill | Type and topic pills removed (the breadcrumb already says both); headings in sentence-case display type; buttons and the status pill in sentence case, server and client copies both. Rail data labels (value, deadline) keep the label face. |
| Dark "GET A DEADLINE REMINDER" box | Light inline form under the card, same fields, same privacy line. |
| "More like this" and cross-dataset card grids with an identical CALGARY tag and no deadline | Rows: name, where/what, amount, deadline. |
| Home "Start where you are" card grid with slogan copy | "By type" rows: open now, total, next deadline. |
| Home "OR BY CITY" 25-chip cloud | Removed; the header dropdown lists every city on every page. |
| Home mini-quiz (a second quiz UI that seeded /match) | Removed with its script, `TEASER_KEYS`/`teaserOptions`, the `short` labels, 5 unit tests and its E2E spec. /match is the one quiz. |
| Quiz reassurance hints (PRIME PREP TIME, TOTALLY FINE, GRADES AREN'T EVERYTHING...) | Removed; informative hints kept in sentence case in the body face. Hints are now optional. |
| Results "$250 – $30,000" dark stat card | Replaced by the sentence it carried; "Save these N" saves the strong matches in one tap (new test). Count and tier pills are plain text. |
| "Under 30 seconds" for up to eight questions | "About a minute", from the one constant. |
| Guides index blog-card grid with kickers and read times | A list of titles and descriptions. |
| Guide dark band, GUIDES / kicker, N MIN READ, KEEP READING cards | White title with a back link; the hub's open listings in the empty right column (up to 8, soonest first); keep-reading as three plain links (same rotation). |
| Footer tagline, uppercase column titles, 56px logo, duplicate "Where listings come from" link | Removed or sentence case; 32px logo. |
| Mobile sheet "GO TO" eyebrow and tagline; no Deadlines or Guides | Eyebrow and tagline gone; Deadlines and Guides rows added (phone only). |
| Carousel "Find my match" button on all 18 cards, square buttons | One action per card, pill shape like every other button. |
| CTA labels "Apply now" / "Learn more" | "Apply", "How to apply" (applications through school), "Visit the program site". Status-dependent labels (Visit, Check the provider) kept: they say something true about the listing. |
| Columns/Gallery "1 of 1542" under a 1,083 group | Counts the group. |
| Group count 2.92:1; row counter read aloud | 0.62 ink; counter has empty alt text. |
| 404 with two pills | Search box and the six biggest hubs. |
| /deadlines at 78,000px with uppercase stats and pill jump chips | Next three months open, the rest folded under their headings (jump links open them); plain sticky month index under the header; sentence-case counts. |
| Frosted-glass hub CSS behind `BACKDROPS_OFF` | Kept: parked by the owner, not dead. |

Add-back fraction: 1 of 19 candidates (the status-dependent CTA labels) kept
rather than collapsed, because "Apply" on a closed or unconfirmed listing would
be false.

| Metric | Before | After |
| --- | --- | --- |
| Label-face class uses in public markup | 79 | 38 |
| Detector `wide-tracking`, 12 built pages | 42 | 1 |
| Detector findings total, same pages | 109 | 68 |
| Lines changed | | +555 / -771 across 23 files |
| Unit tests | 978 | 974 (5 teaser tests deleted with the teaser, 1 save-all test added) |

## AI-look audit fixes: September 23, 2026

From the 2026-09-23 critique (`.impeccable/critique/2026-09-23T20-54-02Z__src-pages.md`),
which named the site-wide lift-and-offset-shadow hover and the landing-page kit
on the home hero, /educators and /updates as what reads as "Claude default".
Everything is local, measured against `dist/`, not hosted.

| Candidate | Outcome |
| --- | --- |
| Hover lift (`translate(-3px,-3px)`) plus zero-blur offset shadow on buttons, quiz options, cards, chips, CTAs, and static hard shadows on the match card, price card, guide CTA and educators CTA | Removed everywhere. Hover now changes colour or tint only; a press sinks 1px. The `--sab-btn-shadow` token is gone. A test now fails on any new offset shadow or lift. |
| /educators stats row (with a filler "$0" stat), 2x2 tag cards, 01/02/03 steps, dark CTA block | Replaced by a printable one-page handout: the address, four plain lines, and the next five real deadlines. Counts are comma-formatted from the same helpers. |
| /updates dark hero, stats row, pill jump links, pill kind tags, "N CHANGES" eyebrow | White page with h1 and lede (the entry count moved into the sentence), plain month links, the kind as a coloured word. |
| Home hero count-up, "$ open right now" ledger, glow text-shadows, "Finally one place..." tail | The ledger became the next three deadlines (same list as #closing, pruned client-side once past). Glow halos became one 1px shadow over a slightly stronger scrim. The video stays (Ilia's call). |
| "Checked" date at 12.5px grey at the foot of the detail card | Moved under the deadline at 14.5px; added to every scholarship and program row. One month formatter (`formatVerifiedMonth`) now serves both, replacing a second copy in `[slug].astro`. |
| Eyebrows restating the h1 (ERROR 404, TERMS, PRIVACY, CREDITS, GUIDES), home TIME-SENSITIVE / HIGHEST VALUE, guide rail kickers, accent-word headlines, 01/02 numbers on the two home lists | Removed. The directory row counter stays (Ilia, 2026-09-22). |
| Dark CTA band at the end of every guide | Folded into the existing note card as one line in the guide's voice. |
| /about "HOW THIS WORKS" card, No-X/No-Y/No-Z titles, status dot | Plain section, statement titles, no dot. Body text raised from 0.65 to 0.8 ink. |
| /match trust chips ("◦ Completely anonymous ◦ Under 30 seconds") | One sentence. |
| Footer mailto links unstyled (set:html misses scoped CSS) | `:global` selector; all 18 footer links now compute the same 14px and colour. |

Add-back fraction: 0 of 10 candidates restored. Nothing was removed that a
retained behaviour needed; the educators and updates facts all survived in
plainer form.

| Metric | Before | After |
| --- | --- | --- |
| Hard offset shadow / lift declarations in `src` (excluding admin) | 23 | 0 |
| Detector `kicker-above-heading`, 12 built pages | 2 | 0 |
| Detector `tiny-text`, same pages | 1 | 0 |
| Detector findings total, same pages (rest are house style or false positives) | 116 | 109 |
| Lines changed | | +360 / -571 across 25 files |
| /educators.astro, /updates.astro lines | 258, 245 | 189, 201 |

Not measured: whether readers stop calling the site "Claude default". That is
the outcome this serves and only a re-run of outside feedback can show it.

## Contrast, tap targets and quiz start: September 21, 2026

Third pass over the 2026-09-19 critique, after the P0/P1 and P2/P3 passes on
the 19th. Every remaining item was re-measured against the build before it was
touched, and four of them turned out to be already closed. Local measurements
on a throttled emulated phone, not hosted results.

| Candidate | Outcome |
| --- | --- |
| `#8A8F8B` fine print on /privacy, /terms and the unsubscribe page (3.00:1) | Replaced with the muted ink the rest of the site already uses, `#5C5F5B` (5.91:1 on cream). Site-wide contrast failures across 18 sampled pages at two widths: 6 to 0. |
| Breadcrumb "/" on guides at 2.49:1 | It is a divider, not a step: `aria-hidden`, and raised off 0.3 so it is not also faint. |
| "HOW THIS WORKS", the three principle titles and "OPEN SOURCE UNDER AGPL-3.0" as divs on /about | Promoted to h2/h3. /about and /saved were the only two pages on the site with no h2 at all. Weight and margins are pinned, so the computed type is byte-identical to what the divs rendered. |
| /saved section heads and the empty state as divs | Promoted to h2, cards under them to h3. |
| 152 award links on /deadlines at 17px tall (mobile) | Padded to a 24px target with a matching negative margin. Single-line rows keep their exact pitch; two-line rows tighten 4px. Undersized targets on /deadlines: 152 to 2 on mobile, 322 to 2 on desktop. |
| 22 city links per hub page and 8 category links on /programs facets at 23px | Row gap moved onto the links themselves; 22 to 0 and 8 to 0. |
| Desktop search field (23px) and "Hide filters" (18px) | `min-height: 24px`. The phone block already took both to 44px. |
| Reminder-block fine print at `#6B716C` on `#141915` (3.56:1) | Paper at 0.55 (5.48:1). Found only after the detail-page sample was widened: the first two listings sampled were closed and render no reminder form. |
| The privacy link inside that fine print | It was the same colour as the sentence around it with no underline, so the one route from the reminder form to the privacy page was invisible. Now paper and underlined. Not a contrast finding; found while fixing one. |
| Quiz payload fetched only after its own module loaded | Preloaded with the document. |
| Stripping default values out of the quiz payload | Rejected, not shipped. See below. |

The one deliberate non-removal: every scholarship ships all 17 eligibility keys
even when null, false or empty, which is 37.5% of the payload's raw bytes.
Stripping them and rehydrating on the client measured 6.0% off the wire
(114,427 to 107,578 bytes gzipped) and 1.7 ms off the parse (1.89 ms to
1.44 ms, median of 40 runs). That does not pay for a rehydration layer between
the catalogue and the matcher, so the payload was left alone. Raw bytes are not
wire bytes and neither is a measured improvement here.

| Metric | Before | After |
| --- | --- | --- |
| Contrast failures, 26 pages x 2 widths | 8 | 0 |
| Undersized tap targets, same sample | 477 | 45 |
| Remaining 45 | | All inline links inside a sentence, plus one single-link breadcrumb: WCAG 2.2 2.5.8's inline and spacing exceptions. |
| /match first question tappable, Slow 4G + 4x CPU | 2,546 ms | 2,040 ms (20% less) |
| /match first question tappable, Fast 4G + 4x CPU | 1,460 ms | 1,092 ms (25% less) |
| Quiz payload request start, Slow 4G | 1,365 ms | 194 ms |
| Quiz payload network requests | 1 | 1 (the preload is reused, not doubled) |

Add-back fraction: 0 of 11 candidates restored. One was rejected on its own
measurement before shipping rather than added back after.

Verification: `npm run ci` green (52 files, 968 unit tests), Playwright 72
passed with the 8 existing skips, Impeccable's mechanical detector clean on all
ten changed files. One E2E locator was made stricter, not weaker: /saved now
has a second heading whose text contains "saved", so the assertion on the page
title was pinned to an exact match.

Not addressed, and not a defect this pass can fix: the 2026-09-19 P1 that the
interface reads as category-standard. That is a visual-identity question, and
polishing the current look is the one thing that cannot answer it.

## Hero film re-encode: September 19, 2026

Re-encoded from the H.264 masters (the higher-bitrate copies) at 1080p: H.265 CRF 28 and H.264 CRF 27, CRF 30/29 for the three high-detail takes (08, 10, 18), audio and timecode tracks dropped, faststart kept. SSIM against the masters is at or above what the old H.265 files scored (clip 01: 0.982 vs 0.987; clip 08: 0.958 vs 0.953).

| Metric | Before | After |
| --- | --- | --- |
| H.265 set (what Chrome and Safari fetch) | 63.7 MB | 29.3 MB (54% smaller) |
| H.264 fallback set | 80.2 MB | 34.6 MB (57% smaller) |
| First clip on a desktop first visit, measured in Chrome | 6.56 MB (plus a second clip, 13.2 MB total, before the prefetch change) | 2.71 MB |

Local measurements. Playback, the 6 s prefetch and the crossfade were verified in Chrome; the H.264 files were checked by a full decode, not in a browser that needs them.

## P2/P3 pass: September 19, 2026

| Candidate | Outcome |
| --- | --- |
| Three rusts (#B8541F, #9C4518, #A0491A) | One: #A0491A, 5.54:1 on cream. Closed/TBA chips moved from 55% to 68% ink (3.68 to 5.44:1). |
| Hand-typed counts in the deadlines-by-month guide (644, 259, 417 and 20 more) | Removed; computed from the catalogue at build (`src/lib/deadline-stats.ts`). They had drifted to 703 and 265, and "April, the next busiest month" was wrong (June is). |
| Second hero clip downloaded at page load | Deferred until 6 s before its handoff: first-visit video drops from two clips (13.2 MB measured) to one. Local projection, not a hosted measurement. |
| 01 to 18 badges on /guides, 01 to 03 on /about principles, 01 to 04 on /educators features | Removed; not sequences. /educators steps keep theirs, which are. |
| Hex literals in global.css | 129 to 21 (the rest are token definitions and one-offs). Components untouched. |
| Gray #6B7280 on /deadlines (4.41:1) | Replaced with brand ink at 68% (5.91:1). |

Add-back fraction: 0 of 6.

## Trust and phone-layout pass: September 19, 2026

From the 2026-09-19 Impeccable critique (P0 and P1 only). Local build measurements, not hosted results.

| Candidate | Outcome |
| --- | --- |
| Tier label on every quiz result ("Strong match" on 20 of 20 for a Calgary grade 12 STEM profile) | Removed when every row shares a tier. Rows gated on something the quiz never asks (gender, Indigenous or BIPOC identity, care, RAP/CTS, financial need) show "Check: ..." instead. "You qualify for" is gone from the quiz, `/match`, the guide CTA and two guides. |
| Generic three-step "How to apply" on every detail page | Removed. Restored in part (2 true steps, no invented submit step) for school-run awards that do take an application. Detail pages with the section: 517 of 1,310, down from all of them. |
| "Apply now" on awards whose own notes say there is no application | Replaced by "How it is awarded" on 41 pages (`src/lib/apply-method.ts`, strict phrases, tested against false positives). |
| Second link to the same URL ("Visit official site") on TBA and ongoing listings | Removed; kept only where the main button is a dead Closed/Opens label (377 pages). |
| Sort and chip rows above the first card on phones | Folded behind one Filters button with an active-filter count. First card on the first 375x812 screen of `/scholarships/` and `/scholarships/calgary/`, previously below it. |
| Eyebrow labels on the homepage quiz teaser and the quiz results | Removed. |

Add-back fraction: 1 of 6 candidates partly restored (17%). Nothing public was deleted to reach it; the listing notes moved into their own ruled-paper block instead of being cut.


## First implemented cuts: September 12, 2026 UTC

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

## Deep reduction audit: September 12, 2026 UTC (isolated prototypes)

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

## Desktop UX audit: September 11, 2026 (no implementation changes)

The [desktop audit](desktop-ux-audit-2026-09-11.md) records live Mac/Firefox reproductions and student outcomes. Removal candidates for a repair pass are the calendar export action when it has no dated events, self-linking previous/next arrows for one-result lists, and duplicate availability interpretations across directory/detail/match surfaces. These are proposals, not completed removals. Public content and the legacy quiz were retained; no repair attempts or removal experiments were performed. Add-back fraction is not applicable (zero attempted removals), and no cycle-time or hosted performance improvement is claimed. Measured audit evidence includes a 118-byte calendar export containing zero events and return navigation expanding a one-result search back to 1118 listings. No new automation was added.

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

## Astra hunt ingest, 2026-09-19

Astra collected 1,417 candidate awards into a gitignored JSONL file. Triage dropped 100
(87 URLs that pointed at a portal search page rather than an award, 12 deadlines whose
stated year had passed, 1 duplicate) and rewrote 138 em dash titles. Of the 571 broad
listings that survived, 332 carried a deadline string, 283 parsed to an ISO date and 173
of those fall in the future.

Verification before any of it shipped: every one of the 95 source URLs was fetched, one
host at a time (93 returned 200, one 403 on a vendor page that was dropped, one page had
gone). Each award's source quote was checked against the fetched page text; 160 of 173
matched, and the 13 that did not were held back rather than guessed at.

142 listings were written from the fetched page text and added. 4 ATA awards were dropped
as being for certified teachers rather than students, 4 Indspire sub-funds were dropped
because they share one application, and 2 were held for lack of a confirmable page.

Removal candidates and outcomes: the portal-search URLs, the stale years and the vendor
SEO page were removed outright and none were added back, an add-back fraction of 0.

## Astra hunt, amount-verified ingest, 2026-09-19

The 844 hunt rows carrying a dollar figure were re-fetched (286 URLs, 110 new
fetches, 4 dead) and checked against the live page: the award title had to
appear, and its amount had to appear inside the award's own section rather than
anywhere on the page. 522 passed, 196 failed on a missing title, 122 on an
unconfirmed amount, 4 on an unreadable page.

Removal before improvement: of the 508 fresh passes, 328 came from 36
multi-award handbooks and portals where a nearby amount is not evidence, so they
were held back rather than shipped. The 41 Red Deer Polytechnic portal awards
were listed individually because 22 of them were already listed that way; the 32
University of Calgary continuing awards were collapsed into one listing because
the hunt had only crawled titles starting with "A" and shipping them would have
published an alphabetical fragment as if it were coverage. The 26 NAIT rows were
dropped as already covered by the NAIT aggregate.

Add-back fraction: 0. Two authored listings were withdrawn before shipping, one
as a duplicate of an existing entry and one because it could not be described
without wording the gender rule forbids.

Catalogue 1,303 to 1,416.

## Directory head, 2026-09-22

The lone headline figure beside the title and its three client-side keys
(`stat`, `stat-label`, `stat-soon`) were removed in both directories, along with
their CSS. One module, `src/lib/ledger.ts`, now builds the figures and the month
chart for both the server pass and the client repaint, where the scholarship
header used to keep the same arithmetic twice (frontmatter and `summary()`).
The pill styling on filter and sort chips was removed rather than restyled; the
buttons, their counts and their behaviour are unchanged.

Add-back fraction: 0. Nothing removed had to be restored.

## Astra hunt leftovers, 2026-09-22

The 1,027 hunt rows still unlisted after the two September 19 passes were worked
source by source rather than row by row, on the rule that a school handbook or
college booklet gets one listing and an award only gets its own listing when it
has its own application and a stated amount. 126 listings were added (catalogue
1,416 to 1,542), each written from the fetched page, PDF, OCR text or rendered
page, never from the hunt's summary.

Outcome per row: 598 are on a page that now has a listing or are named in one,
358 are covered by an aggregate (the King's University, Keyano, NWP and CBT
groupings written in this pass, or the existing NAIT, University of Calgary,
Northwestern Alberta Foundation, 4-H and Indspire listings), 32 were dropped as
recognition only (trophies, honour roll, MVP awards with no money), and 39 were
held with a written reason: teacher-only or graduate-only awards, a male-only
award the gender rule cannot express, a 2019-20 handbook, club newsletters from
2016 to 2023, a password-protected page, and two Drumheller forms that now 404
while the school's current list is a private document. The Skipping Stone Trans
Community Award was listed as the single named exception to the gender rule,
and `validate-data` carries that one phrase as an exception.

Removal before improvement: about 330 per-award rows from handbooks and portals
became 30 school and institution listings instead of 330 thin pages; one listing
with gender-identity eligibility inside an aggregate was left out of its text.
A school board code the quiz does not know (CSCN) was removed from one listing
instead of adding a new board to the quiz.

Add-back fraction: 0. Nothing collapsed or dropped had to be restored.

## Directory figures and month chart, 2026-09-22

Removed on request from both directories and every hub that shares them: the
four figures and the twelve-month chart between the standfirst and the toolbar
(`SabLedger.astro`, `src/lib/ledger.ts` and its test, the month and figure
helpers in `list-core.ts`, the directory client's `paint` hook, their CSS, the
e2e assertions and the design-system entry). The lone headline figure they
replaced was not brought back. 464 lines deleted, 6 added.

Add-back fraction: 0. Nothing removed had to be restored.

## One rule for "open", 2026-09-23

Candidates: five separate definitions of "open" (home scholarship slides,
home program slides, the program directory's count line and OPEN NOW group,
the guide and educator cards, /deadlines). Removed four; every count now reads
`status.ts` through `lib/counts.ts`, and "open" means a real deadline not yet
passed (Ilia's rule). Open with no deadline is its own status, `ongoing`, for
scholarships as well as programs, with its own chip and group ("No fixed
deadline"). The program sort's closed-only status rule was replaced by the
scholarship one (status leads every sort), so one grouping rule serves both.
Guarded by `src/lib/counts.test.ts` and `e2e/numbers.spec.ts`, which reads the
numbers off the built pages. The planned service-worker change was dropped:
`public/sw.js` is already network-first, and the stale page the critique saw
came from a stopped preview server.

Add-back fraction: 0. Nothing removed had to be restored.

## Phase 2 of the 35 plan, 2026-09-23

Removed:
- the hero's "Next deadlines" list, a duplicate of Closing this week, along with its prune script and CSS;
- the third row verb, "Visit";
- three sort chips per directory, now one picker;
- two home fallback phrases, replaced by the shared status words.

Kept after checking:
- the notebook block, already aligned;
- the view switcher and the row numbers, both Ilia's requests and left for him to decide.

Add-back fraction: 0. Nothing removed had to be restored.

## Phase 3 of the 35 plan, 2026-09-23

Removed:
- the repeated quiz subhead and trust line after question 1;
- the Retake-only route to change an answer, now one tap per answer.

Considered and not done:
- a hard exclude on youth-in-care awards when the quiz never asked. It would break the /match promise that an unanswered question counts as unknown, so those awards rank lower instead.

Add-back fraction: 0.

## Phase 4 of the 35 plan, 2026-09-23

Removed:
- the second email regex in `/api/alert`; the form and the API now share `EMAIL_RE` and `emailProblem` in `lib/utils.ts`;
- the hand-written "Date not confirmed" sentence in the status note, now read from `lib/glossary.ts`;
- the height and width transitions on the header dropdown and its hover glide, now transform only.

Considered and not done:
- a glossary entry for "rolling". No surface prints it as a label; it appears only inside listing prose, so a definition would be noise.
- the definition line under the hub standfirst. It moved every chip row on two hubs 57px lower than on the rest, which `smoke.spec.ts` rejects, so it sits over the results instead.

Measured on `dist/`: /saved layout shift with one saved award went from 0.0995 to 0.0002 (footer, 1280px and 375px), after reserving one screen of height.

Add-back fraction: 0 (one placement moved, nothing restored).
