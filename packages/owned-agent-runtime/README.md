# Owned Agent Runtime

Provider-neutral Cloudflare Worker for CREATE SOMETHING agents and governed
Control runs. The public, read-only Guide Agent remains available while the
Control lane consumes the canonical Agency activation ledger rather than
creating another customer-state or execution foundation.

## Contract

- `GET /health`
- `GET /v1/agents`
- `POST /v1/agents/:agentId/messages` with `{ "query": "...", "conversation_id": "optional" }`
- Message responses use server-sent events: `run.started`, `message.delta`, `message.completed`, or `run.failed`.

Authenticated Control transports share one service contract:

- `POST /v1/control/runs` queues a run against an exact active activation.
- `GET /v1/control/runs/:runId` reads one run inside the verified tenant scope.
- `POST /v1/control/runs/:runId/actions` applies approval, rejection, stop,
  cancellation, retry, recovery start/completion, or termination.
- `POST /v1/control/runs/:runId/process` is scheduler-only.
- `POST /mcp` exposes the same customer operations as `control_run_get`,
  `control_run_start`, and `control_run_action` tools.

Control requests require a first-party Identity JWT with the exact configured
issuer and audience plus signed `account_id`, `tenant_id`,
`workspace_account_id`, and accepted role claims. Client-supplied scope or role
headers are ignored. API, MCP, and scheduler paths use the same resolver and
tenant-scoped repository. Control is bearer-only: normal first-party session
cookies are not treated as resource-bound Control credentials.

Production pins `CS_IDENTITY_ISSUER`, `CS_IDENTITY_JWKS_URL`, and
`CS_IDENTITY_AUDIENCE` to the production Identity/runtime pair only in the
production deploy command. Shared Wrangler defaults intentionally omit them.
Preview and local pairs must set all three together, while Identity sets the matching
`OAUTH_ISSUER` and includes the runtime MCP URL in
`CONTROL_RUNTIME_RESOURCES`. This preserves exact issuer/resource validation
without making non-production tokens impersonate the production audience.

Account access is issued through CREATE SOMETHING Identity's explicit OAuth
application policy for
`https://create-something-agent-runtime.createsomething.workers.dev/mcp`.
Identity derives account, tenant, workspace, and Control role from the live
Agency entitlement check before signing the short-lived resource-bound token,
and rejects MCP-only service tiers. Customer credentials require an explicitly
provisioned `account_owner` or `account_reader` Control role; legacy entitlement
rows are not silently upgraded or downgraded into new runtime authority.
The scheduler uses the separate
`/v1/control/scheduler-tokens/admin-issue` Identity endpoint, which requires an
Identity API key carrying only `control_scheduler_token_issue`; issued tokens
are exact-scope, require a read-back of the run's matching frozen Agency activation,
and expire within 15 minutes. This change does not create that
API key, issue a token, grant customer access, or register a workflow.

Every run freezes the activation's Map version, accepted handoff, Build release,
policy, entitlement, and contract hashes. Requested tools and resources must be
subsets of that frozen policy. The D1 state machine covers queued, running,
waiting for approval, stopped, cancelled, failed, fallback required, recovering,
recovered, completed, and terminated states with optimistic concurrency,
idempotent commands, bounded retries, fail-closed admission, and an exclusive
active concurrency key.

Receipts are immutable and hash-chained. Each receipt binds the activation,
Map, Build, policy, actor, verifier, outcome, and recovery path without exposing
provider identity in the customer contract. Scheduler processing persists the
`running` claim before invoking a paid executor, so a concurrent stop or cancel
wins the state update and a late provider result cannot overwrite it.

Build release executors register by the exact release ID and contract hash. An
unregistered release becomes `fallback_required`; the runtime never improvises
a workflow from a prompt. This repository currently registers no customer
workflow, so the start route fails closed and deploying the lane creates no
activation or run authority.

The proposed Template Review A3 adapter is a separately exported, unregistered
Control-host seam. It accepts only a runtime attempt that already has a
durable `effect_intent` checkpoint, creates one fixed-parameter dispatch
identity, requires an explicit exact parameter-digest registration plus an
active matching Agency activation, and rechecks the durable running
runtime/step/prepared-attempt state before a new or replayed dispatch. It
accepts only a source-owned count-only projection plus verifier digest. Its
additive dispatch ledger has no raw queue-record, credential, or
user-identifier column. It contains no OAuth client, service binding, source
transport, Worker registration, or automatic checkpoint transition; each of
those remains an independent promotion gate. Its public preflight returns a
prepared intent without a source tool or transport parameters, so it cannot
authorize a source call. A future promoted source gateway must atomically
redeem an active Agency activation permit immediately before source invocation.
Replays return the recorded
terminal verifier result rather than a dispatch after verification or ambiguity;
if a stop races a verifier already in progress, the adapter retains that
observed terminal evidence without advancing a runtime checkpoint. Ambiguous
results retain the same bounded count and source digests for reconciliation,
but failure codes and verifier labels are constrained to safe machine
identifiers.

D1 owns conversation continuation and normalized run receipts. OpenAI Agents SDK owns the model/tool loop. Agent definitions own MCP allowlists and judgment policy.

Each conversation is protected by a D1 run lease. Concurrent continuation returns `409 conversation_busy` before model execution. Completion and failure write the terminal receipt and release the lease in one D1 batch transaction; an abandoned lease can be reclaimed after ten minutes.

Cloudflare admission bindings protect the paid message route before conversation state or model execution: ten accepted attempts per client per minute and a 120-attempt per-agent budget per minute, both local to the serving Cloudflare location. A denied request returns `429` with `Retry-After: 60`; an unavailable admission check fails closed with `503`. Cloudflare's network DDoS protection and optional zone-level WAF/rate-limiting rules remain the outer security layer.

Production uses Cloudflare service bindings for the three repo-owned MCP Workers. This avoids public custom-domain transport loops while preserving the same MCP protocol and URLs for local execution.

The deployed shadow Worker currently provisions `OPENAI_API_KEY` from the Infisical production root secret `WEBFLOW_OPENAI_API_KEY`. Infisical is a provisioning source, not a runtime dependency. Replace this shared funding source with a dedicated funded project key before broader agent migration.

Tool names must be unique across an agent's MCP servers. The owned Guide Agent keeps the Three-Tier Framework server's `classify_component`; the same-named content-server tool is omitted because the OpenAI Agents SDK rejects ambiguous duplicate tool names.

## Local validation

```bash
pnpm test
pnpm check
REQUIRE_CONTROL_CONFIGURED=true pnpm smoke # strict production Control verifier
```

The shared Guide Agent smoke treats only `control_identity_unconfigured` as an
optional-lane skip. Promotion evidence for Control must set
`REQUIRE_CONTROL_CONFIGURED=true`; every other Control response remains a hard
failure in both modes.

## Promotion and rollback

Create the D1 database, replace the placeholder database ID, apply migrations, and set `OPENAI_API_KEY` through Wrangler secret storage before deployment. Keep the Dify Guide Agent published until its three parity smokes pass against the deployed Worker. Rollback is a route switch to the still-published Dify app; no Dify credential or app deletion is part of this slice.

Migration `0003_control_run_lifecycle.sql` is additive and inserts zero rows.
`pnpm db:migrate` targets local D1; the explicit `pnpm db:migrate:remote`
promotion command targets the shared database. Apply the remote migration to
`create-something-agent-runtime` before deploying a Worker that
serves Control routes. Rollback the Worker deployment without deleting the
empty or historical ledger; receipt and command deletion is intentionally
blocked. Registering a customer Build executor, activating a workflow, issuing
access, or running a customer workflow remains a separate approval-gated
promotion.
