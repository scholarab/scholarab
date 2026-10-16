# Catalogue publishing and operational recovery

Public pages, saved IDs, quiz matching and reminders use the committed JSON catalogue in `src/data/`. Git is the only way to edit it: change the JSON, run `npm run ci`, commit and push. Workers Builds deploys every push to main. `(kind, id)` is the public identity.

## Editing and publishing

The admin editor, its database drafts and the scheduled publisher were retired on 2026-10-15. Its one publication (2026-09-29) was the only one: from 2026-09-15 to 2026-10-15, 88 hand commits and 12 daily syncs changed the catalogue through git. `/admin` now shows analytics only. The tables it used (`catalogue_entries`, `publication_requests`, `parse_log`) and the legacy `scholarships` and `research_programs` tables are still in the database, unread, until a migration drops them. `PUBLICATION_SIGNING_KEY` and `ANTHROPIC_API_KEY` are no longer read by anything.

## Database setup and drift

On the existing database, run with DATABASE_URL loaded:

```sh
npm run migrate-db
npm run migrate-db -- --check
```

Use `npm run migrate-db -- --bootstrap` only for an empty database. The bootstrap is a current baseline; it intentionally does not replay the incomplete historical 0000–0012 chain. Versions 0013 onward are tracked by filename/checksum, applied transactionally, and cannot be changed after application. Current checks also verify subscriber timestamp types and required runtime indexes. Historical audit/deploy/mutation logs are retained, not dropped or treated as current application tables.

`prune-events --dry-run` uses EXPLAIN without ANALYZE so even data-changing CTEs are planned but never executed; inputs are validated before any retention work.

Before deployment, a catalogue/schema backup was written outside the repository to `/Users/admin/.codex/backups/scholarab-2026-09-09/pre-audit-migration.json`. No subscriber email/token data was exported. The migration is additive; a code rollback leaves existing tables and IDs intact.

## Email delivery and recovery

Both confirmation paths share an atomic recipient claim: at most one attempt per 15 minutes and five per rolling 24-hour window. Failed attempts also consume recipient budget. Public resubmission does not alter an existing schedule; a change requires that subscription's token. Public responses do not expose confirmation state. Confirmation copy uses the selected cadence, not a hardcoded schedule.

Every email uses a durable delivery key. Concurrent attempts cannot claim the same delivery. Retries reuse the saved payload and provider idempotency key. Resend retains keys for 24 hours, so automatic retries stop after 23 hours when the outcome is ambiguous. See [Resend's idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

The sender runs every six hours to retry within that window; repeated milestone and catch-up runs are deduplicated. Messages remain serial to respect the existing small sending volume and provider limits. Recipient reads are batched. Routine logs use subscription IDs rather than email addresses. Unsubscribing cascades deletion of unsettled payloads; successful sends immediately erase payload content. Payloads remaining unresolved for 30 days are erased by retention, while deduplication tombstones remain until the subscription is removed.

An unresolved delivery older than 23 hours deliberately fails the sender job with a count. Inspect the corresponding provider record using its idempotency key before marking it sent or arranging another message. Do not delete the ledger row and blindly rerun. No real test emails were sent during implementation.

## Build and performance

`scripts/generate-catalogue-payloads.ts` validates the committed JSON and generates two transport shapes before build/dev/type-check/tests. The legacy quiz payload contains only matching/result fields and is emitted as a fingerprinted asset; answers remain entirely in the browser and the page retries loading on failure. The runtime catalogue contains only public IDs, labels, availability and deadlines for reminders and admin analytics. Both generated source files are ignored by git; neither is an independently edited catalogue.

OG rendering caches a hash of the render tree, font bytes and dependency lockfile. Only changed/missing images render; the CI workflow restores the previous image cache. The full catalogue validation and sitemap generation still run every build. Directory filtering compares visible DOM order before moving cards, and the shared Alberta calendar clock caches its expensive timezone calculation without carrying yesterday across midnight.

Analytics aggregates are sent in one database batch instead of nine sequential requests; obsolete internal-ID title lookups are removed. Counts distinguish confirmed subscriptions from those awaiting confirmation. At the current table size, full retained-history aggregates are inexpensive. Month-only APIs and new indexes were deferred until a query plan demonstrates a need.

Google Analytics has one consent/page-view path, initialized by `astro:page-load` on both first load and navigation. Granting consent loads the tag once; declining or resetting a previous grant disables that loaded tag and updates consent to denied. Local browser checks intercept the tag and serve local assets under the allowed origin, without contacting production analytics or APIs.

Link checking retains eight concurrent hosts and serial requests with a 400 ms gap within each host. A free host slot now starts the next host immediately, without waiting for the slowest host in a fixed batch. URL deduplication, three network attempts, host exclusions and reports remain unchanged.

## Build verification

The legacy quiz is the only quiz. Its payload generator verifies every source identity and writes `public/publication.json`, a build output that is not committed: the complete JSON catalogue hash. IndexNow announces changed URLs only once the live deployment serves that hash. Browser tests reuse the validated build in CI.
