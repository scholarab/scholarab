# Matching rewrite: Phase 2 delivery

The shared deterministic eligibility engine is implemented for scholarships and programs. The existing public quiz still runs its previous engine until Phase 3 integrates the redesigned experience. No listing was promoted to reviewed evidence and no student profile or catalogue draft was written to the database in this phase.

## Engine contract

`createMatchingEngine(opportunities)` validates the complete input and compiles the versioned contracts once. `assess(profile, { now, sort, entities })` validates answers, evaluates every opportunity, and returns:

- `all`: every namespaced catalogue identity exactly once, deterministically ordered.
- `recommendations`: all candidates without a known mandatory contradiction. Their availability is separate; closed and future candidates require separate presentation groups in Phase 3.
- `excluded`: candidates with a known failed mandatory requirement, with the source and reason preserved for inspection.

Every assessment includes rule results, group results, blocking unresolved requirement IDs, matched preferences, source-scope status, application availability, next action, and ordering explanations. A mandatory failure inside an unused ANY alternative does not automatically exclude the opportunity.

The engine has no network, storage, analytics, or LLM calls. Its clock is explicit for reproducible evaluation. Compilation rejects corrupt identities, duplicate IDs, invalid condition types, broken group references, and invalid schema versions instead of silently truncating the catalogue.

## Answers and requirement context

Answers distinguish answered, unanswered, declined, not-sure, and not-applicable. A declined answer is unresolved and does not request another question. Facts are typed:

- Number intervals retain inclusive/exclusive boundaries and unbounded ends. 80–89% is unresolved against an 85% minimum; it never becomes an invented 85%. Below 85% fails that minimum when its upper endpoint is exclusive.
- Choice facts distinguish actual memberships/attributes from alternative possibilities. Possible attendance at either University A or B does not establish enrollment at A. Incomplete choices do not establish a negative.
- Boolean facts refer to the specific source requirement, not a general proxy for identity or need.

The additive `answerKey` and `basis` fields keep provider-specific questions and qualification context explicit. Marks, institution, education stage, and residence need a basis; otherwise they remain unresolved. Examples: `admission-average`, `enrolled`, `current`, `community`, `province`. An answer with a different basis does not satisfy the requirement. Age needs the provider reference date, matched by the answer's `asOf` date. No birth date is necessary.

Identity, membership, activities, financial need, and nomination need an explicit answer key for the specific criterion. Do not infer one identity or provider's need standard from another. The exact meaning and wording of these keys must be established during source review and Phase 3 question design.

Entity comparisons use exact normalized values or supplied reviewed alias catalogs. The existing school-board aliases are supported. Unknown or ambiguous aliases remain unresolved; a school name cannot match another merely because it is a substring. Residence levels are explicit, so a province-wide fit is not labeled a community-specific fit.

## Evidence and group logic

Unreviewed, stale, ambiguous, future-dated, or incomplete evidence never establishes eligibility or a hard exclusion. Manual requirements remain unresolved even when their source is documented. Unknown requirement strength also remains unresolved.

ALL groups fail when a mandatory child fails; otherwise unknown children keep them unresolved. ANY groups pass when a mandatory alternative passes; they fail only when every mandatory alternative fails. Preferences are excluded from eligibility aggregation, including preference-only branches, and cannot satisfy a mandatory alternative. Editors should represent preferences as separate preference nodes rather than mixing the meaning of a provider's mandatory alternatives.

A complete pass is labeled `meets_checked_requirements` only when the requirement scope itself is reviewed. Otherwise the outcome is `worth_checking`. This is not a guarantee of acceptance or eligibility beyond the recorded, reviewed requirements.

## Availability and ordering

Application state is independent of eligibility. The engine handles explicit inactive records, opening dates, closing dates, rolling intake, unpublished deadlines, and unknown windows. It uses the provider timezone when supplied, with Alberta as the documented fallback for the calendar date. Date-only deadlines are not invented closing hours; on deadline day, the next-action note tells the student to check the provider's exact time.

Unreviewed dates remain unknown. A known closing date alone does not prove the application window is open. Nomination and automatic consideration have distinct next actions rather than an indiscriminate “Apply now.”

Three deterministic orderings are available: best fit, closing soon, and local. Known-ineligible results stay outside recommendations in all three. Best fit considers application readiness, reviewed requirement scope, eligibility state, blocking unresolved checks, and verified preferences, then date and stable identity. Missing source coverage does not win merely because fewer requirements were recorded. Local ordering requires a satisfied community-level residence rule. Deadline ordering separates unknown/undated values and places closed opportunities last among candidates.

These are ordering policies, not acceptance probabilities. No award amounts or invented winning odds determine eligibility.

## Admin preview

`Admin → Matching coverage → select a record → Test Phase 2 eligibility engine` opens a read-only synthetic profile preview against the current form's matching contract, including unsaved draft edits. The editor can load a sample mark interval, set a fixed evaluation timestamp, and inspect rule states, sources, follow-up keys, overall eligibility, and next action.

Profile JSON remains in React memory. It is not saved as listing data or transmitted by the preview. Syntax errors produce a local validation message. Closing the selected record removes the preview state. The existing revisioned draft-save and publication workflow is unchanged.

## Verification and limitations

- 951 tests pass in 49 files. The new cases include interval boundaries, dates/bases, skipped/declined answers, source status, entity comparisons, provider-specific questions, nested ALL/ANY logic, preferences, complete-scope uncertainty, application methods, identity preservation, sort exclusions, and network-free preview editing.
- Every one of the 1,207 current opportunities is evaluated for each of the 30 synthetic profiles in the corpus test.
- `npm run matching:evaluate` produces a repeatable aggregate report at `.cache/matching-engine-evaluation.json`, with old/new scholarship count comparisons and a fixed clock. The inspected local run was approximately 8 ms p95 for full-catalogue assessment, excluding compilation. This is Node CPU timing, not a browser/mobile p95 or field interaction measurement.
- Astro checks 196 files with zero errors/warnings/hints; lint, scripts type checks, and full build pass. The build verifies all 1,207 identities, hashes, quiz connections, and detail pages.

All current imported rules still use the new contract's legacy-unreviewed status. Consequently current-corpus results are unresolved rather than silently reusing old unverified hard filters. That is a deliberate safety/correctness boundary, not a claim the existing listings are wrong or the new quiz has already become more useful to students. The existing public experience is unchanged.

The reviewed-rule test fixtures are explicitly synthetic policies with independently specified expected outcomes, not verified provider policies. The 100 provider-source-reviewed judgments and held-out real-source evaluation required by the plan remain Phase 4 work. Phase 3 must compact and split the large Phase 1 evidence asset before loading it in the student experience.

## Handoff to Phase 3

Use the typed answer contract directly; do not convert ranges to midpoint numbers. Generate optional questions only for the indicated unresolved keys, while respecting declined answers and provider scope. Group results by eligibility and application availability, keep all candidates discoverable, and use the returned explanations and next actions. Keep personal answers in the planned session-only client state. Source review must supply explicit contexts and accepted values before conditions can be treated as verified.
