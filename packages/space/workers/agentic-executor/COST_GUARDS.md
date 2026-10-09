# Executor admission and spending policy (review patch; not deployed)

This change protects the Automation execution boundary with durable Database receipts and an explicit Judgment policy. It does not establish that current production spend is controlled.

## Required decisions before promotion

No production values or credentials are added. Missing/invalid policy returns 503; no model work starts.

| Setting | Decision required |
| --- | --- |
| `AGENTIC_ADMISSION_TOKEN` (secret) | Server-to-server admission credential, at least 32 characters; owning app must authenticate/authorize its users before forwarding `Authorization: Bearer …`. This is not an end-user identity provider. |
| `AGENTIC_MAX_TASK_USD` | Maximum allocation accepted per task. |
| `AGENTIC_LIFETIME_BUDGET_USD` | Total allocations allowed across this deployment's named quota object. Lifetime, **not daily/monthly**. No automatic reset or refund. |
| `AGENTIC_LIFETIME_TASK_LIMIT` | Maximum admitted distinct issue IDs over that same lifetime, positive safe integer. |
| `AGENTIC_INPUT_USD_PER_MILLION`, `AGENTIC_OUTPUT_USD_PER_MILLION` | Approved conservative provider rates for the fixed `claude-sonnet-4-5-20250929` model, including applicable pricing tiers/surcharges. Revalidate against provider terms before promotion. No caching/batch/tool-billing options are sent. |
| `AGENTIC_MAX_REQUEST_BYTES` | Maximum serialized text-only model request and admission payload (up to 1 MB). Includes system prompt, tools, and full conversation. |
| `AGENTIC_CALL_RESERVATION_USD` | Conservative per-call maximum. Must cover `(maxRequestBytes × inputRate + 16384 × outputRate) / 1e6`. The byte ceiling deliberately overestimates text tokens; rates must also cover provider overhead. |
| `AGENTIC_SESSION_TIMEOUT_MS` | Wall-clock admission-to-completion deadline, at most 24 hours. Individual model request timeout is at most 60 seconds and never beyond the session deadline. |

Money reservations round up to microdollars, quotas round down. No business allowance is inferred from test fixtures. Provider billing guarantees depend on correct approved tariffs and a conservative byte/token overhead bound; this does not constrain unrelated services, Workers/DO infrastructure charges, or provider price changes. An observed provider charge exceeding its reservation stops that session for operator reconciliation, but cannot undo that charge.

## Behavior and compatibility

- Adds `AgenticQuota`, migration `v2-cost-guards`, and binding `AGENTIC_QUOTA`. All admissions share **one** object name `deployment-lifetime-v1`; never change that name to reset capacity accidentally.
- `POST /submit` requires the server token. The existing Svelte caller must be updated and its user identity/allow policy configured before promotion. The worker does not accept browser identity headers or infer user permissions from this machine token.
- Valid task shape remains `issueId`, `epicId`, `budget`, optional `convoyId` and string-array `acceptanceCriteria`. IDs are now bounded strings (letters/digits/`_.:-`); string/NaN/infinite/negative/zero budgets and allocations below one call reservation fail. Caller extra `prompt`/`type` fields were already ignored by session execution and remain unused; this patch does not repair the existing placeholder issue loader.
- Admission permanently reserves the full task allocation before enqueueing. Duplicate identical IDs return their receipt without enqueueing; changed input for the same ID returns 409. Concurrent fresh IDs cannot race past count or monetary quotas. Queue consumers and sessions both verify the original receipt, so legacy/direct queue messages without receipts do not start work.
- `reserved` means queue delivery may be unknown. Automatic resend/refund is intentionally absent: an operator must reconcile queue/session evidence. A successful `queued` receipt can still have a failed or expired session; it is not proof of completion.
- New session state is saved before the alarm. Existing sessions are never restarted by duplicate `/start`. Running legacy sessions without guard version, and sessions restored with an in-flight model reservation, transition to durable error without calling the provider.
- Each provider call permanently debits its worst-case reservation before sending, while actual token charges remain separately visible as `costConsumed`. `costReserved` is exposed by status; unused reserve is deliberately not reclaimed. SDK automatic retries are disabled.
- A timeout/provider error leaves the reservation pending and stops. Pause cancels the in-flight request and deletes its alarm; uncertain calls cannot resume. Safe paused sessions can resume only within the original deadline; terminal sessions cannot resume. Fifty iterations is a terminal limit, not an invitation to restart.
- Existing placeholder tool implementations remain unchanged. Real paid/external tools need their own reservation and idempotency protocol before implementation.
- Provider keys and inbound headers are no longer printed or forwarded. Observability HTTP calls have a 10-second timeout.

## Verification and promotion

Run `pnpm --filter @create-something/agentic-executor check` and `pnpm --filter @create-something/agentic-executor test`. Tests use in-memory transactional storage, fake D1, and an intercepted global fetch, exercising actual HTTP admission, quota DO, and session lifecycle. These do not replace Cloudflare runtime integration checks.

An initial test harness used the SDK's captured Node fetch rather than the mocked global fetch. A DNS attempt to `api.anthropic.com` with a mock-only key failed with `ENOTFOUND` in the sandbox; no provider response or real credentials were involved. The SDK now explicitly uses the Worker global fetch, and model tests intercept it before construction. The failed initial run was stopped; corrected tests are offline.

Deployment is a separate approval: review caller identity policy and all required values, provision the approved credential separately, validate the new DO migration in an isolated environment, then deploy and measure admissions, reservations, provider usage, and infrastructure usage. No such actions occurred here. Existing queued/legacy sessions intentionally fail closed and require explicit reconciliation rather than automatic migration.

Rollback must preserve the quota namespace and receipts. Do not roll back to the unauthenticated executor or blindly resume old sessions; use a reviewed fail-closed build until accounting reconciliation is complete. No quota reset/delete or runtime administrative endpoint is provided.
