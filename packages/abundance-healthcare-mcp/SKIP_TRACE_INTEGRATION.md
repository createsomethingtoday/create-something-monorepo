# Controlled Skip Trace enrichment (CRE-2412)

Optional `enrich_candidate_skip_trace` accepts one existing nationwide registry NPI and literal `confirm_paid_enrichment: true`. The server resolves first/last name and practice city/state. Practice geography is never represented as residence. PDL and existing NPG behavior are preserved; no automatic fallback, query expansion, outreach, CRM or registry mutation exists.

Provision `APIFY_API_TOKEN` as a Worker secret only after parent approval. Never put it in vars or client configuration. `APIFY_DAILY_BUDGET_USD` defaults to 1 USD; invalid/zero values fail closed. A singleton `SKIP_TRACE` Durable Object reserves ten cents per unique request across sessions in a rolling day. Reservations are retained in full regardless of initial billing receipt. Identical requests remain cached indefinitely; unknown dispatches never POST again. Repeating a pending request polls its known run only. Each API operation has a 15-second bound; there is no blocking polling loop.

Actor vmf6h5lxPAkB1W2gT is pinned to build 0.0.192, max_results 1, timeout 120 seconds, restart disabled, limited permissions requested and maximum charge 0.10 USD. Run and dataset access are restricted. Dataset GET requests project an allowlist and local projection discards unrelated fields. No raw dataset, DOB, street, postal, relatives or associates are stored locally. Remote Actor storage still holds its raw output and requires owner-managed retention. No contacts or secrets are logged by this integration.

Returned contacts are vendor-reported, ownership/consent unverified and never recruiter-ready. First/last and state checks are preliminary triage. Name mismatch, selector fallback, multiple rows and association failures withhold contacts. A different region requires review and does not prove a different person. Phone metadata is omitted; provider text in Last Reported is never interpreted as freshness.

## Parent release gates and migration handoff

This is a draft implementation, not production-ready acceptance. Before promotion:

- Verify Apify start-time generalAccess and forcePermissionLevel options against the current API and confirm restricted storage before paid dispatch. Post-start PUTs cannot repair an exposure that already occurred.
- Implement terminal charge reconciliation (initial terminal receipts can still change). Current `charge_reconciled` is explicitly false; full reservations remain held until their rolling-day expiration.
- Coordinate CRE-2409 owner for additive Agency NPG policy/tool allowlist, paid-tool classification, runner confirmation and display mapping. The active migration checkout and its dirty Agency files were not modified. Do not enable this tool through a hub until classification is staged and reviewed.
- Independently test MCP tool invocation, registry candidate approval policy, Worker compilation and actual Durable Object behavior. Existing synthetic tests exercise provider public function and existing package behavior, not a live Apify or Worker runtime.
- Parent owns independent Sol review, merge, secret provisioning, deployment and live verification. No further paid lookup is authorized by implementation testing.

Rollback: remove tool exposure/allowlisting and unset APIFY_API_TOKEN; retain Durable Object records and reservations for reconciliation. Do not delete cached unknown receipts to force redispatch. Existing PDL remains independent.

Primary references: https://docs.apify.com/api/v2/actors-runs-post and https://apify.com/one-api/skip-trace/input-schema . Consulted November 11, 2026. No pilot personal data was copied into source, fixtures or tracking.
