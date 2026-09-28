# Contact intake receipts

Canonical scope: [Linear CRE-2148](https://linear.app/createsomething/issue/CRE-2148).
Execution/review: [create-something CRE-105](http://127.0.0.1:3101/CRE/issues/CRE-105).

This candidate is source-only. Independent review and coordinator promotion are required.

## Contract and uncertainty

The Promise HTTP boundary still returns `{success, message}`. Additive fields are
`requestId` and `receipt` (`saved`, `unknown`, `conflict`). Send a stable opaque
`Idempotency-Key` header (16–128 ASCII letters, digits, `_`, `-`) for one logical
inquiry. Missing headers retain legacy compatibility using a fresh UUID: legacy
callers **cannot deduplicate a lost response**. No receipt lookup endpoint exposes
inquiry data. The hash covers the validated, defaulted input and is not authentication.

- 200 / success: both provider acceptance IDs were read back from durable receipts.
  Acceptance is not proof of delivery.
- 202 / false: inquiry saved, email outcomes incomplete. Exact message:
  “Your inquiry is saved, but email confirmation is not complete. Please do not submit it again.”
- 503 / false: database receipt unknown. Exact message:
  “We could not confirm receipt. Please keep this request open and do not start a new submission.”
- 409 / false: same ID, different payload; no side effects.
- 400 / false: validation failed before side effects.

The browser helper freezes the first request body across in-page retries and stores
only its ID in sessionStorage. It clears that ID only on confirmed success or 400.
Non-2xx JSON and transport failures retain the ID. On reload, content is deliberately
not restored; changed fields or attribution can produce a safe 409, requiring
operator reconciliation. Blocked browser storage limits persistence to the current
page. New tabs, cleared storage, and legacy clients can still create new logical IDs.
The UI owner must preserve this helper and render the server message when merging
concurrent contact-page layout changes. No visual redesign is included here.

Effect v3 coordinates explicit repository and mailer services behind `lib/server`.
Database operations have a five-second acknowledgement deadline. Provider fetch and
body decoding share a ten-second abort deadline. There are no automatic retries.
A timed-out promise may still commit: a timeout is never evidence of rollback.

The atomic D1 batch inserts the request receipt, inquiry and two email receipts.
Only the execution owning the random token may claim pending email rows. Only an
acknowledged single-row claim authorizes a send. Duplicates read state and do not
claim or dispatch. Interrupted claims/sends are never reclaimed. Provider keys
`contact/<requestId>/<kind>` add correlation/idempotency defense; database receipts
remain the authority beyond provider key retention. A 429 is an explicit transient
rejection; selected validation/auth 4xx are permanent. Ambiguous errors, malformed
success, response loss and 5xx remain unknown. No retry follows any class.

Assessment conversion and analytics are secondary, attempted only by the original
acknowledged creator. Their completed/failed outcome is logged with the opaque ID;
failures do not erase the inquiry or trigger replay. Their individual internal
operations are not transactional or automatically reconciled by this slice.

## Contact-only migration promotion

`migrations/0058_contact_request_receipts.sql` is additive and independent of the
unapplied Abundance 0048–0054 backlog. Coordinator reports 0056/0057 already applied.
Do not run the full package migration queue. The owning coordinator must first
verify the final promotion tree has no filename collision, remote account/database,
legacy contact schema (including assessment_id), exact receipt schema and ledger,
and retain backup/Time Travel and deployment rollback evidence.

Use the existing [reviewed rollout plan](http://127.0.0.1:3101/CRE/issues/CRE-105#document-plan)
with the exact candidate SQL. Copy only this filename into an isolated `contact-only`
directory; verify matching SHA-256. A scratch Wrangler config must use the original
`d1_migrations` ledger and production database ID
`a74e70ae-6a94-43da-905e-b90719c8dfd2`, database name `create-something-db`.
List migrations using that config; the preview must contain exactly this migration.
Only the coordinator may apply remotely after review. Read back ledger and schema,
then confirm the unrelated pending set is unchanged using the full config.

Schema must precede app rollout. Missing receipt tables fail closed before email.
`IF NOT EXISTS` does not validate an existing incompatible schema. Compare table
SQL, table_info and foreign keys with the candidate. The accepted-state constraint
also rejects an empty provider ID (stronger than the initial design document).

Rollback preserves receipt tables. Do not drop receipts, restore the entire shared
D1 database, or re-enable the legacy sender for unresolved submissions. Disable
intake or retain a reviewed receipt-aware handler during app rollback.

## Operator reconciliation (no blind resend)

Use the request ID supplied by the caller/log; do not collect inquiry content in
logs or tickets. Read primary D1 through a fresh `withSession('first-primary')` or
an authorized primary administrative query:

```sql
SELECT request_id, submission_id, created_at
FROM contact_request_receipts WHERE request_id = ?;
SELECT kind, state, provider_id, updated_at
FROM contact_email_receipts WHERE request_id = ?;
```

A duplicate POST with the identical normalized input performs the same receipt
read and returns the truthful current message without sending. Missing readback
after an interrupted write remains unknown. `pending` after uncertain create and
`sending` after interrupted claim/send are held for operator review, not leases.

For an accepted provider ID, use authorized provider readback to verify acceptance
and correct request/kind correlation. For missing IDs, inspect provider-side
correlation/idempotency evidence. Only verified acceptance supports an audited,
conditional repair to `accepted` with that provider ID under a separate approved
operator action. Preserve the original evidence. Missing provider evidence does
not prove rejection and never authorizes replay. This candidate supplies no
unauthenticated repair endpoint or automatic reconciliation writer.

## Local verification

`pnpm --filter @create-something/agency test:contact` covers state-machine failure
classes, real timeout, interrupted provider cleanup, browser messages and retained
IDs, HTTP contract/legacy limit, SQLite batch rollback/claims and workerd D1
concurrent execution. All provider calls use fakes and `example.invalid` fixtures.
Wrangler's pinned Miniflare owns the workerd fixture and is disposed after testing.
Tests run as part of Agency `check`.

The SQLite fixture verifies legacy inserts still work and the legacy table definition
is unchanged. A separate local Wrangler rehearsal uses the same migration basename
and ledger in an isolated database: the first apply succeeds and the second reports
no migrations. These are local proofs, not production schema, provider delivery,
or live UI acceptance.

Primary references: [Effect v3 expected errors](https://effect.website/docs/v3/error-management/expected-errors),
[D1 sessions](https://developers.cloudflare.com/d1/best-practices/read-replication/),
[Resend send email](https://resend.com/docs/api-reference/emails/send-email).


## Candidate verification — 2026-09-28

Preserved and completed the coordinator's uncommitted contact candidate without
resetting or rebasing. The HTTP request abort signal now interrupts Effect;
interrupted database writes may still commit, and receipts prevent dispatch on
subsequent duplicate reconciliation.

- Bootstrap completed with the pinned Node 22.21.1 / pnpm 9.15.0 runtime. The
  runner's Bash startup resets PATH; initialize the pinned runtime after startup
  when invoking the bootstrap script. Initial overlapping preparation failed;
  the subsequent sequential Agency check rebuilt the package dependencies.
- `pnpm --filter @create-something/agency check`: exit 0; `svelte-check found 0
  errors and 0 warnings`; 161 tests across its test subprocesses, zero failures.
- Included contact test output: `tests 29`, `pass 29`, `fail 0`, `cancelled 0`,
  `skipped 0`. Covers local workerd D1 batch rollback/concurrent ownership,
  persistent duplicate reads, permanent/transient/unknown provider outcomes,
  lost acknowledgements, true database timeout, interrupted late database commit,
  HTTP cancellation, partial-send HTTP messaging, and browser ID retention.
- `pnpm --filter @create-something/agency build`: exit 0; Vite `built in 25.67s`,
  Cloudflare adapter `done`. Build emits existing size/Browserslist warnings.
- Local-only Wrangler 4.103.0 apply of the isolated 0058 migration: exit 0;
  second apply: exit 0, `No migrations to apply!`.
- `git diff --check`: clean. No live email, remote D1 mutation, push, merge,
  deployment, charge, or production inquiry.

Direct Linear access remains unavailable; implementation used the coordinator's
explicit canonical issue summary supplied on create-something CRE-105. Paperclip
comment writes in this runner returned 403 `cross_issue_influence_run_context_required`
despite the injected run ID header; coordinator/runtime reconciliation is needed
if the final handoff cannot be posted.

Review/promotion owner: coordinator/local-board and its independent source reviewer.
Reconcile the contact page with UI PR #1796 while preserving the request helper.
Review the contact-only schema gate above before any production application.
Worktree disposition: preserved at
`/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-2148-agent-worktree`
on `codex/CRE-2148-agent-worktree` for independent review.
