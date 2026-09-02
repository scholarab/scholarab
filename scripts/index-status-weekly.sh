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
  npm run index-status
} >> private/index-status/weekly.log 2>&1
