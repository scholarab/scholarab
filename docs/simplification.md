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
while the school's current list is a private document. One award (#1606) was
listed as the single named exception to the gender rule, and `validate-data`
carried that one phrase as an exception; both were withdrawn on 2026-09-28.

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

## After the Phase 5 critique, 2026-09-24

The critique held at 27; these are its P1 and P2 findings.

Removed:
- the second home carousel as a separate section; one carousel now holds both sets behind two tabs (Ilia's choice). The phone home page went from 5,536px to 4,847px.
- ten of the twenty quiz results on first view; "Show all" keeps the rest one tap away.
- the programs block on detail pages when none of its programs is open.

Changed:
- the matcher read field tags case-sensitively, so "Business", "Nursing" and "Commerce" never met a quiz answer; tags now map onto the quiz's five fields. A different field, and family, membership, gender or newcomer gates read from the audience line, become Check notes, and a row with one is never "Strong". Local 38 Heritage (children of Calgary public teachers) was #1 Strong for a Calgary Business student; it is out of the Strong set now, guarded by a real-data test.
- the home page and the 404 page preload Public Sans 600. Mobile home CLS 0.05 to 0, and the 404 page 0.04 to 0 (measured on `dist/`).

Add-back fraction: 0.

## After the 26/40 critique, 2026-09-24

The critique's P1 and P2 findings. Measured on `dist/`.

Removed:
- the repeat of "Due this week" rows inside their month; the month now says how many are listed above.
- the open list of 460+ undated awards on /deadlines; it is folded behind "Show all". The phone page went from 54,348px to 9,224px.
- program grade text from the /deadlines amount column; it shows a stipend, "Paid", or nothing.

Changed:
- quiz results are two groups, each best fit first: "Open now", then "Opens later", with at least half of the first ten from each when both have that many. A Calgary Business student now sees five awards open today; before, all ten were not open yet.
- "None of these" (board) and "Another school" are answers, not skips: board-only and school-only awards drop out, and the school list no longer offers schools the data ties to a board.
- two new audience gates: a parent or guardian "at" an employer (ENMAX) and a named sport or athletes. Both become Check notes.
- Horatio Alger Canadian and National Entrepreneurial: grades 12 to 11, matching their own text.
- "More like this" scores neighbours due within 45 days of the award.
- detail pages: "Worth knowing" sits directly under "Who can apply".
- the quiz scrolls a hidden question heading back into view.

Not done: requirements are not generated from the parsed eligibility fields, because those fields had the Horatio grade wrong. The detail pages still don't say what to submit, because no listing has that data.

Add-back fraction: 0.

## After the 27/40 critique, 2026-09-25

All five findings. Measured on `dist/`.

Removed:
- the closed and "Date not confirmed" scholarship cards from the first view. Both sections load shut with their headings and counts showing, and one tap opens them (Ilia's choice). Programs keep theirs open, because 86 of 121 have no confirmed date.
- the provider line on program rows on phones; the detail page has it. The three facts run as one line capped at two. Rows went from 286px to 230px on average, and /programs from 9,685px to 8,324px at 375.

Changed:
- data: 4 board gates (2 CCSD, 2 GPPSD) and 6 institution gates filled from their own audience lines. Other audience lines that named a board were left alone: 3 named a county and 1 a teachers' union.
- matcher: heritage-specific audiences and a chosen school that is not the award's become Check notes. For a CBE, Western Canada and Mount Royal student, Mary Ngo, Knowlton and CKSF are gone from the top ten.
- search reads 20 common misspellings of the site's own words ("bursery", "schollarship", "calgery") as meant. No fuzzy matching.
- restored /match results: the placeholder, intro and footer no longer paint before the results. The layout shift went from 0.633 to 0 on desktop and from 0.173 to 0 on mobile; a first visit stays at 0.
- detail pages: "Worth knowing" sits inside "Who can apply". "More like this" also scores same-size awards, and the link-floor repair takes slots from the most relevant pages first, not the earliest-sorted ones. Knowlton's neighbours went from fish-and-game and band bursaries to Horatio Alger Entrepreneurial and a business leadership award. Build time went from about 12s to 14s.
- detail-page arrows walk the list as shown, so they skip shut sections.

Add-back fraction: 0.

## After the 25/40 critique, 2026-09-26

The two findings Ilia picked. This is the last critique run (Ilia, 2026-09-26); from here fixes are checked by measurement.

Removed:
- three of the six status headwords. Every surface now leads with "Open now", "Opens later" or "Closed". Finer states are a qualifier after the headword: "Open any time" (no deadline), "Opens later, date not posted" (a rolled-forward date), "Opens Mar 1". One set of words in `STATUS_WORDS`; the counts did not change, and "open now" still counts dated awards only.

Changed:
- a spring note (`openLaterNote` in lib/status.ts) above the first row of a scholarship hub, and under the quiz results headline, when at least half the list opens later. It names the month only when at least half of the dated waiting awards share it, read from real open dates. Calgary: "Most of these open later, most of them in March." The province-wide list does not get it, because most of it is open or undated. The hub note hides while a filter or search is on. Layout shift on the Calgary hub stays 0.

Cost: the quiz note moves the first result from 822px to 887px on a 375px phone.

Add-back fraction: 0.

## After the 27/40 critique, 2026-09-26

Ilia asked for one more full critique (27/40) and then all five findings. Measured on `dist/` at 375 and 1280; layout shift is 0 on every changed page at both widths.

Removed:
- the phone quiz results' eight wrapped answer chips (181px) as a block. They are one line that scrolls sideways (65px), and every chip still opens its question. The first result moved from 887px to 685px on a 375px phone.
- the mobile-only header items. Deadlines and Guides are in the desktop bar too (seven links); between 901 and 1100px the three social icons give way, since the footer has them.
- the mock copy of `isRestrictedCheck` in the quiz test; it now uses the real rule, which is how the old rule survived there.

Changed:
- matcher: an average band rejects only when its top is below the bar. "80 to 89%" is 85 in `averagePercent` and 89 in `averageTop` (`AVERAGE_BAND_TOP` in lib/quiz.ts), so a minimum of 86 to 89 keeps the award with "Check: Needs an average of 88%" instead of dropping it. Loran was invisible to every student in that band.
- quiz results: open awards due within 30 days that the student is not excluded from lead the list, biggest first, up to three of the ten. For a Calgary Grade 12 at 80 to 89%, Loran is now row 1; it was absent.
- quiz rows show the fit tier beside their Check notes, so "3 strong matches" counts three rows that say Strong. Before, a Check replaced the tier, and "5 strong" sat over two Strong rows.
- 103 listings open only to post-secondary students (every grade `post-secondary`) sit in a shut "For after high school" section at the foot of every scholarship directory. Nothing was removed; Calgary has 6, Red Deer 43.
- detail card: a NEEDS row (minimum average, grade outside 12, financial need) between the deadline and Apply. Loran's 88% was only in the About prose.
- phone directory rows: the deadline sits under the amount, beside Save and Apply, instead of below them. Calgary hub 6,948px to 6,662px.
- /scholarships: "Show more" sits under the last card it extends, above the shut sections, and keeps focus after a press. It was under three collapsed headers.
- /deadlines: a "Where you live" picker (the directory's town hubs) hides awards tied to other towns and recounts every month, chip and the stats line. Province-wide, national and program rows always stay. Calgary shows 519 of 1,002; the choice is kept in `?where=`. Only shown with scripts, gated on `html.js` so the page never shifts.

Add-back fraction: 0. One attempt was replaced before shipping: letting every due-soon "possible" match in added 21 rows, most of them awards the student could not apply to.

## Admin analytics: today from midnight, 2026-09-26

The daily chart listed only days with at least one event, so after Alberta midnight it ended on yesterday until the first visit and looked stuck (Ilia, 1:31 AM). The server now appends today at 0, using the same Alberta clock that already supplies the current month. The heading reads "today and the last 13 active days". No query, schedule or job was added. Add-back fraction: 0.

## Home hero: quiz line on one line, 2026-09-26

The line under the hero buttons had a 62ch cap that pushed "needed." onto a second row (Ilia's screenshot). Removed the cap and set it to one line above 900px; phones still wrap. Measured on the build: one line at 901px and 1440px, no horizontal overflow; two lines at 390px. Add-back fraction: 0.

## Save button: worded, primary before opening, place recorded, 2026-09-26

September had about 4.7 saves per 100 listing views once two bulk sessions are set aside, against about 45 Apply clicks per 100. The listing-page save was a bare bookmark icon beside the Apply pill. It now reads "Save" / "Saved". On the 332 scholarships that have not opened, where the Apply pill is a grey "Opens ..." label, the save button takes the green fill as "Save for later" and the two stack full width (side by side, the date wrapped onto two lines in the card). The save toast carries a "See your list" link to /saved/. Each save now records where it was made (`page`, `row` or `quiz`) in `meta`, from a fixed list the server enforces; saves without it still count, for cached pages. No new component, event or table. Measured on the build: both layouts fit at 375px and 1440px with no horizontal overflow. Effect on the save rate is to be measured after a week or two, by place. Add-back fraction: 0 (one layout, side by side, replaced before shipping).

## Admin analytics: where saves happen, 2026-09-26

The save place recorded since 246d46c was only readable by querying the database. The admin page now groups saves by `meta` in one more query in the existing batch and shows Listing page / Directory row / Quiz results with each share and the period's saves per 100 views, under the daily chart and on the same month tabs. Saves from before the field show as "Not recorded" and only when a period has them. No new endpoint or table. Add-back fraction: 0.

## Save button worded on directory rows and quiz results, 2026-09-26

246d46c worded only the listing-page button; every directory row and quiz result still had the bare bookmark (Ilia's screenshot). Rows and quiz results now read "Save" / "Saved" beside the icon, in the Apply link's size and weight, updated by the existing state setter. The button went from a fixed 34px square to a 34px minimum with padding; row heights and the 44px phone tap target are unchanged. Measured on the build: label on one line in Grid, List, Columns and Gallery at 1440px and on phone rows at 375px, no overflow. Add-back fraction: 0.

## Search: misspellings read as the word meant, 2026-09-26

Twelve of the 37 logged empty searches were misspellings of words the site carries (voley, medicne, community involvment, five spellings of "energy revealed"). The fixed SPELLING list in `search-text.ts` gained those, and a general fallback now covers misspellings nobody has typed yet: `correctQuery` swaps each word that matches nothing for the closest word in the listings (one slip up to six letters, two above, same first letter, never under four letters or with digits), and only runs after the search as typed found nothing. The directory shows those results under a note ("No listing says "hocky". Showing results for "hockey"."); on a facet page the empty state's link carries the corrected word, and a corrected typo is no longer logged as a content gap. It reuses the existing page blobs and /search-index.json; no new file, dependency or request. Measured against the full index: 30 common misspellings resolve correctly; "camera" (-> cameron) and "hocky" (-> rocky) were wrong guesses before the same-first-letter and six-letter rules and are now left alone; real gaps (machinist, criminology, aerospace) still log. Correction over the 5,907-word index runs in about 2 ms per word. Add-back fraction: 0.

## Search: accents fold away, 2026-09-26

"metis" found 4 scholarships and "métis" 18, because the one normalizer every search surface shares (`normalizeSearchText`) kept accents. It now folds them (NFD, marks removed), so the page blobs, /search-index.json and the typed query all agree. Measured on the build: "metis", "métis" and "Métis" each find the same 22; "ecole" and "école" each 7. One line in one function; no new code path. Add-back fraction: 0.

## How it works walkthrough, 2026-09-26

First-time visitors saw a directory and did not learn that the site also builds a shortlist, saves, keeps a deadline calendar, emails before deadlines and has guides (Ilia, after polymarket.com's "How it works"). One `SabTour.astro`, included once by the header: a native `<dialog>` with five steps (Find, Shortlist, Save, Deadlines, Guides) and a closing "Find my scholarships". Each picture is a small copy of the site's own parts; the example row is the real Loran listing and the counts are the directory's, read at build. Every claim is checked against the site (reminders 30, 14 and 3 days; answers stay on the device; the email is the only personal information held). Opened from "How it works" in the bar (text from 1101px, the "i" alone from 901, a row in the phone menu); the social glyphs now show from 1360px, where the bar has room for both. Two new events, `tour_open` and `tour_finish`, on the admin tiles. No framework, no new dependency; the dialog is closed until asked for, so it adds no layout shift. Found on the way: Tailwind's base forces `display:none !important` on `[hidden]`, so the steps use `data-off` + `inert`; the global reset zeroes dialog margins, so the dialog sets `margin: auto`. Measured on the build: no wrapping or overflow in the bar at 901, 1100, 1101, 1279, 1280 and 1440px; the dialog keeps one height across steps (535px desktop, 486px at 375px). Add-back fraction: 0.

## How it works opens itself on a first visit, 2026-09-26

At Ilia's request the walkthrough now opens once per browser, 1.2 s after the first page loads, and never again once it has been seen (opened either way; `sa_tour_seen` in localStorage). It stays shut on /match (the student is already in the quiz), for automated browsers (`navigator.webdriver`, so Playwright and script-running crawlers never see it), and where storage cannot be read, which would otherwise mean opening on every page. `tour_open` now carries `auto` or `button` from a fixed list the server enforces, so the admin counts can tell the two apart. The GA consent banner is not modal, so it waits under the dialog. Measured on the build: opens on a fresh /deadlines/ load with CLS 0.0000, stays shut after a reload; E2E covers first visit, second page and /match on desktop and phone. Add-back fraction: 0.

## Program research pass, 2026-09-26

Ilia asked for every research and enrichment program an Alberta student can apply to. Each candidate is checked against the provider's own page before it goes in; no openDate or deadline is guessed (TBA when the provider has not posted one). Rejected on checking, so they are not re-chased: Canadian Mathematical Olympiad Qualifying Repêchage (discontinued 2026), Caribou Mathematics Competition (ceased August 2025), Encounters with Canada (closed 2021; the domain now serves a casino site), Canadian Science Fair Journal (ceased March 2025), "RYLA in the Rockies" (a Colorado camp, not Alberta's). The corpus tests caught two data mistakes on the way and both were fixed in the data rather than the tests: a grades field the quiz could not read ("Age 15+, Grade 9 Science completed", now "Ages 15+"), and meta descriptions too short or, with the "Applications close" prefix, too long.

- Batches 1–2 (ids 154–166): Alberta Innovates Summer Research Studentships (UCalgary), Alberta Envirothon, CEMC Senior/Intermediate, Beaver, Fryer/Galois/Hypatia and Team contests, NACLO, National Biology Competition, RYLA (District 5360), RYLE (District 5370), USACO, Canada/USA Mathcamp, TELUS World of Science Edmonton volunteering. 129 -> 142 programs.
- Batches 3–6 (ids 167–183): Avogadro and Chem 13 News chemistry exams, Willow River Biology Contest, Legislative Assembly of Alberta Page Program, Calgary Mayor's Youth Council, Youth Volunteer Corps (Calgary), PROMYS, Ross Mathematics Program, CAYAC (Alberta Children's Hospital), Stollery Youth Advisory Council, U of A HSMUN, CAHSMUN, CalgaryHacks, Canadian Student Leadership Conference, Canadian Economics Olympiad, Canadian Astronomy and Astrophysics Olympiad, the Aristotle Contest. 142 -> 159 programs. Also rejected on checking: Alberta Minister's Youth Council (paused since November 2025), HackED at the U of A (college students only), Research Science Institute (no confirmed Canadian selection route).
- Batches 7–10 (ids 184–197): Canada Service Corps, Queen's Commonwealth Writing Competition, NSS Space Settlement Contest, SAIT summer camps (grades 9–12), dual credit at Lethbridge Polytechnic, Red Deer Polytechnic, Northwestern Polytechnic, Bow Valley College and Northern Lakes College, the Canadian Cadet Program, Calgary Zoo Conservation Champions Club and Junior Zoo Guides, Yale Young Global Scholars, Summer Science Program. 159 -> 173 programs. Also rejected: NAIT dual credit and Keyano dual credit (no provider page, only school-board pages and old news), U of A science camps (top out at Grade 11 and overlap the listed U of A bootcamps), Canadian Light Source Students on the Beamline (a teacher-led class program, beamtime currently limited).
- Batches 11–12 (ids 198–203): Canadian Math Kangaroo, Rotary Youth Exchange (long-term), Jack.org chapters, CEMC Math Circles (online), Girls Who Code Canada summer programs, Alberta Aviation Museum youth volunteers. 173 -> 179 programs. Also rejected: the Law Lessons / Justice Education Society mock trial (held in Vancouver).
- Batches 13–15 (ids 204–208): Parlement jeunesse de l'Alberta, Alberta Junior Forest Wardens, Métis Youth Summer Employment Program (Rupertsland), Centre for Health Informatics Summer Studentship (UCalgary), WISEST SET Conference. 179 -> 184 programs. The build's legal wording rule (gender eligibility reads "female" or nothing) caught the provider's own phrase on the SET Conference; the entry now reads "female students". Also rejected: Actua for-credit InSTEM (no current application route), RhPAP high school events (program pages return 404), U of A MD Ambassadors (booked by schools, no student-facing application), UCVM vet camp (no ages published), the U of A rural-medicine page (resources, not a program).
- Batches 16–17 (ids 209–216): Wharton Global High School Investment Competition, Diamond Challenge, Purple Comet Math Meet, picoCTF, John Locke Institute Global Essay Prize, Scholastic Art & Writing Awards (open to Canada outside Quebec), Blue Planet Awareness Contest (Bow Seat, formerly Ocean Awareness), The Earth Prize. 184 -> 192 programs.
- Batches 18–19 (ids 217–220): Green Certificate Program, Youth Agriculture Speaking Championships (Calgary Stampede), U of A Programming Contest high school division, Calgary Collegiate Programming Contest. 192 -> 196 programs. Also rejected: Olds College Future Leaders in Agriculture camp (no open application found), MRU MEG Energy science camp (source is from 2015), seed2STEM (BC students only), Western's Discovery Healthcare (Ontario only), uOttawa summer enrichment (local day program), SEAR drone program (runs through school district partnerships).
- Batches 20–21 (ids 221–224): National Youth Remembrance Contests (Royal Canadian Legion), Poetry In Voice, Venturer Scouts, Girl Guides Rangers. 196 -> 200 programs. Also checked and left alone: the eight retired programs (Sanofi Biogenius still redirects to Sanofi's corporate page; Tate HIP confirmed ended). Rejected: FIRST LEGO League in Alberta (grades 4–9), World Robot Olympiad (no Alberta event found), Big Brothers Big Sisters teen mentoring (arranged by schools, not joined by students).
- Batches 22–23 (ids 225–228): YSC Virtual Regional STEM Fair (for communities without a regional fair; the Alberta regional set stays closed at seven), Experiences Canada group exchanges, Alberta Youth Leaders for Environmental Education (ABCEE), CPAWS Southern Alberta Youth Conservation Collective. 200 -> 204 programs. Also rejected: CSA Junior Astronauts (last campaign 2021), CRINA summer studentships (high school eligibility not stated; they run through the SRS already listed).
- Batches 24–25 (ids 229–244): UBC Future Global Leaders, Hack Club, The Concord Review, Journal of Emerging Investigators, HiMCM, Cubes in Space, Wolfram High School Summer Research Program, GENIUS Olympiad, European Astro Pi Challenge (Canada takes part as an ESA cooperating state), Canadian Improv Games in Alberta (run by Rapid Fire Theatre), AwesomeMath, Rotary Interact clubs, International Youth Math Challenge, Stanford Pre-Collegiate Summer Institutes, Lumiere Research Scholar Program, Harvard Secondary School Program. 204 -> 220 programs, where this pass stops (Ilia's target). Also rejected: Queen's ESU SEEQ (discontinued), Canadian Young Scientist Journal (the domain now serves a casino site), ESA Moon Camp (ages 5–16, teacher-submitted), World Scholar's Cup (no Alberta round; nearest is Vancouver), Hampshire College Summer Studies in Mathematics (moving campus in 2027, no new details yet), DECA and a Prime Minister's Youth Council (no current Alberta or Canadian application found), NHSJS (eligibility and fees not published).

## Undated awards stop saying "Open any time", 2026-09-26

An outside review of the site found that an empty deadline rendered as "Open any time", with "Open now." in the search snippet and an Apply button, on 464 awards, while about 107 of those awards' own notes said there was no application, the round had closed, or the date was unknown. Only 2 notes describe a year-round intake. `scholarshipStatusOf` now reads a missing deadline as `unconfirmed` ("Opens later, date not posted": Details instead of Apply, and "This year's deadline is not posted yet." in the snippet) unless the award carries `rolling: true`, a new JSON-only flag set on those two (Canada Company Children of the Fallen, ACFN High School Graduation Incentive) and passed through the same payloads as `deadlineEstimated`. The /deadlines tail heading changed to match. Data fixes from the same review, each taken from the listing's own notes or the provider's page, never guessed: 68 Keyano College awards due December 18 are for students already enrolled there and are now tagged post-secondary, so they sit under "For after high school" (the Red Deer Polytechnic entrance awards the review also named are due May 31 and do take Grade 12 applicants, so they stay); four awards that open later got the provider's open date (Lakeland Co-op January 25, Loans Canada and Double A Solutions January 1, Edmonton Epilepsy January 5); Burns Fire Fund opens in November with no day given, so it is marked between cycles; 28 dates the notes call last cycle's or assumed are now `deadlineEstimated` (six CPA awards, all 13 Cochrane High package awards, four of which were already flagged, PSAC, Air Cadet League, Calgary Black Chambers, Twice But Nice, County of Wetaskiwin ASB, CCSPE, and three Black Gold School Division awards from a summary last updated April 2025). Checked and left: school handouts that give an annual date with no year (Paul Kane, Bellerose, Fort Saskatchewan High) state a recurring date and keep it. Four tests that encoded the old reading were updated to test both readings, plus one new test. Add-back fraction: 0.

## Footer tells the truth about review; "research programs" becomes "programs", 2026-09-26

The footer said listings are "written and reviewed by a person". Ilia does not review most of them himself, so it now says they are researched with AI tools and checked against each provider's own page, which is the process the data files record (`lastVerified`). The program directory holds 220 entries of which about a dozen are research placements; the rest are contests, olympiads, clubs, summer schools and dual credit, so calling the whole directory "research programs" overstated it (external review, 2026-09-26). Every generic mention now says "programs": the /programs title and ItemList name ("Programs for Alberta High School Students"), breadcrumbs, footer, nav label, quiz option and results heading, /saved labels, the walkthrough, home, educators, deadlines, terms, 404 and the generated fallback snippet. Places that mean research keep the word: the Research category hub, the research-and-mentorship format hub, the research guide and the HYRS references. Search Console risk accepted by Ilia: the old /programs title ranked; re-measure its impressions around 2026-10-24. Add-back fraction: 0.

## Waiting states stack in the deadline column, 2026-09-26

With undated awards now reading "Opens later · date not posted" (and estimated ones "Opens later · date not posted, around Sep 26"), the text ran wider than the row's 200px deadline column, and `nowrap` pushed it left over the amount (Ilia, on /saved). On desktop rows a waiting state with a qualifier now stacks its two lines, right-aligned, wrapping inside the column; dated rows ("Sep 30 · 4 days left") keep one line, and phone rows were already wrapping. One CSS block, no markup change. Measured on the build: 0 amount/deadline collisions across all 1,542 rows (948 of them waiting states) at 1440px and at 900px, no horizontal page scroll; /saved checked with the four listings from the report. Add-back fraction: 0.

## Five links in the bar: Deadlines, the quiz and Guides move under Explore, 2026-09-26

The bar had seven links (Scholarships, Programs, Deadlines, Find my scholarships, Saved, Guides, About), and Ilia found first-time visitors lost among them. It now has five: Scholarships, Programs, Explore, Saved, About. Explore is a third dropdown built from the same panel the other two use (tiles plus a link list; on phones, the sheet row opens the panel with a Back button): tiles for Find my scholarships, Deadlines (dated deadlines still ahead, counted from the data at build) and Guides (the guide count), and links to the quiz, the calendar, all guides and the first five guides. The Explore link itself goes to /match/, and it lights up on /deadlines/ and /guides/ as well. No new component, script or dependency: one `also` field on the nav item, and `unit`/`note` on the tile type so the Explore tiles say what they count. Removed: three top-level links. Measured on the build: panel opens on hover at 1440px, the phone sheet shows five rows and Explore opens its panel. Add-back fraction: 0.
- Same day, at Ilia's request, Explore took in the rest of what a student can use, so none of it is reachable only from the footer: tiles for Closing soon (the home page's next-deadlines list) and the reference letter template beside the quiz, Deadlines and Guides (five tiles, one full row at desktop width), and links to How it works (the walkthrough dialog, opened from the list), Closing soon, the template, For educators, What changed, and three guides under short labels (Rutherford, the essay guide, the Grade 11 timeline); the full guide titles widened the list column enough to squeeze the tiles at 1024px. Checked on the build at 1440 and 1024px: the walkthrough opens from the panel and the panel closes behind it.

## How it works analytics: a funnel, 2026-09-26

The walkthrough counted only opens (auto or button) and finishes, which could not say where people stopped or whether it sent anyone anywhere (Ilia asked for its analytics). Three events join `tour_open` and `tour_finish`: `tour_step` (meta 2 to 5, each step reached), `tour_close` (meta 1 to 5, the step it was closed on, by the X, the backdrop or Escape) and `tour_cta` (the closing "Find my scholarships" followed; not also counted as a close). `tour_open` now says which button opened it: `bar`, `menu` (the Explore panel) or `sheet` (the phone menu), beside `auto`; `button` is still accepted from pages cached before the split. Every value is from a fixed list the API enforces, so nothing typed can reach the table, and sendEvent's per-session dedupe makes each count people per visit. The admin panel gains a "How it works" table under the saves split: where it was opened, how many reached each of the five steps (as a share of opens), how many went on to the quiz, and where it was closed. The privacy page's list of counted actions now names the walkthrough, which it had not since `tour_open` shipped. Tests: the API accepts the new values and rejects anything else; the panel renders the funnel from sample rows. Add-back fraction: 0.

## Critique fixes: phone header row, empty status filters, one open-now count, 2026-09-26

From the 2026-09-26 evening critique, each measured on the build. (1) The phone header put its menu button on a second row at 900px and below: `.sabh-right` was still a flex box with every child hidden, so it took the grid's auto column and the burger fell to an implicit row (rows 25.5px + 44px, burger 18px below the 52px bar). The column itself is now hidden on phones; after: one 52px row, burger at y 4 to 48. (2) `/scholarships/?status=unconfirmed` and `?status=closed` showed collapsed headings over "Showing 0 of 0", because the default-shut runs stayed shut even when every match sat in them. Until the reader clicks a heading, the shut runs are now recomputed per result and open when nothing else would show; after: 24 rows and "Showing 24 of 590". (3) "Open now" was three numbers on one page (rail 594, OPEN NOW heading 467, count line 594): the rail and count line counted the after-high-school awards that sit in their own run. Status chips and the count line now count the run their heading counts, through one `openNowCount` helper used by the server render, the client and the E2E, and the home photo slides (which link to `?status=active`) count the same set. After: 467 / 467 / "Showing 24 of 467" on /scholarships/?status=active, every Calgary status chip equal to its heading. Removed: the unused `chipCount` helper and two inline copies of the open-now filter. Not changed: the unfiltered pager ("Showing 24 of 793" spans every open run, not just OPEN NOW) and the header menu tiles, which count all listings by design. Tests: one new unit test for the filter case; the directory E2E states the new chip rule. Add-back fraction: 0.

## Explore panel takes the Scholarships panel's shape, 2026-09-26

Ilia found the Explore dropdown too narrow and long: its five tiles sat in one row and stretched to the height of an eleven-link list, so each tile was about 200px wide and 383px tall. It now has the Scholarships panel's shape: ten tiles in two rows beside ten links. The three guide links, For educators and What changed became tiles as well. The duplicate Closing soon link left the list, since it is a tile. The Deadlines and Guides tiles lost their counts (990, 18) and now carry a note like the others. The link column is one fixed width (226px) in all three panels, because Explore's longest link had widened its own column by 35px. Measured on the build at 1440px: Scholarships, Programs and Explore all have 201 by 170 tiles in two rows starting at x 56, with a 226 by 348 list. At 1024px each panel has three rows of 157px tiles; Explore's are 155 tall and Scholarships' are 148, because one guide name wraps to three lines. On a phone the sheet shows 164px square tiles two across, with no sideways scroll. Removed: the deadline count query, the tile `unit` field and the `albertaDate` import. Add-back fraction: 0.

## Saved ships the visible blurb, not the whole description, 2026-09-26

Adding 25 programs (ids 259 to 283, 250 active) pushed /saved to 805,310 bytes, over the 800,000 budget its E2E enforces, because the page inlines every listing so any bookmark renders from the cached page. Program descriptions were shipped in full, although the card clamps the blurb to two lines and the full text lives on the detail page. They are now cut at a word boundary after 320 characters, which is past what two lines show at desktop width. Measured on the build: 795,623 bytes, and the saved E2E passes; a bookmarked ExploraVision card still shows two full lines. Most of the remaining weight is scholarship `url`, `audience` and `href` (href alone is about 98 KB and derivable from the name), so the next large data batch will meet the budget again; that is the next removal candidate. Add-back fraction: 0.
- Same day, at Ilia's decision: the budget now measures the gzip size of /saved (what a student downloads) instead of the raw HTML, limit 200,000 bytes against 151,681 today. The raw size tracks the catalogue because every listing is inlined, so it would have forced a code cut with each data batch; the transfer grows far more slowly. It still guards the regression it was written for: rendering every card again adds well over 50 KB compressed (the unselected cards measured 140,926 gzip bytes on 2026-09-17, with fewer listings). The 320-character blurb clip stays, since the card never shows more. The `href` cut is no longer needed.

## Row actions get a column that fits them, 2026-09-26

On desktop rows "50 days left" ran under the Save button (Ilia, /programs/summer-programs/). The row grid's last column was 104px, set before the Save button gained its label; the actions cell is now 139px on program rows (Save + Details) and 130px on scholarship rows, 147px and 138px when saved, so it spilled left into the deadline column on every row. The column is now 148px, taking the 44px from the title column. Measured on the build at 1440, 1024 and 900px on /programs/, /programs/summer-programs/, /scholarships/ and /saved/, with Save and with Saved labels: 0 overlaps between amount, deadline and actions, nothing outside the row, no horizontal scroll. One value changed. Add-back fraction: 0.

## Critique fixes: search words, quiz order, phone eligibility, section counts, 2026-09-27

From the 2026-09-27 whole-site critique (26/40), the four priorities Ilia kept; the first-visit walkthrough stays as he asked for it. Each measured on the build. (1) Search matched the query as one substring, in two copies (directory-client and list-core). Both now call one `searchRows`: the phrase first, its last word stemmed, and only when the phrase finds nothing, every word matched at the start of a word in any field. Scholarships found: "indigenous engineering" 0 to 8, "nurse" 11 to 44 (= "nursing"), "first nations" 20 to 29 (the extra rows say "First Nation"), "4-h" 17 to 17, "medicine hat" 12 to 12, a nonsense query 0 to 0. Tried and dropped the same day: word matching on every query ("first nations" matched rows saying "first year") and skipping short words in the fallback (a nonsense query found three awards). (2) The quiz's "Due in the next 30 days" group sorted by amount alone, so its three rows were all "Possible" above six strong fits; it now sorts by fit, then amount, and says "Due today" / "Due tomorrow". (3) Listing pages on phones gain a one-line "Who can apply" under the title (the box itself sat under the card): at 375px it moved from y 892 to y 308, and the Worth knowing note's text measure went from 210 to 244px (the eligibility box and paper margin were trimmed below 640px). (4) Counts: /deadlines counted after-high-school awards as "open to apply today" (638) while the directory leaves them out of OPEN NOW (467); it now says 511, which is 467 scholarships plus 44 programs. The "Show more" line counts within its section through one `showingLine` helper shared by the server render, the client and the E2E: "Showing 24 of 467 open now", not "of 793". Not changed: searching "calgary" (98) and the Calgary hub (162) still differ, since the hub counts by region and search by text. Tests: searchRows, showingLine and the quiz order are covered; the directory E2E states the new line. Add-back fraction: 0.

## Critique fixes: local awards, first visit, school list, phone directory, program cost, 2026-09-27

From the second 2026-09-27 critique (27/40). Ilia chose all five priorities plus the minor items, with the walkthrough held back on landings rather than removed. Each change was measured on the build.

(1) **Local awards.** 184 awards tagged `region: "Alberta"` are for one school, town, county or school division ("Boyle School graduates", "Woodlands County residents"). `region` has no value for a place without a hub, so the quiz treated every one of them as province-wide, and a Calgary STEM student's first result was a Woodlands County bursary marked "Good match". A new JSON-only `localArea` field holds that restriction. It was set by hand from each listing's audience and notes, and left off wherever the area includes one of the quiz's named cities (Cochrane, Okotoks, Fort Saskatchewan, Calgary and Edmonton, the Centre-Nord francophone board, Northern Lights). validate-data allows it only on "Alberta" listings. The matcher now:
- excludes these awards for a student in a named city;
- keeps them for "Other Alberta" with an "Only for …" check, capped at Possible and ranked after unrestricted fits;
- drops the check once the student's school confirms it.

Calgary / STEM / 80 to 89% / U of C, before and after:
- matches: 618 to 443;
- local awards: 175 to 0, 23 of which had been "Good".

For "Other Alberta", all 175 now sit at Possible, where 23 were Good before. Awards due today or tomorrow now list among "Open now" rather than leading the due-soon group.

(2) **First visit.** The walkthrough no longer opens on a listing a student landed on from search. It waits for their next page, tracked by a per-tab `sa_tour_landed` flag. It also waits for the consent band to be answered instead of opening over it. "No thanks" is now as solid as "Allow". Verified in the browser:
- no walkthrough on /scholarships/loran-scholarship/ as a first page, then it opened on the next page;
- with the band showing, no walkthrough, then it opened after "No thanks".

(3) **School question.** "Another school" is now the first option, not the last of up to 64, and the question has the town question's filter box when it has more than 8 schools. Enter picks the first real school, not the escape tile. Other changes:
- Middle schools are left off, since the quiz starts at Grade 10.
- Three schools listed under two spellings are merged in the data: Caroline High School, R.F. Staples Secondary School and Alix MAC School. F.P. Walshe and Grant MacEwan were normalised too.
- Previous is 44px tall.
- The study question gained the schools the listings actually name: Red Deer Polytechnic (70 awards) and Keyano (74) had been missing while Mount Royal (2) was listed. Also added: U of Lethbridge, MacEwan, NAIT, SAIT and Northwestern Polytechnic.

(4) **Phone directory.**
- Section labels are now H2 headings wrapping their toggle buttons (`display: contents`, so the layout does not change), and the 1,542 row titles are H3. Screen-reader heading navigation now reaches 6 sections instead of 1,542 rows.
- At 375px the quiz line runs on from the standfirst as one paragraph, and the gaps and the March note tighten. The first row moved from y 559 to y 475. The ≤400 target was not met without removing the March note, which is content, so it stays.

(5) **Programs and wording.**
- Program rows say "Free", "Has a fee" or "Pays you". Cross-links show cost and format, so the two chemistry exams read "Olympiads", not "Research". The sort is "Pays you first", and the program page's hidden heading is "Cost and deadline".
- /deadlines no longer prints "FEM+ … Program Program".
- Wetaskiwin (an estimated date) reads "Likely date, not posted yet" under Due this week instead of "Opens later".
- "date not posted, around Jun 1" now reads "date not posted yet, likely around Jun 1".
- "Save" everywhere, instead of "Bookmark".
- Smaller copy fixes: the quiz hint's stray comma; /updates' "Five rules" that listed four; /guides/ now leads with the Grade 12 timeline, deadlines, Loran and Rutherford; "How the match works" is folded into a disclosure, with its text still in the HTML.
- Polish: the hero quiz line carries the byline's heavier shadow over the film, and the row Save and Details controls get a 44px hit area without growing the row.

Not changed:
- The quiz counter's "of up to 8" before the town is answered, which is deliberate.
- The Explore menu's tile-and-link pairs, a layout Ilia set on 2026-09-26.
- The Province-wide hub, which still lists the 184 local awards.

Tests:
- New matcher tests for the local rule, including a guard that no real Calgary match is a local award.
- The school-question tests: escape first, middle schools out.
- The due-today test now checks that it lists after the group.
- Selectors updated for the heading wrapper and the folded explainer.

Add-back fraction: 0.

## Critique fixes: quiz tiers, rural towns, first-visit strip, hub counts, 2026-09-27

A third critique run, after e963c23, scored 26/40 (last five runs: 27, 28, 26, 27, 26). Its two P1s were checkable bugs, both confirmed in code before fixing.

(1) **Quiz tiers.**
- A school-only award now carries "Students at … only" when the school question was skipped, and a board-only award "… students only". Before this, a skipped answer left no check at all, so Nancy Wang (Robert Thirsk High School only) was "Strong" for every Calgary STEM student. The wording avoids "Only for", so capTier holds these at Good instead of the local Possible. A local-area check, when present, stands in for the school check.
- Four awards whose descriptions say "identify as female" had `genderRequired: null`: ids 251, 268 and 277, plus 1137 (a female hockey league). They now get the "Female students only" check.

(2) **Towns outside the 23 cities.**
- "Other Alberta" is the first town tile.
- A town the filter does not list turns that tile's hint into "Includes Vulcan". Picking it keeps the town (`town` on the profile), which lifts the "Only for" check off local awards whose area names it as a whole word. For Vulcan, 7 awards come back Good or Possible without the check. Enter still picks a real city first.
- The hub footer's province-wide link reads "Province-wide, other towns and counties". /deadlines "Where you live" gained "Another town or county".

(3) **First visit.** The walkthrough no longer opens by itself. A one-line strip at the foot of the screen offers it ("New here? See how it works in 5 steps"), with the same holds as before (after the consent answer, not on a landed listing). It is offered on up to three pages, and dismissing or taking it ends the offers. The dialog's last step fits a 375px phone: the dots take their own line on every step, so the height stays 526px on all five. `tour_open` gains the meta `strip`.

(4) **Hub counts and repeats.**
- "Show all" drops its number. Beside "Showing 13 of 126" and "Show 24 more", a third count (137) read as a contradiction.
- The March timing note has "Got it", remembered per browser and applied in the head script, so it does not flash.
- Status chips with zero listings on a page are left out ("Open any time 0" on Calgary).
- Hub intros were already one sentence each, so their copy was left alone.

(5) **Targets.** Home carousel dots are 24 by 44, and the scope sub-links get a 44px hit area. The Saved view toggle is 44px tall. Desktop row Save and Apply already reach 44 through `::after`; the detector measured the box without it.

(6) **Words.** "RAP" joins the glossary in "What these mean", the quiz check reads "Needs an apprenticeship (RAP) or CTS courses", and the trades intro says what RAP is. Quiz tiles are named "Calgary, And the foothills" for screen readers. Saved ends with a next step (reminders, the quiz, browse).

(7) **Polish.** Section rules run the full row width. The guide back link matches the listing pages'. The /deadlines month row fades at its right edge on phones. The directory search box already had a keyboard focus rule, so nothing changed there.

Not changed: the Explore menu duplicates (Ilia's layout); no new county hub page, since every hub needs a photo and the province-wide hub already holds the 184 local awards.

Add-back fraction: 0.

## Expired takedown redirect, 2026-09-27

From a full debug pass. `validate-data` had warned on every build since September 19 that the temporary takedown for `/scholarships/local-38-2*` had ended.

| Candidate | Outcome |
| --- | --- |
| The `/scholarships/local-38-2*` 302 to the scholarship index (161b0d2, masking a stale Cloudflare copy of a listing removed September 11) | Removed. The stale copy carried `s-maxage=604800` on September 13, so it expired by September 20, and John M. Kerr, removed in the same commit with no redirect, answers 404 on www. The build has no page at that path. |
| `TEMPORARY_TAKEDOWNS` and its exemption block in `validate-data.ts` | Removed with its only entry, since an empty list is dead code. If a legal takedown is needed again, 161b0d2 has the pattern. |

Also commits the regenerated `public/publication.json`: 279d061 changed scholarship data without it, so every build dirtied the file.

Local measurements on 279d061 plus this change: validate-data went from 119 redirects and one warning to 118 and none; `npm run ci` passed (1,059 tests) and `npm run test:e2e` passed (104). Not yet checked on production: after the deploy the removed listing's path should answer 404, not 200.

Add-back fraction: 0 of 2.

Follow-up, same pass: hosted CI failed on 279d061 and c956727 at 01:18 and 01:34 UTC. `EligibilityQuiz.test.tsx` built "today" from the host's date while the quiz counts days in Alberta (`lib/calendar.ts`), so on a UTC runner the test failed from 6 p.m. to midnight Alberta time, which includes the 04:50 UTC scheduled sync run. The test's hand-rolled date formatting is replaced by `albertaDate()`, the helper the component uses. Reproduced with `TZ=UTC` inside that window, then passed under UTC, Edmonton, UTC+14 and UTC-11; `npm run ci` passed under `TZ=UTC`.

## Withdrawn listings and privacy accuracy, 2026-09-28

From a compliance review of the whole site.

| Candidate | Outcome |
| --- | --- |
| #1606, the single exception to the gender rule allowed on 2026-09-22 | Removed; the exception was withdrawn. `validate-data` loses its exception list, and its pattern gains the terms that would have let the title through on its own (the lookahead keeps #782 passing). |
| Programs #196, #242, #256 and #265 | Removed at the maintainer's request. |
| 301s for the five removed pages | Not added, as in eb6a968: none has a successor page, a 301 onto a hub reads as a Soft 404, and one slug would itself fail the gender-rule scan of `_redirects`. The ship-check slug diff reports all five as FAIL for that reason. |
| Salting the confirmation throttle's hash of each address | Not done. The scheduled sender on GitHub Actions derives the same key and has no secret to salt it with, so salting needs a new secret in two places to protect about 8 rows kept 30 days. Instead the hash is disclosed on /privacy, listed in the SECURITY.md breach inventory, and erased by "Delete all my data"; `recipientKey` gives both paths one derivation. |
| The Terms section "Changes, and which law applies" | Removed: "Changes to these terms" and "Governing law" already said the same at greater length. |

Also: /privacy says cleanup runs daily and no longer promises what its five processors may do with data, or that nothing is shared with anyone; SECURITY.md names Google Analytics and says daily, as does `docs/compliance.md`. Both policy dates move to September 28, 2026.

Local measurements: `npm run ci` passed (1,060 tests, one new) and `npm run test:e2e` passed (104). validate-data counts 1,541 scholarships and 270 programs, down from 1,542 and 274. The first build failed on the stale `lastmod.json` entry for #1606, because `generate-sitemap.ts` rewrites that file after the validator reads it; regenerating it first fixed that, and the committed file no longer carries the slug. Not yet checked on production: the five paths should answer 404 on www after the deploy.

Add-back fraction: 0 of 5.

## Phone fixes from the mobile critique, 2026-09-28

From the phone-only critique of 2026-09-27, priorities 1 to 3. The outcomes: a student sees each quiz question after answering the one before, a date sits beside the award it belongs to, and on an iPhone a field does not zoom the page and a picker is the size it was drawn. Before is production, after is the local build (`dist/`); none of the code involved changed between the two. Measured in Playwright WebKit at iPhone 13 size (390x664) and Chromium at Pixel 7, and for the pickers in Safari on the iOS 26.5 simulator (iPhone 16e).

| Candidate | Outcome |
| --- | --- |
| A new scroll fix for the quiz | Not needed. The 2026-09-24 correction measured at the wrong moment: Preact runs every effect cleanup before any effect, so the cleanup that unfolds the /match intro ran first, and the class that folds it came back only after the heading had been measured and scrolled to. The intro effect moves above the scroll effect; nothing is added. |
| `scrollIntoView` for the quiz heading | Replaced by an `offsetTop` measure and `scrollBy`. The old measure included the 14px the step is still sliding up from, so the heading came to rest 1px under the header instead of at its 68px scroll margin. |
| `display: block` on /deadlines award names (the critique's proposal) | Rejected after trying it on the live page: it fixed every row but put the Program tag on its own line under 12 more names at 375px (41 of 41 instead of 29). `inline-flex` fixes the same rows and moves nothing else, because an inline-flex box aligns on its first line and an inline-block on its last. |
| Native pickers with a larger `min-height` | Not possible: iPhone Safari ignores `min-height` on a native `<select>` (the /deadlines one asks for 44px and drew 29). The three pickers draw their own box and share one arrow (`--select-arrow`). |
| 16px text in every field at every width | Phones only (900px and under), where Safari zooms; desktop sizes are unchanged. |
| A WebKit project in Playwright (the critique's suggestion) | Not added. Playwright's WebKit is not iPhone Safari: it drew the pickers 21 to 23px tall with 5px corners where the simulator's Safari drew 29px pills, and CI would run a third WebKit build, on Linux. Both causes show in computed styles, so one mobile-project test reads them in the existing Chromium run: every field at least 16px, every select `appearance: none`. |

Two new tests: each quiz question opens at its scroll margin after the last option of the one before is answered (both projects), and the phone field rule above (mobile project). Both failed against production before the fix: the heading 136px above the header after the first answer, and 10 field problems across /deadlines, /scholarships, /programs and a listing.

Repair attempts: none against these problems. Separately, the first local `npm run ci` failed in validate-data on a stale, gitignored `public/sitemap.xml` still listing the slug removed in 6f05a7c: validate-data reads the file before `generate-sitemap.ts` rewrites it. Regenerating it fixed the local run; hosted CI starts without the file.

Add-back fraction: 0.

| Metric | Before (production) | After (local `dist/`) |
| --- | --- | --- |
| Quiz heading after a scrolled answer, WebKit iPhone 13 | 106px above the screen, 6 of 6 | at 68px, 15px under the header, 6 of 6 |
| Same, Chromium Pixel 7 | 83px above the screen after the town, under the header after the next three | at 68px, 4 of 4; unscrolled questions unmoved |
| /deadlines names above their own row, WebKit at 320, 375, 390px | 739, 479, 412 of 1,030 | 0, 0, 0 |
| /deadlines days beside a later line of the name, Chromium Pixel 7 | 315 | 0 |
| Picker height, WebKit iPhone 13: sort, where you live, /deadlines | 22, 23, 23px | 40, 44, 44px |
| /deadlines picker, iPhone Safari (simulator) | 29pt | 44pt |
| Phone field text: search, sort, where you live, reminder email | 15, 14, 15, 14px | 16px |
| Desktop Chromium picker widths: sort, where you live, /deadlines | 156, 228, 241px | 158, 228, 221px |
| Unit tests | 1,060 | 1,060 |
| E2E | 104 passed | 107 passed, 17 skipped, 53.7s; the new tests take 18s of that test time |

Not yet checked on production: after the deploy, the same probes should read the after column on www.
