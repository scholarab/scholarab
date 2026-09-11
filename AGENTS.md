# ScholarAB change rules

Keep public content, wording, design, layouts, fonts, and the legacy quiz intact unless the user explicitly changes that scope. JSON is the published catalogue authority; database drafts are separate. Never print, copy, or commit credentials. Preserve unrelated working-tree edits.

For each change, apply this order:

1. State the user outcome behind each affected requirement. Treat implementation choices as removable; keep constraints tied to student outcomes, publication correctness, privacy, or explicit user instructions.
2. Try removing the unnecessary part or process before improving it. Use an isolated experiment for uncertain removals. Restore anything whose removal fails a retained behavior. Record candidates, outcomes, and the add-back fraction in `docs/simplification.md`; the user's target is at least 10%. Do not invent failures, weaken tests, or delete public content to manufacture that number.
3. Record unsuccessful repair attempts against the same problem. After three, stop repeating the approach: remove the unnecessary part, replace it, or change the implementation. A failed optional service must not delete student content. Bound automatic retries and expose final failures.
4. Simplify what remains. Prefer one authoritative implementation over duplicate configuration, generated copies, or broad dependencies used for a single operation.
5. Measure cycle time or work avoided before and after; distinguish local measurements, projections, and hosted results. Do not call whitespace removal a performance improvement.
6. Automate only the process that survives these steps. Reuse `npm run ci` in local and hosted checks. Run `npm run ship-check -- origin/main` before shipping and complete its RUN instructions. Record evidence and limitations; do not claim a percentage reduction that was not measured.

Use the existing Search Console scripts and read `docs/seo-index-status.md` before that work. Keep privacy retention, subscription consent, and publication reconciliation intact. No new connector is required for these operations.
