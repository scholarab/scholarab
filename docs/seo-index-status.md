# Per-URL index status (`npm run index-status`)

Asks the Search Console URL Inspection API what Google actually has, for every
URL in `public/sitemap.xml`, and writes the answer to `private/index-status/`.

The Page Indexing report gives counts per reason but not the URLs behind them.
On 2026-08-28 that mattered: it reported 90 pages "Excluded by 'noindex' tag"
while the built site served a noindex on only 8, so ~82 were stale crawls of
listings that had since rolled to the next cycle. This script answers that
directly instead of reconciling two reports by hand.

The output worth acting on is `<date>-request-queue.txt`: sitemap URLs whose
verdict is not PASS, never-crawled first. That is the order to spend the ~10
per day of manual Request Indexing submissions in.

## One-time setup

The API needs a Google Cloud service account that Search Console trusts.

1. **Google Cloud console** -> create a project (any name).
2. **APIs & Services -> Library** -> enable **Google Search Console API**.
3. **APIs & Services -> Credentials -> Create credentials -> Service account**.
   No roles are needed; project roles are not what grants Search Console access.
4. On the new service account -> **Keys -> Add key -> Create new key -> JSON**.
   Save the download as `private/gsc-service-account.json`.
5. **Search Console -> Settings -> Users and permissions -> Add user**. Paste
   the service account's email (`...@....iam.gserviceaccount.com`) and set
   permission to **Owner**.

Step 5 is the one that goes wrong. URL Inspection requires an owner; "Full"
permission returns 403 with a message that does not say so. If Search Console
will not let you add an owner from that screen, use **Settings -> Ownership
verification -> delegate ownership**.

`private/` is gitignored. The key grants write access to the property,
including Removals, so it must never be committed or pasted anywhere. If it
leaks, delete the key in the Cloud console; that revokes it immediately.

## Running it

```
npm run sitemap          # public/sitemap.xml is generated, not committed
npm run index-status
npm run index-status -- --limit 20    # smoke test, spends 20 of the daily 2000
```

Quotas are 2,000 inspections per day and 600 per minute per property. The
sitemap is ~312 URLs, so a full run costs about a sixth of a day's quota and
takes a couple of minutes at the concurrency the script uses.

## Reading the result

`verdict: PASS` means Google has the page. Everything else is a page we
submitted and Google is not serving, with `coverageState` giving the same
wording as the Page Indexing report ("Submitted and indexed", "Crawled -
currently not indexed", "Discovered - currently not indexed", ...).

`lastCrawlTime` is the field the reports hide and the one that settles stale-vs-
real: a noindex verdict last crawled months ago is a page Google has not
re-examined, not a page that is still noindexed today.

## Weekly runs

A launchd agent runs it Mondays at 9am and appends to
`private/index-status/weekly.log`:

```
~/Library/LaunchAgents/ca.scholarab.index-status.plist -> scripts/index-status-weekly.sh
```

launchd runs a missed calendar job when the machine next wakes, so a laptop
asleep on Monday morning still gets its run. To stop it:

```
launchctl unload ~/Library/LaunchAgents/ca.scholarab.index-status.plist
```

Every run after the first prints a `SINCE <date>` block: the URLs whose
coverage state changed since the previous snapshot, and counts of URLs that
entered or left the sitemap. That block is the point of running it weekly --
it is what answers "did the Validate Fix move anything", which a single
snapshot cannot.

## Click-through check (`npm run gsc-ctr`), September 30, 2026

`npm run gsc-ctr -- <before> <after>` pulls two windows the same way and prints
totals, CTR by position band (query x page rows), CTR by page type (page rows,
which keep the searches Google anonymises), and paired queries: the same
searches at positions 5 to 10 in both windows. The Rutherford guide is left
out of the band and paired figures (see its entry in `src/lib/guides.ts`).
Output goes to `private/seo-ctr/`.

Result for 2026-07-20..08-16 (before the August snippet rewrites) against
2026-08-31..09-27:

| | Before | After |
| --- | --- | --- |
| All searches | 1.62% (169 / 10,433) | 1.69% (762 / 45,214) |
| Listings (page rows) | 1.71% (87 / 5,073) | 1.93% (454 / 23,515) |
| Hubs, no snippet change (control) | 2.10% (49 / 2,333) | 2.23% (166 / 7,448) |
| Positions 5 to 7 (query x page) | 2.12% (10 / 472) | 0.64% (14 / 2,195) |
| Positions 8 to 10 (query x page) | 1.58% (4 / 253) | 0.75% (21 / 2,806) |
| Paired queries at 5 to 10 (39) | 1.66% (9 / 541) | 0.41% (6 / 1,480) |

Reading: the September growth is ranking, not snippets. Weekly clicks went
from about 50 to 190 to 240 and average position from about 11 to 7. The
same 39 searches drew nearly three times the impressions and no more clicks,
which a snippet change cannot explain; a larger share of AI Overview
impressions can. Band and paired figures rest on 4 to 21 clicks a side, too few
to call a snippet effect either way. Listings rose slightly faster than the
control, which is the most the data supports.

What a live check found (2026-09-30): for "rbc ignite scholarship" Google
shows our meta description as written. For "persons case scholarship" our
page appears as an AI Overview source whose text is the header menu from an
old crawl ("Scholarships 971 Programs 117 Match Saved About"). The header and
footer now sit inside `data-nosnippet`, which Google honours for snippets and
AI features; links are still crawled. Query-level rows cover only 20 to 30% of
impressions on this property (the rest are anonymised), so read the band
figures as a sample.

The query x page API rows are not the Performance report's CSV export: the
2026-08-19 export read 1.38% at 5 to 7; the API reads 1.64% for the same
window with the guide in. Compare windows pulled the same way, never an
export against this script.
