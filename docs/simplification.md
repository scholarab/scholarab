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

## Home sections on film: October 2, 2026

After spacex.com: Next deadlines, Biggest awards and By type each fill the screen over one of the hero's own clips (07, 20, 12) under a veil that fades to the same ink as the hero and the carousel, so every seam is ink meeting ink. No new footage: the clips and their phone cuts were already shipped. Each panel adds one still (a lazy WebP of the clip's first frame) and plays its clip only while some of the panel is on screen.

| Candidate | Outcome |
| --- | --- |
| Clip 08 (ravine) for By type | Replaced by 12: 08 is 4.55 MB desktop / 1.37 MB phone, 12 is 1.33 MB / 0.43 MB, and 12 reads better under the veil (worst pixel 4.73:1 against 4.11:1). |
| Clip 13 (Rocky peaks) | Rejected: muted text fell to 4.43:1 on 1% of pixels. |
| A separate dark row style | Not needed: the rows already read their colours from tokens, so the panel redefines six tokens and five hairline/stripe colours. |

Muted row text (80% cream) against the composited film at the veil's thinnest point, sampled every second of both cuts: 5.0:1 or better on 99% of pixels for 07, 20 and 12; worst single pixel 4.1:1 (the sun in 20). Added bytes for a visitor who scrolls the whole page: stills 65 KB desktop / 47 KB phone; clips 2.39 MB desktop / 0.75 MB phone, less whatever the hero already cached. Local measurements only.

## Hero clips 12 and 13 at 60 fps: October 2, 2026

SpaceX's home film moved to 1080p H.265 at 59.94 fps (about 5 Mbps). Of our twelve takes only 12 (Moraine Lake sunrise) and 13 (Rocky peaks at sunset) were shot at 60, and the first encode halved them to 30. Both were re-cut from the Pexels 60 fps sources with the same start point and phone crop (PSNR 39 dB against the shipped first frames). The other ten were shot at 24 to 30 fps and stay as they are: interpolating them to 60 was rejected because it invents frames.

CRF was first calibrated to reproduce the shipped 30 fps sizes, then lowered until SSIM against the source matched the shipped files: H.265 27.5 (desktop) and 30 (phone), H.264 27.5 and 28, keyframe every 96 frames.

| File | Before (30 fps) | After (60 fps) | SSIM before / after |
| --- | --- | --- | --- |
| 12.hevc.mp4 | 939 KB | 1,325 KB | 0.973 / 0.972 |
| 13.hevc.mp4 | 625 KB | 840 KB | 0.981 / 0.980 |
| 12.m.hevc.mp4 | 276 KB | 427 KB | 0.961 / 0.961 |
| 13.m.hevc.mp4 | 189 KB | 262 KB | 0.975 / 0.975 |

The H.265 set grows by 0.6 MB (desktop) and 0.2 MB (phone) over a full loop. The first clip (01) is unchanged, so first-visit bytes and LCP are unaffected. Local measurements only.

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

Checked on www after the deploy (545794a live 2026-09-29 05:39 UTC), with the same probes: quiz headings at 68px in both engines (10 of 10), 0 /deadlines names over the row above at 320, 375 and 390px and 0 days off a name's first line, every phone field at 16px and the pickers at 40, 44 and 44px. That matches the after column.

## Astro 7 and the Workers adapter, trial, 2026-09-28

Branch `astro7-trial`, approved by Ilia and merged 2026-09-29. `npm audit --omit=dev` listed 8 findings (1 critical) whose only fix is astro 7.3.5 and @astrojs/cloudflare 14.3.3, and adapter 13 dropped Cloudflare Pages. So this branch moves the deploy from Pages to Workers with static assets, and the domains move to the Worker after the merge.

None of the 8 was reachable in production, checked against the code and the built Worker: nothing uses `astro:assets`, so sharp never runs, even at build time; the Worker's `/_image` never calls an image service; there is no `base`, no `transition:` directive, no HTMLElement component, no Astro action and no session, so the XSS, base-path and devalue advisories have no input; the adapter's SSRF is in an image endpoint 12.6.13 does not have; undici, ws and miniflare are local tooling.

| Candidate | Outcome |
| --- | --- |
| `empty-sharp-in-worker` Vite plugin | Removed. Adapter 14 keeps sharp out of the Worker on its own (0 files mention it). |
| `react-dom/server` to `server.edge` alias | Removed. The Worker build resolves the edge renderer by itself. |
| `_routes.json` and `pages_build_output_dir` | Gone with Pages. `wrangler.toml` `run_worker_first` lists the same four route patterns, and `not_found_handling = "404-page"` keeps 404s off the Worker. |
| SESSION KV namespace the adapter provisions | Never created: `session: false`, since nothing reads `Astro.session`. |
| Prerendering in workerd (the adapter's default) | Restored to Node (`prerenderEnvironment: 'node'`). workerd ignores the build's `TZ=America/Edmonton`, and the deadlines guide printed 1008 dated deadlines instead of 988. |

Added to keep public output the same: `compressHTML: true` (Astro 7 defaults to JSX whitespace), Vite 7's browser target (Vite 8 raised the floor to Safari 16.4 and emitted media range syntax), and `@import 'tailwindcss/index.css'` (the bare name does not resolve under Node prerendering). An npm override pins miniflare's undici to 7.30, because an advisory published the day of the trial covers the 7.29.0 it pins.

Repairs forced by the adapter: `locals.runtime` is gone and its getters throw, so the old `/api/event` answered 500 to every event and `defer()` would have failed every alert sign-up. They now read `request.cf` and `locals.cfContext`.

Local measurements, same machine, same commit (09fb294):
- `npm audit --omit=dev`: 8 findings to 0.
- `astro build`, 3 runs each: median 13.84 s to 12.22 s.
- `npm run ci`: passed, 1,059 tests. `npm run test:e2e`: 104 passed and 16 skipped on both, 57.7 s to 43.1 s (one run each).
- Built HTML: all 1,896 pages match after normalizing whitespace, scoped-style ids and asset hashes. 34 screenshots (17 pages at 1280 and 375) are pixel-identical except 20 pixels of logo antialiasing on three.
- Worker: 470.6 KB to 470.2 KB gzip (wrangler dry run). Per-page JavaScript within 2%.

Differences that remain: a bare path redirects with 307 rather than Pages' 308, and a 404 carries `max-age=0` rather than `no-store`.

Hosted results, 2026-09-28, Worker `scholarab` at scholarab.iliaivan10.workers.dev (no secrets bound yet), compared with www on Pages:
- `npx playwright test` pointed at the Worker: 104 passed and 16 skipped, the same as local.
- Every security header from `_headers` (CSP, HSTS, frame, referrer, permissions, COOP, CORP) is byte-identical. `/_astro/*` is immutable and fonts cache for a year, as on Pages.
- Root files, service-worker seed URLs, sampled `_redirects` rules, `/admin` (302 to login) and 404s answer with the same status. `/api/event` answers 204 same-origin and 403 cross-origin.
- Workers does not add Pages' `access-control-allow-origin: *` or a charset to `text/html` and `text/plain`. Every HTML page opens with `<meta charset="utf-8">` and the three `.txt` files are ASCII, so neither changes what a visitor sees. The GA ID in the HTML matches production, so `PUBLIC_GA_ID` needs no binding.

The publication check and IndexNow read the deployment from outside the zone firewall; they now read the workers.dev alias, since pages.dev freezes on the last Pages deployment.

Add-back fraction: 1 of 5 (Node prerendering).

## AI visibility audit: IndexNow scope and scholarship markup, 2026-09-29

AI search answers (Bing-sourced, like ChatGPT search and Copilot) described ScholarAB as "1134+ scholarships" while the home page read 1541, but quoted /about/ at its current 1,542. /about/ is in `src/data/lastmod.json`; the home page is not. IndexNow read only that manifest, which holds listings and four prose pages, so the home page, both directories, /deadlines/, every guide and every facet hub were never announced.

| Candidate | Outcome |
| --- | --- |
| `lastmod.json` as IndexNow's URL source | Removed. The script already read `public/sitemap.xml` for its live-deploy check; it now takes the URLs whose `<lastmod>` is today from the same file, which dates hubs by their newest member and guides by `dateModified`. |
| `offers` on scholarship detail JSON-LD | Removed. On `EducationalOccupationalProgram` an Offer's price is what the program costs, so a $1,000 award was declared a $1,000 fee. The type has no property for money paid to the student; the amount stays in the description and on the page. |

Added: the GitHub repo in the Organization's `sameAs`, since it is the top search result for the brand name.

Local measurements, same build:
- Announceable URLs (`--all --dry-run`): 1,785 to 1,858, all of the sitemap. 73 were unreachable before.
- 2026-09-28 replayed under the new rule: 3 URLs to 13 (adds /, both directories, /deadlines/, /guides/, /educators/, /match/, /updates/ and the two hubs holding the changed program).
- Scholarship pages declaring a price: 1,278 to 0.
- `npm run ci`: passed, 1,063 tests. `npm run test:e2e`: 107 passed, 17 skipped.

Not yet measured: whether Bing's copy of the home page refreshes. Re-run the "best scholarship websites for Alberta high school students" query after the next data change is announced.

Add-back fraction: 0 of 2.

## First Workers Builds deploy: OG image step, 2026-09-29

The first hosted builds on Workers Builds never finished: `generate-og-images.ts` ran silently until the 30 minute limit. GitHub Actions (Linux, Node 22) renders the same 1,520 cards in 75 s.

Repair attempts against the same problem:
1. resvg scanned every system font for each card, although satori already emits paths. `loadSystemFonts: false` took a card from 148 ms to 31 ms locally with pixel-identical output (40 of 40 compared), and a cold run from 224 s to 44 s. The hosted build still stalled.
2. Pinned Node 22 (`.node-version`, matching CI) and added progress lines. The hosted build rendered 1,000 cards in 60 s, then froze.
3. Changed the implementation instead of a fourth tweak. The renderer holds 1 to 2 GB of native memory that forced garbage collection does not return, so cards now render in child processes of 100 whose memory is released on exit (peak 0.89 GB, down from 1.7 GB; cold run 52 s, warm 1 s). Each batch has a 90 s limit and the step stops starting batches after 8 minutes: an OG image is a social preview, so a stalled render skips its cards (retried next build) instead of blocking the deploy. Both paths were exercised locally with forced limits.

Outcome: the first hosted build after attempt 3 rendered all 1,520 cards and deployed. Cutover, 2026-09-29 08:20 UTC: `wrangler.toml` routes `www.scholarab.ca/*` and `scholarab.ca/*` to the Worker. A zone route runs before the request would reach the Pages origin the DNS records still name, so the switch needed no DNS change and removing the routes hands the site back to Pages, which keeps its domains and its last deployment (automatic deployments are off). Hosted checks after the switch: the Playwright suite against the Workers Builds deployment passed (107, 17 skipped); 80 sitemap pages on www match workers.dev exactly; every `_headers` security header is on www and the middleware's on /admin; the admin login answers 401 to a wrong password (database and secrets bound); the apex still 301s to www; a Workers Builds deploy from `main` kept the routes.

## Stale build outputs in validate-data, 2026-09-29

The outcomes: no gender-identity or orientation wording and no em dash reaches the site, and a local build after a listing is removed passes without regenerating files by hand. validate-data runs before the steps that rewrite `public/sitemap.xml`, `public/llms.txt`, `src/data/lastmod.json` and the two catalogue payloads, so its text scans read the copies an earlier build left. On 2026-09-28 that failed two local builds, once on `lastmod.json` and once on `sitemap.xml`, both still carrying the slug of #1606 after the listing was removed; each time the fix was to run `generate-sitemap.ts` by hand.

| Candidate | Outcome |
| --- | --- |
| Reading those five build outputs in the wording and em dash scans | Removed. Their text comes from the data and pages the scans already read, except for listing URLs, which are built from titles. |
| Listing URLs, which only the sitemap and `lastmod.json` spelled out | Added back from the data: the wording scan reads all 1,858 URLs the validator already builds for `_redirects` (1,811 listings, 47 hubs). Before, CI saw them only in the committed `lastmod.json`: 1,781 indexable listings, as of its last commit. |
| Listing files with `git ls-files`, so gitignored files drop out (the first idea when this was flagged) | Not used. `lastmod.json` is committed, so it would still fail, and a hand-written file in an ignored folder would quietly stop being read. The skip list names exactly the five files the build rewrites. |
| Running the generators before validate-data | Not used. They would rewrite the committed `lastmod.json` from data not yet validated, and validate-data run on its own would still read stale copies. |
| Multi-word terms matched with a space only ("gender identity", "sexual orientation" and three more) or a hyphen only ("two-spirit") | Now a space, a hyphen or nothing. A URL always hyphenates, so a URL check with the old terms would miss five of them, and "gender-identity" in prose passed the old pattern too. No current file or URL matches either form. |

Measured locally, in a copy of the tree in the session scratchpad so the shared checkout was not touched:
- Stale copies of all five outputs carrying a withdrawn listing: 5 failures before (4 wording, 1 em dash), a pass after.
- Violations planted in sources: a title "Two Spirit Leadership Award", "gender-identity" in `public/_redirects`, "sexual-orientation" in a new uncommitted file, "lgbt" in a hand-written file under the ignored `public/og/`, an em dash in a new doc. Before, 2 of 5 files failed; after, 5 of 5, plus the title's URL.
- validate-data run time on the real tree: 0.45 to 0.51 s before, 0.44 to 0.47 s after, the same within noise.

Repair attempts against this problem: 2 before this change, both regenerating the file by hand (2026-09-28).

Add-back fraction: 1 of 1 (the listing URLs, now read from the data instead of the files).

## Publication marker: commit only the request ID, 2026-09-29

The outcomes: the publisher marks a publication live only when the deployment serves that request's exact catalogue, IndexNow announces only a confirmed deployment, and a build leaves the shared checkout as it found it. `public/publication.json` held the request ID the publisher commits and a catalogue hash that every build rewrites. No reader used the committed hash: the publisher compares the live marker with a hash it computes from the data, its crash recovery reads only the ID, and IndexNow reads the local marker after the build step has rewritten it. So each data commit had to carry the rebuilt marker for nothing, and one that left it out made every later build show a modified tracked file. Since the marker was added on 2026-09-09, 41 of 55 data commits carried it and 14 left it stale: all 6 daily syncs and 8 made by hand.

| Candidate | Outcome |
| --- | --- |
| The committed catalogue hash | Removed. The ID moves to `src/data/publication-request.json`, which only the publisher writes. `public/publication.json` becomes a gitignored build output with the same two fields at the same URL, so the live check and IndexNow are unchanged. |
| Adding the marker to the daily sync's `git add` (the first idea) | Not used. It fixes the sync but keeps the marker in every data commit, and 8 commits made by hand missed it anyway. |
| Taking the ID from the publisher's commit message instead of a file | Not used. CI checks out a single commit, so the message is usually not there to read. |

Measured locally: `npm run ci` (1,063 tests; the generator test now also checks that a build leaves the committed request file untouched) and `npm run test:e2e` (107 passed, 17 skipped) left `git status` exactly as before they ran. The built marker, `dist/client/publication.json`, carries request 4fab8530 and the same hash the publisher computes from the data.

Hosted: CI and the Workers Builds deploy of 81fc23d passed, so the hosted build writes the marker from the new file, and `/publication.json` on workers.dev reads request 4fab8530 with the hash the publisher computes from the committed data.

Repair attempts against this problem: none before this change; the drift was avoided by not staging the file.

Add-back fraction: 0 of 1.

## Secrets out of the Worker bundle, 2026-09-29

The outcome: no credential is readable from the build output, whoever builds it and wherever it is deployed from. A fresh `npm run build` compiled the live Neon connection string and the Anthropic API key into `dist/server/chunks/` from `.env.local`. Five call sites read secrets as `getEnv(X) ?? import.meta.env.X ?? process.env.X`, and Vite inlines every `import.meta.env.X` it can resolve. The `DATABASE_URL=` prefix on `astro build` did not stop it. The public `dist/client` was clean.

| Candidate | Outcome |
| --- | --- |
| The `import.meta.env` fallback at all five sites (`db/client.ts` twice, `adminAuth.ts` twice, `parse-eligibility.ts`) | Removed. `getEnv` is the Worker's source, and in `astro dev` Astro copies the loaded env files into `process.env`, so the last fallback still covers dev, scripts and tests. |
| The `DATABASE_URL=` prefix on `astro build` | Kept, untested for removal. Nothing reads `import.meta.env.DATABASE_URL` any more, but it still stops a prerendered page from reaching the database. |
| `dist/server/.dev.vars`, a full copy of `.env.local` | Kept. The Cloudflare plugin writes it for local `wrangler dev`; `wrangler deploy` does not upload it and git ignores it. |
| A lint rule alone | Not enough. It closes this one pattern; `scripts/check-bundle-secrets.ts` checks the output, by the local secret values and by credential shapes, and fails the build naming only file and variable. |

Measured locally: before, the new check reported `DATABASE_URL` and `ANTHROPIC_API_KEY` in two server chunks; after, it passes with 3 local secret values checked. It takes 0.56 to 0.63 s warm (1.83 s on a cold first run), including tsx start-up, over 3,773 files. Its first shape pattern also matched two strings inside the Neon driver (its `user:password@` example and its URL builder); the pattern now excludes both, and the tests pin that.

Not yet measured: whether the deployed Worker carried the credentials. That depends on how each deploy was made, and is checked separately.

Repair attempts against this problem: 1 before this change, the `DATABASE_URL=` prefix, which did not work.

Add-back fraction: 0 of 1.

## Signed publication requests, 2026-09-29

The outcome: only an editor using the admin page can change the live catalogue. `publish-drafts.ts` turns any queued row in `publication_requests` into a commit on `main`, which deploys. So write access to the database was enough to publish, for example a phishing link in place of an apply URL, and validation would pass it. The audit that found the inlined `DATABASE_URL` made that path concrete.

| Candidate | Outcome |
| --- | --- |
| An HMAC over the request id and its changes, made by the admin API with a key the database never holds, checked by the publisher before git is touched | Added: `src/lib/publication-signature.ts`, column `signature` (0015), one secret in the Worker and GitHub Actions. A rejected request is marked failed so it cannot hold the one-pending slot. |
| A restricted database role for the Worker instead | Not used (declined 2026-09-29). It narrows what a leak of the Worker's password can do, but the GitHub Actions secret is still the owner role, and either can write this table. |
| A human approving each publication in GitHub (an environment with required reviewers) | Not used. It adds a manual step to every publication, which the signature makes unnecessary. |

Measured locally: the stored signature verifies after a real Postgres jsonb round trip (PGlite, keys reordered, `1.50` normalised), and rewriting one URL in the stored changes fails it. Without a key the admin route answers 503 and queues nothing.

Residual: someone with database access could re-queue an old signed request (same id and changes) by deleting its row first. `applyPublication` skips a change already live and rejects one whose field has moved on since, so a replay can only re-publish content an editor once approved (for example a field later changed back, or a listing later removed), never new content.

Repair attempts against this problem: none before this change.

Add-back fraction: not applicable; nothing was removed.

## Directory rows: the deadline and the money first, 2026-09-29

The outcome: a student scanning /programs or /scholarships finds each listing's deadline and money first, can tell one listing from the next, and presses Save or Apply on a row that lines up. A reader on Reddit, shown the site at Ilia's request, said the Programs page still looked AI-made and busy, with no clear first thing to read; that Save and Apply were misaligned; that the "Checked" line mattered only once a listing went stale; that listings needed contrast between them and the filters a surface of their own; and that "How this works" under the reminder form left the page with no way back. Every row element was semibold at 13 to 14px, the deadline included, so nothing led.

| Candidate | Outcome |
| --- | --- |
| "Checked Sep 2026" on every directory row (full ink and a green tick since the 2026-09-28 critique) | Removed. Every one of the 1,802 rows said August or September 2026, beside the deadline. Added back only where it says something: `isCheckStale` prints "Last checked Mon YYYY", quietly, on a row whose check is six calendar months old in Alberta. Today that is none. The detail page keeps its sentence. |
| The dots before a program's "Free", "Has a fee" and "Pays you" | Removed. The words are set in the amount's face and column instead, so a program row has a money figure like a scholarship row. |
| The hairline between list rows | Removed. Alternate rows are shaded instead, counted over the rows a search or filter leaves on screen; under a section heading the hairline had been a second rule. Tile and columns views keep their hairlines, and a browser without `:nth-child(of S)` keeps them too. |
| The phone-only 44px `min-height` on Save and Apply | Removed. The hit areas have been 44px at every width since 2026-09-27 through `::after`, and the stretched box was what hung Apply's underline 15px under the word. |
| Apply's underline as its bottom border | Replaced by a bar under the box, so the box is the word and Save and Apply share a centre line. |
| The link from the reminder fine print to /privacy/ | Replaced by a disclosure that opens in place with the privacy page's own reminder facts (nothing sent until confirmed, deletion at 30 days unconfirmed or 60 after the deadline, never sold). The full policy is one link inside it. |
| A modal for "How this works" (the reader's suggestion) | Not used. A native disclosure needs no script and keeps the form in view. |
| The deadline as a figure on phone rows too | Not used. It adds a line to every phone row, which is the height this change takes out. |
| A stipend figure for paid programs | Not used. The field is free text ("~$15/hr", "Fully funded (travel, accommodation, meals)"), so a figure would be invented. |
| Reorganising the listings (the reader's last idea) | Not attempted in this pass. |

Before is production (8fc405c); after is a local build of this change served by `wrangler dev`. Chromium, 1440x900 and iPhone 13 (390x664), first 24 rows:
- Save and Apply label centres: 2px apart on every row before, 0 after, both pages and both widths.
- Apply's underline under its word: 14.5px on a phone before, 5px after (5px on desktop, unchanged).
- Tap areas: still at least 44px (phone Apply 63 to 44, Save 54 to 44; the drawn Save stays 34px).
- "Checked" lines rendered: 261 to 0 on /programs, 1,541 to 0 on /scholarships.
- Average row height on a phone: /programs 218.1 to 202.4px (-7%), /scholarships 199.9 to 178.4px (-11%). Page height 7,899 to 7,523px and 8,008 to 7,492px. Listings wholly on the first phone screen of /scholarships: 0 to 1.
- Desktop rows grew slightly with the date figure: 176.3 to 177.1px on /programs, 98.6 to 100.4px on /scholarships.
- The filter rail is 24px wider (252px, 220px under 1280) so its chips keep the 228px and 196px they were measured in.
- `npm run ci` passes (1,071 tests) and Playwright passes (111, 17 skipped). The two new e2e tests passed 60 of 60 over 15 repeats here and failed 4 of 4 against production, so they fail on the defect.

Not yet checked on production.

Repair attempts against these problems: the "Checked" line was made louder on 2026-09-28, which this reverses; none before for the alignment or the row separation.

Add-back fraction: 2 of 6 removals (the "Checked" line, on stale rows only; the privacy link, inside the disclosure).

## One row order, the reminder promise, the phone head and print, 2026-09-29

The outcome: a Grade 12 student on a phone reads each listing in the order they decide (can I still make it, is it worth it, am I allowed), sees what is due in the next two weeks before anything else, is never promised a reminder that cannot arrive, and a counsellor can print a list. The critique run on production after the row pass above (27/40) found the deadline fix held only on desktop (14px on a phone, under a 26px amount), program rows still carried 8 text styles and a 2-line description, the first phone row started at 475px of 844, the reminder form promised "30, 14 and 3 days" on an award closing tomorrow while `send-alerts.ts` mails only at exactly those milestones, and there was no print stylesheet (a printed hub was 24 of 161 rows with site chrome and no addresses).

| Candidate | Outcome |
| --- | --- |
| The deadline at the far right of a desktop row, and under the amount at 14px on a phone | Replaced. One row order on every listing row: the date as a figure down the left edge (26px desktop, 24px phone, ink; the countdown under it in rust), the money on the title's line. The same order on the home closing and biggest-awards lists, and /deadlines' dates are ink figures now. |
| A program's description on its row | Removed from list rows (kept in the DOM for the tile views and the preview pane, which show it). The provider line takes the facts' style. |
| The standfirst in full, the quiz line and the spring note on phones | The standfirst clamps to two lines (full text still in the HTML). The quiz line and the note are off on phones: the header's Explore and every empty state keep the quiz, and the new DUE WITHIN 2 WEEKS run answers "is there anything for me" better than a paragraph. Desktop unchanged. |
| The phone filter panel inline above the list, with sort and view buttons in the toolbar | Replaced by a bottom sheet over a scrim holding the sort too (a second picker, kept in step by the existing select painter). Escape, the scrim or "Show N results" closes it; focus goes in and comes back. The view switcher is off on phones and Layout.astro applies a stored tile view only on a wide screen, so a phone cannot be left in a view it has no button to leave. |
| "Open now" as one run | Split: open and closing within 14 days is its own run, DUE WITHIN 2 WEEKS, ranked first within open under every sort, so the group key stays the sort's primary key and no run appears twice. Calgary's OPEN NOW had started 213 days out. |
| The reminder form whenever a day was left | Kept, but it names only the milestones still ahead ("3 days" at 10 days out), recomputed in the visitor's browser, and gives way to "Closes tomorrow. Too soon for an email reminder." when none are. `/api/alert` stores only the milestones still ahead and refuses a sign-up with none, so the confirmation email cannot promise one either. The disclosure is named for what it holds, "What we keep", and is 44px tall on a phone. |
| Printing | Added: `@media print` hides the chrome and the buttons, prints each row's address, and the layout stamps the print date. The directories reveal every row of the current result before printing, /deadlines opens every folded month, and both restore afterwards. |
| An icon-only Save (the critique's proposal) | Not used. The word was added on 2026-09-26 because the bare bookmark read as decoration (about 5 saves per 100 views). |
| Apply moved off the row onto the detail page (the critique's proposal) | Not used. It would change the apply_click metric's path for a layout gain; the whole row now opens the listing instead, with Save and Apply above the stretched link. |

Before is production (f3aeefe); after is a local build of this change. Chromium, 390x844 (mobile emulation) and 1440x900, first 24 rows:
- First row's top on a phone: /scholarships and /scholarships/calgary 475 to 328px, /programs 383 to 328px. Rows wholly on the first phone screen of /scholarships: 2 to 3.
- Row date size: 14 to 24px on a phone, 24 to 26px on desktop.
- Average row height on a phone: /programs 202.4 to 158.3px (-22%), /scholarships 178.4 to 166.4px (-7%). Page height 7,523 to 6,483px and 7,492 to 7,131px.
- Desktop: /programs rows 177.1 to 137.5px (-22%); /scholarships rows grew 100.4 to 106.3px (the countdown sits under the date now).
- Print emulation of /scholarships/calgary: 24 to 136 of 161 rows (the 25 left out are in the runs shut by default, whose headings print with their counts), each with its address.
- Reminder: at 1 day out the form is replaced by the closing line; at 10 days out it says "3 days". `/api/alert` unit tests cover the refusal and the stored cadence.
- The detector (`impeccable detect`) on the changed files reports only the selected filter chip's stripe, judged a false positive in the critique.
- `npm run ci` passes (1,083 tests) and Playwright passes on the changed specs.

Not yet checked on production.

Repair attempts against these problems: the phone date was deliberately left small in the row pass above ("adds a line to every phone row"); the date column takes no extra line, which is what made it possible. None before for the reminder promise, the phone head at this size, or print.

Add-back fraction: 1 of 4 removals (the program description, kept in the DOM for the tile views and the preview pane).

Follow-up the same night, from a review of the shipped change: the /saved rows still showed a program's description (the row there is built by `saved-client.ts`, which now marks it the same way); Tab walked out of the phone sheet into the footer and skip link behind it (the sheet now keeps focus, the directory behind it is `inert`, and widening the window past the phone layout closes it); and the /deadlines stripes counted rows hidden after their deadline passed. Checked on production at dac0e04: the reminder block says "Closes tomorrow" 1 day out and "14 and 3 days" 16 days out. Checked on a local build of this follow-up: the sheet sits at the bottom edge on the Edmonton, Alberta, National and Fort McMurray hubs (the photo-backdrop pages) and on a program hub, and 60 Tab presses never leave it.

## Impeccable product context refresh, 2026-09-29

The outcome: future design work preserves the student audience, the current public interface and the legacy quiz, describes application availability honestly, and respects publication and privacy promises. `$impeccable init` found an existing `PRODUCT.md`; it is updated in place, with the audience and purpose retained.

| Candidate | Outcome |
| --- | --- |
| Copied catalogue totals in the durable product record | Removed. The three snapshot values (1,416 scholarships, 123 listed programs, 129 program records) become references to the authoritative JSON and `programIsListed`. No catalogue data changes. |
| A historical contrast failure presented as an outstanding defect | Removed as a current claim. The accessibility requirement stays, with references to dated evidence and regression checks; this refresh makes no new conformance claim. |
| Separate or regenerated product context | Not added. The resolved root `PRODUCT.md` remains the single Impeccable product record, and the existing code-first setting stays in `.impeccable/config.json`. |

The retained record also corrects the claim that public development loaders read database drafts, the implication that every listing has a confirmed deadline, and the claim that all analytics are zero-PII. Evidence is the current public loaders, shared status rules, privacy page and publication guide. Explicit preservation rules point to `AGENTS.md`; privacy retention details point to the public policy instead of creating another schedule to maintain.

Measured locally: copied catalogue totals in `PRODUCT.md`, 3 before and 0 after. The JSON currently has 1,541 scholarship records and 270 program records; 534 scholarships have no deadline and 132 mark their deadline estimated. These counts explain why the old prose was misleading; they are not new published totals. Work avoided: this product record no longer needs a numeric refresh after each catalogue publication. Time savings and hosted effects were not measured. Live mode is not configured by this documentation refresh: the built preview uses a CSP that blocks its helper, so that optional workflow needs separate setup.

Repair attempts against these context problems: none before this change in this session.

Validation: `npm run validate-data` passes (1,541 scholarships, 270 programs, 118 redirects), and `git diff --check` passes. Only `PRODUCT.md` and this log changed. No runtime code changed; the full CI suite and hosted checks were not run for this documentation-only refresh.

Add-back fraction: 0 of 2 removals. Neither removal failed a retained behavior; no restoration was manufactured to meet the 10% target.

## Impeccable design hook enabled, 2026-09-29

The outcome: future UI edits surface mechanical design defects while the student interface is being changed. The user explicitly requested `$impeccable hooks on`. The shipped CLI set `hook.enabled: true` in `.impeccable/config.json`, preserved the code-first setting, and recorded accepted consent in the gitignored `.impeccable/config.local.json`.

Removal candidate: a second project-local skill installation and hook manifest. Not added: the installed plugin already ships `PostToolUse` and `Stop` definitions, and `codex features list` reports hooks enabled. The CLI's "No installed provider skill folders found to repair" refers to its project-local repair path. No detector exceptions were added and no public files changed.

Before: project enablement was implicit and local consent absent. After: enablement and accepted consent are explicit; `impeccable hooks status` confirms enabled with no environment override or ignored rules. Automatic execution has not been observed on a UI edit in this session. Work avoided is projected: routine manual detector invocation can be handled by the hook when Codex dispatches it. No cycle-time or hosted improvement was measured.

Repair attempts: none. An unsupported `hooks --help` query returned usage error without changing configuration; the documented `hooks on` command succeeded. Validation: the status command, JSON inspection, local consent ignore check and `git diff --check`; no runtime code changed, so CI was not run.

Add-back fraction: not applicable; no existing behavior or files were removed.

## Site-wide lean review, 2026-09-29

The outcome: Alberta students can find a relevant opportunity, understand its deadline, eligibility and cost, save it, and reach the provider with fewer setup choices and less repeated advice. The user explicitly expanded scope to public wording, layout and removal of unnecessary UI, especially on scholarships and programs. Published JSON remains authoritative. No listing, guide, provider URL, consent step, retention rule, publication reconciliation or legacy quiz behavior is removed.

Independent Impeccable assessments covered the distinct public interfaces, every guide body, all 47 hubs, all 1,811 catalogue records/detail documents, and admin/API source. The durable route coverage, limits and remaining proposals are in `docs/lean-site-audit-2026-09-29.md`. The baseline critique was 26/40; no unsupported post-change score is claimed. Impeccable hooks are enabled and were observed responding to edits during this session. The optional live overlay was blocked by the existing CSP; the CSP was kept and native browser inspection used.

| Removal candidate | Retained outcome and result |
| --- | --- |
| Three alternate directory layouts, selection preview, double-click navigation and view preference restoration | Removed. One responsive list keeps dates, amounts/costs, eligibility, Save and provider/detail links. Old stored view values do not interfere with the list. Search, sorting, grouped pagination, print and contextual detail navigation remain. |
| Permanent chip forests and program navigation disguised as filters | Replaced with labelled native selects. Program format, field, status and search now intersect and survive reload/Back. All hub URLs remain accessible from navigation and related hubs. Scholarship location still changes the hub while preserving query/type/status. |
| Repeated directory quiz invitation and cycle-tip paragraph | Removed. Relevant status groups explain availability; Explore and empty-state recovery still reach the unchanged quiz. Shorter root introductions and less top spacing bring listings forward. |
| Hidden program descriptions and duplicate per-button row metadata needed only by removed views | Removed from directory markup. Full searchable text and detail descriptions remain; row identity and save labels come from the existing row. |
| Five-step illustrated tour | Removed with its component, triggers and dedicated CSS. Direct navigation and the existing guides cover the tasks without a second instructional system. Historical analytics remains interpretable. |
| Explore's duplicate tiles and text links | Removed duplicates: 20 action controls become 10 distinct destination links. Keyboard, Escape, focus return and mobile navigation retained. |
| Saved's global reminder instruction and hidden descriptions/unused categories | Removed. Listing-level availability governs reminders. Saved program rows instead expose eligibility and cost; full details remain one link away. Empty Saved no longer offers List/Calendar, while populated lists retain calendar/export/remove/Undo. |
| Generic guide footer pitch, repeated city counts and editorial preambles | Removed. All 18 guide bodies and useful examples/provider qualifications retained; incorrect internal assertions were corrected. Related guides and contextual listing links remain. |
| Unused guide takeaway metadata | Removed 18 arrays, 54 unconsumed summary strings. Guide bodies remain the maintained advice source. This is maintenance reduction, not a runtime-speed claim. |
| Repeated reference-template explanations | Removed 134 introductory words (174 to 40); all four copyable template strings are byte-identical to the baseline. |
| Overbroad email-only privacy assurances | Removed from summaries and replaced with concise, accurate references to the detailed policy. Consent, collection/retention tables, deletion scope and Google Analytics opt-in remain. |
| Duplicate confirmation/unsubscribe page rendering | Replaced with one small shared renderer. Missing/invalid links and rate limits retain HTTP status and now explain recovery. GET does not confirm or erase subscriptions; POST, one-click unsubscribe, token escaping and anti-enumeration behavior remain. |
| Five unvisited full pages downloaded during service-worker installation | Removed. Only the self-contained offline fallback is fetched. Runtime caching still keeps visited pages, preserves existing v9 entries, bypasses admin/API/writes, and has a 60-entry cap. Failed fallback installation now rejects visibly to the browser lifecycle instead of silently activating an incomplete worker. |
| Maintenance narration, unsupported participation/ranking claims and contradictory detail-state copy | Trimmed only where supported by the authoritative records. Ended/rolling/inactive distinctions and secure-submission wording are documented in the audit. No eligibility, amount, date or provider URL was inferred or rewritten. |

The uncertain removals were tried against saved baseline source/build artifacts in `.cache/lean-session/removal-baseline` and the original worker in an isolated in-memory cache test. Retained-behavior tests exercise the surviving student tasks, rather than preserving deleted view/tour machinery. Tests solely for the deliberately deleted tour were removed; navigation coverage now proves all ten destinations remain reachable. Native filter tests retain actual count/intersection assertions.

Repair attempts: the first integrated build found one stray CSS block left by the removal script; deleting it fixed the build. The first directory run found a real phone date-column collapse caused by an obsolete mobile grid override; removing that duplicate override restored the retained date column. A new Back test raced navigation and was corrected to wait for the actual detail URL. The first broad e2e run found two old hub-link selectors and a missing native-select appearance rule: selectors now check the retained menu/related-hub links, and the existing 44px/custom-arrow control treatment is applied to the new selects. A shared-navigation selector initially mismatched whitespace; its accessible-role selector passed. A final independent source review also found that replacing program navigation rows had removed no-JavaScript hub links. A compact no-script disclosure restores those links using the same eligible hub definitions. This is a genuine partial add-back. The detail-state test harness required three unsuccessful standalone-compiler trials, then switched to the installed Astro compiler configuration; application behavior and expectations were not weakened.

Measurement methods and final validation follow. No hosted transfer, task-completion time or accessibility-conformance improvement is claimed from source counts or local tests.

Add-back fraction: **1 of 14 removal groups (7.1%)** required partial restoration: no-JavaScript program hub navigation. This remains below the requested 10% target. Repairs to retained date layout and native-control geometry are recorded honestly as repairs, not manufactured feature add-backs. The removed full-page prefetches are counted as one coherent group here; agent-specific logs count individual resources separately.


Local integrated evidence: all 1,892 public HTML documents and their normalized headings/canonicals remain; 29,923 main-region internal references resolve. Scholarships HTML is 3,437,457 to 3,101,519 bytes (9.8% smaller), Programs 733,279 to 579,553 (21.0%), Saved 804,968 to 699,854 (13.1%). Saved inline data is 753,624 to 663,488 bytes (12.0%) with all 1,811 entries. Gzip estimates and all routes are in `docs/audit-evidence/lean-site-2026-09-29-measurements.json` and `lean-site-2026-09-29-routes.csv`. A final fallback-style inspection found 4,962 unnecessary scoped attributes on Programs; using its already-unique class names globally removed 119,088 raw bytes versus that intermediate build, with the same fallback layout. This is real markup removal, not whitespace compression.

The same local 20-sample, 4x CPU search benchmark moved median handler time from 43.30 to 35.85 ms and input-to-next-paint from 92.17 to 77.09 ms. The first desktop scholarship row starts at y=391.44 instead of 558.89 at 1440x900. These are local measurements, not hosted latency or student completion-time claims. Worker install fetches fall from six to one, avoiding five baseline pages totalling 5,124,876 raw HTML bytes (665,689 gzip estimate); actual network savings depend on cache/compression. Explore has ten destination controls instead of twenty. Guide body text was reduced by 787 stripped-source words in the initial pass, followed by removal of one seven-word stale countdown; no reading-time claim is inferred. Nine selected catalogue fields go from 861 to 727 words. Template preambles go from 174 to 40 words and the four copyable messages remain unchanged.

Final verification: `npm run ci` passes with 1,105 tests, production build, bundle-secret check and type checks. Full `npm run test:e2e` passes 112 tests with 16 existing skips. The ship check confirms no removed/renamed detail URLs and requires those same shared commands. Native browser checks confirm the desktop list, 320px filters/intersection, Saved cost/eligibility and corrected availability states; inert reminder-error HTML was checked without live subscription actions. The full audit records remaining admin proposals and the limits of static versus browser coverage. No new scheduled process, dependency, provider-fact refresh, private-data access or external message was introduced.

The final inventory parser initially treated a line break and escaped ampersand differently from the baseline heading extraction. It now compares normalized rendered text; those were measurement-tool repairs, not changed headings. A final native selector used plural “results” for one match; reading the actual control (“Show 1 result”) resolved the inspection without changing the UI.

## Post-audit hook: obsolete selected-chip stripe, 2026-09-29

Outcome: preserve clear filter selection and no-script location links without maintaining decoration for controls that no longer exist. The stop hook flagged `side-tab` on `.sabl-chip.on::before`. Source inspection found only ordinary no-script scope anchors still using `.sabl-chip`; neither their markup nor their controller applies `on`. Native selects now express selection. Removed the unused stripe and its two associated selected-chip rules; retained the ordinary link layout and all current controls. No detector suppression was added and no active visual treatment was changed.

Work avoided is maintenance of three dead CSS rules, not a measured runtime-speed improvement. The earlier artifact sizes describe commit `4fa6f93`; this cleanup removes stylesheet bytes without changing rendered controls. No unsuccessful repairs; one removal group, zero add-backs. The detector reports no findings. The shared ship check required CI and browser tests: CI passed with 1,105 unit tests and successful build/type checks; browser tests passed 112 with 16 existing skips. No ignores were added.

## Status explanations fit the filter panel, 2026-09-30

Outcome: students can read every status and glossary definition in Scholarships and Programs without dragging a horizontal scrollbar. The user supplied a screenshot of clipped explanations in the desktop filter panel. All wording, semantic definition pairs, native disclosure behavior and vertical scrolling remain.

Removal candidate: the fixed two-column definition layout and its viewport-based phone exception. Removed both. Each term now sits above its description at every width, using ordinary block flow and the existing typography. Spacing between definition pairs increases from 6px to 12px. This addresses the narrow container directly without hiding overflow or adding another breakpoint.

Baseline measured on production: at a 1440px viewport the rail had 264px of content in 241px of available width; at 1200px it had the same 264px in 209px. The explanation itself needed 252px but had only 217px and 185px respectively. Verification after the change is recorded below. No load-time or completion-time improvement is claimed. Work avoided: horizontal scrolling to read definitions and maintenance of the obsolete breakpoint override.

No unsuccessful repair attempts. One removal group, zero add-backs; the retained behavior did not require restoring the two-column layout. Regression coverage opens the native disclosure with Enter, checks all definitions fit, scrolls to the final definition and closes it again, on both directories at 1200/1440px desktop and 320/412px phone widths. The Impeccable hook reports no findings; no suppressions were added.

After, measured on the built local preview: rail content equals its available width at both desktop sizes (241/241px and 209/209px); the explanation itself fits 217/217px and 185/185px. The 320px phone program sheet also fits, with 280/280px for the explanations. Native browser screenshots confirm the stacked text. `npm run ci` passes all 1,105 unit tests, the production build, bundle-secret checks and type checks. Full `npm run test:e2e` passes 116 tests with 16 existing skips, including all four new directory/project cases. No hosted performance measurement was made.

## About page editorial cleanup, 2026-09-30

Outcome: students can understand who built ScholarAB and why, then find privacy information, contact details and source code without repeated promises. The user explicitly requested deletion of the “I.I.” signature and a complete About-page review for AI slop. The notebook artwork, handwriting, personal account, founder metadata and public identity links remain. An independent source reviewer confirmed the repeated promise sections and vague instant/device claim as useful cuts.

| Removal candidate | Outcome |
| --- | --- |
| “I.I.” and signature-only layout | Removed as requested, including its two CSS rules. The existing full-name/school credit moves beside the story. |
| Repeated identity and origin sentence at the end of the story | Removed. The first four paragraphs are byte-identical, and the original final sentence still explains the wish to help other students. The byline retains the name and school. |
| Three “How it works” promise blocks | Removed. Free use, no ads and no account are already explained in the story. “Everything is public and works on any device, instantly” was an overbroad assertion. A shorter paragraph keeps device-local saves/quiz answers, reminder confirmation/unsubscribe and an explicit link to the full collection/controls policy. No consent, tracking or retention behavior changes. |
| Large source-code divider, icon and two pill buttons | Replaced with ordinary descriptive links and short paragraphs. Email protection comments, AGPL-3.0 code identification and every link destination remain. Deleted the unused data structure, wrappers, button variants, animation and breakpoint styles. |

The pre-edit source was preserved in the ignored `.cache/about-before-2026-09-30.astro` for comparison. Source checks confirm the retained story paragraphs and all five link destinations. Native inspection covered the entire published baseline and built replacement at 1440px desktop and 320px phone widths, including the end of the story and lower page. No text clips horizontally; keyboard links retain the visible 2px focus ring. The handwritten text stays at its existing 20.376px on the narrow phone.

Measured main-region text falls from 312 to 240 whitespace-delimited words; headings fall from six to two. Main-region height goes from 2,158.9 to 1,547.8px at 1440px, and 2,930.6 to 2,185.0px at 320px. The measurements compare the published baseline with the local built replacement, using the same browser and viewport sizes. Less text and scrolling are the measured work avoided; no reading-time, load-time or hosted performance reduction is inferred. Page source goes from 11,935 to 7,456 bytes, but this is not a transfer or runtime benchmark.

No unsuccessful repairs. Four removal groups, zero add-backs; no restoration was manufactured to reach the 10% target. The Impeccable hook reports no findings and no suppressions were added. The story's chosen paper and handwriting remain intentionally in place.

Verification: `npm run ci` passes 1,105 unit tests, production build, bundle-secret checks and type checks; the existing two legacy quiz lint warnings and ten Astro hints remain. Full `npm run test:e2e` passes 116 tests with 16 existing skips. The generated last-modified record changes only for `/about/`. No new dependency, script or test fixture was added for this static editorial/layout change.

Hosted follow-up: the About page deployed successfully and live inspection confirms the signature is absent, the five links remain and the main region has 240 words. GitHub validation exposed an unrelated future-date assumption in the existing stale-check test. The prior green run used Node 22.23.2; the failing run used 22.23.3 with timezone data 2026c. At `2027-03-01T06:59Z`, that newer data returns March 1 in Edmonton, whereas local Node 24.14.0 with data 2025c returns February 28. The hosted failure reproduced under Node 22.23.3 locally; merely running the old local runtime in UTC did not reproduce it. One hosted rerun was requested before the runtime difference was identified; no automatic retry loop was added.

Removed assumption: a future winter offset in an otherwise valid midnight-boundary regression test. Replaced its dates with the historical March 1, 2026 boundary and corresponding September 2025 check month. The same false-before-midnight and true-at-midnight assertions remain. Production calendar logic is unchanged; this does not pin an outdated runtime or weaken the test. This separate verification repair removes one fragile fixture assumption with no add-back. No student-facing speed improvement is claimed.

The single hosted rerun passed on Node 22.23.2, confirming why runner selection changed the outcome. The repaired 55-test utility suite and full 1,105-test CI pass locally on 22.23.3. The first attempt to run browser tests through `npx -c` prevented its nested `npx wrangler` server command from starting; selecting the same downloaded Node binary through PATH removes that launcher conflict without changing repository configuration.

The final browser run under Node 22.23.3 passes 116 tests with 16 existing skips. The follow-up changes only this evidence log and the existing unit-test dates; the published About page and production calendar logic remain unchanged.

## Match quiz: four choices and fewer questions, 2026-09-30

Outcome: students can answer one manageable question at a time, find their city or school without scanning a wall of cards, and reach useful results with the fewest relevant answers. The user explicitly expanded the legacy quiz scope and requested at most four options, largest-population cities first, and Other as the fourth city control to reveal another batch. Impeccable source reviewers, a complete published quiz walkthrough, and built desktop/phone inspections informed this change.

| Removal candidate | Retained outcome and result |
| --- | --- |
| All city, field, institution and school options displayed together | Replaced with one shared batching helper: three answers plus Other while more remain, then at most four answers. Other only navigates; it never writes an answer, advances progress or emits quiz events. Previous options is separate from Previous question. Search covers the full city/school/institution pool and retains its real fallback answer. Back, reload and answer editing reopen the selected answer's batch. All six base-question answer-value sets match the isolated baseline exactly. |
| City, average, institution, board and school questions on program-only searches | Removed from that path because matchPrograms uses only grade and field. Programs now take three questions instead of six to eight. Scholarships and Both retain the relevant six-to-eight-question path. Versioned session records migrate old program progress without losing relevant answers. Changing the search type walks forward through the newly relevant questions. |
| Broad city catchment hints, repetitive board hints and misleading school/board skip instructions | Removed. Exact city/board/school matching semantics remain, including the distinction between an unknown answer and explicit None of these/Another school. Typed rural towns retain local matching. Changing city or board still clears dependent answers. The field question now asks about interests in plain language. |
| Long results headline, completed progress bar, repeated tier totals and decorative row ranks | Removed. Your matches leads with actual shown/total counts, with per-row checks, fit labels where useful, dates, reasons, amounts, saves and provider/detail links retained. The later group now says Upcoming or undated because an unknown date is not proof that an award opens later. |
| Slide/stagger animation state, tile arrows and save confetti | Removed from the quiz and its placeholder/CSS. The 260ms selected-answer confirmation and duplicate-click guard remain intentionally, with timer cancellation on unmount. Keyboard heading focus and scroll positioning remain. No new animation dependency or automatic process replaces them. |
| Verbose explanation and duplicate empty-state reset button | Reduced the rendered disclosure from 389 to 89 whitespace-delimited words, including its heading. It keeps matching scope, session privacy/expiry, fit versus winning odds, provider verification and both directory links. Empty results direct students to the existing editable answers or directory; Retake remains available. |
| Unconditional program Apply action | Replaced with the existing shared status/action helper. Undated or closed programs use Details, while open applications link to the provider. Catalogue data and matcher rules are unchanged. |

Population ordering uses the same 2021 census year throughout, rather than mixing recent municipal estimates with older urban-area counts. Sources: [Statistics Canada municipal census subdivisions](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201), [Strathcona County's 2021 urban/rural census breakdown](https://www.strathcona.ca/council-county/facts-stats-and-forecasts/census/past-census-results/), and [Statistics Canada population centres](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001101). Sherwood Park uses its urban population, Fort McMurray its population centre rather than all Wood Buffalo, and Lloydminster the Alberta portion. These are named-place populations, not metro-area populations. Other Alberta remains the real final answer and is immediately available in filtered searches.

| Order | Place | 2021 population |
| --- | --- | ---: |
| 1 | Calgary | 1,306,784 |
| 2 | Edmonton | 1,010,899 |
| 3 | Red Deer | 100,844 |
| 4 | Lethbridge | 98,406 |
| 5 | Airdrie | 74,100 |
| 6 | Sherwood Park | 72,017 |
| 7 | St. Albert | 68,232 |
| 8 | Fort McMurray | 68,002 |
| 9 | Grande Prairie | 64,141 |
| 10 | Medicine Hat | 63,271 |
| 11 | Spruce Grove | 37,645 |
| 12 | Leduc | 34,094 |
| 13 | Cochrane | 32,199 |
| 14 | Okotoks | 30,405 |
| 15 | Fort Saskatchewan | 27,088 |
| 16 | Chestermere | 22,163 |
| 17 | Beaumont | 20,888 |
| 18 | Lloydminster, Alberta | 19,739 |
| 19 | Camrose | 18,772 |
| 20 | Cold Lake | 15,661 |
| 21 | Brooks | 14,924 |
| 22 | Lacombe | 13,396 |
| 23 | Wetaskiwin | 12,594 |

Measured work avoided: at 1440x900, the city grid changes from 24 displayed answers in 718px of height to three answers plus Other in 183px. The first scholarship result starts at y=524.45 instead of y=592.39 for the same Both/Grade 12/Calgary/STEM/90%+/University of Calgary/CBE/Another school profile. The baseline's first immediate measurement was still inside its entrance animation; the comparison uses its settled position. These are local browser layout measurements against the published baseline, not hosted latency, conversion or completion-time improvements. Smaller places require more paging if students do not use search; the complete search pool avoids that extra navigation. No percentage speed claim is inferred from fewer words or source bytes.

The source baseline is isolated in ignored `.cache/match-before-2026-09-30`. Independent tests cover every option in each encountered question, helper lengths 0 through 100, full-pool search, typed towns, explicit fallback semantics, city/board invalidation, keyboard paging, saved selections, both result types, legacy/v2 progress, storage failure, TTL, metadata-only events, loader errors/retry and cancelled unmounts. The answer schema and published JSON values remain unchanged apart from a session-record version used for migration. No user answers are sent over the network. Consent, subscription retention and publication reconciliation are untouched.

Repair evidence: the first focused UI run exposed seven assertions tied to intentionally removed copy or the duplicate reset button; one remaining fallback wording assertion was then corrected. Matching and navigation behavior passed. The initial browser-test helper incorrectly assumed every fallback should be sorted last; it was corrected to the authoritative question order before the first full run. The first full browser run passed 136 tests with 16 expected skips. Native inspection then found a long waiting-date badge overflowing a 320px screen and a low-contrast search placeholder. One repair batch allows tags to wrap, lets the row's text track shrink, and sets the placeholder to #626862. It also aligns the short explanation with the quiz and clarifies its expiry wording. Confirmation finds no row or page overflow; search retains the existing visible 2px focus ring. The new regression initially overconstrained an inner wrapper that intentionally contains gutter-wide scrolling answer chips; document/body width and date bounds already passed. Removing that wrapper-only assertion keeps the meaningful page-overflow and wrapping checks.

The local preview was briefly requested while CI rebuilt its output. After the server was restarted, the old browser error tab still rejected reload/navigation; a fresh tab opened the healthy 200 response. This was an inspection recovery, not a production code repair. No automatic retry loop was added.

Seven removal groups, zero add-backs. None failed a retained behavior, so no restoration was manufactured to meet the requested 10% target. Intentional brand type, palette, per-row eligibility checks and answer-confirmation feedback remain. The Impeccable detector reported no findings; no ignores or rule suppressions were added.

Final shared CI passes 1,129 unit tests, the production build, bundle-secret check and type checks, with zero errors and the ten existing Astro hints. The prior two quiz hook-dependency lint warnings are resolved by the primitive dependencies used for the dynamic question list. Final browser and hosted verification are recorded below.

Final full browser run passes **138 tests with 16 expected skips**, including both 320px long-date regressions. All 24 city answer values and every answer in each encountered quiz question remain reachable with at most four tiles. `git diff --check` passes. No catalogue or last-modified JSON changed during these builds. Production deployment and hosted CI status are reported with the delivered result; the measurements above remain explicitly local.

## Quiz result action bounds, 2026-09-30

Outcome: students can see and click the entire Save/Saved control, distinguish it from Apply/Details, and read the award amount without overlapping text or a partial hover background. The user supplied three screenshots showing the bookmark and label escaping the button and crowding the adjacent link. This change applies to both quiz result types.

Removal candidate: the fixed 108px quiz action column. Removed in favour of the actions' intrinsic content width. The remaining title track takes the available space; the amount retains its existing track. Action controls no longer flex-shrink, and the existing bookmark wrapper uses inline flex so its SVG is centred within the button. Shared directory control styling and all save/link behavior remain authoritative; no duplicate action component, JavaScript sizing, truncation or hidden text is introduced.

Baseline, measured on the published Grade 10/Medicine Hat/STEM/90%+/University of Alberta/Medicine Hat Public School Division/Medicine Hat High School results at 1440px: both actions shared 108px. The Save button shrank to 35.05px. Its Saved label extended 11.42px beyond its right edge, with the icon similarly outside the left edge; the visible Saved-to-Apply gap was only 2.58px despite a declared 14px layout gap. Source and screenshot baselines are isolated in ignored `.cache/match-actions-before-2026-09-30.css` and `.cache/match-actions-before-2026-09-30.png`. Work avoided is accidental or missed clicks and visual ambiguity; no task-time or load-speed reduction is claimed.

One removal group, zero add-backs; no restoration is invented to meet the 10% target. The fixed width was unnecessary for the retained student outcome. The Impeccable detector reports no findings, and no suppression was added.

Built-preview measurements at 1440px: Save is now 65.79px wide and Saved is 73.88px wide. Both labels end 8px inside the painted button, with a 14px gap between controls and 22px between the label and adjacent action text. The expanded pointer targets are at least 44px in each dimension and do not overlap. At 320px, all 20 inspected scholarship/program rows contain their icons and labels, with no horizontal page overflow. Native screenshots cover the hovered Save background, Saved background and keyboard focus. These are local layout measurements, not hosted performance or task-completion measurements.

The new regression first reproduced the two desktop failures on the baseline; the phone case already passed. These intentional baseline failures are not unsuccessful repair attempts. The first implementation repair passed all three targeted viewport cases, with no subsequent repair needed. The regression checks real published scholarship and program rows with Apply and Details, Save/Saved/hover/focus states, the final letter's click target, expanded pointer targets, keyboard navigation, accessible labels and the correct save-storage key.

Shared CI passes 1,129 unit tests, the production build, bundle-secret check and type checks, with zero errors or warnings and ten existing Astro hints. The full browser suite passes 141 tests with 19 expected skips (16 existing skips plus three project/viewport combinations intentionally covered in the other browser project). The new test passes ESLint, and `git diff --check` passes. No dependencies, catalogue or last-modified JSON changed. Hosted deployment and CI evidence are reported with the delivered result.

## Link report 39, September 30, 2026

Outcome: students reach the correct provider material and see current availability; maintainers can distinguish confirmed bot refusals from broken links without silencing future failures. The user explicitly requested a complete repair of issue 39. The full per-listing evidence is in [link-checker-39.md](link-checker-39.md).

| Removal candidate | Result and retained requirement |
| --- | --- |
| Dependence on the deleted MCHS PDF for 19 listings | Replaced with the school's stable awards and athletics pages. All IDs retained. Renamed bursary preserves both old URL forms through 301s. Three awards missing from the current document remain available with explicit uncertainty. |
| Unsupported future dates and outdated criteria | Removed four assumed 2027 deadlines, old fundraising and volunteering requirements. Corrected two amounts and one award name against current official material. |
| Claims of currently available Alberta programs | Removed active Alberta claims for WILD Outside and the ended Watersheds contest. Detail pages, explanations and official links remain; no student content was deleted because a fetch failed. |
| Replacing every school note wholesale | The first test run exposed loss of the Green and Gold school-selected, no-separate-application route. Restored its existing note and appended the current handbook reference. Capital Plumbing's old no-application assertion remains removed because current availability is unconfirmed. |
| Broad host exclusions for this report | Not added. Eleven verified refusals use exact URLs, exact statuses and expiry dates; every URL is still requested, with unrelated failure types reported. Existing legacy exclusions were not broadened. |
| Retrying an identical failing network client | A curl fallback replaces existing retry slots after transport failures. Same three-attempt maximum; final errors are visible. TLS verification remains on. No additional dependency or independent retry loop. |

Six candidates, one restored behavior: add-back fraction 1/6. The restoration follows a real retained student outcome, not an invented failure to satisfy the 10% target. Baseline data is isolated in Git; original issue, hosted baseline and browser evidence are also saved in ignored `.cache` files.

Measured work avoided: the original report repeated one dead PDF across 19 listings and listed 23 suspect URLs. Sixteen of those suspect URLs already returned 200 in a local baseline. The replacement removes all 19 references to the dead document. The fresh pre-change hosted run still had 19 broken plus 20 suspects, including four new network/refusal cases. No speedup percentage is claimed: networks differ and browser-confirmed exceptions are reviews, not automated passes. Retry count remains at most three rather than adding another retry layer.

Repair record: first shared CI failed two catalogue-count assertions after intentional availability changes; inspection also caught the Green and Gold note loss, which was restored. Updated counts retain all existing rendering/route assertions. Next CI reached script type checking and caught an inferred Promise<unknown> where the retry helper requires Promise<void>; an explicit type fixed it. Final shared CI passes 1,132 tests and the full browser suite passes 141 with 19 expected skips. The two failures were different problems; no repeated repair loop was used. Provider browser tabs that stalled were replaced with fresh tabs for independent pages rather than continually retried. No automatic retry behavior was added to native browsing.

Ship check reports the renamed bursary route is redirected and requires the shared CI and browser suite. Both passed. Generated lastmod changes correspond to the 29 edited catalogue records; inactive program pages remain built while their index entries are removed by existing publication rules. No privacy, consent, retention, draft database, visual design or quiz behavior changes.

Final local scan clears every original issue entry as a pass or a documented refusal. It exposes five separate listing failures across three URLs: Ponoka DNS, Calgary CCPC timeout and a Drayton Valley awards-page timeout affecting three listings. These are not suppressed. The moving timeout set prevents an honest latency comparison. Built native inspection confirms the renamed bursary redirects and the inactive Watersheds page still renders its explanation, provider link and alternatives.

Hosted follow-up: cf03827 deployed with a matching catalogue fingerprint and passed hosted CI. The full hosted checker took 189.5 seconds and reported zero broken links, eleven exact reviewed refusals, and two separate suspect URLs. All original 42 entries cleared. Local Ponoka DNS was resolved diagnostically through a public resolver and a certificate-validated request; no checker override was introduced.

Two further provider checks complete the expanded report. AUArts' temporary 502 recovered in both clients and the browser. Removed its outdated implication that the four-week Pre-College course would return; the provider says 2026 was its final year. The current two-week Arts-Bridge and admissions requirements remain, with both old-slug redirects. CCPC failed repeatedly through Node, curl and the hosted runner; changed the source instead of repeating that approach. Its organizer's official Eventbrite page preserves the full contest rules, eligibility and ended-event context and returns 200 in both clients. No timeout or 502 suppression was added. Total catalogue records edited: 31. These extend the existing source-dependency and availability removal groups; no additional add-back or measured speedup is claimed.

The follow-up passes shared CI with 1,132 unit tests and the full browser suite with 141 passes and 19 expected skips. Its ship check reports five changed files, the removed AUArts slug redirected, and the same two required commands. Both were completed. Native built inspection verifies the rename and retained description. No unsuccessful implementation repair was needed for the two-record follow-up; the provider timeout caused a source replacement, not a retry loop.

Final network limitation: cfad8a1 passed hosted CI and deployed with a matching catalogue fingerprint. The second hosted scan cleared both follow-up URLs, reported no broken links, but timed out on two different unchanged provider pages, Bredal Energy and Alberta's Page Program. Both then returned 200 locally with valid TLS and correct official content. No further data edit or suppression followed. A single final confirmation run after this observed recovery is linked in the audit; repeating full scans indefinitely would not repair external network variability. The normal scheduled checker continues to expose failures. This documentation-only follow-up records the limitation without expanding the repair scope.

## Scholarship combos, September 30, 2026

Outcome: a Medicine Hat student sees the local awards they can apply to together, grouped by the one fact that decides eligibility (school board, town, or where they are going next), and saves a whole set in one step. The user asked for city combos and a new page for them.

| Removal candidate | Result and retained requirement |
| --- | --- |
| One combo per city | Removed before building. A Medicine Hat High student cannot apply to the Catholic board's awards, so a city-only combo would break the "you can apply to all of these" promise. Each combo adds one deciding fact instead. |
| Dollar total per combo | Not added. Most awards are competitive, several cannot be stacked and four of the five Catholic awards publish no amount, so a total would be a figure the site cannot support. Rows keep their own amounts. |
| Hand-listed member IDs | Replaced by rules over the published JSON. Closed awards, awards only for students past high school, and combos under the floor (2 core, 3 total) drop out on the next build without an edit. Cypress County already falls below the floor. |
| A new residency field in the catalogue | Not added. The Redcliff and Cypress County rules read the audience line, the sentence students already read. Adding `localArea` to these listings would also change /match results, and other agents edit the catalogue concurrently. |
| A new list component or client controller | Not added. The page reuses the directory's global row styles, `list-core` date and apply cells, and the existing saved-list tracker. The page's script only repaints clock-dependent cells and saves. |

Five candidates, none restored: add-back fraction 0/5. No speedup is claimed. Work avoided, counted rather than timed: saving the Catholic combo is one click where the hub needed five separate saves among 20 rows. Medicine Hat has 3 combos today (5, 3 + 1 add-on, 2 + 2 add-ons), not the 5 the idea assumed; the page does not pad the count with province-wide lists.

Verification: `npm run ci` passed with 1,143 unit tests, including 11 new combo tests; the browser suite passed 141 with 19 expected skips. On the built site, the page rendered on desktop and at 375px with no horizontal scroll and no console errors, "Save all 5" put all five awards on /saved, and the Medicine Hat hub footer links to the page. The sitemap lists the page. No catalogue data, quiz behaviour, privacy or consent handling changed.

Follow-up, same day: the page was restyled as a fast-food promotion at the user's request ("more fun and playful"), and combos joined the header's Explore menu. Research: Refero styles for Lamanna (primary: condensed display type, numbered specials, pill actions), Yellowbird (3px ink outlines, 30px trays, no shadows) and Gumroad (white canvas, black primary button). Kept the site's fonts, white page, mint brand colour and the directory's Save, Apply and date cells; mustard is limited to stickers. Removed: the directory row grid on this page, replaced by menu lines (name, leader dots, price), so no new component is shared with the directories. The Explore link is generated from `comboCities`, so it cannot point at a page the build skipped. One repair: on a 375px screen the price squeezed long award names to four words a line; the name now takes its own line there. `npm run ci` passed 1,143 tests and the browser suite 141 with 19 expected skips, with the Explore menu assertion updated for the new link.

## Directory promo trim, September 30, 2026

Outcome: /scholarships, /programs and their hubs carry the combo page's fast-food feel, as the user asked ("same what you did with combos, but avoid AI slop"), without changing what a student reads in a row or how the filters work. The hubs share the header markup and the "every directory page reads the same way" rule, so they change with the two indexes.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Redesigning the rows (menu lines, trays) | Not done. Row order, stripes, Save and Apply are pinned by reader feedback and the browser suite; the trim stays in the frame: header board, sticker counts on run headings, display-face Show more. |
| A figure in the burst sticker | Not added. The header's count figures were removed on purpose (36c0f2a); the burst carries a promise instead ("Free, no sign-up"). |
| An ink outline on the filter panel | Tried, then removed: with the board above it, a boxed panel read as one card too many (the anti-slop "cards everywhere" tell). The tinted panel stays. |
| The toolbar's 2px rule under the new board | Removed; board edge plus rule read as a double line. |
| The burst on phones | Removed at 900px and below. With room made for it, "ALL SCHOLARSHIPS" wrapped and the first listing sat at 424px. |
| A second copy of the burst shape | Removed: `BURST_PATH` in `lib/icons.ts` is shared by the combo page and both directories. |

Six candidates, one restored behaviour (the filter panel outline was added and taken back): add-back fraction 1/6.

Measured on the built site at 390x844, first listing top: /scholarships 330px before, 378px after; /programs 330px before, 378px after. That 48px is the board's cost on a phone, reduced from 94px by the phone rules above. Not a speedup; no performance claim. `npm run ci` passed 1,143 tests and the browser suite 141 with 19 expected skips, including the check that every hub puts its toolbar at the same height.

Second pass, same day ("make ScholarAB fun to use, less default looking"): the trim reaches the parts used on every visit. Rows gained menu-board leader dots from the name to the price on desktop (prices now sit left in their column where the dots end); run count stickers are coloured by meaning (rust for due within two weeks, mint for open now); rows light mint under the pointer; the filter and sort pickers moved from 6px hairline boxes to ink-outlined pills; the empty state says "Nothing on the menu for that."; and the header's Saved link carries a mustard count of saved listings, updated by an event from `tracker.ts` so every save surface feeds it without its own code. Not added: a "big one" sticker on high-value rows (clutter on a 1,500-row list) and new copy for the status run labels (clarity over jokes). Phone first listing unchanged at 378px (leaders are desktop only). `npm run ci` passed 1,143 tests; browser suite 141 passed, 19 expected skips.

## Combos for every city, September 30, 2026

Outcome: students outside Medicine Hat get combos too, and a /combos/ index lets anyone find their school, board or college from the Explore menu.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Hand-written rules per city | Replaced for the common cases by generated combos: one per checked school board (board-wide awards only), per college the awards are tied to, per high school with its own list. Hand rules remain only for what the data cannot express (Redcliff residency, Cypress County). |
| Guessed board names | Not added: only the ten board codes whose audience lines name them get a combo; an unchecked code gets none. |
| Treating every member as open to all | Replaced: an award with a narrower gate is a side. Found by reading members, not by tests: Keyano's Huskies-only awards, Edmonton Public awards inside "Going to the U of A", a male-only award, an award for children of Calgary Catholic teachers (Airdrie's only combo dissolved), and one for students affected by cancer. Structured gates (field, gender, identity, named activity, a second board or college) and a list of audience-line gates now make a side. Over-flagging only moves an award into the sides. |
| One Explore link per city | Removed: 15 links would swamp the menu; one "Scholarship combos" link goes to /combos/. |
| Long combos shown in full | Collapsed: the first 6 core and 3 sides show, the rest sit in a `<details>` (no script; crawlers and no-JS readers get every row). The Calgary Board list is 58 awards. |
| A figure that double counts | Fixed: the burst counts distinct awards, since one award can sit in two school combos. |

Six candidates, one restored behaviour (the hand-written Medicine Hat College rule briefly lost its board-gate check when helpers moved; a new test caught it): add-back fraction 1/6. Result on today's data: 15 city pages (plus the index), 53 combos. City pages copy is hand-written per city with no counts in it, so it cannot go stale as awards close. `npm run ci` passed 1,148 tests (16 combo tests); browser suite 141 passed, 19 expected skips. Limitation: on a phone, Calgary's 12 jump pills stack, so its first tray starts at 1,164px.

Follow-up ("more"): six more cities (St. Albert, Spruce Grove, Fort Saskatchewan, Lloydminster, Cold Lake, Chestermere) whose school lists name the school only in the audience line. Rather than editing `specificSchools` in the catalogue (which would change /match and collide with concurrent data edits), eight audience-pattern school rules were added, each checked against that city's listings. A Northwestern Alberta Foundation combo for Grande Prairie ("one universal form" in the listings' notes), with single-hamlet, team and nation funds as sides. A "one application covers these" tag appears only when every core award goes through a form the notes say covers the set (EducationMatters, RDP General Application, the foundation, Bev Facey, LPSD); it lands on 8 combos. Named sports, immersion and student council joined the side gates. Not added: Leduc, Beaumont and Airdrie (no set survives the gates) and province-wide themed combos (a filter by another name). Result: 21 city pages, 61 combos. `npm run ci` passed 1,149 tests; browser suite 141 passed, 19 expected skips.

## Reminders on estimated deadlines, September 30, 2026

Outcome: a student who asked to be reminded about an award is never told "3 days left" for a date the provider has not posted. Found in the 2026-09-27 debug: the sender filtered on `active` and `deadline` alone, so a subscription made while a date was real kept counting down after a curator marked the date as a rolled-forward guess (64 listings passed that filter).

| Removal candidate | Result and retained requirement |
| --- | --- |
| The sender's own "can be reminded" filter | Replaced by `reminderCopy` in `lib/alerts.ts`, which reads `scholarshipStatusOf`, the rule the listing page already uses. Ended (`concluded`) listings now also send nothing, which the old filter did not check (none are affected today). |
| Skipping estimated dates outright | Not chosen: the student asked to hear about this award, so silence fails them. The email says the date is a guess ("Date not confirmed yet", "Expected around ... going by last year's deadline", "Check the date") and never counts days to it. |
| A second date formatter in the sender | Removed: `reminderDate` in `lib/alerts.ts` is the one copy. |
| /api/alert accepting a guessed date | Closed: the runtime catalogue carries a sparse `deadlineEstimated`, and the route refuses it. The listing page never offered the form, so only hand-made requests were affected. |

Four candidates, none restored: add-back fraction 0/4. Measured on the production database (counts only, no addresses): 43 confirmed subscriptions, 2 on estimated dates (#373, first email 2027-07-10; #47, 2027-04-01). #748 and #1670, the two nearest estimated dates, had no subscribers, so no wrong email went out. The email template and the confirmed-date copy are unchanged (the email redesign stays deferred); both variants were rendered and checked by screenshot.

## Search check and three phone fixes, September 30, 2026

Outcome: know whether the August snippet rewrites earned clicks, and give a phone reader a smaller consent band, a header that stays with them on the home page, and one whole match on the first results screen.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Two copies of the Search Console credential loader and token exchange (`index-status.ts`, `gsc-months.ts`) | Merged into `scripts/lib/gsc.ts`, which the new `gsc-ctr.ts` also uses; it pages Search Analytics past 25,000 rows, which the old single request silently could not. |
| Another snippet rewrite | Not done. The check (docs/seo-index-status.md) shows ranking growth, not a snippet effect, on too few clicks to act on; the Rutherford guide's "stop rewriting" note stands. The one concrete fault, menu text quoted in an AI Overview card, is fixed with `data-nosnippet` on the header and footer. |
| The home band's `position: relative; z-index: 2` | Removed. It served a transparent bar over a hero film (5382481); the bar has been solid since, and the rule was all that unstuck the home header. |
| One sentence of the consent body ("which is how we tell a returning visitor from a new one") | Removed on every width. Kept: the cookie, that it identifies the browser, that no changes nothing, the privacy link, both 44px buttons and all consent logic. |
| The reminder line, Retake and the city link above the phone results | Moved below the list on phones (CSS order; markup split so Save stays above). Desktop unchanged. |

Five candidates, none restored: add-back fraction 0/5.

Measured on the built site in WebKit at iPhone 13 size (390x664):

| | Before | After |
| --- | --- | --- |
| Consent band | 179px (27%) | 144px (22%) |
| Home header top after scrolling 800px | -800px | 0 |
| First quiz match, top to bottom (Medicine Hat, Grade 12, Catholic board) | 499 to 772px (cut off) | 382 to 655px (whole) |

The plan's target for the band was 110px; the two-line body and 44px buttons set the floor at 144 without dropping required disclosure. The first-match figure differs from the 2026-09-27 audit's 659px because later fixes had already moved it. The 2026-09-28 section's "Not yet checked on production" line is out of date: those fixes were confirmed on www that day. New browser guards: the header stays pinned on / and /scholarships/, and results keep Save above the list with the rest below it on a phone. Found in passing: the weekly index-status launchd run of 2026-09-14 failed 1,308 of 1,320 inspections.

## Combos on /match, September 30, 2026

Outcome: a student whose quiz answers put them in a combo is told so on the results screen, with one tap to save the set, instead of having to find the combos page.

| Removal candidate | Result and retained requirement |
| --- | --- |
| A second download for combo data | Not added: `comboIndex` (combos.ts) goes into quiz-payload.json beside the catalogue it is built from, 3.1 KB gzip on a 163 KB payload. The results intersect each combo's core ids with the student's own matches, so an award that closes after the build drops out on the visitor's clock. |
| Asking a new question for combos | Not added. The key is an answer the quiz already has (city, board, school, college); the eight schools the listings name only in their audience line join the existing school question, derived from the listing text like every other school there, and filter nothing else. |
| A per-combo field in the events table | Not added: `combo_open` has no meta, so which combo is not an open field. |
| Placing the tray above the results | Rejected: on a phone the first match is only just on screen (fixed the same day). The tray follows the third row, and the first match is still 382 to 655px on a 664px iPhone screen. |
| Grade 10 and 11 awards in a combo's core | Removed, found by the new drift test: the St. Oscar Romero combo's core was a Grade 10, a Grade 11 and a Grade 12 award, so no one student could apply to all three. An award not open to Grade 12 is now a side. Romero and the Alberta High School of Fine Arts fall below the floor; Edmonton Public, Calgary Board and "Going to the University of Lethbridge" each lose one core award to their sides. |

Five candidates, none restored: add-back fraction 0/5. Result: 59 combos (was 61), of which 58 can be named on /match (Redcliff has no quiz answer); before this change 51 were reachable, 7 of them only after the school question learned the audience-line schools. A real-catalogue test now fails if any indexed combo returns fewer than two of its core awards to a Grade 12 student who gives its answer; today every one returns all of them. The phone probe and screenshots were taken on the built site in WebKit at iPhone 13 size and in Chromium at 1280px.

## Weekly index-status run, September 30, 2026

Outcome: the Monday Search Console check finishes and says which sitemap pages Google is not serving, instead of silently producing a 12-row snapshot.

Cause, from `private/index-status/weekly.log`: the 2026-09-14 run inspected 12 URLs, then 1,308 came back HTTP 401 and the snapshot was written 72 minutes after the start. The token lasts an hour and was minted once per run ("every run is minutes"), 401 was not retried, and the run was not kept awake. A full pass had grown to 1,878 URLs and 53 minutes (measured 2026-09-30), so the same failure was one sitemap growth away even on an awake Mac, and a full pass was about to outgrow the 2,000-a-day quota.

| Removal candidate | Result and retained requirement |
| --- | --- |
| One token per run | Replaced: `accessToken()` in `scripts/lib/gsc.ts` renews five minutes before expiry and shares one in-flight mint among the workers; a 401 drops the token and retries that URL once. Checked by forcing a 401 on the first inspection: 2 of 2 inspected, 1 retry, 2 tokens minted. |
| Asking about every sitemap URL every week | Replaced by a budget (default 1,800): new URLs, then pages Google is not serving, then the longest since asked. Unasked and failed URLs keep their last known row with `inspectedAt`, so the snapshot stays complete and a failure cannot read as a de-indexing in the diff. Checked with `--budget 20`: 20 inspected, 1,858 carried, 1,878 rows. |
| A run the Mac can sleep through | Wrapped in `caffeinate -i` in `scripts/index-status-weekly.sh`. |
| A separate scheduler or a hosted job | Not added: the key stays on this machine and out of CI secrets. |

Four candidates, none restored: add-back fraction 0/4. Measured on 2026-09-30: a full manual run inspected 1,878 of 1,878 with 0 failures and 0 retries in 53 minutes (1,792 indexed, 86 in the request queue). The next Monday run is the first real test of the launchd path; read the `RESULT` line at the bottom of weekly.log.

## Home carousel photos on a phone, September 30, 2026

Outcome: a phone visitor downloads the carousel photo they can see and the one a swipe will show, not the whole strip beside it.

Cause: every card's photo was an `<img loading="lazy">`. Chrome's lazy-load distance covers the sideways strip, so on a Pixel 7 the page fetched five 2000w tall photos while one was on screen. Measured on the built site with the page scrolled top to bottom and the carousel never swiped:

| | Before | After |
| --- | --- | --- |
| Pixel 7 (Chromium), at load | 5 photos, 1,725 KB | 1 photo, 311 KB |
| Pixel 7, after scrolling past the carousel | 5 photos, 1,725 KB | 2 photos, 530 KB |
| iPhone 13 (WebKit), after scrolling past | 3 photos, 991 KB | 2 photos, 530 KB |
| Desktop Chrome, after scrolling past | 3 photos, 432 KB | 2 photos, 254 KB |

| Removal candidate | Result and retained requirement |
| --- | --- |
| Real sources on every card | Removed: only each set's first photo is a real `<img>`. The rest carry `data-srcset` until the carousel is within 400px of the screen, then the card in view and its neighbours get their sources as the strip moves. Swiping each of the ten cards with a 700ms settle landed on a loaded photo every time in Chromium and WebKit. |
| Smaller files for 3x phones | Not done: a 1170px-wide iPhone screen would upscale the 1000w file, a visible change to photos Ilia chose at full strength. |
| A lazy-loading library | Not added: an IntersectionObserver and the carousel's own scroll sync. |
| Photos for no-JS visitors | Kept: a `<noscript>` copy of each deferred picture; with JS off all 18 photos load, as before. |

Four candidates, none restored: add-back fraction 0/4. The contrast test over the photos now waits for each photo to load; before, a deferred card would have been measured against the ink behind it and passed. New browser guard: the home page fetches exactly two carousel photos once the carousel is in view, and the third arrives on a swipe. Local only; `npm run ci` passed (1,163) and `npm run test:e2e` passed (153).

## Single-school awards removed, September 30, 2026

Outcome: a student opening ScholarAB finds awards they can apply for and would not hear about at school. An award only one high school's students can win is announced by that school, and nobody outside the building can apply, so its listing costs a yearly re-check and a row in the directory for almost no use.

Method: every listing was tagged by who can apply (one high school, enrolled at one college, entrance to one college, a town or county or district, Alberta, Canada), by hand from its audience, school list and source page. Tags, scripts and data are in `private/city-demand/` (gitignored). An award on a school's page whose audience did not name the school was tagged local, so 472 is a floor.

| | Listings | Share | Apply clicks since Jul 17 | Share | Apply per listing, live by Sep 15, events since |
| --- | --- | --- | --- | --- | --- |
| One high school | 472 | 31% | 56 | 4% | 0.10 |
| Enrolled at one college | 113 | 7% | 10 | 1% | 0.06 |
| Entrance to one college | 92 | 6% | 24 | 2% | 0.10 |
| Town, county or district | 551 | 36% | 348 | 27% | 0.26 |
| Alberta | 161 | 10% | 467 | 36% | 0.91 |
| Canada | 152 | 10% | 408 | 31% | 1.63 |

Search Console (2026-03-01 to 09-28) gave the single-school group 93 of 491 listing clicks; the queries Google reports for small-town listings were the award's own name, typed by someone who already knew it. Calgary held 62 of the 472, so the line is eligibility, not city size.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Whole small-city directories | Not done: town and county awards open to anyone there get 2.6 times the use of single-school ones and are the awards students miss. |
| The 472 single-school listings | Removed. Each slug 301s, in both slash forms, to its city or scope page; every city page keeps at least MIN_FACET_ITEMS (Chestermere lands on 5). The Spruce Grove rename that pointed at a removed listing now points at the Spruce Grove page. Two guides keep their prose about school awards and drop the four links. |
| Database copies | Kept: `sync-db` mirrors without `--prune`, and its guard refuses a bulk removal, so `catalogue_entries` still holds 472 published rows the site no longer builds. Reminders read the JSON, so the one confirmed subscription on a removed award stops sending. |
| College-only awards (113 enrolled, 92 entrance) | Not yet: Ilia chose to cut the single-school group first. |
| The Chestermere page | Removed: after the cut its five listings were four Calgary Black Chambers awards and the Rocky View teachers' award, none from Chestermere, and its intro described a city award that was gone. It 301s to the Calgary page; the quiz keeps Chestermere as a city answer, since the Calgary-region awards still match there. |
| School combos named after one of several schools | Removed: a school combo now needs one award that is that school's alone. Without the rule, the cut left "Bow Valley High School" in Cochrane and "Holy Trinity Academy" in Okotoks holding awards every school in town shares, named after whichever school sorted first. Combos 58 to 16, combo pages 21 to 9; the 12 retired combo pages 301 to their city page. |
| Quiz school answers taken from audience text | Removed: all eight led to a combo that no longer exists. |
| Copy that described removed awards | Rewritten from the surviving listings: 13 city page descriptions or intros (Okotoks promised a 52-award handbook, Lloydminster "thirty-two of these share one form"), 4 combo pages and the combos index. |

Add-back fraction: 0/5 removed. Listings 1,541 to 1,069 (31% fewer to re-check each cycle); sitemap 1,878 to 1,395 URLs; `_redirects` 122 to 1,092 rules (Workers allows 2,000 static). Local only: `npm run ci` passed (1,163), `npm run test:e2e` passed (153, 19 skipped), and the built home page's 60 internal links all resolve.

## Grade 12 focus: college, post-secondary and Grade 10 to 11 awards removed, September 30, 2026

Outcome: ScholarAB serves one student well, a Grade 12 student heading to college or university, before it widens. Ilia's instruction: "focus on one thing, make it good", and add colleges and universities back properly later.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Awards a college or university gives out itself (205: 113 for its enrolled students, 92 entrance) | Removed, entrance awards included (Ilia's choice): Keyano, Red Deer Polytechnic, Burman, Augustana, Northwestern Polytechnic, King's, U of Lethbridge, UCalgary, Medicine Hat College and the rest. They return later as their own section. |
| Outside awards only for students already in post-secondary (67) | Removed after reading each audience line: 62 graded post-secondary only or ungraded, plus 5 graded Grade 12 whose text was for working nurses, student leaders in university or registered apprentices. Kept 9 ungraded or post-secondary-graded awards a Grade 12 student can apply for (Advancing Futures, Indspire, the Masonic bursary and six more), and county bursaries for graduates entering first year. |
| Grade 10 or 11 only (8, plus the U of Lethbridge Grade 11 award counted above) | Removed (Ilia's choice). Awards open to Grades 10 to 12 stay. |
| Quiz answers for colleges with no remaining award | Removed: U of Lethbridge, Northwestern Polytechnic, Keyano and Medicine Hat College. Seven colleges and the trades answer stay, each still named by a listing. |
| Copy that described removed awards | Rewritten from the surviving listings: 10 city pages, 4 combo pages and the combos index. Seven guides keep their prose and drop the links. |

Each removed slug 301s in both slash forms to its city or scope page, older rules that pointed at a removed listing were retargeted, and the four college combo pages (Lethbridge, Lacombe, Fort McMurray, Camrose) 301 to their city pages. Every city page keeps at least MIN_FACET_ITEMS; Beaumont is the thinnest, one Beaumont award among seven.

Add-back fraction: 0/5. Listings 1,069 to 789 (280 removed; 1,541 to 789 across both cuts today, 49%). Combos 16 to 8, combo pages 9 to 5. Sitemap 1,395 to 1,111 URLs. `_redirects` 1,092 to 1,660 rules: Workers allows 2,000 static rules, so the next large removal needs a different redirect approach (dropping the oldest rename rules once Google has recrawled them, or a Worker route) rather than more lines. Local only: `npm run ci` passed (1,163), `npm run test:e2e` passed (153, 19 skipped).

## Grade question removed from the scholarship quiz, September 30, 2026

Outcome: a Grade 12 student reaches their matches in one fewer tap. Every listing left after the Grade 12 cut is open to Grade 12, so the grade answer could no longer change a scholarship result; Grade 10, Grade 11 and "Already in post-secondary" only promised awards the catalogue no longer has.

| Removal candidate | Result and retained requirement |
| --- | --- |
| Grade question on the Scholarships and Both paths | Removed. The matcher scores every scholarship search as Grade 12, including a Both search switched from Programs with a different grade. |
| Grade question on the Programs path | Kept for now: 20 of 259 live programs are closed to Grade 12 and 14 cap at age 17, so the answer still changes program results. Under review with Ilia. |
| Progress saved by the six-question version | Migrated, not discarded: version 3 drops the stored grade and moves the step back one, so a student mid-quiz resumes on the same question. |

Add-back fraction: 0/3. Scholarship quiz 6 to 8 questions becomes 5 to 7; programs stay at 3. Local only: `npm run ci` passed (1,162).

## Critique fixes, October 1, 2026

Outcome: the three first-impression moments (quiz results, a city hub reached from Google, a listing on a phone) show the student what they can act on, in plain words. From the 2026-10-01 critique (`.impeccable/critique/2026-10-01T03-40-17Z__src-pages.md`).

| Candidate | Result and retained requirement |
| --- | --- |
| Quiz results grouped by date first | Changed: up to five strong, unrestricted matches lead as "Your strongest matches", then the date groups. The Save button saves that group, which now sits directly under it. Due-soon possible matches keep their group and their Check: reasons. |
| "Good match" for keyword-only hits (critique claim) | No change: the cited award (Bonnyville Agriculture Society) is tagged business in the data because it funds agriculture business programs. |
| City hubs read as the whole list | Added one line under the toolbar naming the province-wide and national counts, linked. Placed under the toolbar so every hub's toolbar stays at one height (smoke.spec). "Many of", not "all of": the province-wide hub also holds single-town awards. |
| Phone standfirst clamped to two lines | Removed: it cut Calgary's off before "$100,000". |
| Directory Apply/Save under 44px (critique claim) | No change: both already carry 44px hit areas through `::after` (global.css); the review measured the drawn box. |
| Detail CTA labels touching the button edge | Fixed: 18px side padding on the CTA, official-site and copy buttons. |
| Mustard kickers ("Now serving", "On the menu", "Pick your city") | Removed from directories, hubs and combo boards. The heading already names the place; the burst, ink board and stickers stay. |
| "Sides" wording on combo pages | Reworded: "+N to check" and "Also check these, if the line under one fits you". Empty states say "No scholarships match that." / "No programs match that." |
| "Deadline TBA" on detail pages | Now "Not posted yet", matching the list's "date not posted". |
| Quiz option hover sticking on touch | Hover tint gated by `(hover: hover)`. |
| Count sticker squeezed beside a wrapping heading | `flex: none`. |
| Guide cards on /scholarships/ and /programs/ | Now zebra rows like every other list; /scholarships/ leads with the Grade 12 timeline instead of the Grade 11 one. |
| Duplicate "Who can apply" on phone detail pages | The box below the top line keeps only its "Worth knowing" note on phones. |
| Deadlines "This week" chip beside "SEP" | Renamed "Next 7 days" and set apart by a rule; the section reads "Due in the next 7 days". |
| Phone menu "Explore" said nothing about its contents | Hint "Quiz, deadlines, guides" in the sheet (aria-hidden, so the link's name stays Explore); menu counts 11px at 62% to 14px at 72%. |
| "Another school" first in the school question (critique claim) | No change: first on purpose since 2026-09-27, so a student without a listed school can pass without paging 64 tiles. |

Add-back fraction: 0/15 (three claims checked and left unchanged, not counted as removals). Measured on the static build: Calgary hub first row 492px of 812 on a phone (the line and the unclamped standfirst cost it; the kicker's removal paid some back), /scholarships/ first row 358px (was 378px with the kicker), no horizontal overflow at 375 or 1280. Local only: `npm run ci` passed (1,163), `npm run test:e2e` passed (151, 19 skipped), `impeccable detect` clean on every changed file.

## One "Open now" status, October 1, 2026

Outcome: a student filtering for what they can apply to today gets all of it with one choice. "Open any time" was a second STATUS option and a second list run for the same answer to that question. It held 2 scholarships beside 249 "Open now", and on /programs it held more programs (48) than "Open now" did (40), so "Open now" hid most of the open programs.

| Candidate | Result and retained requirement |
| --- | --- |
| "Open any time" STATUS option on /scholarships and /programs | Removed. "Open now" holds dated and no-deadline listings: /programs "Open now" is 88 (40 + 48). Old `?status=ongoing` links open "Open now" (directory-client, e2e test). |
| "OPEN ANY TIME" list run | Folded into the OPEN NOW run. Within it, no-deadline rows sort after dated ones by date and by amount like any other row, so "Highest $" no longer splits the run. |
| "N open any time" line on home photo slides | Removed. "N open right now" counts both, the same set as the hub chip it links to (`openCounts`, numbers.spec). |
| "Open any time" as a fourth status headword | Now the headword "Open now" with the qualifier "no deadline" (rows, /saved, the detail chip, quiz results, related cards). The "What these mean" note loses a line. |
| The rolling/Ongoing distinction itself | Kept: it decides the row's date cell and keeps estimated or unposted dates out of "Open now" (status.ts unchanged). |

| "DUE WITHIN 2 WEEKS" run above OPEN NOW | Removed, with its sort rule and rust count style. Under the default "Earliest deadline" sort it was the top of OPEN NOW with a second heading; each row's date already turns rust inside 14 days. Under "Highest $" a close deadline now sits where its amount puts it (the trade-off). The quiz's own due-soon results group is separate and unchanged. |

Add-back fraction: 0/5. Local only: `npm run ci` passed (1,163), `npm run test:e2e` passed (153, 19 skipped); no "open any time" or "within 2 weeks" text left in `dist/`.

## Entrance awards back, October 1, 2026

Outcome: a Grade 12 student choosing a college or university sees the money that school gives new students. Ilia asked for the 92 entrance awards cut the day before to come back; the 113 awards for students already enrolled and the 67 outside post-secondary-only awards stay out.

| Candidate | Result and retained requirement |
| --- | --- |
| 92 college and university entrance awards (tagged E in `private/city-demand/scope.json`) | 91 restored from 7619a59 in their original order, unchanged: Red Deer Polytechnic 27, Keyano 22, Northwestern Polytechnic 14, Burman 11, U of Lethbridge 4, The King's 4, Augustana 3, Medicine Hat College 3, UCalgary, Lethbridge Polytechnic and CBTS 1 each. 29 open now, 9 open later, 32 date not posted. The 21 that are applied for after starting (Keyano's December first-year awards, Red Deer's upgrading and re-entry bursaries) sit in the FOR AFTER HIGH SCHOOL run, as before the cut. |
| U of Lethbridge Grade 11 Merit Award | Not restored: Grade 11 only, which the Grade 12 focus removed by choice. |
| Their 182 slug 301s | Removed, and 2 older rename rules point at the restored listings again. `_redirects` 1,660 to 1,470 rules. |
| College combo pages 301 (Lethbridge, Lacombe, Fort McMurray, Camrose) | Removed: the restored awards rebuild those combos, so the pages exist again. |
| Quiz answers U of Lethbridge, Northwestern Polytechnic, Keyano, Medicine Hat College | Back, each named by a restored listing again. |
| Hub and combo copy rewritten for the cut | Kept: still true, it just does not mention entrance awards. |

Add-back fraction: 91/92 of the entrance cut. Local only: `npm run ci` passed (1,163), `npm run test:e2e` passed (153, 19 skipped); the no-separate-application count test moved 16 to 21, all five restored admission-automatic awards. The database republishes them on the next CI mirror (sync-db upserts published JSON).

## University & college awards page, October 1, 2026

Outcome: a student applying to a college or university finds that school's entrance awards wherever they live. Filed by the school's city, Burman's eleven sat on the Lacombe page, and the quiz hid every one of them from a student outside that city even when they named the school (Ilia: "no matter where you are located ... as long as you apply to that university").

| Candidate | Result and retained requirement |
| --- | --- |
| Entrance awards filed under the school's city | 79 moved to region "University & college" and a new hub, `/scholarships/university-college-awards/`, with a School picker (Red Deer Polytechnic 27, Keyano 22, Northwestern Polytechnic 14, Burman 11 and seven more). The 12 that also require a local graduate or resident (Wood Buffalo at Keyano, Central Alberta at Red Deer Polytechnic, within 100 km of Burman, the Peace Region, Mamawi Atosketan) keep their city and appear on both pages via `alsoOpenTo`. |
| Quiz: city rule on a school's own award | Replaced by the school rule (`school-awards.ts`, eligibility-matcher): a school award matches a student who names that school, from any city; local ones still need the city. Not "Local to" anywhere. Burman, The King's, Lethbridge Polytechnic and CBTS joined the school question, since their awards are reachable only through it; the reachability test now tries every school answer. |
| "University & college" printed as a place | Rows, related cards, the detail subline, OG and social cards show the school instead (`placeOf`). Left out of "Where you live", the deadlines town filter and the city pages' "also open to you" line. In snippets the school is omitted when the title already names it, which kept 3 metaDetail clauses; 3 others now carry the school instead of their clause. |
| Lethbridge, Lacombe, Fort McMurray and Camrose combo pages | Gone again (they were made of these awards) and 301 to their city pages. |
| Menu | A text link under Scholarships, not a photo tile: the tiles are places. |

Add-back fraction: 0/5. Local only: `npm run ci` passed (1,167), `npm run test:e2e` passed (153, 19 skipped); built page checked in the browser (School picker narrows and deep-links with `?school=`).

## What you'll need on award pages, October 1, 2026

Outcome: a student sees what an application takes before clicking Apply, so they can pick what they have time for. The flow plan (private/flow-plan/PLAN.md) measured the drop-off: 262 saves in 30 days against /saved at 0.8% of page views, and provider pages that range from no application at all (New Beginnings) to a portal, essays, a one-take video, a referee and a transcript (Loran). Three of the eight most-clicked providers do not say until you are inside their form.

| Candidate | Result and retained requirement |
| --- | --- |
| Phase 1 cuts in the plan: tour strip, "FREE NO SIGN-UP" sticker, run-count stickers | Not cut. The tour was already removed in 4fa6f93 (the few tour events since are cached pages); the sticker and count stickers are the 2026-09-30 promo trim Ilia asked for. The plan was wrong to list them. |
| "Copy link" button under Apply | Removed with its handler and style. A third full-width button in the card; phones share natively and desktops have the address bar. |
| "Program cost: Not listed" | Kept. Saying a fee is unknown is honest (`programValue`); the fix is filling the 101 missing costs, which is data work. |
| "More like this" picks | Kept. Its loose matches are the corpus-wide inbound-link balancing in `related.ts`, which keeps every listing reachable for indexing. |
| `toApply` on 45 of the 50 most-used scholarships | Added: each item from the provider's own page, read 2026-10-01, never derived from notes. `complete` marks the 29 whose page lists the whole application; the other 16 say the form may ask for more. Grant MacEwan UWC, Ted Rogers (provider URL 404), editing.services (403), Ambassador (PDF only) and LaDue (aggregator page only) have none. Validated in `validate-data.ts` (`lib/to-apply.ts`). |
| "Who can apply" box on desktop | Folded into the line under the title, as on phones since 2026-09-27, so the list can lead the column without the eligibility sentence printing twice. The box keeps the "Worth knowing" note. |

Add-back fraction: 0/1 of the one cut made.

## Saved view switch on the ink board, October 1, 2026

Outcome: a student on /saved can see both views and switch between them. The 2026-09-30 promo trim made every `.sabl-title-row` an ink panel, and /saved shares that row, so the List / Calendar switch kept its ink border and ink "Calendar" on ink: only the active "List" showed, as a stray word (Ilia's screenshot).

| Candidate | Result and retained requirement |
| --- | --- |
| Drop the switch, keep List only | Not cut. Calendar is the saved deadlines view and the switch is its only door. |
| Switch colours inside the board | Inverted (white border and text, white active button), 14px above it on phones where the board stacks with no gap. |

Add-back fraction: 0/0. Local only: built /saved checked on phone and desktop, both views.

## Five listings from the What you'll need research, October 1, 2026

Outcome: a student acts on what the provider says today. Reading the top 50 provider pages for `toApply` turned up five listings that disagreed with their source.

| Candidate | Result and retained requirement |
| --- | --- |
| Scotiabank x myBlueprint: $3,750, four streams, 16 winners, opens 2027-01-01 | Corrected to the 2026 page: one Financial Wellness stream, ten awards of $3,000. The 2027 open date was never published, so it goes; the deadline is 2026's April 24 rolled forward with `deadlineEstimated`. |
| Ted Rogers Legacy: Rogers page 404, "no application form" | Pointed at the University of Calgary award page: two $25,000 awards a year, renewable to $100,000, through the High School Prestige Awards application (October 1 to December 1, the same dates as Pathways to Medicine). |
| Chick-fil-A Community Scholars: age rule only in the kit | Added to the notes: 18 by July 15, 2027. |
| RBC Elevate "listed as open" | No change: it already reads "Not posted yet", and the 2026 window is in its notes. My report was wrong. |
| Canada's Luckiest Student as a scholarship | Kept: the description calls it a giveaway and its kit says prize draw. |

Add-back fraction: 0/0 (corrections, nothing cut). Local only: validate-data OK.

## /saved as a plan, October 1, 2026

Outcome: a student who saved awards comes back to a next step, not a second copy of the directory. Measured: 262 saves in 30 days against /saved at 0.8% of page views (private/flow-plan).

| Candidate | Result and retained requirement |
| --- | --- |
| A separate "Start here" list above the rows | Not built: it would repeat three rows and add a screen of scrolling. The first three open awards that take an application are numbered in place instead, with the combo trays' sticker. |
| Moving a row as soon as its status changes | Not done: the row stayed under the pointer that set it. Submitted and Won sink below the work still to do on the next visit. |
| A per-award checklist | Not built: one status per award (Not started, Working on it, Submitted, Won) carries the plan; the award page already lists the items. |
| Totals of what the list asks for | Added from `toApply` kinds and letter counts only (the text stays on the award page), over open awards not yet submitted, with how many lists are partial or missing. |
| An event per status | One event, `app_status`, meta fixed to working, submitted or won and only with an item; statuses themselves stay in localStorage (`scholarab_status`). |

| The plan's sentences on a phone | Cut at Ilia's call: with them the first phone row started at 648px of 812. Phones get the totals as one line in short words (3 letters, 5 essays, 1 transcript); desktop keeps the lead and the note. First phone row now at 454px. |

Add-back fraction: 0/1. Cost: each saved row is about 42px taller for its status. Local only: `npm run ci` passed (1,181), `npm run test:e2e` passed, built /saved checked on phone and desktop.

## What's next on listing pages, October 1, 2026

Outcome: a student who lands on one listing from Google has a next step on the screen that ends this one. 50-58% of arrivals land on a single listing, average 2.2 pages, and 1-9% reach "More like this" at the foot (private/flow-plan).

| Candidate | Result and retained requirement |
| --- | --- |
| Move "More like this" up | Not done: its picks are loose on purpose (`related.ts` balances inbound links across the corpus), so they are no next step. It stays at the foot for that job. |
| A pick per page with a reason | Added under What you'll need (`lib/whats-next.ts`): one pick per reason in order (same place, same work from `toApply`, same field, same kind of award), never one already in More like this, open with a week left. Scholarships 2 or 3 picks on all 848 open pages, programs 2 on 258; closed pages keep "Open now instead". |
| Picks a student can't take | Cut by `fits`: Loran's page offered a county agricultural award at Olds College and Kin Canada's an oil-and-gas one. A pick is never narrower in place (`localArea` too), field, school or group. |
| Timing-only picks | Capped at one a page (two when nothing else qualifies), and only from the 45 hand-researched awards: by season alone, a woman's award was offered a bleeding-disorder one. None on program pages, where it put the AMC math contest on 217, the youth choir's among them. |
| "Also for marks" (Academic category) | Dropped as a reason: it matched Loran to a county bursary on nothing a student would recognise. |

Add-back fraction: 0/0. Local only: built pages sampled (Loran, Kin, Ted Rogers, Chick-fil-A, Empowered Young Woman, Conrad, Alberta Youth Choir) and checked on phone and desktop.

## City pages: remembered city and a shorter first step, October 2, 2026

Outcome: a returning student gets back to their city's list in one tap, and a city page ends sooner. A Calgary phone page ran 8 screens with 24 rows before "Show more", and 4-7% of readers reached its end (private/flow-plan).

| Candidate | Result and retained requirement |
| --- | --- |
| Point "Browse 880 scholarships" at the remembered city | Not done: the home page's buttons are the part readers praised, and the whole directory stays one press away. One line under them instead, "Back to Calgary: 10 open now", only when a city list was opened on this device (`sa_city`, lib/my-city.ts), painted inline before first paint so it shifts nothing. |
| A city picker or "change city" control | Not built: opening another city's list replaces the remembered one. |
| 24 rows before "Show more" on city pages | 12 on city hubs (`step`, read by directory-client from `data-dir-step`): Calgary's ten open awards all show, the 62 opening later sit behind "Show 12 more". Phone page 8.0 to 5.5 screens. Province-wide, national, school and topic hubs and /scholarships keep 24. |
| Privacy page | Updated: the counts list now names the /saved status event shipped 2026-10-01 (it had been missed), and the device-storage line names statuses and the remembered city. |

Add-back fraction: 0/0. Local only: built Calgary, Edmonton and home pages checked on phone and desktop.

## City boards: specials and the city's photo, October 2, 2026

Outcome: a city page says something only it can, from its own data and its own place, on the board a student already reads, without costing a phone screen.

| Candidate | Result and retained requirement |
| --- | --- |
| "Closes next" special | Not built: the list is sorted by closing date, so it would repeat the first row under the board. |
| Specials in the board | Tried and moved: on the board they pushed every city's toolbar 170 to 260px below the other hubs' (smoke.spec holds every hub's toolbar at one height). They sit under the toolbar instead, beside "These are only the Calgary awards": "Biggest" (largest figure still to go for) and "Opens next" (soonest future open date), from `lib/city-specials.ts`, Grade 12 awards only. Phones show only "Biggest". |
| Full-page photo backdrops back on | Not done: switched off 2026-09-15 ("looks broke") and still off (`BACKDROPS_OFF`). |
| The city photo inside the board | Desktop only, the right 30% at full strength under the sticker, meeting the ink as the home carousel's slides do; the text keeps its usual column (holding it to half the board wrapped it and moved the toolbar), with a shadow where a long name (Fort Saskatchewan) reaches the photo's dark edge. The CC BY photos carry their credit on the board. Phones get a 1px placeholder, so no download and no added height. |

Add-back fraction: 0/0. Local only: every city board measured at 1440, 1180 and 1000 wide (toolbar height and text-to-photo overlap); Calgary, Airdrie and Fort Saskatchewan checked by eye; no backdrop request at 375.

## Listing page: Worth knowing first, card without the template labels, October 2, 2026

Outcome: the note that only ScholarAB has (Loran closes at noon ET, finalists still get $6,000) is the first thing under Apply, and the card reads as words rather than a form.

| Candidate | Result and retained requirement |
| --- | --- |
| The "Who can apply" box around the note | Deleted: its heading and text had been hidden since 2026-10-01 (the same sentence sits under the title), so it was a wrapper for the note alone. The note stands on its own. |
| Ruled notebook paper (two gradients, red margin, pitch maths, three breakpoints) | Replaced by the list boards' ink with a mustard heading, the one look already marking the site's own voice. First in the left column: on a Loran phone page it moved from 1660px to 800px down, 451 to 337px tall. What's next moves down 370px (1341 to 1710). |
| All-caps card labels ("AWARD VALUE", "DEADLINE", "NEEDS", "PROGRAM COST", the program facts) | Sentence case in the body face: "Award", "Deadline", "Needs", "Cost", "Format". The cost colour now keys on the item type instead of the label string. |
| The filled status pill | Coloured words above the title, by tone (quiet, go, soon, urgent) instead of inline background and colour pairs, in the build and the client repaint. "Open now instead" lost its uppercase too. |

Add-back fraction: 0/0. Local only: built Loran page checked on phone and desktop, compared with www.

## Listing page: How you apply, October 2, 2026

Outcome: under "Who can apply", a student reads who takes the application, so they know whether to go to the counsellor, a club or nobody before they open the provider's page.

| Candidate | Result and retained requirement |
| --- | --- |
| Show "Through your school" for all 175 `applyViaGuidance` listings | Not done: read by hand, it was true of 92. The rest are a division-wide form (27: EducationMatters, Edmonton Public Schools Foundation, Elk Island myBlueprint, Calgary Catholic), the sponsor itself (32: Legion branches, Lions and Kinsmen clubs, county ag boards, foundations), a nomination (16), a contest (4) or a campus awards office (4). Stored as `applyRoute` beside the flag; validate-data rejects an unknown route or one without the flag, and only warns on a flagged listing without one, since the admin form has no route field. |
| A route for the other 705 | Not guessed: 503 have no flag at all. They show no line, except the 19 whose own notes say there is nothing to file (`saysNoApplication`, already used for the button). |
| "Applications go through your school." under the amount | Deleted: the line under the title says it, by route. The "nothing to file" sentence moved there too. |
| The two counsellor steps (school deadline) on every flagged listing | Kept only for school and division routes: they were telling students to ask a counsellor about a Kinsmen bursary that is emailed to the club. |
| Routes on list rows and /saved | Not yet: the page line comes first. |

Add-back fraction: 0/0. Local only: 194 built pages carry the line; Schulich, Leduc Kinsmen and Loran (no line) checked on a phone, no horizontal scroll.

## Rows and /saved: who takes the application, October 2, 2026

Outcome: scanning a list or their saved awards, a student sees which ones go through the school, a division form or a nomination, without opening each.

| Candidate | Result and retained requirement |
| --- | --- |
| A route chip or a new row line | Not added: the route joins the requirements line ("Financial need · Division application"), after the facts, with an open ink ring where they have a green dot, so a row with facts usually grows by nothing; a row without them gains one line, on the 194 that carry a route. |
| "Straight to the sponsor" on rows | Left off: applying to the provider is what most awards are, so on a row it says nothing. The award page still says it. |
| The route's words in the /saved payload | Its key instead (`via`, only on the 194 that have one); /saved is 94.7 KB gzip against its 200 KB budget. |
| Numbering nominated awards in "Start with" | Not done: a nominated award is not one to start tonight, so the 1-2-3 skips it. It still does not count as "no application at all": Schulich nominees do apply after the nomination. |
| Combos rows | Unchanged for now; same list markup, so it can follow. |

Add-back fraction: 0/0. Local only: built Calgary list and /saved (Schulich, Joan MacLeod, Servus, Ted Rogers) checked on a phone, no horizontal scroll.

## Uniqueness pass, batch 1: programs, empty /saved, combo rows, October 2, 2026

Outcome: on program pages the biggest text is the real cost, the facts take a third less of a phone, a fee on a list row stops reading like a prize, and the empty /saved page gives a real number instead of a dashed box.

| Candidate | Result and retained requirement |
| --- | --- |
| "Has a fee" as the program card's big figure | The fee itself when the cost note leads with one (`lib/fee-figure.ts`): 37 of 68 fee programs, e.g. "$10" over "$10 per student", "From $55" where a second price follows, never an add-on ("$5 per extra nomination"). The other 31 keep "Has a fee". |
| "THIS PROGRAM" / "THIS PROGRAM IS" over Pays you and Free | Sentence case: missed in the card pass earlier today. |
| Label-over-value facts on phones | Label beside value: AAPT PhysicsBowl's four facts 478 to 319px, the page 159px shorter. Desktop unchanged. |
| "Has a fee" in the list's money type | Plain 14px words; "Pays you" and "Free" keep the big type. |
| Three suggested awards on the empty /saved page | Tried and dropped: soonest-first gave a Photoshop-actions essay contest and Niagara Region Right to Life; biggest-first passed a bleeding-disorder award as open to anyone, so the data cannot say "open to almost anyone". |
| The dashed box itself | Gone on /saved only (the directories' no-results box shares the class and keeps it). The text leads with the directory's own OPEN NOW count, 283 today, the same number /scholarships shows. |
| Combo rows | Carry the route label, like the other lists. |

Add-back fraction: 1/7 (the suggested awards, removed after two attempts). Local only: built AAPT PhysicsBowl, /programs, empty /saved and Calgary combos checked on a phone and compared with www.

## Programs: Worth knowing, first nine, October 2, 2026

Outcome: the most-searched program pages say something only ScholarAB says, the catch the provider buries, and their dates and costs are right.

| Candidate | Result and retained requirement |
| --- | --- |
| Notes for every program | Not done: hand-checked only, starting with the 10 program pages with the most Search Console impressions (Sept 3 to 30): CCO 828, SHAD 618, AHSMC 564, HOSA 424, COMC 275, FIRST Canadian Rockies 226, ISSYP 168, CYSF 166, TELUS Spark volunteering 147, PhysicsBowl 136. Nine got a note (`notes` on the program, shown in the same ink box); ISSYP did not, since Perimeter posts nothing current and the description already says so. |
| Errors found while checking | Fixed from the provider pages: the Chemistry Contest is January 19, 2027 with teacher registration by December 29 (the data said April and March 31); AHSMC registration closes November 12 (was TBA) and costs $2 a student; COMC closes October 21 and 14 for shipped papers (was 22 and 15) and costs $30 or $35; SHAD's final deadline is January 6, 2027 (was TBA) and its fees are the 2027 ones; HOSA's $150 fee was missing. |
| A forum post's "first time since 2019" for the Canadian Rockies Regional | Left out: FIRST's own event system confirms March 31 to April 3, 2027 at STEMIA in Calgary with 22 team places, but FIRST Canada lists a 2022 regional, and not every year between was checked. |
| Meta descriptions | Three shortened (SHAD, CCO, AHSMC): the new closing dates pushed them past the snippet cut. |

Add-back fraction: 0/0. Local only: built CCO page checked on a phone; all nine pages render the note.

## Critique fix pass: rows, urgency, tokens, the filter sheet, October 2, 2026

Outcome: a student meets one row layout on the directories, /match, the home list and a listing's related lists; Apply stays under the thumb on a phone listing; a deadline due today still says it is too soon for a reminder; an estimated date no longer contradicts itself; and the phone filter sheet behaves as a dialog a keyboard can finish.

| Candidate | Result and retained requirement |
| --- | --- |
| Apply and Save "52x21 targets" (critique, both reviewers) | No change: a false positive. The drawn link is 52x21, the hit area (`::after`, 2026-09-27) is 60x44; a probe 10px above and below hit Apply on 8 of 8 rows. Save is 44px tall the same way. |
| Long amounts over Save at 1280 | `.sabl-amount.is-long` wraps in its column: 4 of 880 overlaps to 0. The three amount formats in the data are left alone (factual copy, not this pass). |
| /match leading with strong fits that open in spring | Only strong fits a student can apply to today lead; the others head "Upcoming", still strong first. Keeps the 2026-10-01 rule (open strong fits above possible matches due soon) and drops its one case: six spring openers above Loran. Test rewritten to say so. |
| Combo tray at row three | Under the first two groups. |
| Apply below the fold on phone listings (688 to 743px on a 667px screen) | A pinned bar (amount, date, Apply, Save) while the card's own buttons are off screen; hidden under the footer and while the consent band is up. Needs stays above the card's Apply (2026-09-26). |
| Reminder block missing on the due date | `canRemind` is `daysLeft >= 0`, so the written "Too soon for an email reminder. Apply today." shows (ATCO, due today: absent, now shown). |
| "Closing this week" over rows due in 13 days | The heading needs every row inside the week; otherwise "Next deadlines". |
| /match result cards | Directory rows (`sabl-card`): date figure left, ink money with leader dots, the same stripes and stretched link. Program results use the same cell. Quiz bundle +636 bytes. |
| Related lists on listing pages | Date figure first, as the directory; no countdown, since these rows are built once. |
| Home closing rows | Stripes and the mint hover of the directories instead of hairlines. |
| /deadlines "Open now" on 323 of 622 rows | Only exceptions print a state; the month count already says how many are open. Month headings in the display face. Tailwind grey replaced by the ink token. 279px shorter on a phone. |
| 73 half-pixel font sizes, 14 ink strengths for secondary text | `--fs-*` (12 to 17, whole pixels) and `--ink-soft/-muted/-faint` (0.8, 0.72, 0.62) on `:root`; design-tokens.test.ts rejects both from now on. Distinct sizes per page down on every page measured (listing 19 to 14 at 1280). |
| Three primary fills (mint, dark green, black) | Mint with ink for Remind me, the educators' handout, the sheet's Show results and the empty-state button; Show 24 more is an outline. The menu-board yellow-on-black pieces are the boards' own look and stay. |
| Status heading on estimated listings | "Likely date, not posted yet" (`LIKELY_DATE` in status.ts, shared with /deadlines), not "Opens later, date not posted" above "Around May 31, 2027". |
| Verification as fine print | Under the deadline it vouches for, with a drawn mark: "Date confirmed on the provider's page, Sep 2026." for posted dates, the plain check otherwise. Rows unchanged: "confirmed" on 880 rows would be noise. |
| Phone filter sheet | `role="dialog"` with `aria-modal` while open on a phone, header and footer inert, the glossary's summary in the Tab cycle, a Filters heading and Clear filters; pickers one width. Focus still lands on the first picker. |
| Confetti in Tailwind purple and pink | The site's colours. |

Add-back fraction: 1/18 (the focus target, restored to the first picker after E2E caught Clear filters taking it). Local only: built site measured with a scripted Playwright pass at 375x667, 375x812 and 1280x900 before and after; `npm run ci` 1,204 tests; E2E 153 passed on Chromium and Pixel 7; detector clean on the changed files. Not measured: hosted timings, real-device Safari.

## Quiz schools, row tint and carousel, October 3, 2026

Outcome: a Grade 12 student who has applied to several schools sees every school's entrance awards; a student whose high school is on the list finds it before giving up on it; a phone row lights only when tapped, not when scrolled past; the home carousel lands on a loaded photo however fast it is swiped. From Ilia's notes and phone screenshots of 2026-10-03.

| Candidate | Result and retained requirement |
| --- | --- |
| "Another school" as the first tile of the school question | Removed from the tiles. It read as the way past the list, so students took it before paging to their own school. The answer itself is retained (a student at an unlisted school must pass without claiming one): last on short lists, and under the tiles on every page of a long one as a text button, renamed "My school isn't listed". |
| One answer to "Where are you planning to study?" | Replaced: several schools can be picked, then Continue. Stored as one `A\|B` string, so saved progress keeps its shape and an old single answer reads as before. The matcher takes the union: University of Alberta, University of Calgary and Red Deer Polytechnic together add 27 school-only awards for a Calgary profile, the sum of 3, 1 and 23 alone. No new state library or component. |
| Enter on a search with no match | Removed by accident for the institution question when Enter became "pick and clear". E2E caught it; restored: with nothing picked, Enter still takes "Somewhere else, or not sure". |
| Row hover tint on touch screens (home lists and directory rows) | Removed. Touch browsers apply `:hover` to the row under a finger, so the mint tint jumped from row to row while scrolling. Pointer hover is unchanged. New E2E guard, checked to fail on the old rule. |
| Mint underline on the home "View all" links | Removed over the film panels: on a phone it sat just above the carousel's mint tab line and mint buttons. The link keeps an ink-light underline and turns mint on hover. |
| Fetching every carousel photo with the page | Not done. Still two photos until someone swipes; after the first swipe the rest of the set follows, nearest first and one at a time. |
| A JavaScript crossfade for the slide change | Not added. First pass: a CSS scroll-driven fade dimmed the photos mid-swipe, but a slow drag still showed a sharp edge between two photos (Ilia's phone, same day). Second pass, same CSS mechanism: the photos hold still and the arriving one dissolves over the leaving one while the words and buttons slide; the shade moved from the slide onto the photo so a pinned photo carries its own. Resting, only the slide's own photo shows. Browsers without scroll-driven animations keep the plain slide. Late photos fade in rather than pop. |
| Smaller photo files for 3x phones | Not done, as on 2026-09-30: the photos stay at full strength. |

Add-back fraction: 1/4 removal experiments (the no-match Enter fallback). The 10% target counts removals that hold; this set is mostly fixes, and no removals were invented to raise it.

Local only, against `dist/`: `npm run ci` 1,206 tests; E2E 155 passed on Chromium and Pixel 7 (5 tests updated for the new institution step and the moved school escape; 1 new test, run on both projects); on a 375x812 emulated phone the carousel had 2 of 10 photos before a swipe and all 10 within 3 seconds after one, served from localhost, so this is not a network timing. Not measured: real-device Safari, the swipe fade on a phone, hosted timings, and how many students now pick their own school.

## Universities and colleges map, October 3, 2026

Outcome: a Grade 12 student sees every university, polytechnic and college in Alberta by town, how far each is from home, and which ones ScholarAB lists entrance awards for, one tap from those awards. Ilia asked for it to be "interactive, visionary, beautiful, modern, very easy to navigate", Alberta only. New page at `/map/`, linked from the University & college awards page.

| Candidate | Result and retained requirement |
| --- | --- |
| A map library and hosted map tiles | Not added. The province is drawn at build time from its border (49°N, 110°W, 60°N, 120°W and the Continental Divide) in `src/lib/alberta-map.ts`: no third party sees a visitor, nothing new in the CSP, no dependency. The dot field is 40 KB of path data that gzips to about 600 bytes; the whole page is 19.7 KB gzipped. |
| Street-level campus positions and zooming | Not done. One dot per town: at province scale an address adds nothing, and a town is the unit a student moves between. |
| The map on the awards page itself | Not done. It would push the award list a screen down, and every hub keeps its toolbar at one height (E2E). The awards page links to the map; each school links back to its filtered awards. |
| A separate place panel and list | One element: the same panel lists places, then shows the chosen one; on a phone it is a sheet over the map's foot, and the map shrinks above it so the whole province stays in view. |
| A second copy of the distance code in the page | The page script imports one 10-line function (`alberta-map-client.ts`); the build module re-exports it. |
| Hand-checking that each award school is on the map | Automated: a unit test fails when the entrance-awards list names a school the map does not place. |

Sources for the school list: the Government of Alberta's types of publicly funded institutions page (28) and Indigenous learning providers page (5 First Nations colleges), read 2026-10-03, plus CBTS, which ScholarAB lists an award for. Every website was opened; four answer bots with 403 or 406 and are kept as known domains. Distances are straight lines, labelled as such.

Add-back fraction: 0/3 removal experiments (map library, street positions, map on the awards page). Local only, against `dist/`: `npm run ci` 1,212 tests (6 new); E2E 163 passed on Chromium and Pixel 7 (4 new map tests, both projects); checked at 1440x900 and 375x812 in the built site. Not measured: real-device Safari, how many students use it, and the town coordinates beyond the few kilometres a dot can show.

## SpaceX desktop header, October 3, 2026

Outcome: on a computer, a student scans one short uppercase list per menu and sees the next deadlines from any page, in the spacex.com bar Ilia pointed at ("web ONLY", six rows at most per menu). The phone sheet is unchanged: its tiles and full lists stay, and only the desktop shows the new lists.

| Candidate | Result and retained requirement |
| --- | --- |
| Gliding hover pill (markup, CSS, `initGlide`) | Removed. SpaceX marks hover with brighter text only. |
| Blur scrim under an open menu | Removed. The menu is a short list on the bar's own dark band. The home film still pauses while a menu is open (`sab:menu`), so that E2E stays as it was. |
| Photo tiles and 11 to 13 link lists in the desktop panels | Hidden on desktop and replaced with a list of at most six rows. They are still in the DOM for the phone sheet, so the hub cross-link tests still find every link. |
| "How it works" button and the Instagram, TikTok and email icons on the right | Removed from the bar. The footer carries the social links; How it works is now the sixth row under Explore. |
| Right-hand column | Replaced by SpaceX's outlined box, "Upcoming deadlines": the next five awards open today (the home closing list's rule) plus All deadlines. Rows whose date has passed since the build are hidden in the client. |

Repair attempts: the deadlines box closed as soon as it was clicked, because leaving the nav links started the nav's 140 ms close-all timer, which also caught the box. Fixed on the first try by limiting that timer to the nav's own menus. A new E2E test covers it.

Add-back fraction: 0/4. Local only, against `dist/`: `npm run ci` 1,212 tests; E2E 164 passed on Chromium and Pixel 7 (two header tests rewritten for the new layout, one added); checked at 1440, 1180, 910 and 901 px (the row fits with 0 px overflow at 901 after the box label shortens to "Deadlines" below 1041 px) and in the 375 px sheet. Not measured: real-device Safari.

Follow-up the same day (Ilia: "no background at all, forever", keep the old position and font, no all-caps, no deadlines box, bring back the social icons and How it works). The bar's links went back to their centred position, font and normal case. The deadlines box was deleted and the right-hand column restored. On the home page the bar no longer goes solid under an open menu: the shared band is not drawn there and the list sits over the film. That removed the last reason for the home film pausing while a menu is open, which began with the blur scrim, so the `sab:menu` event, both listeners, the `held` flags and that E2E test were removed too. Off the home page the dark bar and its band stay, because light text on the white pages has nothing else to sit on. Local only: `npm run ci` 1,212 tests; E2E 163 passed (the deadlines box and film-hold tests are gone, one home transparency test was added); the row fits at 901 px with 0 px overflow. One known cost: on the home hero the open Scholarships list overlaps the "Read the story" line.

## Region hubs by population, October 4, 2026

Outcome: a student lands on the area most of them live in. Ilia: "8/10 visitors are from Calgary or Edmonton areas", and the 30k towns bring almost none. Pages now go by population; eligibility still goes by town, so no student is shown an award as theirs when it is not.

| Candidate | Result and retained requirement |
| --- | --- |
| 15 town hubs (Airdrie, Cochrane, Okotoks, St. Albert, Sherwood Park, Spruce Grove, Leduc, Fort Saskatchewan, Beaumont, Cold Lake, Lloydminster, Lacombe, Camrose, Wetaskiwin, Brooks) | Removed. The suburbs roll into Calgary area and Edmonton area at the old `/calgary/` and `/edmonton/` URLs; the rest into Northern, Central and Southern Alberta. Each old URL 301s in both slash forms, and the 658 older rules that pointed at them were retargeted so nothing chains. |
| Town-level eligibility (listing `region`, `alsoOpenTo`, the quiz's town answer) | Kept. Area pages label each row with the towns it is open to ("Airdrie only", "Calgary, Airdrie, Cochrane"); province-wide awards pinned to a town get no label. |
| 12 town photos (60 files) and their credits | Removed with their hubs. Cold Lake, Lacombe and Brooks photos stay as the zone pages' board photos. |
| 13 combo page copy entries for folded towns | Removed. All 13 already built no page (their single-school awards were cut 2026-09-30); Calgary and Edmonton build the same four combos as before. On /match a metro combo is offered only to a town its core awards reach. |
| St. Albert in the header menu and home carousel | Removed: `MENU_SCOPES` is the two broad scopes plus seven cities. |

Region hubs: 25 to 13. Add-back fraction: 0/15. Local only, against `dist/`: `npm run ci` 1,212 tests; E2E 163 passed (two hard-coded carousel counts moved from 10 to 9 cards); row labels counted on all five area pages. Not measured: Search Console impact of the 301s (re-measure in 4 to 6 weeks), and the 107 county bursaries with `localArea` are not yet tagged to a zone.

## One "Opens later" run, October 4, 2026

Outcome: a student scanning the list sees three answers to "can I apply today": open now, opens later, closed. Ilia: "why do we need opens later, date not posted ... just put it in opens later and write somewhere that the date is not posted".

| Candidate | Result and retained requirement |
| --- | --- |
| The "OPENS LATER, DATE NOT POSTED" run (292 on /scholarships) | Removed. It joins the "Opens later" run (243 + 292 = 535), dated rows first. Each undated row still reads "Opens later" with "date not posted" (or "date not posted yet, likely around ...") under it, as before. |
| The matching "Opens later, date not posted" Status option | Removed; "Opens later" now counts both. |
| The status itself (listing pages, reminders, meta, /match) | Kept: only the directory grouping and filter changed. |

Add-back fraction: 0/2. Local only, against `dist/`: `npm run ci` 1,212 tests; E2E 163 passed; built /scholarships shows OPEN NOW 283, OPENS LATER 535, CLOSED 41, FOR AFTER HIGH SCHOOL 21.
