#!/bin/sh
# Decide which verification steps a ScholarAB change actually needs.
# Prints PASS / FAIL / RUN lines. Exit 1 if any FAIL.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

BASE_REF=${1:-HEAD}
CHANGED=$(
  {
    git diff --name-only "$BASE_REF" --
    git diff --name-only --cached "$BASE_REF" --
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
  printf 'RUN npm run validate-data   (data JSON changed; also checks _redirects)\n'
  if ! npx --no-install tsx .claude/skills/ship-check/scripts/slug-diff.ts "$BASE_REF"; then
    FAILED=1
  fi
fi

# ── code ─────────────────────────────────────────────────────────────────────
has '^src/.*\.(ts|tsx|astro)$' && printf 'RUN npm run lint && npm run type-check\n'
has '^scripts/.*\.ts$'         && printf 'RUN npm run type-check:scripts\n'
has '^(src|scripts)/'          && printf 'RUN npm test\n'
has '^src/pages/'              && printf 'RUN npm run build   (route added/changed; regenerates sitemap + OG)\n'
has '^public/_redirects$' && ! has '^src/data/.*\.json$' && printf 'RUN npm run validate-data   (_redirects changed)\n'

# ── things easy to forget ────────────────────────────────────────────────────
has '^drizzle/' && printf 'RUN apply the migration via the Neon driver (no psql on this machine)\n'
has '^outreach/.*\.csv$' && fail 'outreach contact CSV is staged, never commit it'

printf 'MANUAL commit and push when green (repo rule: never leave work uncommitted)\n'
exit "$FAILED"
