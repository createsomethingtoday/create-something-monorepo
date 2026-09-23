# Map product operations

Owner: Micah Johnson
Linear control issues: CRE-1286, CRE-1287, CRE-1288, CRE-1289

## Product boundary

`/map` is a credential-free acquisition canvas. Its working draft stays in the visitor's browser and may call only the constrained public mapping-agent endpoint. It is not customer system-of-record storage.

`/map/workspace` is the authenticated customer product. A customer must explicitly create a map or paste an exported public draft. Every server operation is scoped by first-party auth subject, account ID, tenant ID, and workspace account ID. A cross-account miss is returned as not found; the service never reveals whether another tenant owns the identifier.

The durable workflow definition is `customer_maps` plus immutable `customer_map_versions`. Review events, approved-version shares, and Map-to-Build handoffs are separate append-only artifacts. Routes do not issue unscoped SQL.

## Limits, retention, recovery, and privacy

- Active limit: 100 maps per workspace and 500 immutable versions per map. The service fails closed at the limit instead of silently deleting history.
- Active maps and versions have no automatic expiry. Customer canvas JSON remains in D1 and must not contain credentials or private production records.
- Archive is a soft delete with a 30-day recovery window. It immediately revokes active public shares. Only the same account/tenant/workspace may recover the map.
- After the recovery window, an operator may permanently purge the archived map under an approved customer-data deletion request. D1 foreign keys remove dependent versions, review events, shares, and handoffs. Take a verified D1 backup before a bulk purge.
- Public share tokens are random, stored only as SHA-256 digests, shown once, read-only, pinned to one approved version, and independently revocable. A share does not expose account or tenant identifiers.
- Logs and synthetic receipts record IDs, counts, states, and durations; they do not record canvas JSON, email addresses, credentials, share tokens, booking submissions, or customer prompts.

## Customer workflow and support

1. Sign in through CREATE SOMETHING Identity and open `/map/workspace`.
2. Create a blank map or explicitly import public canvas JSON.
3. Save changes as immutable versions. A stale version returns a conflict and must be reconciled rather than overwritten.
4. Compare versions, request review, and record the review note. Only `in_review` may become `approved` or `changes_requested`.
5. Approved versions may be shared, exported, or prepared as a hosted Map-to-Build handoff. A subsequent edit returns the map to `draft`; old artifacts remain pinned to their recorded version.
6. Archive from the map. Recover from the workspace archive list within 30 days.

Support triage order follows Database / Automation / Judgment:

1. Database: confirm the canonical entitlement and scoped map/version rows exist; do not copy customer JSON into tickets.
2. Automation: inspect the route status, conflict code, webhook receipt, or synthetic receipt.
3. Judgment: confirm review transition, share approval, commercial approval, and requested recovery/deletion policy.

For an isolation report, capture only map ID, requesting account/workspace IDs, HTTP status, timestamp, and source SHA. Never paste another tenant's row or share token into Linear.

## SLOs and production synthetic

The machine-readable policy is `packages/agency/scripts/lib/map-monitor-policy.mjs`. The Cloudflare Worker at `packages/agency/workers/map-production-monitor` runs at `7,22,37,52 * * * *` (every 15 minutes) at desktop and mobile viewports. It is scheduled-only: its public `GET /health` endpoint reports only lane readiness and never runs a synthetic.

| SLO | Target | Window | Measurement |
| --- | ---: | ---: | --- |
| Public Map availability | 99.9% | 30 days | `/map` returns 200 and the public canvas renders without document overflow |
| Booking-context consistency | 100% | 30 days | visible redacted Map reference/readiness/score match the booking URL after starter, edit, restore, and reset |
| Mapping-agent boundary | 100% | 30 days | GET remains non-mutating and malformed POST is rejected before execution/storage |

The synthetic uses a labeled browser-local draft, never supplies an email, never asks the agent to mutate, never submits a booking, and never touches customer workspace data. Each scheduled run writes a complete, sanitized desktop/mobile receipt to the shared `create-something-db` D1 table `map_production_monitor_receipts` for 30 days. A receipt contains only the scheduled/completed times, exact deployed source SHA, Worker version, base URL, check codes, and durations. It never stores browser exception text, screenshots, canvas JSON, URLs containing booking context, or customer data.

The Cloudflare receipt is the canonical burn-in evidence. A failed, incomplete, malformed, or wrong-SHA receipt invalidates its entire America/Chicago calendar day; a later green receipt on that day is diagnostic only and cannot revive the streak. The public-distribution terminal verifier reads D1 directly and independently requires the Worker health lane to report `ready`. It does not treat a GitHub Actions artifact as Map burn-in evidence.

After the normal PR review and merge, deploy only from a clean `main` exactly equal to `origin/main`:

1. Apply the reviewed remote D1 migration: `pnpm --filter @create-something/map-production-monitor db:migrate`.
2. Compile and validate the exact-source deployment without upload: `pnpm --filter @create-something/map-production-monitor deploy:dry-run`.
3. Deploy with the same guarded command: `pnpm --filter @create-something/map-production-monitor deploy`.
4. Read `https://map-production-monitor.createsomething.workers.dev/health`; it must return a non-cacheable `ready` receipt lane. Do not add a manual execution route.
5. Record the D1 receipt and Worker version in CRE-1289; only one complete green scheduled receipt per America/Chicago calendar day counts toward the seven-day GA streak.

Run the guarded deploy through Infisical so the existing production `RESEND_API_KEY` is attached only to that Worker version; the command creates a mode-0600 temporary secrets file, passes it with Wrangler's version-scoped secret mechanism, verifies the installed secret name without reading its value, and removes the file. The deploy command refuses a dirty or stale checkout, an absent receipt or alert table, or a missing alert credential, and injects the exact final main SHA as `MAP_MONITOR_SOURCE_SHA`. It does not apply D1 migrations, use `--commit-dirty`, or spend money by changing a Cloudflare plan.

Two consecutive scheduled failures create one D1-idempotent CRE-1289 operator escalation and send it through the Cloudflare Worker to the existing operator email destination. A pending delivery is retried on every later scheduled invocation, including a green synthetic receipt; a `delivering` claim has a ten-minute lease and is reclaimed after an interruption. A unique claim token fences completion or failure updates to the current owner, and undelivered records are retained until delivery succeeds. A pending or delivering record blocks terminal GA. The record has `pending`, `delivering`, or `delivered` state and never contains browser exception text, booking context, or customer data. Severity and sanitized failed-check codes aggregate the unbroken failure streak: any booking-context mismatch is SEV-2; availability-only failure is SEV-3. Receipt `completedAt` is captured after the browser work finishes.

Incident response:

1. Read the failed D1 receipt and identify the first sanitized failed check code; do not recover browser exception text from logs into a ticket.
2. Re-run only through the scheduled production lane or a separately approved diagnostic environment, then compare the deployed Worker source SHA with the intended merge SHA.
3. For booking mismatch, disable the public booking CTA or roll back the deployment; do not leave a stale-context handoff live.
4. For customer workspace isolation or authorization failure, disable the workspace route at the edge and preserve D1/read logs. Do not mutate customer rows during diagnosis.
5. For mapping-agent boundary failure, disable the agent endpoint/config while preserving the local canvas.
6. Post exact command, receipt, deploy ID, decision, and rollback/readback evidence to CRE-1289.

## Commercial launch gate

Map checkout is enabled only when all of these are true:

- `MAP_COMMERCIAL_LAUNCH_APPROVED=true` is recorded through the owning configuration path after explicit approval in CRE-1288;
- Stripe secret and webhook signing configuration are present;
- both approved `STRIPE_PRICE_MAP_MONTHLY` and `STRIPE_PRICE_MAP_YEARLY` values are present;
- the webhook endpoint and `agency_map_entitlements` migration are deployed and test-mode lifecycle evidence passes.

Price configuration alone cannot activate checkout. `/map/subscribe` visibly reports the closed gate until the approval artifact and all configuration are present. Do not add live products/prices, reveal values, charge a card, or set the approval flag without explicit commercial approval.

Checkout requires a signed-in first-party identity. Account, tenant, workspace, auth subject, and normalized email are copied into both Checkout Session and Subscription metadata so signed webhooks can reconcile the exact customer workspace. Active/trialing subscriptions grant access. Payment failure and cancellation fail closed. The subscription page is identity-only so a signed-in customer can buy before entitlement exists; the workspace requires active entitlement once commercial launch is approved.

Before approval, validate only with unit/contract tests and Stripe test-mode fixtures. After approval:

1. Record approved monthly/yearly price IDs, tax category, invoice descriptor, refund posture, support owner, and rollback decision in CRE-1288.
2. Apply D1 migrations and configure secret names without printing values.
3. Run test-mode monthly and yearly checkout, signed webhook replay, active entitlement, failed-invoice suspension, recovery, and cancellation.
4. Promote through PR/merge/deploy, then verify `/map/subscribe`, `/api/map/health`, and a no-charge live checkout-page readback. Do not submit payment data during verification.

Rollback: set `MAP_COMMERCIAL_LAUNCH_APPROVED=false` first, verify `/api/map/health` reports `fail_closed`, preserve webhook processing for existing subscriptions, then roll back UI/code if needed. Never delete commercial or webhook receipts as a rollback mechanism.
