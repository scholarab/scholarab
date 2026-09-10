# ScholarAB Match: rewrite specification and implementation plan

Status: proposed implementation plan; no quiz code changed by this document.

Prepared from the current repository on 2026-09-09, following the catalogue and reliability improvements. Estimates below are planning ranges, not delivery promises. The intended release includes the entire core journey, not merely a redesigned questionnaire.

## 1. Product decision

Promise: **Find opportunities worth your time, understand why they fit, and know what to do next.**

Build a progressively refined shortlist with explicit eligibility reasoning. Students get initial results after three essentials, then choose whether to answer useful follow-ups. Keep the public route `/match/`, existing public listing IDs, and the saved-list/application infrastructure.

Primary users: Alberta Grade 10–12 students; students entering or already attending post-secondary; students exploring research and other programs. Include uncertain plans, rural communities, shared school computers, and keyboard/screen-reader use throughout the design.

Success means students can identify a suitable opportunity and its next action without being misled about eligibility. Completion rate alone is insufficient.

### Goals and proposed targets

- First shortlist after search intent, education stage, and location; at least 80% of usability participants reach it within 60 seconds without help.
- Every displayed recommendation explains known matches, unresolved requirements, application availability, and a next action.
- Zero known hard-rule contradictions in the default recommendations in the reviewed evaluation set; all curated eligible fixtures remain discoverable.
- At least 80% of usability participants correctly distinguish a requirement they meet from one they still need to verify, and can identify their next action.
- Recalculation p95 below 100 ms on the defined 4× CPU-throttled browser benchmark; no answer interaction blocked by a network request once the matching core is loaded.
- Maintain or improve the current approximately 101 KB compressed page/data baseline. Set the full JavaScript budget after recording the existing baseline, before implementing the UI.

These are release/design targets, not observed results. Controlled usability percentages are descriptive with a small sample, not proof of population-wide conversion lift.

## 2. Evidence and implications

Current entry points: `src/pages/match.astro`, `src/components/QuizLoader.tsx`, `src/components/EligibilityQuiz.tsx`, `src/lib/quiz.ts`, `src/lib/eligibility-types.ts`, `src/lib/eligibility-matcher.ts`, and `src/lib/quiz-payload.ts`.

| Observed implementation/data | Consequence for the rewrite |
|---|---|
| 1,078 scholarships and 129 programs; all currently have an eligibility field | Completeness must be evaluated per requirement, not by the existence of an object |
| 167 scholarships carry minAge or maxAge; scholarship matching does not evaluate age | Support age requirements with their reference date, and visibly unresolved cases |
| “80–89%” becomes 85, “90% or higher” becomes 93, and “Below 80%” becomes 79 | Preserve ranges; never manufacture exact marks for threshold decisions |
| Institution mismatch can be a ranking penalty | Separate mandatory enrollment/admission requirements from preferences and location hints |
| “Another school” and skipping can share an empty answer | Distinguish a known different school from unknown, declined, and not applicable |
| Confidence is a weighted specificity score | Replace eligibility badges with rule results; use a separate explainable ordering policy |
| 418 scholarships have no deadline | Separate unpublished dates, rolling intake, nomination/automatic awards, future cycles, and unavailable listings |
| Scholarship quiz payload omits active/openDate | Audit availability end to end and ship explicit availability fields for both catalogue kinds |
| School/board discovery has its own geographic scope logic | Normalize geographic rules and reuse them for evaluation and question discovery |
| Homepage teaser seeds grade/city/field | Preserve incoming answers through a versioned adapter and update teaser copy |
| Existing saves, application steps, calendar export, reminders, and event counting | Integrate these capabilities instead of creating parallel stores |
| Current page promises “every” opportunity and uses “qualify” language | Replace absolute claims with accurate discovery and verification language |

Counts describe the inspected snapshot and must be regenerated at implementation start. Missing dates or legacy fields are review signals, not automatic evidence that a provider listing is wrong.

## 3. Scope and user stories

### Required for the rewrite

- As a student with uncertain plans, I can get useful results without inventing answers.
- As a student, I can see exactly why an opportunity fits and what still requires checking.
- As a student whose school, age, membership, or institution matters, I receive the relevant question or an explicit unresolved requirement.
- As a student planning ahead, I can distinguish applications I can start from future or closed cycles.
- As a student using a shared computer, I can skip personal questions and end my session clearly.
- As a student comparing choices, I can compare up to three opportunities and save a next action into the existing workspace.
- As an editor, I can review ambiguous requirements, attach source evidence, and publish corrections through the existing draft workflow.

### Deliberate boundaries

The core release includes optional personal questions, comparisons, source-backed requirements, editor review tools, and saved-workspace integration. These are not postponed as cosmetic extras.

Accounts/cross-device synchronization, document uploads, essay generation, automatic applications, provider acceptance-odds prediction, and a broad site redesign are separate projects. Client-side matching remains deterministic; an LLM may assist editorial extraction into drafts, but cannot decide a student's eligibility at runtime. No new database platform is needed.

## 4. Experience and visual design

Retain ScholarAB's warm off-white background, dark readable type, green accents, and existing fonts. Improve hierarchy and interaction rather than introducing an unrelated brand.

### A. Start

Heading: **Find opportunities that fit your plans.**

Supporting copy: **Start with three details. Refine your shortlist whenever you want.**

State that answers stay in this browser session; saved listing IDs may remain on this device. Provide a direct directory alternative.

Ask intent (scholarships/programs/both), education stage, and community. Use a searchable, keyboard-accessible community selector with a genuine “My community isn't listed” route. Do not imply that living near a city satisfies its residency rules. Separate current stage from intended application-year stage when an award requires it.

No fixed “six questions” promise or fake progress percentage for an adaptive flow. Initial progress can say “2 of 3 essentials”; refinement says “Optional: improve these results.”

### B. Initial shortlist and optional refinement

Desktop: results in the main column, a compact editable answer/refinement panel alongside. Mobile: results in one column with an “Edit answers” control and a separate accessible refinement view; avoid permanently shrinking the results viewport.

Show up to five starting recommendations, with an obvious way to view all remaining candidates. The initial five are a presentation limit, never a catalogue eligibility cutoff.

Offer one useful follow-up at a time: “Your school could help check requirements on these opportunities.” Avoid promises such as “unlock 12 awards.” Students can skip, view results, go back, or stop refining at any time.

Sensitive topics appear behind a clearly optional “Check additional eligibility criteria” choice. Explain the relevance of each question without implying an identity or need. Declining a topic suppresses repeated prompts during the session.

### C. Result organization

Use eligibility and application availability as separate dimensions:

- **Meets the requirements we checked**: no failed or unresolved mandatory requirements and reviewed coverage is sufficient. Never label this guaranteed eligibility.
- **Worth checking**: no known contradiction, but one or more requirements or source details remain unresolved.
- **Doesn't meet a known requirement**: excluded from the default shortlist, inspectable through a clearly labeled view with the reason.

Availability badges: Open, Opens later, Rolling, Deadline not published, Nomination/automatic consideration, Closed. Availability can remain uncertain independently of eligibility.

Each card shows title, provider, award amount or program cost/stipend where known, date/status, two concise fit explanations, the most important unresolved requirement, and a next action. Full evidence and all rule results expand on request.

Example: “Your grade and community fit. Check: this award requires membership in the provider's organization.” A future application says “Prepare for the next opening,” not “Apply now.”

Do not hide every broad opportunity below highly specific local ones simply because it has fewer restrictions.

### D. Compare and act

Compare up to three listings by requirements, unresolved checks, timing, amount/cost, and verified preparation tasks. Desktop may use a table; mobile uses stacked labeled sections with the same content.

Reuse existing saves by `(kind, public_id)`. Link to the detail page, official source, reminder signup, calendar export, and current application steps. Add only the minimum workspace fields necessary for a next action and optional student-reported submission state. Keep shortlist/app-step behavior consistent across quiz, detail pages, and `/saved/`.

Time-to-apply estimates appear only when supported by evidence; otherwise show concrete tasks such as “Reference letter required” or “School nomination required.”

### E. Required states

Design loading, partial-data failure, retry, empty results, all-unknown results, unavailable storage, invalid saved session, expired session, changed catalogue, long school names, large result sets, and no JavaScript. No-JS users receive useful explanatory content and direct filtered-directory links. Zero results explain actual restrictions and let the student revise answers; they must not encourage hiding accurate answers to obtain more matches.

Keyboard focus follows deliberate navigation, not every result update. Announce result-count changes politely, keep option labels explicit, use visible focus and text alongside color, respect reduced motion, support 200% zoom, and keep touch controls comfortably sized. Test desktop, 390px mobile, and 320px narrow layouts with no horizontal page scrolling.

## 5. Data contract and editorial migration

Introduce a versioned matching contract. Both scholarship and program records normalize to `Opportunity`; preserve kind/public ID, URL, published revision/hash, and provider-specific source text.

Each requirement needs:

- Stable requirement ID and supported rule type.
- Mandatory versus preference classification.
- Operator and typed value, including explicit ALL/ANY groups where provider rules require alternatives.
- Source URL and concise supporting excerpt/section reference.
- Verification date and editorial status: legacy-unreviewed, reviewed, ambiguous, stale.
- Applicable cycle and reference date where relevant.
- A student-facing explanation and an unresolved/manual-check fallback.

Represent “not required,” “unknown,” and “explicitly required” distinctly. Existing false/default values cannot automatically establish that a restriction was checked and absent. Preserve raw legacy information; label the adapter's provenance honestly.

Initial rule families: education stage/application year; residence/community/region; school and board; intended versus admitted/enrolled institution; study field when mandatory; marks/ranges and calculation basis; age at a specified date; citizenship/residency; membership/employer affiliation; nomination/automatic consideration; apprenticeship; activities when mandatory; optional identity/financial requirements.

Unsupported provider conditions become visible manual checks. Never silently drop them or hard-exclude students using an unverified inference.

Availability contract includes application method, cycle, opening date, closing date, timezone or date-only semantics, date source, and verification status. A date-only deadline does not imply a precise provider closing hour. Do not infer next year's date solely from last year's deadline.

Use the existing canonical catalogue and draft publication flow for new fields. Extend validation, admin editing/preview, merge tests, and payload generation together. Prefer an additive JSON contract; add SQL columns/tables only if a demonstrated operational requirement needs them.

Create a repeatable coverage report and editor queue for unsupported rules, contradictions, missing reference dates, stale evidence, and uncertain availability. Prioritize frequently viewed/saved opportunities and near-term deadlines, then cover the remaining catalogue. Every record must either have supported reviewed requirements or an explicit visible unresolved state; full manual re-verification is not a prerequisite for representing the catalogue safely.

## 6. Eligibility engine

Build pure, deterministic modules separate from React:

1. Normalize catalogue and student answers.
2. Evaluate each rule.
3. Aggregate requirement groups and evidence completeness.
4. Evaluate application availability independently.
5. Rank eligible/unresolved candidates.
6. Produce display explanations and refinement options.

Rule result: `satisfied | unresolved | not_satisfied`, with rule ID, evidence reference, reason code, and optional follow-up question. Unknown rule types produce unresolved results plus a build/report signal.

For mandatory ALL groups, any verified failure fails the group; otherwise any unresolved child leaves it unresolved. For ANY groups, one satisfied child satisfies the group; all failed children fail it; other combinations remain unresolved. Preferences never cause ineligibility.

Answer states distinguish answered, unanswered, declined, not sure, and not applicable. Numeric answers support exact values and intervals. For a minimum mark of 85%, an answer of 80–89% is unresolved; 90%+ satisfies it; a verified exact 84% fails it. “Below 80%” must never become an invented 79%.

Age questions should ask the minimum needed to resolve the rule, such as age on the provider's reference date or a direct threshold check. Do not require or store a full birth date. Missing age-reference dates remain unresolved.

Normalize schools/institutions through explicit IDs and reviewed aliases. Replace substring-based matching with exact normalized entities and explicit unknown/other states. Distinguish residence from school location and intended institution from accepted/enrolled status.

Personal requirements retain source wording and inclusive answer options; do not infer identity from another answer. Ask about meeting a provider's financial-need criterion where possible rather than collecting unnecessary precise household income.

## 7. Ordering and adaptive questions

### Ordering

Keep eligibility classification separate from ordering. Default “Best fit” uses a documented deterministic tuple: application availability/readiness, unresolved mandatory checks, expressed interests and plans, then relevant timing and stable public ID. Tune the precise ordering against reviewed profiles before freezing it. Missing evidence must not earn a ranking advantage over well-documented opportunities.

Offer “Closing soon” and “Local opportunities” as explicit student choices; undated opportunities sort separately. Do not treat amount as winning likelihood or let an urgent but known-ineligible award enter the default list. Do not estimate acceptance odds. Explain the main ordering reasons and keep all plausible candidates discoverable.

### Question selection

Start with a simple deterministic policy, not machine learning. Candidate questions must resolve supported unknown requirements among plausible opportunities. Prioritize near-term relevant candidates, count actual affected rules, penalize burden, and require explicit opt-in for personal topics. Do not derive a probability distribution over student identities.

Ask at most three optional refinement questions consecutively before returning to results; offer further refinement explicitly. Never repeat declined questions. Maintain a stable order during an active question, recompute after submission, and invalidate dependent answers when education/location changes. Always allow editing earlier answers.

Tests must prove that each offered question can change at least one current rule assessment or a stated preference, and that students cannot become trapped in a question loop.

## 8. Implementation map

Proposed new modules under `src/lib/matching/`: `types.ts`, `schema.ts`, `normalize.ts`, `evaluate.ts`, `availability.ts`, `rank.ts`, `questions.ts`, `explain.ts`, and `session.ts`. Keep them small with explicit contracts; avoid a universal expression language.

Proposed UI under `src/components/matching/`: `MatchExperience`, `EssentialQuestions`, `RefinementQuestion`, `AnswerSummary`, `ResultsList`, `OpportunityCard`, `RequirementDetails`, and `CompareView`. Prefer native controls and existing styling primitives before adding UI dependencies.

Update `quiz-payload.ts` and its generator with version validation and catalogue hash. Split compact rule data from lazily loaded display/evidence details only if measurements justify it. Preserve atomic catalogue-version consistency across assets; stale/mismatched assets prompt a refresh rather than mixing evidence and rules.

Reuse `QuizLoader` fetch/retry behavior while strengthening runtime validation. Start essentials immediately where practical while data loads. Matching runs locally once the core loads; add a Web Worker only if the benchmark misses its budget after straightforward optimization.

Adapt the homepage teaser and old session keys explicitly. Carry safe known teaser answers; old invented numeric approximations must be re-asked. Never reinterpret a previous answer silently. Session format includes schema version, catalogue version, expiration, and answer states. Publish the same storage semantics in UI and privacy documentation.

Keep the old engine behind a build-time variant switch during implementation. Preview uses the same `/match/` experience on an isolated deployment. Do not run a second public indexable quiz route.

## 9. Privacy and measurement

Keep personal quiz answers in memory/sessionStorage with the existing one-hour expiry policy, enforced on reads, interactions, and tab reactivation. Closing the tab, expiry, or “End session and clear answers” removes them. Describe this as session-scoped storage, not secure erasure from a device. With storage blocked, continue in memory. Saved listing IDs and application progress have separate explicit persistence controls; ending the quiz must not silently erase the student's shortlist.

No personal answers, exact marks, identity, financial details, sensitive question IDs, or answer-derived explanations in URLs, logs, analytics, or error reports. Network tests enforce this. Evidence fetches must not encode a student's personal answer.

Extend the current closed event allowlist with coarse versioned milestones: initial results shown, refinement used, comparison used, and next action chosen. Compute session milestone completion locally and emit once; do not introduce persistent person IDs or a cross-site identifier. Existing reminder email consent remains separate.

Report aggregate counts and denominators honestly: sessions reaching initial results, sessions taking a shortlist action, and refinement use. Without longitudinal identifiers, do not claim unique-student retention or connect events into a person-level funnel. Avoid linking new matching-specific event payloads to sensitive listing selections. Use opt-in usability work for deeper explanations and any follow-up outcomes.

A submission tick is student-reported; neither it nor an apply click proves an application was accepted by the provider. Award success can be studied later with separate voluntary follow-up.

## 10. Evaluation and release gates

Create at least 30 synthetic student profiles spanning Grade 10–12/post-secondary, cities/rural communities, alternative institutions, age boundaries, mark intervals, uncertain plans, skipped personal answers, and no eligible open opportunities.

Create at least 100 provider-source-reviewed profile/opportunity judgments spanning both catalogue kinds and every implemented rule family. Include difficult alternatives and date boundaries. Split into development and held-out release cases; have a second human review ambiguous interpretations when available. Do not generate the reference answers from the implementation being tested. Label this an evaluation set, not full-catalogue certification.

Required checks:

- Rule-level tests for interval boundaries, ALL/ANY logic, missing/declined answers, unsupported fields, stale sources, identity semantics, aliases, and Alberta/provider date boundaries.
- Invariants: unknown never equals satisfied; adding a verified failed mandatory condition excludes the item; unrelated preferences cannot change eligibility; deterministic ordering; all non-excluded candidates remain discoverable.
- Explicit regressions for the 167 age-restricted records, mark-band approximation, “another school,” mandatory institution requirements, secondary eligible cities, and active/openDate propagation.
- Catalogue integration tests: every record normalizes or produces a reported unresolved condition; public IDs remain stable; new fields survive draft/edit/publish/sync and payload generation.
- Component/browser tests: full initial journey, refine/back/edit, compare/save/remind handoff, homepage teaser, keyboard navigation, narrow screens, loading errors, session expiry, storage failure, and catalogue-version mismatch.
- Privacy checks intercept requests and storage to confirm answer isolation and clearing semantics.
- Performance checks include page, data, JavaScript, parsing, evaluation, and rendering. Record benchmark device/throttle/cache conditions; local timings are not field interaction metrics.
- Release requires zero known hard-rule violations and no missing eligible cases in the held-out curated set, plus review of old/new result differences. Passing legacy tests alone is insufficient.

Run two usability rounds with 5–8 participants each, representing different education stages and including uncertain plans. Use synthetic profiles where discussing real personal circumstances is unnecessary. Recruitment/contact requires separately authorized coordination. Automated checks and internal walkthroughs can proceed independently; if participant testing is unavailable, label the release a beta and leave human validation explicitly incomplete rather than declaring it passed.

## 11. Delivery sequence

| Package | Work and deliverable | Dependencies | Completion gate | Planning effort |
|---|---|---|---|---|
| 1. Baseline and evaluation | Regenerate coverage, capture payload/JS timings, define profiles and initial reviewed judgments, inventory all teaser/storage consumers | None | Reproducible baseline and traceable failure cases | 2–3 focused days |
| 2. Data semantics and editorial support | Versioned requirement/availability schema, aliases, legacy adapter, coverage report, source review controls in existing admin | 1 | All catalogue rows represented without silently inventing certainty; draft round-trip tests pass | 4–6 days |
| 3. Engine and ordering | Pure evaluation, grouped rules, numeric intervals, availability, explanations, ranking | 2 plus initial judgments | Rule tests and reviewed cases pass; old/new differences classified | 4–6 days |
| 4. Adaptive question/session model | Three essentials, optional selection, personal-topic opt-in, answer dependencies, session/teaser migration | 3 | No loops, invalid inherited answers, or personal-data network leakage | 2–4 days |
| 5. Design and complete journey | Responsive essentials/results/refinement, cards, compare, evidence, all error/empty states, saved-workspace handoffs | Prototype can begin after 1; implementation depends on 3–4 | Complete desktop/mobile journey and accessibility walkthrough | 5–7 days |
| 6. Validation and revision | Held-out evaluation, representative source review, usability rounds, performance tuning, copy/privacy/analytics review | 2–5 | Measurable release gates pass; human-testing status stated | 3–5 days plus recruitment |
| 7. Rollout and cleanup | Preview, controlled beta, production switch, monitoring, rollback exercise, old-code removal after stability | 6 | Production smoke checks pass and no unresolved release blockers | 1–2 days plus observation |

Approximate engineering effort: 21–33 focused days. Editorial source verification, independent review, and participant availability add calendar uncertainty; this is not a promise of a specific elapsed delivery date. Re-estimate after packages 1–2 using actual source ambiguity and coverage. Design prototyping and editorial review can overlap engine work; implementation dependencies remain explicit.

Do not cut correctness, privacy, or source uncertainty handling to meet a date. If time becomes constrained, simplify comparison styling or defer optional polish while retaining the complete core journey and clearly reporting changed scope.

## 12. Rollout and recovery

1. Complete baseline, rules, and evaluation before replacing production recommendations.
2. Build and test the new variant in preview; run comparisons on synthetic profiles locally, without uploading student answers.
3. Validate a controlled publication round trip for matching fields and confirm the current email/reminder handoff with a designated test recipient when authorized. Do not email ordinary subscribers as tests.
4. Release a preview/beta to authorized testers, resolve correctness and comprehension issues, then switch `/match/` via the build-time flag. Keep old implementation available for at least one stable release cycle.
5. Verify production assets, initial/refined results, mobile navigation, save/calendar/reminder handoffs, and failure reporting. Check aggregate milestones daily during the first week; this is a rollout responsibility, not an automation created by this plan.
6. Roll back the variant on known wrong hard-rule recommendations, leaked personal answers, widespread load failures, or broken existing saves. Retain additive data and drafts. Publish a corrected build rather than deleting evidence or rewriting public IDs.
7. Remove legacy engine/UI only after release gates and the observation window are complete. Keep regression fixtures and migration documentation.

## 13. Decisions and remaining dependencies

Defaults chosen: preserve `/match/`; retain ScholarAB branding; three essentials before results; deterministic local matching; no account requirement; session-scoped personal answers; five initial recommendations plus all results; optional personal refinement; source-backed requirements; additive migration; existing publication and application tools.

Engineering must settle the exact payload split and JavaScript budget from measured package-1 results. Editorial review must settle ambiguous provider requirements from sources, never from a guessed conversion. Design/usability review must validate whether result grouping and language are understood. User coordination is needed only for participant recruitment, external contact, and a designated live-email test; these dependencies do not block implementation or synthetic evaluation.

The rewrite is complete when the source/data model, engine, adaptive flow, full results/action experience, privacy controls, operational handoffs, documented evaluation, and production rollout all meet their gates. A beautiful screen with the old scoring logic underneath is not completion.
