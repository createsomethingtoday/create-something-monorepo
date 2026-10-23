# Goldin workflow coordination

Default-disabled coordination around an existing Notion operations system. Staff review booking observations; a transactional SQLite Durable Object coordinates one-payer rosters, approved versioned pricing, duration/buffer capacity holds, payments/refunds/disputes, verified production evidence and audited release eligibility. There is no customer-send, charge or gallery-release transport.

## Runtime and validation

Node>=24 is required for the offline SQLite harness; CI uses26.11.0. Local Cloudflare tests use Miniflare4.20260708.1 with explicitly pinned workerd1.20261022.1 at compatibility2026-10-22. There is no older-runtime fallback. Install locked dependencies with pnpm9.15.0, then run:

```sh
pnpm --filter @create-something/auth-platform build
pnpm --filter @create-something/tufte package
pnpm --filter @create-something/canon package
pnpm --filter @create-something/goldin-coordinator check
pnpm --filter @create-something/goldin-coordinator lint
pnpm --filter @create-something/goldin-coordinator test
pnpm --filter @create-something/goldin-coordinator test:runtime
```

The runtime script builds the Worker and generated owning/synthetic/production Pages artifacts before testing. The two standalone staff apps reuse the owning app's locked toolchain through an ignored node_modules symlink. There is no separate installer or deployment in these commands. CI has read-only repository permissions and a15min timeout.

See VALIDATION.md for the sanitized review receipt. Detailed hosted receipts and business decisions are retained privately, not in this public repository.

## Boundaries

The HTTP API verifies existing CREATE SOMETHING JWT signatures, issuer/audience, current session claims, token lifetime and explicit tenant/roles. Browser adapters verify HttpOnly cookies server-side, exact Origin/host and same-origin fetch metadata, reject redirects, bound request/response sizes and never return tokens. The production app uses the canonical login handler, with profile-gated staff email admission; no new identity provider or credential flow is introduced.

Production is off by default. It needs an explicitly approved profile with exact staff roles, named release reviewers, complete evidenced decisions, pricing catalog and Notion mapping. A production access lease is capped at24h and rechecked on requests/alarms; this does not expire the underlying Notion credential. PRODUCTION_ENABLED, PRODUCTION_PROFILE and the scoped production-only projection grant must agree. An incomplete profile or unapproved catalog blocks mutations. Health/status/stop remain available to appropriately authenticated operators when writes are disabled. Unknown environments fail closed.

The production staff app uses a private COORDINATOR_SERVICE binding and an IDENTITY_KEYS binding to the existing issuer; the coordinator need not have a public write endpoint. Backend only stores NOTION_API_TOKEN as an encrypted secret. Pages must not receive that credential. Configure approved origins and least-privilege bindings separately; no production resources/grants are provisioned by this source.

Notion projection requires live validation of five existing rich_text property IDs: source, payment, production, delivery and receipt. Production mode **updates only staff-linked existing canonical Sessions** and refuses creates at both adapter and transport layers. Missing/duplicate source match blocks; unrelated properties remain untouched. It does not infer or replace operational relation/formula/status schemas. Property allowlisting is an application boundary; Notion credential access is database/page scoped and can include other records in its authorized database.

All tests use fictional identities, destinations, credentials and business fixtures. The synthetic-only operator pin is intentionally fictional and must not be treated as a live staff grant. No supported native Pixieset event transport is established. The authenticated reviewed-intake envelope is explicitly an app-owned staff-observation format, not a Pixieset API/export contract.

## Operator contract

Commands include price, reviewed-intake, event, get, health, outbox, schema, drain, reconcile, retry_reset and dispatch_start/stop/status. Actor and tenant come only from verified server policy. Production refuses raw intake and catalog changes outside the approved profile. Existing booking snapshots/replay are preserved; a new booking rejects conflicting persisted price-version terms.

A price uses integer cents, USD, kind, version, min/max, deposit and unit. Default basis is per_person; fixed basis supports an approved one/two participant solo exception. Optional durationMinutes and before/after buffers are part of the immutable version. Shoot start/end include explicit offsets; buffers are separate and must not be counted twice. Current hold ceiling is15min. Resource suitability/availability is staff-reviewed; pooled assignment and external calendar ingestion are not implemented.

An outbox entry commits atomically with state. Known no-write failures retry within the attempt budget. Uncertain writes block later projections for that source until full-field reconciliation; never blindly replay them. Exhausted retries require explicit audited retry_reset approval. Health uses tenant SQL aggregates and exposes counts/attention without payloads. dispatch_stop invalidates old query chains and removes the alarm; an already issued external write may complete and needs reconciliation.

## Recovery and rollback

Stop dispatch, disable writes/access and retain receipts before rolling back code. Preserve DO storage and schema migrations; a code rollback does not undo external Notion writes. Reconcile uncertain outcomes before restart. Do not delete booking records, media or audit trails as cleanup. Logs/Traces are enabled in Worker config; owner-approved alert routing, sampling, retention and credential rotation/revocation remain deployment prerequisites. No external alert destination is provisioned here.

`policy/production-profile.example.json` and `policy/production-proposal.json` are intentionally incomplete, inactive proposals. `node production-report.mjs` generates decision-support scenarios using explicitly invented costs and provisional prices; it cannot approve terms or enable production. Tax/fee treatment, cancellation/refund terms, live catalog, source access, privacy/consent and reviewer ownership require owner approval before live use.
