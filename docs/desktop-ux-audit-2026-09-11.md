# Desktop user-experience audit: September 11, 2026

Tested the live `www.scholarab.ca` site by controlling Firefox on the user's Mac, using clicks, scrolling, typing, and keyboard navigation. Firefox screenshots were 1346 × 768, including browser chrome. Also used the visible Codex browser at a temporary 1346 × 690 viewport to check directory behavior in a separate browser session. This is a manual audit, not a release or a comprehensive accessibility certification.

The live catalogue changed during testing: the initial homepage/directory showed 1118 scholarships, while the final homepage showed 1122. Counts and amounts below are snapshots from the respective reproductions, not assertions about the latest deployment.

The main journeys work, but availability labels and returning from a task need attention. Six defects below are reproducible; four smaller improvements follow. No application code, catalogue content, design, fonts, or legacy quiz behavior was changed.

## Priority findings

### 1. High: a discontinued scholarship is advertised as opening later

**Student outcome:** distinguish an award they can plan for from one that has permanently ended.

**Reproduce:** search the [scholarship directory](https://www.scholarab.ca/scholarships/) for `TD Scholarships for Community Leadership`, then open its detail.

**Observed:** the search reports `$70,000 OPENING IN A LATER CYCLE`, `Opening soon 1`, and `Closed 0`. The card says both `OPENING SOON` and `No longer accepting applications`. The [detail page](https://www.scholarab.ca/scholarships/td-scholarships-for-community-leadership/) explicitly says the program has concluded and accepts no new applications for 2026 and beyond, but still displays `OPENING SOON`, `Deadline TBA`, and a generic three-step application process.

**Fix direction:** retain the explanatory listing and its URL, but represent permanent closure separately from an unknown next opening. Remove its historical value from future-opportunity totals and suppress inapplicable application steps. Do not delete the listing.

**Local implementation evidence:** `src/lib/status.ts` maps `active: false` with no elapsed deadline to `future`. This cannot distinguish a discontinued award from one between cycles.

### 2. Medium: unknown deadlines are treated as rolling availability

**Student outcome:** know whether a program accepts applications now and whether a deadline still needs checking.

**Reproduce:** search [programs](https://www.scholarab.ca/programs/) for `SHAD`.

**Observed:** one result appears in `Ongoing 1`, although the same card shows `DEADLINE TBA`, `NO FIXED DEADLINE`, and prose describing a September-to-January application window. Following its external link opened the [official SHAD application page](https://www.shad.ca/apply/), which said applications for 2026 had closed and offered notification of the next opening. The link itself worked.

The same semantic inconsistency also appears for [Alexander Rutherford](https://www.scholarab.ca/scholarships/alexander-rutherford-scholarship/): directory and Saved say `NO FIXED DEADLINE`, Saved adds `ROLLING`, while the detail says `DEADLINE TBA`.

**Fix direction:** use distinct states for unknown deadline, genuine ongoing intake, and a cycle that has not opened. Reuse the same interpretation across cards, details, filters, and Saved. Keep the provider prose and existing listings.

**Local implementation evidence:** `src/lib/list-core.ts` groups missing deadlines, `TBA`, and `Ongoing` into the same program status, while `src/lib/status.ts` distinguishes TBA from ongoing for details.

### 3. Medium: the site's Back link loses the search

**Student outcome:** open a candidate and return to the shortlist without repeating the search.

**Reproduce:** search for the TD award above → open the single result → click `← Back to Scholarships`.

**Observed:** the detail correctly says `FILTERED · 1 OF 1`, but its Back link returns to an empty search and all 1118 listings. The typed query is not encoded into the displayed directory URL. This reproduction concerns the site's Back link; browser-history Back was not established as failing.

**Fix direction:** retain query, filters, sort, and the return location, using one representation shared by return navigation and shareable URLs.

**Local implementation evidence:** `src/lib/list-context.ts` retains ordered paths and a filtered flag, but not search/filter values. `SabDetail.astro` renders its Back link from the directory path.

### 4. Medium: an empty calendar download reports success

**Student outcome:** know whether useful deadline events were actually exported and what still needs importing.

**Reproduce:** save Alexander Rutherford as the only bookmark → Saved → Calendar → Add to calendar.

**Observed:** the page says `No deadlines this month`, but enables export and changes the button to `✓ Added to calendar`. Firefox downloads `scholarab-deadlines.ics`, 118 bytes. Reading the downloaded file confirmed a VCALENDAR wrapper with **zero VEVENT entries**. No calendar application was opened and nothing was imported.

**Fix direction:** remove the export action when there are no dated items to export, explain that the saved item has no confirmed calendar date, and describe a successful export as a download. Reserve an “added” claim for a confirmed import.

**Local implementation evidence:** `src/lib/saved-client.ts` invokes `downloadICS` and unconditionally sets the success label.

### 5. Medium: completing the quiz leaves the user partway down the results

**Student outcome:** see the result summary and highest-ranked matches first.

**Reproduce in Firefox:** on Home select Grade 11, Calgary, STEM → Show my matches → I'd rather not say → Not sure yet → None of these → scroll down the long school list and choose Another school.

**Observed:** the result screen keeps the prior scroll position. After the transition settled, the viewport showed approximately results 7–9, including Friesens Yearbook Award, Steven Irving Memorial Music Scholarship, and Viscount Bennett Band Parents Bursary. The result heading and top matches were above the screen. This run produced 11 scholarships and 20 programs. Reload preserved those results.

A separate completed Grade 12 Edmonton/STEM run also entered results below the main heading. During intermediate questions, the sticky header obscured the small question-progress line.

**Fix direction:** move focus and scroll to a visible result heading when completion occurs; account for the sticky header when positioning each question. Preserve the quiz questions, ranking, and visual design.

### 6. Medium: match results omit known opening status

**Student outcome:** separate a strong eligibility fit from an application that is open now.

**Reproduce:** complete a Grade 12, Edmonton, STEM, 80–89%, University of Alberta, Edmonton Public Schools, Jasper Place profile, with both opportunity types selected.

**Observed:** the first scholarship match, Catherine and Robert Povaschuk, has `STRONG MATCH`, `DUE APR 27, 2027`, and `Apply`, with no opening information. Searching that same award in the directory shows `0 OPEN NOW`, `OPENS FEB 1`, and `Visit`. The audit does not establish that its external form accepts premature applications; the defect is inconsistent guidance within ScholarAB.

**Fix direction:** retain relevant future matches but expose their known opening date and use the same action semantics as the directory. Do not discard possible matches merely because some eligibility answers are unknown.

## Smaller improvements

1. **Remove redundant one-result arrows.** TD and SHAD details display previous/next links even for `FILTERED · 1 OF 1`; both point back to the same page. The previous link's accessible label is `Previous listing (0 of 1)`. Hide the pair for a one-item list and correct the wraparound label for larger lists. This is a direct removal candidate, not a reason to remove content.
2. **Make the school question consistent with the board answer.** After choosing Edmonton Public Schools, the school question still offers Austin O'Brien Catholic High School, St. Joseph Catholic High School, and St. Oscar Romero Catholic High School. Consider narrowing choices only when board membership is reliably known. The audit did not verify outcomes for deliberately contradictory board/school answers.
3. **Expose homepage selections to assistive technology.** Grade/region/focus choices visibly change when selected, but Firefox's accessibility tree continues to report ordinary buttons without a selected/pressed value. Directory filters do expose their state. Verify with VoiceOver and give these choices appropriate state semantics.
4. **Reduce the work before the first directory result.** At normal Mac zoom the scholarship page's introduction and multi-row filter bank occupy the initial viewport; results require scrolling. Consider a compact or collapsible scope selector. Home and directory also show different city counts, for example Airdrie 10 versus 21 and Edmonton 56 versus 59; establish whether those represent different inclusion rules before treating them as stale data. These are design/data-consistency proposals, not implemented changes.

## What worked in this session

- Homepage, scholarship directory, program directory, details, Saved, Match, and public deadline calendar loaded.
- `Rutherford` search returned four results; the detail's filtered previous/next context identified position 2 of 4.
- A nonsense query displayed a clear empty state; Clear all filters restored 1118 listings in the comparison browser.
- Saving Rutherford added it to Saved. Removing this test bookmark restored zero saved items.
- SHAD search returned one result with program duration, grades, location, costs on its detail, and a working external provider link.
- Two quiz journeys completed. Homepage Grade 11/Calgary/STEM choices carried into the remaining quiz rather than being asked again. Results survived reload, and Retake quiz returned to question 1.
- The public deadline calendar's October jump positioned `October 2026` visibly below the header.
- A malformed reminder address (`invalid`) was blocked by browser validation with `Please enter an email address`; focus returned to the field. The test text was cleared.
- At a verified 200% Firefox zoom, the SHAD detail reflowed into a single column. The compact menu opened, Tab produced a clear focus ring, and Escape closed it and returned focus to its trigger.

## Scope, cleanup, and next verification

This was a sample of student journeys, not a check of every catalogue entry or outbound URL. No valid email address was submitted, no subscription or application was created, and email delivery/confirmation/unsubscribe were not tested end to end. No VoiceOver session, automated accessibility scan, measured color-contrast audit, load benchmark, or mobile-device audit was performed. Native Firefox accessibility snapshots sometimes lagged visual transitions; findings above rely on settled screens, targeted comparison, or corroborating code, not on those snapshot delays.

The test bookmark was removed, the fictional quiz was reset through Retake quiz, the invalid email text was cleared, and Firefox zoom was restored to 100%. The 118-byte test calendar download remains in Downloads as evidence. No pre-existing downloads were removed. Existing unrelated repository edits were preserved.

Suggested implementation order: correct availability semantics and totals; prevent empty exports; retain directory return state; correct quiz positioning and availability guidance; then review the smaller improvements. For any implementation, follow the removal-first requirements in `docs/simplification.md`, run appropriate retained-behavior checks through `npm run ci`, and complete `npm run ship-check -- origin/main` before shipping. No shipping checks or performance improvements are claimed for this audit-only work.
