# Plan: whole-site critique from 27 to 35+

Written 2026-09-23 after the sixth whole-site run (`.impeccable/critique/*src-pages.md`).
Scores so far: 26, 22, 24, 28, 27, 27.

## Why the score is stuck

1. **The same three heuristics score 2 every run.**
   - H4 Consistency has scored 1 or 2 in all six runs, and the cause is always numbers or labels that disagree between surfaces:
     - Medicine Hat 22 vs 20.
     - /deadlines 926 vs 932.
     - 1008 vs 1,002.
     - Competitions 8 open on home vs 3 on its hub.
     - Four status vocabularies.
     - Apply vs Details vs Visit.
   - H8 Minimalist has scored 2 in all six runs. The home stack, the /match essay, the /deadlines length and the directory toolbar keep coming back.
   - H6 Recognition dropped to 2 this run: an icon-only view switcher and 24 unordered quiz city tiles.
   - Fixing these three for good is worth +5 on its own.
2. **Each pass fixes the last report's list, not the cause.** Counts were fixed surface by surface, so a new surface (the home carousels) brought a new mismatch. Nothing fails the build when two surfaces disagree.
3. **Redesign churn adds new findings.** The full-screen carousels (777ee57) raised authorship to 65%, but they also produced this run's priority issues 2 and 3. Each new visual feature gives a fresh reviewer something new to dock.
4. **Reviewer variance is about ±1.** The prompt is unanchored, so 27 vs 28 is noise. To land 35 reliably, the site has to be at about 36 on paper.

## What 35 means

35/40 is 87.5%. It needs **no 2s**, and at least five heuristics at 4 with the other five at 3. The target is 37, which leaves room for variance:

| # | Heuristic | Now | Target | How |
|---|---|---|---|---|
| 1 | Visibility of status | 3 | 4 | Phase 1 (one count source, fresh HTML) |
| 2 | Match real world | 3 | 4 | Phase 4 (inline definitions) |
| 3 | User control | 3 | 4 | Phase 3 (quiz results keep answers, save all, undo) |
| 4 | Consistency | 2 | 4 | Phase 1 (parity tests), Phase 2 (one status + CTA system) |
| 5 | Error prevention | 3 | 4 | Phase 3 (quiz hard filters, condition flags on Apply) |
| 6 | Recognition | 2 | 4 | Phase 2 (labelled views), Phase 3 (city order) |
| 7 | Flexibility | 3 | 3 | Keep; "this week" jump on /deadlines is a bonus |
| 8 | Minimalist | 2 | 3 (4 stretch) | Phase 2 (home order, cut duplicates, shorter pages) |
| 9 | Error recovery | 3 | 4 | Phase 4 (closed listings, offline page, form errors) |
| 10 | Help | 3 | 4 | Phase 4 (glossary everywhere, time in deadline box) |
| | **Total** | **27** | **37** | |

## Rules for the push

- **Freeze new visual features until 35.** That means no new carousels, sections or redesigns. Only fixes from this plan.
- **Every fix gets a guard:** a Vitest or Playwright test that fails if the problem returns. A fix without a guard does not count.
- **Keep re-runs comparable.** Same page list every run: home, /scholarships/, /scholarships/calgary/, /programs/, /programs/competitions/, one detail page, /match/ walked to results, /deadlines/, /saved/, /guides/, a 404. Always against `dist/`. Two A reviewers are averaged when the result is within 2 of a target.
- **Run the 35 gate (end of this file) before paying for a critique.** Only re-run once every gate line passes.

## Phase 1: numbers that never disagree (H1, H4; about +3)

**Status 2026-09-23:**
- Done: steps 1 to 3.
- Step 4 is partial: the directory count line is grouped; there is no lint rule yet.
- Step 5 was dropped as a false finding (see `docs/simplification.md`).
- "Open" now counts dated listings only: 623 scholarships. The 460 undated ones are "No fixed deadline".

The biggest lever. It is also the product's promise: freshness is the moat.

1. **One count module.**
   - Create `src/lib/counts.ts` with `openCount(items, today)`, `datedDeadlineCount(...)` and `facetCount(...)`, built on `status.ts` and `list-core.ts`.
   - Every surface imports it: home carousels (`index.astro:115`, `:147`), header menu tiles, hub chips, hub headings, /deadlines and its guide card, /educators, the quiz copy and the footer.
   - Decision needed from Ilia: whether a year-round program counts as "open". Recommended: "open" means dated and open. Year-round is its own label ("8 open or year-round") and never folded into "open".
2. **Parity test** (`tests/count-parity.test.ts`). For every scholarship facet and program format, assert home card count == header tile count == hub total, and home open == hub Open chip.
3. **Built-page parity test** (Playwright, `e2e/numbers.spec.ts`). Read the rendered numbers off `dist/` pages (home slide "N open", hub chip, /deadlines heading, guide card) and compare them. This catches markup that computes on its own.
4. **Number formatting.** Every visible number goes through `toLocaleString('en-CA')`. Add a validate-data or lint check that fails on a raw `{n}` count in `.astro` templates, which would catch 1542 vs 1,542.
5. **Stale HTML.**
   - `public/sw.js` served an old home page and then an offline page during the critique. Status on a freshness site must never be stale.
   - Make HTML network-first, with the cache used only when offline, and label the offline page "Saved copy from {date}".
   - Guard: a test that the SW fetch handler never cache-firsts `text/html`.

## Phase 2: one system, fewer things on screen (H4, H6, H8; about +3)

**Status 2026-09-23:**
- Done:
  - Step 1 (status words): the home fallbacks now use `STATUS_WORDS`; "Around {date}, not confirmed" stays as the dated form of Date not confirmed.
  - Step 2 (CTA): `rowAction` in `status.ts`; rows say Apply or Details, Visit is gone; the detail Apply is mint.
  - Step 3 (home order): the hero list is deleted, Closing this week sits above the carousels, and the carousel headings are visible.
  - Step 4 (contrast): guarded by `e2e/media-contrast.spec.ts`, lowest line 7.9:1.
  - Step 5 (sort): sort is one picker.
  - Step 7 (/deadlines): two months open, "Due this week" on top.
- Decided by Ilia:
  - Step 5: all four views stay.
  - Step 6: the 01/02 row numbers are removed from the directories; the quiz keeps its rank.
- Dropped:
  - Step 8: the notebook already sits on its rules; the misalignment report came from a stale build. There is no time field for "noon ET".

1. **One status component.**
   - The label set: Open now, Opens {date}, Date not confirmed, Year-round, Closed.
   - Use it on rows, detail, quiz results, /saved and /deadlines. Delete the other vocabularies ("Opening later", "Around Jun 15 / not confirmed", "Ongoing").
   - Guard: grep test that the old strings are gone from `src/`.
2. **One CTA system.** One Apply style: the mint, everywhere, including the detail page's dark green. One row verb: "Apply" when an application URL exists, otherwise "Details". "Visit" goes.
3. **Home order (`index.astro`).**
   - New order: hero, Closing this week, scholarship carousel, program carousel, biggest open awards, categories.
   - Delete the hero's "Next deadlines" list (it duplicates Closing this week). The hero keeps the headline, one line and two buttons.
   - Carousel headings become visible, small and above each carousel: "Scholarships by where you live", "Programs by format".
4. **Contrast over photos.**
   - `.sab-scope::after` top stop 0.55 at 9% becomes 0.75 at 12%.
   - `.sab-scope-kicker` gets the hero's text-shadow, and the hero byline zone gets a darker local scrim.
   - Guard: the pixel-contrast Playwright check from this run's Assessment B, saved as `e2e/media-contrast.spec.ts`, which fails under 4.5 median.
5. **Directory toolbar** (`SabViewSwitch`, directory head).
   - Views: cut to List and Grid with text labels. Columns and Gallery go, recorded in `docs/simplification.md`.
   - Sort becomes one `<select>`. That takes the toolbar from 9 controls to 4.
6. **Remove the 01/02 row numbers** everywhere they remain.
7. **/deadlines.**
   - This month and next open by default; the other months collapse behind their month heading.
   - Add a "This week" jump link at the top. That drops the 53,000px phone page and 9,093 nodes.
8. **Notebook block (`SabDetail.astro:383-395`).**
   - Either align the text to the ruling at every width or make it a plain callout.
   - The deadline time and timezone ("noon ET") move into the deadline box.

## Phase 3: the quiz earns a 4 (H3, H5, H6; about +2)

**Status 2026-09-23:**
- Done:
  - Step 1: the intro folds to the heading after question 1.
  - Step 2: the six biggest cities come first, with type-to-filter.
  - Step 3: an age filter reads the grade. Group limits the quiz never asks about (youth in care) still show with their flag, as /match promises, but rank below unrestricted awards.
  - Step 4: a "You answered" summary; changing one answer returns straight to the results.
  - Step 5: Undo on /saved removals.
- Unchanged:
  - The save button already named what it saves.
  - Browse goes to the student's own city hub.

1. **Collapse the intro after question 1.** Keep one line plus the progress bar. More answers fit on a phone.
2. **City question.** Six biggest pinned first (Calgary, Edmonton, Red Deer, Lethbridge, St. Albert, Medicine Hat), the rest alphabetical, and type-ahead above them.
3. **Hard eligibility filters.**
   - Age, grade and "youth in care only" style conditions exclude an award, not just flag it. The reported case: a Grade 10 Medicine Hat student saw Advancing Futures (18 to 24, youth in care) at #2.
   - Guard: a Vitest case with that exact profile.
4. **Results.**
   - Dated-open results first within each tier.
   - The primary button is "Save these N", with a clear count.
   - "Browse all" opens the directory with the answers applied as filters.
   - Show a short "You answered" summary above the results, which fixes the working-memory failure.
5. **Undo.** Unsaving shows "Removed. Undo" for 5 seconds (/saved and results).

## Phase 4: help and recovery at the moment it is needed (H2, H9, H10; about +2)

**Status 2026-09-23:** done.
- Step 1: `src/lib/glossary.ts` defines bursary, designated trade, Date not confirmed, olympiad and dual credit. The olympiad and dual-credit hubs define their word over the results, the home slides use the short forms, and both directories' "What these mean" note lists them. "Rolling" was dropped: nothing prints it as a label.
- Step 2: all 19 closed detail pages list three open listings from the same hub inside the deadline card, on the first screen at 375px.
- Step 3: the reminder form names the part to fix, next to the field, in red. It used to print near-white text on the white card.
- Step 4: the guides index is titled "Guides for Alberta students". Red Deer, Lethbridge and Olympiads now link their guide.
- Step 5: the breadcrumb Home link is 24px tall, /saved CLS dropped from 0.0995 to 0.0002, and the header dropdown animates transform.
- Guards: `e2e/help-recovery.spec.ts`, `src/lib/glossary.test.ts`, and new cases in `related.test.ts` and `utils.test.ts`.

1. **Inline definitions.**
   - One `glossary.ts`: bursary, rolling, Date not confirmed, dual credit, olympiad, designated.
   - Shown as a one-line explainer under the program slides and hub headings, and as the existing "What these mean" pattern on every directory.
2. **Closed listing pages.** Show three open listings from the same facet above the fold, so a closed page is never a dead end.
3. **Form errors.** The reminder form names the problem ("Add an @ to your email") inline, next to the field. No native bubbles.
4. **Guides index.** Make the headline match the contents, and link each guide from the matching hub.
5. **Small fixes:**
   - The /deadlines breadcrumb "Home" link goes to at least 24x24.
   - The /saved footer shift of 0.025 goes to 0 (reserve the list height).
   - The header dropdown animates transform/opacity instead of height/width (`SabHeader.astro:299`, `:412`).

## Phase 5: verify, then critique once

1. Run `npm run ci`, `npm run test:e2e` and `npm run ship-check -- origin/main`.
2. Walk the 35 gate below on desktop and 375px.
3. Run `/impeccable critique` with the fixed page list. If it lands 33 or 34, fix only the named 3s; no new features.

## The 35 gate (all must pass before a critique run)

**Walked 2026-09-23 against `dist/`, 1280px and 375px:** all pass.
- Two fixes came out of the walk: every count is now grouped (the chips, "Show all", the region picker and the header tiles printed 1542), guarded in `e2e/numbers.spec.ts`; and the chosen view shows its name beside its icon.
- Notes on the tap-target line: the only element under 24px is the header's keyboard-only menu toggle. It is clipped until it has focus, then 24x24, the same case as the skip link.
- Closing this week starts at 617px on a 375px phone, so it is on screen 1.

- [x] Every count on home equals its hub, header tile and /deadlines equivalent (parity tests green).
- [x] No raw unformatted count in any page.
- [x] HTML is never served from cache while online.
- [x] Exactly one status vocabulary in `src/`; old strings grep-clean.
- [x] One Apply style and at most two row verbs.
- [x] Home: no duplicated deadline list; carousel headings visible; Closing this week is on screen 2 on a 375px phone.
- [x] Text over every photo and video frame sampled is at least 4.5:1 median.
- [x] The directory toolbar has at most 4 controls; the views have text labels.
- [x] The quiz intro shows once, cities are ordered, and there are no ineligible awards in the top 10 for the test profiles.
- [x] Quiz results show a "You answered" summary; Browse all keeps the answers.
- [x] Every jargon word on home, hubs and the quiz has an inline definition.
- [x] Closed detail pages show three open alternatives.
- [x] No tap target under 24px except the skip link.

## Order and size

Phases 1 and 2 carry about +6 on their own and should go first, in that order. Phase 1 is mostly `src/lib` plus tests. Phase 2 touches `index.astro`, `SabViewSwitch`, the directory head, `SabDetail` and `deadlines.astro`. Phases 3 and 4 are independent of each other. Expect four working sessions. Critique once at the end, not after each phase.
