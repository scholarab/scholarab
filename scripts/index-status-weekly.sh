#!/bin/zsh
# Weekly index-status run, driven by the launchd agent
# ~/Library/LaunchAgents/ca.scholarab.index-status.plist.
#
# Regenerates the sitemap first: index-status inspects exactly the URLs in
# public/sitemap.xml, which is gitignored and built, so a stale one would
# silently inspect last month's corpus.
#
# Output is appended to private/index-status/weekly.log. The run itself writes
# the snapshot and the request queue next to it, and prints the diff against
# the previous week -- which is the line worth reading.
set -euo pipefail
cd /Users/admin/scholarab
export PATH="/usr/local/bin:$PATH"
{
  echo "=============================================================="
  echo "run: $(date '+%Y-%m-%d %H:%M %Z')"
  npm run sitemap
  # caffeinate -i: no idle sleep until the run ends. On 2026-09-14 the Mac
  # slept a few requests in, woke after the hour-long token had expired, and
  # 1,308 of 1,320 inspections came back 401. The script now renews its token
  # too; this keeps a sleep from stretching a run past the day it started.
  /usr/bin/caffeinate -i npm run index-status
} >> private/index-status/weekly.log 2>&1
