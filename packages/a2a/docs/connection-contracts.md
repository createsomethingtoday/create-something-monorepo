# A2A connection contracts — CRE-2431

Canonical identity is `a2a-inbox`; display names do not select an identity.
`src/connection.ts` owns contract and expected binding revisions. Expected
App/plugin/release/resource identifiers describe owned configuration only.
`binding.observed` remains `unknown`: this server cannot inspect ChatGPT's
installed App, private plugin binding, consent grant, scheduler or retry behavior.
No installed App or owner grant is updated by this change.

`GET /.well-known/a2a-connection` and CLI `diagnose` work without authentication.
They expose public resource/issuer/protocol/expectation data only, never an owner,
renewal audit, inbox or credential. Authenticated `GET /api/v1/connection`, CLI
`status` and read-only MCP `a2a_connection_status` require existing `a2a:read`.
The status does not request write scope. `allowedOperations` reports scope-level
categories; individual inbox, counterpart and state checks still apply. It is
not a grant to act on received text. Missing authentication cannot be diagnosed
by calling an authenticated tool: use anonymous diagnostics and retain the
401 challenge or 403 denial. The host's internal handling is external.

Identity userinfo adds only bounded renewal facts for the authenticated
subject/client/resource. A2A validates that allowlist before including facts in
status. Unknown/missing facts stay `unknown`; null timestamps mean no matching
retained audit, not proof of no historical renewal. Consent and host refresh stay
unknown even when a committed server rotation is visible.

MCP tool results keep existing `structuredContent` and the original content block.
An appended public JSON content block exposes receipt/recovery facts to the agent,
alongside `_meta.receipt` for clients. ChatGPT hides `_meta` from its model
([tool result reference](https://developers.openai.com/plugins/reference#tool-results)).
The receipt contains server-generated request ID, operation, canonical
connection, contract/binding revisions, timestamp, and confirmed/denied/unknown.
HTTP and MCP receipts share the same request ID and operation outcome.
HTTP responses provide `X-A2A-Request-Id` and JSON `X-A2A-Receipt`; HTTP errors
also include receipt and recovery advice. Client IDs never select receipt IDs.
A confirmed operation does not attest delivery or task completion. A failure
after a message commit reports unknown; reconcile the exact payload and existing
send idempotency key. Never automatically replay claims/finishes. Receipts are
per attempt; logical write idempotency remains the existing domain record.

`connection-recovery-policy.json` is the Judgment artifact consumed by the
connection helper. CLI and MCP use its bounded advice; no helper dispatches
retries. Honor Retry-After, including dates. Stop when the delay exceeds sixty
seconds or three retries are exhausted. Temporary reads can retry; missing
consent/terminal authentication needs owner action, revoked/forbidden access
stops, and uncertain writes reconcile. A CLI refresh remains single-use and
never replays an uncertain old credential. The owner's existing encrypted
cookie-session recovery remains the only opted-in server refresh replay path.
No automatic broad reauthorization is introduced.

Protocol compatibility remains MCP `2025-03-26`, existing discovery/scopes and
OAuth challenge semantics. Newer MCP refresh recommendations are not a reason
to silently migrate the deployed host's working consent contract. Identity is
the first-party authorization server.

## Renewal audit, access and retention

Identity migration 0020 adds `connection_renewal_audit`, independent of expiring
consumption/recovery tombstones. For opted-in encrypted recovery, a rotation's sanitized row is inserted in the
same D1 transaction as consumption and encrypted recovery. A failed audit insert
rolls back consumption. Concurrent losers cannot write a winner's audit, and
retries cannot duplicate a rotation row. A recovery response increments
`replay_count` only after active identity/family and successor checks, before
return preparation; `last_recovered_at` is response preparation, not proof of
network delivery. The normal commit readback is not counted as a replay. Standard single-use host
refreshes also create an audit row at final response preparation, with
`commit_mode: response_prepared`; consumption and audit commit atomically after response preparation, so audit
failure rolls both back. These do not acquire encrypted recovery; committed
standard grants remain single use with replay revocation. An uncertain commit
or lost standard response still cannot be recovered by this audit. `recovery_committed` identifies
the atomic encrypted successor path. Audit timestamps record committed server
facts and do not prove the host received or persisted credentials.

Rows contain internal grant ID, owner subject, client, resource, canonical ID,
revision and numeric timestamps/counts. They contain no tokens, nonce, claim
payload, ciphertext, message bodies or credentials. Full rows are operator DB
access only; authenticated userinfo exposes only aggregate facts scoped to the
current subject/client/resource. Anonymous diagnostics expose none. Expired
rows are pruned opportunistically on subsequent opted-in rotations after 90
days; this is an eligibility/maintenance policy, not guaranteed timed erasure.
Operators may delete rows older than the 90-day cutoff during maintenance.
Existing `mcp_auth_events` issuance records occur before exchange completion and
must remain classified as issuance attempts, never committed renewal evidence.
No historical audit backfill is inferred from those events or tombstones.

See [disposable lab runbook](../acceptance/README.md) for isolated cloud execution,
cleanup and the separate CRE-2428 host acceptance limit.
