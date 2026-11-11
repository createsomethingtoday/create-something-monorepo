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

### Chat recovery for a known run

An approved Skip Trace response with a validated receipt ID, run ID and original NPI in `pending` state is recoverable. The original dispatch action is consumed as `completed` (dispatch acknowledged, not provider completion), and its receipt is atomically checkpointed in owner-scoped conversation state with the conversation idle. It does not create the global ambiguous-paid-action hold. Unrelated paid tools still require normal approval and their own budget/readiness checks.

In that same conversation, send **Refresh Skip Trace** using the existing message composer. The POST API's existing `message` command checks owner and conversation version. The host loads the original consumed action for that owner/conversation, verifies its tool and original literal paid confirmation, and sends the stored arguments plus `reconcile_receipt: {id, run_id}`. This is a read of an already approved receipt, not a new paid approval. The provider transaction requires that exact cached digest/run/owner receipt to exist before any reservation or dispatch path; absent cache, changed registry identity or changed run fails without POST. No paid lease or new dispatch authorization is acquired for this read. Initial review expiry does not revoke the ability to read its already dispatched receipt.

A refresh can remain pending and be refreshed again; a confirmed terminal result closes the recovery state and reports source review requirements. A temporary provider transport failure retains the known receipt for another refresh. Unknown dispatch without a validated run, mismatched receipts, privacy/association failures and billing anomalies retain manual fail-closed handling. They cannot be cleared or redispatched by typing the refresh phrase. Existing `Refresh history` only reads stored history and does not poll Apify; the message explicitly names the composer command. One pending Skip Trace run per conversation is supported; reconcile it before requesting another Skip Trace lookup. Other paid tools may proceed under their existing approval gates.

Any failed account, run, permission PUT, permission readback or items reconciliation invalidates cached success: no contacts or Person Link, `charge_reconciled: false`, and a conservative full reservation. Known transport failures return `pending`; specific privacy, association and billing anomaly states remain specific. Fresh access and billing evidence must succeed before contacts can return, and stable terminal billing must be observed again before reducing the reservation.

The existing page/API source flow was reviewed: idle conversations enable the composer, pending receipt guidance appears as an assistant message, and the existing owner/version-checked message POST reaches the reconciliation path. No page/layout markup was changed. Rendered recovery text was not visually tested.

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

### GitHub review resolution evidence

Comments 4542804933 and 4542804944 were read directly. Failing-before regressions demonstrated `ambiguous` instead of recoverable `idle`, and cached `review_required` instead of unresolved `pending`. The runner/store regression uses real local D1 through Miniflare, verifies another approved PDL action can finish, rejects cross-owner refresh, and completes pending-to-terminal recovery. Unknown-dispatch tests preserve the global manual hold. Provider tests cover cached reconciled zero followed by a ten-cent read and permission failure, plus account/run/readback/items failures, conservative reservation and successful fresh recovery. Strict receipt tests reject cache misses, changed identity and missing paid confirmation; the actual workerd fake-upstream test exercises receipt-restricted readback and mismatch rejection. No review reply was posted.

### Conversation-limit recovery correction

Owner-scoped Refresh Skip Trace bypasses ordinary chat length limits after conversation ownership/version checks. It replaces same-receipt source/status entries; when needed it trims oldest conversation context to keep the stored refresh view bounded, with an explicit notice. The original approved action remains in D1. A regression begins with 60 messages and over 280,000 state characters, performs repeated pending refreshes then a terminal refresh, and verifies one receipt source, bounded history and successful recovery. Agency tests: 39/39 pass; this establishes synthetic runner/store behavior, not rendered UI or live provider behavior.

When the provider response chain is reset, the next ordinary message replays retained source evidence in a user-level data message explicitly labeled untrusted, alongside stored conversation text. Evidence never becomes a system/developer instruction or paid authorization. The refresh-follow-up regression verifies recovered contact evidence reaches the model without another tool dispatch.

Recovery additionally replaces any oversized stored source (>120,000 serialized characters, matching the provider response cap) with an explicit evidence-omitted placeholder. It trims to 259,000 before the short notice, reserving headroom below the 260,000 bound. The regression covers both oversized old source history and an oversized retained refresh result; receipt/action recovery remains anchored separately.

### Real transport and terminal billing recovery

Refresh initializes the actual MCP client/catalog before calling the existing receipt. Recovery remains available for known pending or terminal-but-unreconciled results, including immediately terminal initial dispatches, until `charge_reconciled` is explicitly true. Terminal-but-unsettled messages request another same-receipt read after at least 60 seconds. SDK HTTP transport regressions cover initialization, exact receipt arguments, and pending/immediately-terminal -> unsettled terminal -> reconciled terminal without another paid action. These use real createProviders/SDK transport against a fake upstream, not live provider calls.
