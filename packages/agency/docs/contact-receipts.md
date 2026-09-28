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
only its ID in sessionStorage. It clears that ID only on confirmed success. HTTP
400 clears the frozen body so fields can be corrected, but preserves the ID in
memory and sessionStorage: a validation rejection after reload does not prove
that an earlier valid request was never saved. All non-success JSON and transport
failures retain the ID. On reload, content is deliberately
not restored; changed fields or attribution can produce a safe 409, requiring
operator reconciliation. Blocked browser storage limits persistence to the current
page. New tabs, cleared storage, and legacy clients can still create new logical IDs.
The UI owner must preserve this helper and render the server message when merging
concurrent contact-page layout changes. No visual redesign is included here.

Effect v3 coordinates explicit repository and mailer services behind `lib/server`.
Database operations have a five-second acknowledgement deadline. Provider fetch and
body decoding share a ten-second abort deadline. There are no automatic retries.
A timed-out promise may still commit: a timeout is never evidence of rollback.

The atomic D1 batch inserts the inquiry first, omitting its database-owned integer
`id`, then inserts the request receipt using `last_insert_rowid()` before the two
email receipts. Production uses `INTEGER PRIMARY KEY AUTOINCREMENT`; the repository's
older `db/admin-schema.sql` text-ID definition is not production-faithful. The
receipt's `submission_id` is an integer foreign key to the generated inquiry ID.
A uniqueness failure on the request receipt rolls back the inquiry too. Do not
split these statements into separate calls or place another insert between the
inquiry and request receipt. The coordinator must include triggers in schema
preflight; the current fixture mirrors the supplied primary table definition.
Only the execution owning the random token may claim pending email rows. Only an
acknowledged single-row claim authorizes a send. Duplicates read state and do not
claim or dispatch. Interrupted claims/sends are never reclaimed. Provider keys
`contact/<requestId>/<kind>` add correlation/idempotency defense; database receipts
remain the authority beyond the provider's 24-hour key retention window. A 429 is an explicit transient
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
legacy contact schema (including integer autoincrement id and assessment_id),
exact receipt schema, triggers and ledger,
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
also rejects an empty provider ID. This candidate supersedes the initial plan's
TEXT submission_id with INTEGER plus a foreign key. Never apply over the prior
candidate's TEXT receipt table merely because IF NOT EXISTS succeeds: stop and
reconcile schema first. This migration has not been applied to production.

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
IDs, HTTP contract/legacy limit, workerd D1 batch rollback/claims and concurrent
execution. Route fixtures use the same pinned Miniflare D1 runtime on Node 20
and Node 24; no node:sqlite import or version-based test skip is required. All provider calls use fakes and `example.invalid` fixtures.
Wrangler's pinned Miniflare owns the workerd fixture and is disposed after testing.
Tests run as part of Agency `check`.

The local D1 fixture verifies legacy inserts still work and the legacy table definition
is unchanged. A separate local Wrangler rehearsal uses the same migration basename
and ledger in an isolated database: the first apply succeeds and the second reports
no migrations. These are local proofs, not production schema, provider delivery,
or live UI acceptance.

Primary references: [Effect v3 expected errors](https://effect.website/docs/v3/error-management/expected-errors),
[D1 sessions](https://developers.cloudflare.com/d1/best-practices/read-replication/),
[Resend send email](https://resend.com/docs/api-reference/emails/send-email),
[Resend 24-hour idempotency window](https://resend.com/changelog/idempotency-keys),
[D1 atomic batch](https://developers.cloudflare.com/d1/worker-api/d1-database/),
and [SQLite last insert rowid](https://www.sqlite.org/c3ref/last_insert_rowid.html).


## Initial candidate verification — 2026-09-28 (superseded below)

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


## Production integer-ID correction — 2026-09-28

The coordinator's primary schema preflight invalidated the initial candidate's
UUID inquiry ID assumption. Do not promote `e8f21cad9d5c4d1294786a9ac0c3be4d3aa28a98`
without this correction. The source now lets the production autoincrement column
allocate the ID and captures it in the immediately following receipt insert within
the same D1 batch. Migration 0058 uses an INTEGER foreign key for that association.
No legacy table ALTER or backfill is required.

Both SQLite and workerd fixtures now load `test/contact-production-schema.sql`,
which mirrors the coordinator's schema-only readback including default status and
timestamps. Tests prove existing legacy rows/inserts, generated integer receipt
links, duplicate-batch rollback, same-ID ownership, and distinct concurrent batches
linking each receipt to the correct inquiry. No production records were queried.

Local Wrangler rehearsal initialized that production-schema fixture, applied only
0058, inserted a legacy caller row, and read back `id: 1`, `id_type: integer`,
`status: new`, the foreign key to `contact_submissions(id)`, and the exact 0058 ledger
entry. A second apply reported `No migrations to apply!`. All four commands exited
0 and used `--local` plus a run-scratch config/database; no remote migration ran.

Agency check passed again: 161 tests, zero failures, including 29 contact tests;
Svelte check reported zero errors and zero warnings. Agency build also exited 0
and the Cloudflare adapter completed successfully. The coordinator must reconcile this schema revision
with the initial Paperclip rollout plan before promotion. Preserve the unrelated
0048–0054 backlog and the contact page's request helper during UI integration.

## Validation-rejection identity correction — 2026-09-28

Independent review found that clearing a retained request ID on HTTP 400 could
create a second inquiry after a lost successful response and reload. The helper
now clears only the frozen body on 400; the request ID remains in memory and
sessionStorage. Only confirmed success clears that identity. This allows an
invalid first submission to be corrected without treating validation as proof
that all earlier requests under the ID failed.

Two route-backed SQLite regression cases reproduce the exact sequence: valid
submission committed, response lost, helper recreated using stored ID, invalid
5001-character message rejected, then valid correction. The original payload
must return 200 from its existing receipt; a changed valid payload must return
409. Both assert one inquiry, one request ID and exactly the original two provider
calls. Both failed before the correction because storage had been cleared.

Post-correction verification: Agency check exited 0 with 163 tests / zero failures;
contact output `tests 31 / pass 31 / fail 0 / skipped 0`; Svelte check zero errors
and zero warnings. Agency build exited 0 and the Cloudflare adapter completed.
No migration change, production query, live mail, deployment or promotion was
performed for this correction. Independent reviewer owns final source approval.


## Node 20 CI compatibility correction — 2026-09-28

Strict CI for PR #1798 used Node 20.20.2, where the earlier fixture's top-level
`node:sqlite` import failed before its tests could run. `contact-d1.test.ts` now
uses the Miniflare dependency owned by Agency's pinned Wrangler, matching the
existing workerd fixture. All D1 assertions use awaited binding calls; constraint
errors use rejected-promise assertions. Fixture setup and each test dispose the
runtime on failure or completion. No dependency or application behavior changed.

All 31 contact tests passed with zero skips on local Node 20.19.5 and Node 24.11.0.
The suite retains production integer-ID and schema preservation checks, duplicate
batch rollback, owner claims, interrupted requests, legacy caller behavior, and
both lost-response/reload/400 correction regressions. This is local verification;
the coordinator must re-run strict CI for the final SHA.

Full Agency check on Node 20.19.5 exited 0: 163 tests, zero failures; Svelte zero
errors and zero warnings. Agency build on that Node version also exited 0 with
the Cloudflare adapter complete. Bootstrap used the repository-pinned Node 22 /
pnpm runtime before verification. Existing workflow-only merge at `10f4170a1`
was preserved. Only the portable test fixture and these notes changed; no tests
were skipped or weakened. The engineer committed locally without pushing, per
the direct no-push instruction; coordinator owns CI rerun and promotion.
