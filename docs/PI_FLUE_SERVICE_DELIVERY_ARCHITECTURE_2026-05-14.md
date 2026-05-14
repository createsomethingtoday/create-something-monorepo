# Pi + Flue Service Delivery Architecture

> Date: May 14, 2026
> Status: integration proposal and hardening plan
> Scope: CREATE SOMETHING codebase reliability and client service delivery

## Decision

Use both Pi/OpenClaw and Flue, but give them different jobs.

- **Pi/OpenClaw remains the always-on channel gateway** for interactive operator surfaces, multi-channel messaging, device pairing, long-lived conversations, and the Cloudflare Sandbox relay in `packages/relay`.
- **Flue becomes the programmable service-agent layer** for typed, headless client delivery workflows that need repeatable triggers, structured outputs, isolated sessions, MCP tool adapters, and deployment to Node or Cloudflare.
- **Policy OS remains the product boundary**. Pi/OpenClaw and Flue are runtime choices inside the governed package, not client-facing product names.

This is not a replacement plan. Flue itself currently builds on Pi packages for model and agent primitives, so the useful distinction is gateway runtime versus programmable harness.

## Why Both

Pi/OpenClaw is strongest where the system needs an operator-facing assistant:

- web chat and gateway UI
- Telegram, Discord, Slack, and similar channel ingress
- explicit device pairing and remote access control
- persistent conversation state across sessions
- a containerized workspace with skills

Flue is strongest where the system needs a productized agent endpoint:

- TypeScript-authored agent handlers
- webhook and CLI-triggered workflows
- typed outputs via schemas
- lightweight virtual sandboxes for scale
- local, Cloudflare, or external sandbox targets
- task delegation and MCP tool adapter support inside trusted code

Together, they let CREATE SOMETHING keep a rich operator console while adding smaller, auditable service agents for client workflows.

## Tier Mapping

| Tier | Responsibility | Pi/OpenClaw role | Flue role |
| --- | --- | --- | --- |
| **Database** | State, evidence, session data, client artifacts | R2-backed gateway config, paired devices, conversations, workspace files | Durable Object or Node session store, R2-backed virtual filesystem, structured run outputs |
| **Automation** | Tools, actions, harnesses, workflows | Channel gateway, OpenClaw agent runtime, Cloudflare Sandbox process lifecycle | Agent handlers, sessions, tasks, MCP tool adapters, shell/fs tools in selected sandbox modes |
| **Judgment** | Policy, approvals, roles, escalation | Operator-facing review and control UI, skills surfaced through the assistant | Role files, skills, schema-constrained outputs, event observation, contract-driven workflow gates |

Debugging stays in the repo order:

1. **Database**: Was the client data, policy artifact, or session state available and current?
2. **Automation**: Did the Pi gateway, Flue handler, MCP tool, or sandbox execution path succeed?
3. **Judgment**: Was the right role, skill, contract, approval mode, or escalation rule applied?

## Current Repo Anchor Points

| Surface | Current role | Integration implication |
| --- | --- | --- |
| `packages/relay` | Cloudflare Worker that runs OpenClaw/Moltbot in a Cloudflare Sandbox and proxies gateway traffic | Keep as channel gateway; harden versioning, health checks, persistence, and policy-aware tool exposure |
| `packages/harness` | Codex/Linear-oriented coding-agent orchestration | Keep as internal engineering harness; do not force it to become the client runtime |
| `docs/POLICY_OS_PRODUCT_DEFINITION.md` | Canonical paid package definition | Runtime choices must ship inside the Policy OS contract bundle |
| `docs/COMPOSIO_PATTERNS.md` | Commodity connectivity guidance | Flue and Pi agents should consume brokered CREATE SOMETHING MCP/tool surfaces, not raw broad catalogs |
| `docs/guides/CODING_AGENT_HARNESS_PATTERN.md` | Repo-local agent reliability pattern | Reuse its tracked work, validation, review, and checkpoint standards for Flue service agents |

## Integration Architecture

```text
Client / operator / channel
  |
  |-- Pi/OpenClaw gateway
  |     - WebChat, Slack, Discord, Telegram, paired devices
  |     - Human steering and review
  |     - Long-lived assistant workspace
  |
  |-- Flue service-agent endpoint
        - Typed webhook or CLI trigger
        - Contract-specific role/skill
        - MCP tools from CREATE SOMETHING hub surfaces
        - Structured output and event stream

Shared control plane
  - Linear issue and evidence
  - Policy OS contract bundle
  - Golden tasks
  - MCP registry and brokered discovery
  - Observability and run logs
```

Pi/OpenClaw and Flue should meet through artifacts and APIs, not through a tangled runtime dependency.

Shared artifacts:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden_tasks.yaml`
- `runbook.md`
- Linear evidence comments

Shared APIs:

- CREATE SOMETHING MCP hub endpoints
- client-specific MCP servers
- Composio-backed bridge tools where commodity connectivity is appropriate
- policy/authz manifest checks where the workflow is protected

## Hardening Lanes

### Lane 1: Relay Hardening

Purpose: make the existing Pi/OpenClaw gateway safer before adding more responsibility.

Actions:

- audit the current `clawdbot`/OpenClaw package pin in `packages/relay/Dockerfile`
- decide whether to upgrade from the old `clawdbot` package to the current OpenClaw package line
- keep a version matrix for Cloudflare Sandbox image, Node, OpenClaw, and Pi packages
- add a startup health probe that verifies gateway readiness beyond TCP port availability
- record gateway version, active model provider, sandbox id, and R2 sync status in a protected status endpoint
- ensure all channel tokens and model credentials remain Worker secrets or Infisical-managed values
- keep broad debug routes disabled outside explicit operator mode

Acceptance:

- relay startup produces machine-readable status evidence
- R2 sync cannot overwrite known-good backup state with empty config
- package versions are explicit and reviewable
- gateway logs can be linked into Linear evidence without leaking secrets

### Lane 2: Flue Pilot Runtime

Purpose: prove Flue as a repeatable client-service agent runtime without disturbing the channel gateway.

Actions:

- create a small pilot package or app boundary for Flue rather than editing `packages/relay`
- use one narrow workflow first, such as client intake triage, delivery evidence summarization, or template-review follow-up
- prefer Flue virtual sandbox for read/search/report workflows
- use `sandbox: local` only in CI or already-isolated developer runners
- connect to CREATE SOMETHING MCP surfaces through `connectMcpServer()` from trusted code
- return schema-constrained output for handoff, evidence, and review
- subscribe to Flue events and forward compact run metadata to the same observability/evidence path used by Policy OS

Acceptance:

- one Flue agent can run locally from CLI and through a webhook target
- the agent uses a contract bundle and golden task fixture
- output is structured and validated
- run evidence can be attached to Linear
- no client secret is exposed to model context or sandbox files

### Lane 3: Shared Contract Layer

Purpose: make client delivery portable across Pi/OpenClaw, Flue, Codex, and MCP hosts.

Actions:

- define one canonical `agent_contract.yaml` shape for service agents
- include runtime fields:
  - `runtime_candidates`: `pi_openclaw`, `flue`, `codex_harness`
  - `trigger_surfaces`: `channel`, `webhook`, `cli`, `cron`
  - `sandbox_mode`: `virtual`, `container`, `local`, `external`
  - `allowed_mcp_servers`
  - `approval_mode`
  - `evidence_required`
- require each workflow to declare which runtime owns the first trigger and which runtime may perform follow-up
- add golden tasks that can run under the Flue pilot and be reviewed through the existing harness pattern

Acceptance:

- a client workflow can be moved between channel gateway and service endpoint without rewriting policy
- policy review focuses on the contract and evidence, not on runtime-specific naming

### Lane 4: Policy OS Delivery Integration

Purpose: turn runtime integration into a client-service operating model.

Actions:

- map every client workflow to `MCP-only`, `policy_os_trial`, or `policy_os_core`
- use Pi/OpenClaw for operator-visible workflows where human steering is part of the value
- use Flue for deterministic service endpoints, background jobs, and typed handoffs
- route commodity SaaS connectivity through brokered CREATE SOMETHING MCP surfaces
- keep custom MCPs for strategic or client-specific workflows
- require Linear evidence for deploys, validations, blocked actions, and golden-task drift

Acceptance:

- each client delivery has a named runtime owner, contract bundle, validation command, and rollback note
- blocked or escalated actions are traceable to a policy artifact
- client-facing language remains Policy OS / Skills + MCP, not Pi or Flue

## Risk Controls

| Risk | Control |
| --- | --- |
| Flue API churn | Keep first use in a pilot package, pin versions, and isolate generated build output |
| OpenClaw package drift | Maintain explicit version matrix and upgrade notes before changing Dockerfile pins |
| Secret leakage | Keep MCP connection secrets in trusted runtime env; never write them into AGENTS.md, skills, sandbox files, or prompts |
| Broad tool exposure | Use brokered discovery and allowlisted MCP tools; do not expose full SaaS catalogs by default |
| Local shell misuse | Use virtual sandbox for routine Flue agents; reserve local shell for CI/developer isolation |
| Duplicate harnesses | Keep `packages/harness` as engineering orchestration; use Flue for service-agent endpoints |
| Unreviewed autonomy | Require golden tasks, policy artifacts, and Linear evidence before promoting a workflow |

## Delivery Rule

Choose the runtime by workflow shape:

| Use this | When |
| --- | --- |
| Pi/OpenClaw | The workflow starts in chat, needs operator steering, depends on paired devices/channels, or benefits from a persistent assistant workspace |
| Flue | The workflow is a typed endpoint, a repeatable job, a CI/local command, or a client-specific agent service with clear inputs and outputs |
| Codex/harness | The workflow changes code, needs worktree isolation, or belongs to internal engineering delivery |
| Custom MCP | The durable value is controlled access to a client system or domain-specific tool surface |

## First Implementation Slice

The first slice should be small enough to finish and validate:

1. Add relay version/status hardening for `packages/relay`.
2. Add one Flue pilot workflow outside `packages/relay`.
3. Create a matching `agent_contract.yaml` and `golden_tasks.yaml` fixture for the pilot.
4. Validate through local CLI, webhook/dev server, and Linear evidence.
5. Decide whether to promote the pattern into a shared service-agent package.

The pilot should not attempt to replace OpenClaw channels. It should prove that Flue can run governed service workflows beside the existing gateway.

## Implemented Pilot Slices

- `CRE-317`: `packages/relay` now exposes protected runtime/status evidence for the Pi/OpenClaw channel gateway.
- `CRE-318`: `packages/agents/flue-service-agent` adds a Flue service-agent pilot with `.flue/agents/service-delivery.ts`, the `/agents/service-delivery/:id` endpoint pattern, and contract-bound evidence for `runtime-routing-pi-flue`.
- `CRE-323`: `packages/agents/flue-service-agent` now has a deterministic `flue:smoke` evidence command and a second `.flue/agents/delivery-readiness.ts` webhook agent at `/agents/delivery-readiness/:id` for contract-bundle readiness review.
- `CRE-324`: `packages/agents/flue-service-agent` now checks brokered MCP access through `.flue/agents/mcp-access-review.ts` at `/agents/mcp-access-review/:id`, requiring explicit contract allowlists, hub discovery tools, and registry-resolved servers before promotion.
- `CRE-325`: `packages/agents/flue-service-agent` now has Cloudflare-target readiness through `.flue/agents/cloudflare-readiness.ts` at `/agents/cloudflare-readiness/:id` and `flue:smoke:cloudflare`, which verifies generated Worker artifacts, Durable Object bindings, migrations, and deployment guardrails without deploying.
- `CRE-326`: `packages/agents/flue-service-agent` now has Linear-ready promotion evidence through `flue:evidence` and `flue:evidence:cloudflare`, converting deterministic smoke/readiness reports into a compact Markdown artifact with runtime surfaces, MCP access, Cloudflare guardrails, and rollback notes.
- `CRE-328`: `packages/agents/flue-service-agent` now has first-class run-history output through `flue:history` and `flue:history:cloudflare`, appending schema-valid `flue.run_history.v1` JSONL records under ignored `.artifacts/` storage for observability handoff.
- `CRE-330`: `packages/agents/flue-service-agent` now exposes run-history as read-only MCP resources through `registerFlueRunHistoryResources(...)`, with `flue://run-history/status`, `flue://run-history/latest`, and `flue://run-history/list` backed by the local JSONL history.
- `CRE-333`: `packages/create-something-mcp` now registers the Flue run-history resources on the local stdio `create-something` MCP, reading the package JSONL by default and allowing `FLUE_RUN_HISTORY_PATH` overrides.
- `CRE-340`: `packages/create-something-mcp` now registers the same Flue run-history resources on the hosted Worker when `TELEMETRY_DB` is bound, backed by the `flue_run_history` D1 table and a migration under `worker/migrations/`.
- `CRE-345`: `TELEMETRY_DB.flue_run_history` has been migrated on remote D1, and `create-something-mcp` Worker version `c938afe9-f667-4214-91f9-d31b4f736dde` is deployed on `mcp.createsomething.ltd` with live `flue://run-history/*` resources reading from `d1://TELEMETRY_DB/flue_run_history`.
- `CRE-349`: `packages/create-something-mcp` now has a controlled `flue:history:upload` operator command that validates local Flue run-history JSONL and performs idempotent D1 upserts into `TELEMETRY_DB.flue_run_history`; the first hosted upload populated 2 records and live MCP status reported `missingHistory: false`.
- `CRE-351`: `packages/create-something-mcp` now has a one-step `flue:history:promote` operator command that generates Cloudflare-ready Flue run-history evidence and uploads the validated JSONL to hosted D1; `smoke:flue-promotion` runs the same path against a temp JSONL without remote writes. The current hosted table has 3 records, with latest issue `CRE-351`.
- `CRE-353`: `.github/workflows/flue-run-history-promotion.yml` now owns CI validation for the promotion path. Pull requests and `main` pushes run dry-run promotion checks, while `workflow_dispatch` with `target=remote` performs the protected D1 upload under the `production` environment.

## Open Questions

- Which client workflow should be the first Flue pilot: intake triage, delivery evidence summarization, template-review follow-up, or Hub health review?
- Should the relay upgrade move directly to the current OpenClaw package line, or first add a version/status endpoint around the current `clawdbot` pin?
- Where should shared service-agent contracts live long term: `docs/examples/`, `templates/`, or a package-owned contract directory?
- Should remote Flue run-history promotion stay manual through `workflow_dispatch`, or become automatic after a signed-off Linear state transition?
