#!/bin/sh
# Decide which verification steps a ScholarAB change actually needs.
# Prints PASS / FAIL / RUN lines. Exit 1 if any FAIL.
set -eu
cd "$(git rev-parse --show-toplevel)" || exit 2

BASE_REF=${1:-HEAD}
git rev-parse --verify "$BASE_REF^{commit}" >/dev/null || exit 2
CHANGED=$(
  {
    git diff --name-only "$BASE_REF" --
    git ls-files --others --exclude-standard
  } | sort -u
)
FAILED=0

has() { printf '%s\n' "$CHANGED" | grep -Eq "$1"; }
fail() { printf 'FAIL %s\n' "$1"; FAILED=1; }

if [ -z "$CHANGED" ]; then
  printf 'PASS working tree clean, nothing to verify\n'
  exit 0
fi

printf 'CHANGED %s file(s)\n' "$(printf '%s\n' "$CHANGED" | wc -l | tr -d ' ')"

# ── data ─────────────────────────────────────────────────────────────────────
if has '^src/data/.*\.json$'; then
  if ! npx --no-install tsx .agents/skills/ship-check/scripts/slug-diff.ts "$BASE_REF"; then
    FAILED=1
  fi
fi

# ── code ─────────────────────────────────────────────────────────────────────
has '^(src/|scripts/|public/|e2e/|\.github/workflows/|package(-lock)?\.json$|.*config\.[^/]+$|wrangler\.toml$)' && printf 'RUN npm run ci\n'
has '^(src/(pages|components|layouts|styles|lib)/|src/data/|public/|e2e/|package(-lock)?\.json$|astro\.config\.|playwright\.config\.|wrangler\.toml$)' && printf 'RUN npm run test:e2e\n'

# ── things easy to forget ────────────────────────────────────────────────────
has '^drizzle/.*\.sql$' && printf 'MANUAL review migration scope and rollback before any live database change\n'
has '^outreach/.*\.csv$' && fail 'outreach contact CSV is staged, never commit it'

printf 'MANUAL commit and push when green (repo rule: never leave work uncommitted)\n'
exit "$FAILED"
