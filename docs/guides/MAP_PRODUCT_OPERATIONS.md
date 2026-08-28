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

The machine-readable policy is `packages/agency/scripts/lib/map-monitor-policy.mjs`. The scheduled workflow `.github/workflows/agency-map-production-monitor.yml` runs every 15 minutes at desktop and mobile viewports.

| SLO | Target | Window | Measurement |
| --- | ---: | ---: | --- |
| Public Map availability | 99.9% | 30 days | `/map` returns 200 and the public canvas renders without document overflow |
| Booking-context consistency | 100% | 30 days | visible redacted Map reference/readiness/score match the booking URL after starter, edit, restore, and reset |
| Mapping-agent boundary | 100% | 30 days | GET remains non-mutating and malformed POST is rejected before execution/storage |

The synthetic uses a labeled browser-local draft, never supplies an email, never asks the agent to mutate, never submits a booking, and never touches customer workspace data. Each run uploads desktop/mobile receipts for 30 days. The workflow failure is the first alert surface; two consecutive failures require CRE-1289 operator escalation. Booking-context mismatch is SEV-2; one isolated availability failure is SEV-3.

Incident response:

1. Open the failed workflow receipt and identify the first failed transition.
2. Re-run against the deployment URL and compare the deployment SHA with the intended merge SHA.
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
