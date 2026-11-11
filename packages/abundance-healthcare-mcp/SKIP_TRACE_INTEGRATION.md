# Controlled Skip Trace enrichment — CRE-2412

`enrich_candidate_skip_trace` is an explicit optional paid provider, never PDL fallback. It accepts one existing nationwide registry NPI and literal `confirm_paid_enrichment: true`. The server resolves the registry first, middle and last name and practice city/state. It sends `name: ["Full Name; City, ST"]`, `max_results: 1`. Practice geography is not residence. Existing PDL and registry behavior remain independent. There is no outreach, CRM, registry write, query broadening or automatic second lookup.

## Server configuration

Parent provisions `APIFY_API_TOKEN` as a Worker secret after review; never put it in client configuration or vars. The token needs authenticated `users/me` account identity read, run/create/read/update and default dataset read/update access for this actor. Do not use a token without default storage access.

Set `APIFY_PRIVACY_DATASET_ID` to a harmless, owner-created **empty** dataset with `generalAccess: FOLLOW_USER_SETTING`. The integration reads authenticated `users/me`, requires exact bounded string account/sentinel/owner IDs, and requires sentinel owner to equal the authenticated account. Authenticated sentinel metadata must report zero items and `items?limit=0` must return an empty array. An unsigned anonymous request to that same items endpoint must return HTTP 403 JSON with Apify `error.type: insufficient-permissions` and the expected dataset-specific permission message. Generic denials, 401/404, missing resources, HTML, malformed bodies and network failures never authorize dispatch. The error contract is deliberately fail-closed: provider wording changes require review, not relaxing the check. Preflight failures release their unused reservation and can be retried after configuration is repaired. Creation and resumed receipts must carry bounded nonempty string run/dataset/owner IDs, with exact ownership and response association before URL construction or contact projection.

**The sentinel is a bounded access observation, not proof of absolute privacy or absence of grants.** Parent must configure that token owner's account General resource access to **Restricted**, allow at least a minute for propagation, and keep it restricted during execution. Disable **Share run data with developers**; review and remove unwanted explicit collaborator/Actor/task grants, and do not attach sensitive run URLs to public Actor issues (which can automatically grant creator access). Pre-signed URLs and explicit sharing can bypass general restrictions. The sentinel cannot enumerate or exclude these grants, and it cannot prove access settings on a future run. Account configuration and sharing review remain parent-owned release prerequisites; no authenticated account or real dataset was inspected in this implementation.

Apify documents that runs and default storage inherit account permissions. The integration does not rely on an undocumented `generalAccess` start query. After creation it restricts the run and dataset using supported PUTs and verifies authenticated GET metadata, exact IDs and owner before retrieving items. Such readback observes metadata; it does not eliminate provider propagation delay, revoke explicit grants or prevent an Actor from processing its input. Changing account/resource access can take up to a minute. Do not claim that the preflight or PUTs guarantee private-at-creation or exclusive access. Remote raw Actor storage still requires owner retention management.

Actor `vmf6h5lxPAkB1W2gT` is pinned to build `0.0.192`, max charge `$0.10`, timeout 120 seconds, `restartOnError=false`, `forcePermissionLevel=LIMITED_PERMISSIONS`. `APIFY_DAILY_BUDGET_USD` defaults to $1. Invalid/zero values fail closed. `SKIP_TRACE` is a singleton Durable Object shared across sessions. Its transactional reservations precede paid dispatch. Each network operation is bounded to 15 seconds; requests do not run polling loops.

## Recovery, billing and retention

Identical inputs reuse the same durable receipt indefinitely. Repeating them reconciles a known run using GET/permission PUTs only, including terminal cached results. A dispatch without a confirmed run ID remains `delivery_unknown`; it is never dispatched again automatically. Operator reconciliation is required; do not delete cache entries to force redispatch. Known pending transport failures remain pending and recover through the same input. Provider failed, aborted and timed-out statuses are separate from no-contact and identity-review results. Durable leases serialize polls, and lease ownership prevents stale pollers from replacing a newer terminal receipt.

Initial or changing charge receipts retain the full ten-cent reservation without expiry. Terminal billing is readback-reconciled only after the same valid nondecreasing charge is observed at least 60 seconds apart and charged event counts equal accounted event counts. Missing accounting evidence keeps the full reservation. This is provider-run readback reconciliation, not a guarantee of invoice finality. Every later invocation refreshes billing again. Negative, nonfinite, decreasing or over-cap charges withhold contacts and globally block new paid dispatches for operator reconciliation. Reconciled charges replace full reservations in the rolling 24-hour budget; an increased unsettled receipt upserts and restores the full reservation even after a prior zero-charge entry was pruned. Recreated or changed reservations use the current observation time, so a delayed charge cannot escape the rolling budget. Never reset billing state without reviewing provider receipts.

## Output policy

Dataset GETs use a field projection; local output is projected again. Local records contain only an internal digest/NPI, run/dataset/owner IDs, bounded receipt/billing/provenance fields, a validated HTTPS Person Link, allowlisted emails/normalized US phones and home city/state. No raw payload, DOB, street, postal, relatives or associates are stored. The integration does not log contacts or secrets.

Only the exact `Search Option: Name+CityStateZip Search` mode is eligible for contact projection. Absent, unknown, differently cased and fallback modes withhold contacts even when names and state match. It does not prove a match. Explicit `Name Match` fallback or unknown match flag, first/last mismatch, response association failure and duplicate rows withhold usable contacts. Different or missing home state requires review, not a claim of a different person. First/last and geography are preliminary triage only. Ownership and consent are unverified and readiness remains blocked. Phone Type/Last Reported/Provider metadata is not interpreted as mobile ownership or freshness; unrecognized phone text is omitted.

## Integration and validation

Hub authorization classifies the tool as a reviewed paid write, including read-only-mode denial. This branch stages additive Agency policy/paid allowlist, a distinct broker-scope approval preview, and unresolved-outcome handling. The captured V8 prompt/hash remain unchanged; Skip Trace instructions are a separate addendum. Existing candidate-evidence and explicit approval gates apply.

CRE-2409 owner Micah Johnson owns the active migration checkout `t3/npg-custom-chat`. It was inspected read-only and never modified. This branch updates its own copy of the tool-count regression to 13 with an explicit Skip Trace assertion. The migration checkout's uncommitted changes remain owner-controlled; merge-time conflicts must preserve both changes.

Validation commands use `npx --yes --package=pnpm@9.15.0 -c 'pnpm …'` where pnpm is unavailable globally:

- Package `test`, `typecheck`, `build`; Worker `typecheck`.
- Package `test:worker`: Wrangler dry-run bundles the actual Worker; Miniflare/workerd invokes the actual singleton Durable Object against a fake outbound service. It verifies preflight, real storage transactions, one POST under concurrency, persisted projection and budget enforcement. Installed workerd supports July 15, 2026, so this test uses that compatibility date. Production configuration remains September 2; Wrangler dry-run also validates that configuration. No live runtime or paid provider evidence is claimed.
- MCP tests invoke the actual registered tool through SDK Client/InMemoryTransport using synthetic pilot-shaped fields and full registry middle name. Provider tests cover positive projection/provenance, no contact, identity/state/fallback/association conflicts, duplicates, unknown phone metadata, missing secret/confirmation, global budget, concurrent dispatch/polls, stale-lease fencing, late/anomalous billing, privacy refusal/readback and uncertain-run recovery.
- mcp-authz tests verify reviewed write classification and denial in read-only mode.
- Agency `test:npg-analyst` includes the updated additive tool-count regression.

No paid requests, real pilot data, secret reads, deployment or merge were performed. Parent owns independent Sol review and promotion.

Rollback: remove exposure/allowlisting and unset APIFY_API_TOKEN. Preserve Durable Object receipts and unresolved reservations for reconciliation; do not delete them to trigger new paid calls. Existing PDL is independent.

Primary docs checked November 11, 2026:
- https://docs.apify.com/api/v2/actors-runs-post
- https://docs.apify.com/account/collaboration/general-resource-access
- https://docs.apify.com/integrations/api
- https://docs.apify.com/api/v2/actor-run-put
- https://apify.com/one-api/skip-trace/input-schema

## Independent review corrections

All four reported defects were reproduced as failing synthetic regressions before fixes: generic anonymous denial authorization, zero-charge reservation pruned then late charge, unknown search mode projecting contacts, and a missing dataset ID coerced through a regex. Added boundary matrices cover missing/nonstring/invalid/oversized provider IDs (including cached resume), exact sentinel identity/account owner, empty items and provider-specific denial bodies. No real contact data is used.
