# NPG enrichment recovery

PDL, Exa and Skip Trace are the only active providers. One separate exact owner approval requests these three independently. Clay has been removed from tools, readiness, dispatch and recovery. New results contain only `pdl`, `exa`, `apify` and record that exact `active_providers` scope. Saved older approvals must be replaced with a fresh review before dispatch.

Historical jobs, receipts and original action scopes remain intact in D1. Unresolved Clay receipts remain unchanged inside their historical source; the aggregate is marked `retired` once active providers are settled, rather than falsely complete. `retired_providers: [clay]` identifies the audit-only source. A legacy Clay-only pending receipt does not prevent a fresh three-provider request for the same candidate. Exact unresolved Skip receipts and identity/privacy holds still prevent duplicate lookup.

## Existing receipt recovery

The Healthcare MCP Worker runs once per minute and awaits an authenticated POST to the Agency reconciliation endpoint. The endpoint accepts only the existing internal service bearer; it accepts no caller-selected account, action or candidate. It scans one eligible conversation per invocation and uses a compare-and-set lease shared with interactive chat. Recovery during another pending review preserves the approval version and exact payload. Previously approved receipts remain eligible after an unrelated chat interruption; recovery preserves the interrupted chat status and never retries the failed message.

Recovery state is persisted in the conversation before external reads: action/NPI association, attempt count, next attempt, deadline and final state. Existing conversations are discovered from saved complete-profile sources. Each action is limited to 24 attempts and 24 hours with exponential backoff from one minute to one hour. An interruption retains the reserved attempt and the original receipt. The request has a 170-second provider deadline and a 240-second lease.

Only one operation is available in receipt-only mode:

- Reconcile Skip Trace with its original receipt ID, run ID and NPI.

Recovery never creates another paid lookup. The approved action must match the owner, conversation, operation ID, tool and NPI. Changed or unknown associations withhold affected contact evidence and require review. A pending receipt also prevents another paid request for the same candidate, including from a different conversation.

The three active result states and the nested profile are recomputed after recovery. Historical charges on a cached job do not become charges for the current approval. A finished lookup can still have unknown billing or unverified contacts. Exhaustion requires operator reconciliation; it does not authorize another dispatch.

The browser reads saved state every 15 seconds while recovery is pending, up to 120 checks per mounted recovery interval. It pauses reads while hidden or while an interactive command is running. Closing the browser does not stop the Worker scheduler. Reloading obtains persisted state. The browser does not call enrichment providers directly.

## Retired provider endpoints

Former Clay GET/POST routes return authenticated HTTP 410. The former webhook authenticates the original job token read-only and returns 410 without accepting a callback. Historical database records are retained for audit and are never retried or deleted. No runtime recovery reads Clay.

A known `blocked_review` Skip receipt with unreconciled billing may be read by its exact saved ID/run solely to reconcile charges. This cannot clear the identity hold, reveal contacts, or authorize another paid lookup. Privacy and association failures remain fail-closed.

## Release and rollback

Apply the additive `0065_npg_recovery_scan.sql` index to the Agency D1 database. Deploy the reviewed Agency artifact before deploying the Healthcare Worker cron trigger. Both reuse existing service credentials and resource bindings; no new secrets or provider permissions are required.

Verify the unauthorized reconciliation endpoint returns 401, the Worker schedule is installed, and persisted recovery attempts advance for an existing approved receipt. Verify recovered source associations and result/billing states independently. Do not run a newly paid lookup as a deployment smoke test without its exact in-app approval.

Rollback the Worker to the recorded preceding version and remove the added cron schedule, then restore the preceding Agency deployment. Existing D1 receipts and recovery metadata remain intact, and the additive index may remain. Worker rollback does not revert Durable Object or D1 data.

## Validation

Run `pnpm --filter @create-something/agency test:npg-analyst`, Healthcare MCP tests and Worker typecheck. Recovery tests use local D1 and provider fixtures for restart, concurrent cron/chat, pending approvals, exact associations, no replay, bounds, billing and final status. Route tests cover service authority. These establish local behavior, not a live provider match.
