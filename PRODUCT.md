# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Alberta high school seniors (Grade 12) looking for scholarships they can actually
apply to. They arrive from Google, from a counsellor's email, or from a link a
friend sent, usually on a phone, usually in the evening, usually with a deadline
already close. They are first-time applicants: they do not know the vocabulary
("bursary", "rolling", "designated"), they do not have a list, and they give up
quickly when a listing turns out to be dead or closed.

Counsellors and parents read the site too, and counsellors are the main
distribution channel (a 524-school outreach list, first batch sent 2026-09-10),
but they are not the audience design decisions are made for. When a counsellor
need conflicts with a student need, the student wins.

## Product Purpose

A free, ad-free directory of scholarships and research programs open to Alberta
high school students, so a student can find what they qualify for and apply
before the deadline. Success is a student applying to an award they would not
otherwise have found.

Catalogue size changes with publication. Read `src/data/scholarships.json` and
`src/data/research-programs.json` for current records; program directory counts
use `programIsListed` in `src/lib/status.ts`, not the raw record count.

## Positioning

Freshness and verification are the moat, not the software. Listings distinguish
confirmed dates, estimates, dates not posted, and genuinely rolling applications,
so a student is not told an award is open without evidence. Provider links and
verification dates make the sources checkable. Dead awards are removed and the
removals are checked by hand, because the automated verdicts were
wrong 3 times in 12 and always in the same direction (filing a live award as
dead). Competing lists circulate as stale PDFs: on one Alberta counsellor list,
9 of 31 awards were dead and only 1 said so.

No ads, no account, no paywall, no email required to browse.

## Operating Context

- Phone first, in short sessions, often with a deadline days away.
- Entry is rarely the homepage: search lands students on a city hub, a topic hub,
  or a single listing page.
- A student compares a handful of awards and needs the deadline, the amount, and
  the eligibility in one glance to decide whether to bother.
- Counsellors forward links and print lists for their own students.
- Optional email reminders for a chosen deadline (double opt-in since
  2026-08-21). Offer only reminder milestones still ahead; a deadline too close
  for a reminder must say so.

## Capabilities and Constraints

- Directories for scholarships and research programs, with facet hubs by city,
  scope, topic, field and format; detail pages per listing; a match quiz at
  /match (three questions for programs, six to eight for scholarships); saved listings;
  deadline reminders by email; guides;
  an admin area.
- Status vocabulary is product truth. `src/lib/status.ts` owns the states and
  shared labels. "Open now" counts only listings with a confirmed application
  deadline; "Open any time" requires an explicitly rolling scholarship.
  Unknown or estimated dates are not open windows, and an opening date must
  never be invented. For scholarships, `active: false` means between cycles;
  `concluded: true` means permanently ended. Inactive programs are unlisted.
- Astro, deployed as a Cloudflare Worker (Workers Builds, via git). Public data
  loaders read JSON in `src/data` in both development and builds. Database
  drafts are separate and cannot change the public catalogue until publication.
  A publication is confirmed only when the live request ID and catalogue hash
  match; a failed publication keeps its drafts. See
  `docs/publication-and-operations.md`. Verify rendered changes against the
  build in `dist/`.
- React runs only on /match and /admin. Everything else is server-rendered HTML
  with small vanilla controllers; new work extends those rather than adding
  islands.
- One fixed light palette. There is no theme system and must not be one.
- Google Analytics loads only after explicit consent and uses a browser
  identifier; do not describe it as anonymous or zero-PII. Cloudflare Web
  Analytics is cookieless, and first-party event rows have no person or session
  identifier. The consent banner and tracking opt-out remain required. The
  privacy page (`src/pages/privacy.astro`) owns the published collection and
  retention promises.
- Saved listings and quiz answers stay on the student's device. Reminder email
  addresses require confirmation and remain subject to unsubscribe, deletion,
  and retention rules. Preserve those paths when changing the interface.
- Preserve existing public content, wording, design, layouts, fonts and the
  legacy quiz unless the user explicitly expands the scope, as `AGENTS.md`
  requires.
- Dual licensed: code AGPL-3.0, data CC BY-SA 4.0, name reserved.

## Brand Commitments

- Name: ScholarAB. Site: https://www.scholarab.ca
- Built solo by a Grade 12 student in Medicine Hat, which is stated publicly and
  is part of why students trust it.
- Copy is plain and specific, lowercase-friendly, never salesy. No em dashes
  anywhere, ever.
- Promises made in public and in the privacy page that future work must not
  break: free, no ads, no account needed, no selling of data.

## Evidence on Hand

- Real listing data with deadlines, amounts and sources in `src/data`.
- Publication behavior in `src/lib/data-loader.ts` and
  `docs/publication-and-operations.md`; shared availability rules in
  `src/lib/status.ts`.
- Search Console history, Cloudflare analytics, and first-party events.
- A counsellor outreach list of 524 Alberta schools (contact CSV is gitignored
  and must never be committed).
- Public feedback from r/ClaudeAI (2026-09-16): the interface reads as
  "Claude default", body text is too faint to read, copy could be half as long,
  the consent banner is the first thing people notice. This is historical
  feedback, not a description of the current interface. Dated reviews live in
  `.impeccable/critique/`; subsequent changes and measurements live in
  `docs/simplification.md`.
- There are no testimonials, no sponsors, no revenue, and no user counts worth
  quoting. Do not invent any.

## Product Principles

1. A listing a student cannot trust is worse than no listing. Verify before
   publishing, and verify again before removing.
2. Deadline, amount and eligibility come first on every surface; everything else
   is secondary.
3. No friction before value: no account, no email, no interstitial between a
   student and a scholarship.
4. Say less, and say it in words a 17-year-old uses.
5. Look like ScholarAB, not like a template.

## Accessibility & Inclusion

WCAG 2.2 AA is the bar: 4.5:1 contrast for body text, full keyboard paths, and
visible focus. The September 16 muted-text finding is historical; verify any
current defect against the current build. `src/lib/design-tokens.test.ts`
guards known color and focus regressions. Existing tests and dated audits do
not establish full-site conformance.
