# Catalogue publishing and operational recovery

Public pages, saved IDs, quiz matching and reminders use the committed JSON catalogue. Admin edits live separately in `catalogue_entries.draft`; `published` is the last mirrored JSON snapshot. `(kind, public_id)` is the shared public identity. Legacy catalogue primary keys are historical IDs; their nullable `public_id` columns provide an explicit mapping. Eight historical scholarship rows have no current public counterpart and remain archived in the legacy table, not exposed through admin or public loaders.

## Editing and publishing

Admin search and pagination operate on the entire catalogue. Every update/delete requires the row revision. A conflict keeps the unsaved form visible. Edits—including deletions—remain drafts until **Review and publish**, followed by **Publish these changes**, queues their exact revisions. Later edits are not included in that request.

The **Publish admin drafts** workflow checks the queue every 15 minutes (GitHub schedules may run late), or can be started through GitHub's workflow-dispatch UI. It merges independent JSON changes, rejects conflicting field edits, generates rename/deletion redirects, validates and builds, commits, and pushes without force. It then verifies the request ID in the live `/publication.json` artifact. A commit or accepted deploy hook alone is never shown as “published.” Failed requests retain their drafts; correct the reported problem and queue again.

A publisher interrupted after push recovers by recognizing the committed manifest. Newer edits are retained during acknowledgement. The workflow's concurrency group prevents two publishers from running together; a concurrent regular main push rejects the publisher's push rather than being overwritten. The workflow uses the repository's existing `DATABASE_URL` secret and `GITHUB_TOKEN` with `contents: write`; no new provider credential is needed.

The previous deployment-hook endpoint has been replaced by this publication queue. `DEPLOY_HOOK_URL` is no longer required for admin publication. The existing Cloudflare Pages git integration remains responsible for deployments.

## Database setup and drift

On the existing database, run with DATABASE_URL loaded:

```sh
npm run migrate-db
npm run sync-db -- --dry-run
npm run sync-db
npm run migrate-db -- --check
```

Use `npm run migrate-db -- --bootstrap` only for an empty database. The bootstrap is a current baseline; it intentionally does not replay the incomplete historical 0000–0012 chain. Versions 0013 onward are tracked by filename/checksum, applied transactionally, and cannot be changed after application. Current checks also verify subscriber timestamp types and required runtime indexes. Historical audit/deploy/mutation logs are retained, not dropped or treated as current application tables.

`sync-db` validates both complete catalogue files before planning changes and updates published snapshots in one transaction. It preserves drafts and public-ID tombstones. `--prune` archives removed mirror snapshots, not drafts or legacy data. A large removal is rejected for separate review. `--dry-run --prune` performs reads only. `prune-events --dry-run` uses EXPLAIN without ANALYZE so even data-changing CTEs are planned but never executed; inputs are validated before any retention work.

Before deployment, a catalogue/schema backup was written outside the repository to `/Users/admin/.codex/backups/scholarab-2026-09-09/pre-audit-migration.json`. No subscriber email/token data was exported. The migration is additive; a code rollback leaves existing tables and IDs intact. To roll back the admin workflow, retain the new tables and queued requests until draft reconciliation; dropping them would lose unpublished work.

## Email delivery and recovery

Both confirmation paths share an atomic recipient claim: at most one attempt per 15 minutes and five per rolling 24-hour window. Failed attempts also consume recipient budget. Public resubmission does not alter an existing schedule; a change requires that subscription's token. Public responses do not expose confirmation state. Confirmation copy uses the selected cadence, not a hardcoded schedule.

Every email uses a durable delivery key. Concurrent attempts cannot claim the same delivery. Retries reuse the saved payload and provider idempotency key. Resend retains keys for 24 hours, so automatic retries stop after 23 hours when the outcome is ambiguous. See [Resend's idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

The sender runs every six hours to retry within that window; repeated milestone and catch-up runs are deduplicated. Messages remain serial to respect the existing small sending volume and provider limits. Recipient reads are batched. Routine logs use subscription IDs rather than email addresses. Unsubscribing cascades deletion of unsettled payloads; successful sends immediately erase payload content. Payloads remaining unresolved for 30 days are erased by retention, while deduplication tombstones remain until the subscription is removed.

An unresolved delivery older than 23 hours deliberately fails the sender job with a count. Inspect the corresponding provider record using its idempotency key before marking it sent or arranging another message. Do not delete the ledger row and blindly rerun. No real test emails were sent during implementation.

## Build and performance

Quiz data is generated before build/dev/type-check and emitted as a fingerprinted asset. It contains only matching/result fields; answers remain entirely in the browser. The page retries loading on failure. The generated source JSON is ignored by git.

OG rendering caches a hash of the render tree, font bytes and dependency lockfile. Only changed/missing images render; the CI/publisher workflows restore the previous image cache. The full catalogue validation and sitemap generation still run every build. Directory filtering compares visible DOM order before moving cards, and the shared Alberta calendar clock caches its expensive timezone calculation without carrying yesterday across midnight.

Analytics aggregates are sent in one database batch instead of nine sequential requests; obsolete internal-ID title lookups are removed. Counts distinguish confirmed subscriptions from those awaiting confirmation. At the current table size, full retained-history aggregates are inexpensive. Month-only APIs and new indexes were deferred until a query plan demonstrates a need.

## Matching catalogue foundation

Phase 1 adds `/admin/matching` for source review and draft previews. Matching fields are validated and saved through the same revisioned catalogue APIs. Every build creates `/matching/manifest.json` plus its content-addressed opportunity asset and verifies exact IDs, hashes, current quiz connections, and detail-page existence. The current public quiz does not load the new foundation asset yet. See [Phase 1 delivery](matching-phase-1.md) for commands, baseline, coverage, and evidence limitations.

CI also runs `npm run matching:audit-db` after sync. It performs read-only reconciliation of canonical published records, drafts/archives, and explicit historical mappings. Structural failures remain failures even during publication; expected version differences are labeled in-flight. The publisher verifies the live matching manifest as well as `/publication.json` before declaring completion.
