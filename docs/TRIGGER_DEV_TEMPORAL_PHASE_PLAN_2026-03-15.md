# Trigger.dev Then Temporal Phase Plan

## Intent

Adopt Trigger.dev first as the async runtime for CREATE SOMETHING agent workflows, then add Temporal only when durable pause/resume and approval-bound workflows justify the extra complexity.

This keeps the primary system boundaries stable:

- `OpenAI Agents SDK`: orchestration and agent behavior
- `Hub MCP`: tool plane
- `mcp-authz` + `policy-os-engine`: authorization and review decisions
- `Braintrust` + house telemetry: observability
- `Trigger.dev`: first async runtime
- `Temporal`: later durable workflow runtime

## Phase 0: Shared Runtime Spine

Goal:

- create one reusable agent runtime boundary that Trigger.dev and later Temporal can both call

Deliverables:

- shared correlation ID contract
- shared policy evidence contract
- shared Hub invocation wrapper
- shared OpenAI Agents SDK runner boundary

Exit criteria:

- existing Half Dozen smoke lanes can be called through a reusable module boundary instead of only a top-level script

## Phase 1: Trigger.dev Foundation

Goal:

- establish Trigger.dev package, env contract, and CLI workflows

Deliverables:

- `packages/workflows-trigger`
- `trigger.config.ts`
- foundation tasks
- Infisical-backed local/dev CLI wrapper

Exit criteria:

- `trigger.dev dev` can run through repo scripts
- Trigger secrets can be resolved from Infisical
- a foundation task run emits a traceable correlation payload

## Phase 2: Trigger.dev Read-Only Pilot

Goal:

- run a read-only scenario under Trigger.dev

Candidate:

- `fleet-watchdog`

Deliverables:

- scheduled Trigger.dev execution
- retry policy
- correlation across Trigger.dev, Hub, Braintrust, and house telemetry

Exit criteria:

- one read-only production-safe scenario runs on schedule without manual babysitting

## Phase 3: Trigger.dev Bounded Writes

Goal:

- move one bounded-write workflow into Trigger.dev

Candidates:

- `inbox-triage`
- `dedup` (only after safer write envelope exists)

Deliverables:

- pre-execution Oso authz check
- post-execution governance evidence
- idempotency and retry guards

Exit criteria:

- one bounded-write flow runs safely with auditable policy evidence

## Phase 4: Temporal Adoption Gate

Add Temporal only when one of these is true:

- the workflow must wait for hours or days
- the workflow must pause for human approval and resume deterministically
- multi-step side effects need compensation
- partial failure recovery must survive process/runtime loss

If none of those are true, stay on Trigger.dev.

## Phase 5: Temporal Pilot

Goal:

- prove one durable workflow that Trigger.dev is not the right tool for

Candidate shapes:

- destructive route requiring approval
- partner onboarding saga
- cross-system state transition with compensating steps

Deliverables:

- `packages/workflows-temporal`
- shared runtime integration
- re-authorization before side effects after waits/signals

Exit criteria:

- one long-running or approval-gated workflow completes with deterministic resume behavior

## Package Map

- `packages/workflows-trigger`: Trigger.dev runtime package
- `packages/workflows-temporal`: Temporal runtime package, later
- `packages/mcp-authz`: canonical policy catalog
- `packages/policy-os-engine`: Oso primary evaluator + local fallback
- `packages/observability`: Braintrust and MCP tracing bridges

## Do Not Duplicate

Do not re-implement these concerns inside Trigger.dev or Temporal:

- authz policy logic
- Hub routing logic
- house telemetry source of truth
- packaging/commercial entitlement state

Those stay in existing repo systems and are consumed by the workflow runtime.
