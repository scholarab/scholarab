# Link report 39 repair, September 30, 2026

Student outcome: every reported listing should lead to the relevant official information, and an automated refusal must not be mistaken for an ended scholarship. Review covers all 19 broken and 23 suspect entries in [issue 39](https://github.com/scholarab/scholarab/issues/39), plus newly reported failures from a fresh hosted run. JSON remains the publication authority. No listing was deleted because a network check failed.

## Deleted school document: 19 listings

The old MCHS download `/download/441592` returns 404. Eighteen listings now link to the school's [awards page](https://mchs.psd.ca/students/awards), which links its current [September 22 awards document](https://mchs.psd.ca/download/536726). Green and Gold links to [athletics](https://mchs.psd.ca/programs/athletics), which links the current [2026-27 handbook](https://mchs.psd.ca/download/352404). This removes dependence on a particular school download ID.

| IDs | Review result |
| --- | --- |
| 473, 475-477, 479-480, 484-486, 488-490 | Award found in the current school material; stable official link replaces the deleted download. |
| 474, 478, 481 | Capital Plumbing, Dr. Dekterov and Laverne & Jack Lewis are absent from the current document. Retained with an explicit availability warning and instruction to confirm with Student Services; absence alone does not establish cancellation. |
| 482 | Current document names the Meridian Masonic Lodge award Jack Webster Memorial Bursary. Renamed, preserved ID and former-name reference, and added both old-slug 301s. |
| 483 | Current Parker Tobin value is $1,000, replacing $750. |
| 487 | Current Lions improvement criteria do not state the old volunteering requirement. Removed that requirement from text and structured eligibility. |
| 491 | Current handbook retains $1,000, 70% average and two team years including Grade 12. Replaces the old fundraising requirement with proof of post-secondary registration within two years. School-selected application route retained. |

## All 23 original suspect entries

Browser verification means the actual provider content rendered in the native browser. It does not mean that an automated check passed. The Ken Foster PDF was inspected through the web PDF reader instead.

| Listing | Evidence and disposition |
| --- | --- |
| Luke Santi Memorial Award | [Perimeter](https://perimeterinstitute.ca/outreach/students/luke-santi-award-student-achievement) loads. Corrected award from $1,000 to $2,500. The 2026 round is closed; removed an unannounced 2027 deadline. |
| ISSYP | [Perimeter student page](https://perimeterinstitute.ca/outreach/students) loads. Existing unconfirmed-session wording retained. |
| USW Post Secondary | [Official page](https://usw.ca/pages/post-secondary/) loads after its automatic browser challenge. 2026 closed June 30; removed the assumed 2027 date. Exact 403 exception expires October 30. |
| USW Indigenous Post-Secondary | [Official page](https://usw.ca/pages/usw-indigenous-scholarships/) verified with the same closed-cycle correction and exact 403 exception. |
| David Ellis | [Official page](https://usw.ca/david-ellis/) verified with the same closed-cycle correction and exact 403 exception. |
| WILD Outside | [CWF](https://cwf-fcf.org/en/conserve/wild-outside.html) loads. Current ages are 13-18 and Western Region groups are coming soon. Removed the claim of active Calgary/Edmonton programming; retained the detail page with unconfirmed Alberta availability. Exact 403 exception. |
| Caring for our Watersheds | Old host has a certificate mismatch. Replaced with [Alberta organizer BRWA](https://www.battleriverwatershed.ca/youth-programs/caring-for-our-watersheds/). Its notice says funding ended after 2025-26 and a new sponsor is needed. Retained the detail page with that explanation, removed from current program recommendations. |
| Metis Scholar Awards | [Rupertsland](https://www.rupertsland.org/metis-scholar-awards/) loads; updated to the canonical path. |
| USACO | [Official site](https://usaco.org/) loads; exact 403 exception. |
| Alberta Aviation Museum Youth Volunteer Program | [Provider page](https://albertaaviationmuseum.com/empowering-youth-at-the-alberta-aviation-museum-youth-volunteer-program/) loads with the youth program; exact 403 exception. |
| Blue Planet Awareness Contest | [Bow Seat](https://bowseat.org/programs/blue-planet-awareness-contest/contest-overview/) loads. Updated renamed contest path; exact 403 exception. |
| AYLEE | [ABCEE](https://www.abcee.org/alberta-youth-leaders-for-environmental-education/) loads; exact 403 exception. |
| Fallen Firefighters Education Program | [CFFF](https://www.cfff.ca/education-program) loads. URL retained; fresh hosted baseline passed. |
| Interact | [Rotary](https://www.rotary.org/en/get-involved/youth-programs/interact-clubs) loads. Updated canonical path; exact 429 exception. |
| STEM Fellowship Journal | [UBC journal](https://ojs.library.ubc.ca/index.php/sfj/about) loads. Curl also returns 200 where Node reported a closed socket; URL retained. |
| Bold Eagle | Replaced generic Forces page with the program's [Canadian Army page](https://www.canada.ca/en/army/services/bold-eagle.html). It loads with the correct program information and valid TLS. |
| Blue Ocean | [Official competition](https://blueoceancompetition.org/) loads, including 2027 information; exact 403 exception. |
| Ken Foster Memorial Scholarship | [Official 2026 ATU PDF](https://atu569.ca/wp-content/uploads/2025/11/2026-ATU-Memorial-Scholarship-Announcement.pdf) verified as a five-page scholarship document. URL retained; fresh hosted baseline passed. |
| Metis Youth Summer Employment | [Rupertsland project](https://www.rupertsland.org/training-project/metis-youth-summer-employment-program/) loads. Existing wording requiring confirmation of current intake retained. |
| Canada Service Corps | [Canada.ca](https://www.canada.ca/en/services/youth/canada-service-corps.html) loads; retained. No timeout exception. |
| HiMCM | [COMAP](https://comap.org/contests/himcm-midmcm) loads with 2026 contest dates; retained. Fresh hosted baseline passed. |
| Canadian Cadets | [Canada.ca](https://www.canada.ca/en/department-national-defence/services/cadets-junior-canadian-rangers/cadets/join-us.html) loads; retained. No timeout exception. |
| Young Canada Works | [Canada.ca](https://www.canada.ca/en/canadian-heritage/services/funding/young-canada-works/students-graduates/heritage-organizations-students.html) loads; retained. No timeout exception. |

## Checker behavior and new findings

The fresh pre-change [hosted run 36685893407](https://github.com/scholarab/scholarab/actions/runs/36685893407) reported 19 broken and 20 suspect entries. Four suspects were new: Lloydminster Fish and Game, Wharton, Drayton Valley's Small Town Big Dreams, and Calgary CCPC. Wharton's official page and Drayton Valley's scholarship both rendered in the native browser. Wharton's repeated automated 403 has an exact, dated exception. Lloydminster and CCPC have correct official pages visible through web retrieval but browser/network timeouts locally. A local scan also found a Ponoka Agricultural Society DNS failure; the official page remains indexed and the fresh hosted baseline passed it. Do not substitute unrelated pages or suppress DNS/timeouts just to clear a report.

Eleven new reviews are scoped to one URL, one observed 403/429 status and an October 30, 2026 expiry. URLs are still requested every run. A later 404/410, DNS failure, TLS error, timeout, server error or different refusal remains reportable. Existing host exclusions are unchanged. The closure message distinguishes reviewed restrictions from automated passes.

Socket failures use curl in an existing retry slot. Both clients validate certificates; there are still at most three attempts with 2/4-second backoff and 25-second request limits. A final error is reported. Unit tests cover recovery, bounds, non-retryable statuses, later broken pages and expired reviews. No dependency was added.

Local shared CI passed 1,132 unit tests, production build, bundle-secret checks and type checks. Browser tests passed 141 with 19 expected skips. Hosted follow-up is recorded below after deployment.

Final local scan: all original report entries are either automated passes or reviewed refusals. The unsuppressed remainder is Ponoka DNS plus timeouts for Calgary CCPC and the Drayton Valley awards page shared by Michael R. Allers, Brittany Ann Urkevich and Ricochet Oil. Drayton Valley's individual Small Town Big Dreams page passed this scan; Lloydminster also recovered. This movement between URLs is evidence of transport variability, not a reason to change correct catalogue URLs. Built preview confirms the renamed bursary's 301 and the preserved inactive Watersheds detail page.

## Hosted follow-up

Commit cf03827 passed hosted CI and deployed successfully; production's catalogue fingerprint matched the built JSON. [Hosted link run 36687813023](https://github.com/scholarab/scholarab/actions/runs/36687813023) reduced the report to zero broken and two suspect entries: a new AUArts 502 and the persistent CCPC timeout. All 42 original entries cleared as passes or documented bot refusals. Eleven exact refusals were reported as reviewed. The full hosted scan took 189.5 seconds; this is one observation, not a controlled speed comparison.

Ponoka's local failure was DNS-specific: a public resolver returned the provider's Jimdo CNAME and current addresses; a diagnostic request to that address, preserving the original hostname and certificate verification, returned the correct scholarship page with 200. No DNS override or exclusion was added to the checker.

AUArts recovered with 200 from both Node and curl and rendered in the browser; no 502 exception was added. Its page confirms the four-week Pre-College course was offered for the last time in 2026. Updated listing 112 to University Prep Programs with two-week Arts-Bridge, current grade/admission criteria and an unannounced next intake, preserving both old URL forms with 301s. Sources: [program overview](https://www.auarts.ca/program-areas/university-prep-programs) and [Arts-Bridge admissions](https://auarts.ca/program-areas/precollege-program/about-artsbridge).

After repeated CCPC timeouts across both clients and the hosted runner, stopped retrying that address. The [organizer's official Eventbrite listing](https://www.eventbrite.ca/e/calgary-collegiate-programming-contest-2026-tickets-1981079259394) loads in the browser and both HTTP clients. Expanding its details confirms the same high-school eligibility, divisions, location and contest rules and links back to the original university URL. Listing 220 now uses this official alternate, clearly identifying it as the ended March 2026 event with no announced next date. This preserves substantive provider information rather than substituting an unrelated homepage. Neither new failure was hidden.

The two-record follow-up passes shared CI (1,132 tests, build and type checks) and all 141 browser tests with 19 expected skips. Built native inspection confirms AUArts' old URL redirects to its current name and corrected description. No checker exceptions were added in this follow-up.

Final deployment: cfad8a1 passed hosted CI and Cloudflare deployment, with a matching production catalogue fingerprint. Live native inspection confirms the AUArts old-slug redirect and corrected content. [Hosted scan 36688723635](https://github.com/scholarab/scholarab/actions/runs/36688723635) cleared AUArts and the replacement CCPC link, with no broken links, but reported different timeouts for [Bredal Energy](https://dvcf.org/bredal-energy-fund-scholarship-application/) and the [Alberta Page Program](https://www.assembly.ab.ca/about/careers/page-program). Both subsequently returned 200 via certificate-validated curl, and official web retrieval confirmed the expected program/award content. No record was changed and neither timeout was suppressed. One final [hosted confirmation](https://github.com/scholarab/scholarab/actions/runs/36689348103) was dispatched after that recovery. Its output and issue 39 are the authoritative final network result; do not infer an automated pass merely from this manual review. No further full-scan retry loop is planned.
