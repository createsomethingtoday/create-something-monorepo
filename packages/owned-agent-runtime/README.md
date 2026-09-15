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
- `GET /v1/control/runs/:runId/proof` reads verified runtime and handoff evidence
  through a configured trusted proof reader; missing configuration fails closed.
- `POST /v1/control/runs/:runId/actions` applies approval, rejection, stop,
  cancellation, retry, recovery start/completion, or termination.
- `POST /v1/control/runs/:runId/process` is scheduler-only.
- `POST /mcp` exposes the same customer operations as `control_run_get`,
  `control_run_start`, `control_run_proof`, and `control_run_action` tools.

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

The separate handoff evidence store validates the source-owned
`create-something/template-handoff-observation@1` contract against a verified
`template-review.handoff.observe.v1` attempt. Its capability parameter digest
must equal the source request digest. The host configures an observation age
limit, persisted with each observation so policy changes do not rewrite historical
acceptance; this is never a deadline for submission processing. The store rejects raw
fields and inconsistent classification/action pairs, preserves one immutable
result per attempt, and permits identical readback after a stop without changing
the checkpoint. It requires the existing trusted manifest/proof reader and
retains only minimized facts and digests in migration `0011`.
This evidence store is not an invocation permit, source transport, executor
registration, or proof of the original submission-to-record correlation. Those
remain required before production reconciliation can run.

`D1WorkflowRuntimeProofReader` is the paired read-only database reader.
Control owns the ledger that it reads. Future Substrate and Atlas views may
display its result, but cannot change a run. The reader resolves the manifest
by persisted digest through a trusted artifact authority, then verifies it and
the persisted hash chain before deriving one
`create-something/workflow-runtime-proof@1` value. That value contains exact
run, step, attempt, approval, checkpoint, receipt, and redacted capability
observation identities; it omits source routes, raw source records, operator
subjects, free-text outcomes, and every execution or approval command. It is
not yet an HTTP route, MCP tool, Atlas write-back, deployment, or live Proof
surface. Approval rows are append-only: they begin pending, can receive one
decision, and cannot be altered or deleted afterward. A persisted wait also
requires a manifest resolved through the trusted artifact authority. It stores
the exact Control scope, run and step versions, activation and artifact/runtime
digests, compiler workflow identity, action and evidence digests, approval
policy/expiry, and an explicit `no_capability_attempt` marker. The proof reader
rejects a missing, changed, malformed, cross-scope, or receipt-inconsistent
approval context. This is still a durable Control ledger seam, not an approval
HTTP route, an Identity actor-role assertion, or permission for a source call.

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

Migration `0008_control_workflow_runtime_approval_context.sql` adds the
append-only wait-context column. It is required for new approval rows; existing
historical rows remain intact but fail closed when requested through the v1
proof projection until they have an explicitly governed legacy-read path. The
migration does not permit a historical row to be retroactively populated.

## Terminal read-only compiler integration proof

`node scripts/github-commit-proof.mjs start <exact-reviewed-commit-sha> <new-output-directory>`
performs two authenticated GitHub GETs: one `/user` request to verify the existing
CLI account `createsomethingtoday`, then one request for that immutable commit in
`createsomethingtoday/create-something-monorepo`. The proof reports both reads
separately and a total of two; only the commit read is a runtime dispatch. It signs a compiler artifact, validates the
source-bound plan, persists a runtime effect intent, reads the commit, signs
the bounded source observation, and records a wait checkpoint. It then reopens
and verifies the receipt in a separate process without another source read.

Run `node scripts/github-commit-proof.mjs verify <output-directory> <trusted-public-key>`
to inspect the same retained proof. The public key is written beside the output
directory on the first run; pin that exact file independently. The private key
exists only in memory. A start refuses an existing output directory; an
incomplete intent requires reconciliation and never automatically resends.
Keep the output and trusted key in operator-controlled local storage.

This is a terminal-operated production source read with a local checkpoint
ledger. Its bounded local policy is not an Agency customer activation, Identity
approval, deployed Control executor, or Marketplace A3 acceptance. The runtime
core remains zero-write; both GETs are owned by this verifier. No external
write, access grant, credential output, automatic approval or paid model call
is involved. Set `WORKFLOW_COMPILER_CONSUMER_DIR` to a disposable npm consumer
directory for post-release proof against the installed public compiler; otherwise
it uses the workspace compiler package. Build workflow-runtime first.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`; terminal proof: `scripts/github-commit-proof.mjs` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test`; deployed Control: `REQUIRE_CONTROL_CONFIGURED=true pnpm smoke` |
| Validation surfaces | Typed runtime contracts, immutable receipts, signed compiler inventory, checkpoint verifier, and source readback |
| UI validation path | No UI in this package. Verify consumer consoles in their owning browser surface. |
| Escalation rule | Stop before expanded source access, customer activation, unregistered executors, source writes, or an unverified receipt. |

## Reconciliation proof projection

`D1WorkflowRuntimeHandoffProofReader` combines the existing verified runtime
projection with immutable handoff observations. It rejects orphan observations,
succeeded handoff attempts without evidence, and runtime version changes during
a read. REST and MCP apply the existing Identity, admission, run ownership, and
scheduler activation checks before consulting this reader. The default Worker
still lacks a registered manifest authority and therefore does not enable live
proof reads. Production wiring, source dispatch, Atlas/Substrate consumption,
and the live canary remain separate required integration steps.

### Source permit authority (not registered)

`D1ControlSourcePermitAuthority` atomically matches every frozen activation field
and active status in Agency D1 while inserting one immutable redemption per
run/step/attempt. The host must verify the durable effect intent before calling
it and invoke only its fixed registered source immediately after a successful
redemption. Duplicate or ambiguous redemption never grants another invocation.
Migration `packages/agency/migrations/0056_control_source_permits.sql` belongs to
Agency, not the runtime database. The table records authorization decisions only;
it does not own runtime steps or checkpoints. No Worker endpoint, source transport,
or activation provisioning is introduced by this class. Stop handling and source
receipt persistence remain required gateway responsibilities.

Observation clock skew is an explicit stored policy (`maximumClockSkewMs`, default
zero, at most 60 seconds). It permits bounded source clock offset around dispatch
and reception without rewriting the source timestamp or increasing maximum age.
Migration `0012` preserves existing rows with zero skew and retains immutable
receipt constraints. Historical reads/replays use the stored policy even after
host configuration changes. Gateway configuration and remote migration remain
separate promotion steps.

### Immutable artifact transport (not registered)

`R2WorkflowArtifactReader` reads `workflow-artifacts/<manifest hex digest>/`
from its injected bucket. It requires an attestation, validates inventory paths
before fetching them, and bounds actual stream bytes (1 MiB manifest, 16 KiB
attestation, 4 MiB per artifact, 16 MiB total, 512 artifacts). These host limits
are deliberately below the compiler's general filesystem limits. The release
pipeline must use the same content-addressed prefix and enforce write-once
publication. This reader does not configure R2, prove immutability, authenticate
a signature, or grant execution. Its byte snapshot must pass the public compiler
verifier and the registered signer/release/runtime policy before admission.

`admitWorkflowArtifact` consumes the reader's serialized bytes through the public
compiler signature verifier and runtime parser. It requires exact registered
outer/runtime hashes, workflow/compiler identity, signer key/fingerprint and
schema, plus independent host capability/compiler/schema allowlists. It copies
policy, registration and bytes across asynchronous boundaries. The owning
registry must supply this input after activation/release authorization and must
check revocation on each new admission or step claim. This function does not
implement that registry, activation check, revocation service or hosted executor.
