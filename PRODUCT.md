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

As of 2026-09-22 the site lists 1,416 scholarships and 123 research programs
(123 of the 129 program records are listed).

## Positioning

Freshness and verification are the moat, not the software. Every listing carries
a real deadline, a real status, and a link that has been checked; dead awards are
removed and the removals are checked by hand, because the automated verdicts were
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
  2026-08-21).

## Capabilities and Constraints

- Directories for scholarships and research programs, with facet hubs by city,
  scope, topic, field and format; detail pages per listing; a match quiz at
  /match (six to eight questions, depending on the answers); saved listings;
  deadline reminders by email; guides;
  an admin area.
- Status vocabulary is product truth: a listing is open now, opening later (with
  a real open date, never invented), or closed. `active: false` does not mean
  closed.
- Astro, deployed on Cloudflare Pages via git. JSON files in `src/data` are the
  build source of truth; the dev server reads a database and will disagree with
  the build.
- React runs only on /match and /admin. Everything else is server-rendered HTML
  with small vanilla controllers; new work extends those rather than adding
  islands.
- One fixed light palette. There is no theme system and must not be one.
- Analytics are consent-gated Google Analytics plus Cloudflare Web Analytics and
  first-party events, all zero-PII. The consent banner is required and stays.
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
- Search Console history, Cloudflare analytics, and first-party events.
- A counsellor outreach list of 524 Alberta schools (contact CSV is gitignored
  and must never be committed).
- Public feedback from r/ClaudeAI (2026-09-16): the interface reads as
  "Claude default", body text is too faint to read, copy could be half as long,
  the consent banner is the first thing people notice.
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
visible focus. Known outstanding gap as of 2026-09-16: muted text set at 45 to
55% ink over cream measures 2.9 to 3.9 and fails.
