---
name: ship-check
description: Decide what verification a ScholarAB change needs before committing. Use when finishing an edit, asking "is this ready to commit/push", or after touching src/data JSON, src/pages, scripts, or drizzle migrations.
---

Run from anywhere in the repo:

```
.Codex/skills/ship-check/scripts/ship-check.sh
```

Report its CHANGED / PASS / FAIL / RUN lines without re-deriving the checklist.
Then run exactly the commands it printed under RUN, nothing more, and fix any FAIL.

Notes:
- `npm run build` pins `DATABASE_URL=`; the dev server reads the DB and will disagree with the build. Trust the build.
- Finish by committing and pushing.
