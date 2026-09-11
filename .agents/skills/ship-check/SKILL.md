---
name: ship-check
description: Decide what verification a ScholarAB change needs before committing. Use when finishing an edit, asking "is this ready to commit/push", or after touching src/data JSON, src/pages, scripts, or drizzle migrations.
---

Run from anywhere in the repo:

```
npm run ship-check -- <base-ref>
```

Report its CHANGED / PASS / FAIL / RUN lines without re-deriving the checklist.
Then run exactly the commands it printed under RUN, nothing more, and fix any FAIL.

Notes:
- Omit `<base-ref>` for uncommitted changes; use `origin/main` to include branch commits.
- Public pages and the legacy quiz use the JSON snapshot. Verify the built site; admin drafts are separate.
- `npm run ci` is shared with GitHub Actions; do not maintain a second list of its checks.
- Before shipping a reduction, record removal candidates, restored requirements, repair attempts, and before/after evidence in `docs/simplification.md`.
- Finish by committing and pushing.
