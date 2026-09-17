---
target: /scholarships
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/admin/scholarab/src/pages/scholarships.astro"
target_fingerprint: "sha256:f902e8016185a82e09fd6810595a5d14d3cfad1fbccb4fe69ad3368bb989488d"
target_path: /Users/admin/scholarab/src/pages/scholarships.astro
timestamp: 2026-09-17T03-55-33Z
slug: src-pages-scholarships-astro
---
Method: dual-agent (A: ab6426786e1c5e0fb, B: abfb3e4b1b4a82417)

# Critique: /scholarships (Operate mode)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Counts and live regions correct, but no listing shows it was verified, and the 26-chip row gives no hint it scrolls |
| 2 | Match System / Real World | 2 | TRACK, SCOPE, STATUS, "cycle", "bursary" are schema and institution words, not student words |
| 3 | User Control and Freedom | 3 | URL state and scroll restore excellent; no per-chip undo, "Hide filters" persists silently forever |
| 4 | Consistency and Standards | 3 | In SCOPE, "All" is a button that filters while the other 25 pills are links that navigate |
| 5 | Error Prevention | 3 | Little destructive surface; Apply opens safely in a new tab |
| 6 | Recognition Rather Than Recall | 2 | Edmonton off-screen in a 3357px rail behind a 375px window; star is an unlabeled glyph |
| 7 | Flexibility and Efficiency | 3 | Accelerators exist, but no deadline-window filter and no "/" to focus search |
| 8 | Aesthetic and Minimalist Design | 2 | 42 chips plus a $1.29M stat above the first card; head costs 1.5 phone screens |
| 9 | Error Recovery | 3 | Strong empty state that cross-searches /programs, but advises "clear a filter" when none is set |
| 10 | Help and Documentation | 2 | The useful guide sits below 1134 cards; "bursary" never glossed |
| **Total** | | **26/40** | **Acceptable, significant improvements needed** |

## Design Specificity Verdict

Specific at the card, template above it. The card is authored (Instrument Serif money, mono deadline, orange urgency pill, one audience line). Above the cards it is the stock filterable-index layout; $1,294,447 is the largest object on the first screen and answers "how big is your database", not "what can I get". The verification moat appears nowhere on the page.

Deterministic scan: 1 finding on the four page files, 10 across src/components/sab, all `overused-font` on Instrument Serif (SabDetail 4, SabGuide 3, SabGuideRail 2, SabHeader 1). ScholarshipDirectory.astro and scholarships.astro clean. Treated as taste warnings, not defects; the rule's message lists fonts the files do not use. Still evidence for the "looks AI-built" reaction.

Visual overlays: none. Injection blocked by the site's own CSP (no localhost source); detect.js is 2.2MB, too large to inline. No overlay exists.

## Overall Impression

The card layer is good work and should not be touched. Everything above it is a tax a panicking student pays before reaching the thing that helps them. Biggest opportunity: the page cannot answer "what closes this week that I can apply to", and the view that answers it already exists behind a hamburger.

## What's Working

1. Card typography: three typefaces, three jobs, fixed reading order (amount, urgency, who, when).
2. State handling: filters in the URL, scroll restored on Back, day counts recomputed in the visitor timezone so a cached page never lies about "4 days left".
3. Status seams: OPEN NOW / OPENING SOON / CLOSED with counts, collapsible; status truth at the top of the scroll.

## Priority Issues

[P1] Eight muted text styles fail contrast, including the deadline. Measured: chip counts 2.89:1, row labels 3.35:1, DUE line 3.39:1, Hide filters 3.90:1; minimum is 4.5. Fix: raise muted tokens to >=72% ink, due line to full ink. Command: /impeccable audit.

[P1] SCOPE row is 26 chips, 3357px wide behind a 375px window, no arrow or edge fade; Medicine Hat is chip 20; "All" behaves differently from identical-looking neighbours. Fix: top 4 plus "More scopes (22)" or a "Where do you live?" combobox; stop navigating chips impersonating filters. Command: /impeccable distill.

[P1] No deadline filter. "Open 756" mixes an award due in 4 days with one due in 8 months; Closing soon and the calendar are 19 links deep. Fix: time row (Closing this week / This month / Open / All) from the deadline value the client already parses. Command: /impeccable shape.

[P2] The $1.29M hero answers nobody's question; it pushes search below the fold on mobile. Fix: same slot, "756 open right now / 41 closing in the next 7 days", second as a link. Command: /impeccable layout.

[P2] Verification moat invisible at the moment of trust. lastVerified is parsed client-side and rendered nowhere; Apply ejects with no evidence. Fix: "checked Sep 14" in the card foot; replace the standfirst with the claim ("1,134 Alberta awards with real deadlines. We check every link and delete dead ones"), 60% shorter. Command: /impeccable clarify.

## Persona Red Flags

Maya (Gr 12, Medicine Hat, 11pm, deadline Friday): her question is unanswerable here; her town is chip 20 of 26; she sees $1,294,447 before the search box; Apply ejects with no reassurance; the deadline reminder is never offered on this page.

Jordan (first-timer): cannot read TRACK/SCOPE/STATUS at 3.35:1 and would not know what they mean; Province-wide 154 vs National 126 vs All 1134 reads like broken arithmetic; "bursary" never glossed; the star gives no feedback.

Sam (screen reader): heading outline is H1 Scholarships then H2 "How to actually win one"; the three status seams are buttons, not headings, so there is no way to jump between them in a 1134-item list; ~45 tab stops to card one. Focus rings, live region and link names are correct.

Ms. Dhillon (counsellor): can share a filtered URL but there is no deadline dimension to encode, so her link is "all 153 Calgary awards"; no print view, no compact table.

## Minor Observations

- All 1134 cards ship in the HTML, not just the visible 24. Correct for no-JS and crawlers, heavy on rural LTE; measure wire bytes.
- Tap targets clean: every chip exactly 44px tall; the four sub-44 hits were non-interactive count spans. No horizontal page overflow at 375px.
- Empty state gives the wrong advice when only a search term is set.
- "Hide filters" persists in localStorage forever; its caret points left to mean collapse.
- "DUE SEP 20" omits the year, ambiguous on a 2027 cycle.
- Search placeholder describes the mechanism; "Try 'nursing' or 'Lethbridge'" would teach the index.

## Questions to Consider

1. If the first screen could show one number, why is it not "41 closing this week"?
2. What if the 42 chips lived behind a single Filter control, and the head asked one question with four answers?
3. Why does Apply, the loudest action on the card, send a student away from the only page that proves the listing is real?
