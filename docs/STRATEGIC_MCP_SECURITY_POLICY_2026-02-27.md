# Strategic MCP Security Policy (2026-02-27)

This policy defines how CREATE SOMETHING should run MCP tools with business-safe reliability while preserving delivery velocity.

## Objectives

1. Keep core automation online by default.
2. Reduce blast radius during incidents quickly.
3. Promote Polar/Oso enforcement safely with measurable gates.
4. Tie policy operations to telemetry and commercial KPIs.

## Control Layers

### 1) Global access mode (reactive kill switch)

Control: `MCP_TOOL_ACCESS_MODE`

- `normal`: standard tool exposure.
- `read_only`: read-only tools exposed, write tools hidden.
- `off`: all tools hidden.

Use this first during incident response. It is fast, explicit, and reversible.

### 2) Entity rollout mode (reliability-first adoption)

Control plane table: `judgment_engine_rollout`

Modes:

- `legacy_enforce`
- `shadow`
- `polar_enforce`

Recommended promotion sequence:

1. `shadow` at `10%`
2. `shadow` at `25%`
3. `shadow` at `50%`
4. `shadow` at `100%`
5. `polar_enforce`

### 3) Account and role boundaries

- `public`: read-only account, no write-level control plane mutation.
- `auditor` and `readonly`: read-only posture.
- `operator` and `admin`: write and approval-capable.

### 4) Execution governance controls

For shared remote Hub execution, the following controls are part of the runtime security model, not optional metadata:

- actor-context resolution
- route classification
- tenant-scoped route authorization
- quota enforcement
- rate-limit enforcement
- retry/backoff policy
- trace and audit emission

Protected remote execution MUST fail closed when required actor, tenant, authorization, quota, or access-mode inputs cannot be resolved.

## Gate Policy

Default strict promotion gates:

- `mismatch_rate <= 0.005`
- `fallback_rate <= 0.01`
- no material block/review drift outside entity guardrails

Temporary warm-up gates may be used for entities with historical noise in the current 24h window:

- `mismatch_rate <= 0.5`
- `fallback_rate <= 0.5`

Then return to strict gates after a clean measurement window.

## Required Execution Order For Shared Remote Hub Calls

For brokered downstream execution, the required control order is:

1. resolve actor context
2. classify route
3. evaluate authorization
4. enforce quota and rate limits
5. apply retry/backoff policy
6. execute downstream call
7. emit telemetry and trace records

This order should govern shared remote Hub execution even while rollout mode remains in `shadow`.

## Integration Mapping

### Oso + Polar

- Policy compiler: `@create-something/policy-os-engine`
- Primary evaluator: Oso Cloud
- Fallback evaluator: local deterministic evaluator
- Circuit breaker: bounded fallback during primary errors

### Telemetry

- `judgment_engine_events` captures rollout mode, sampled path, fallback, mismatch, decision, latency.
- Dashboard `engineHealth` reports p50/p95 latency, parity, fallback rate, decision mix, KPI projections.
- Shared remote Hub telemetry should additionally capture route classification, quota/rate-limit outcome, retry behavior, and correlation across hub and downstream execution.

### Langfuse

- Decision traces are emitted when `LANGFUSE_SECRET_KEY` is present and tracing is enabled.
- Treat Langfuse as observability amplification, not a control-plane dependency.
- Langfuse auto-instrumentation MAY be used for LLM spans, agent traces, and operator debugging, but it MUST NOT replace house telemetry or explicit governance trace records for shared remote Hub execution.
- Any Langfuse trace used for governed MCP review MUST carry explicit governance metadata when available, including `account_id`, `tenant_id`, `correlation_id`, route classification, and policy or review outcome.
- Trace fields and tags SHOULD stay DRY and business-legible. Prefer a small set of governance tags over transport-level tag noise.

## Operational Commands

From `packages/interaction-atlas-mcp/worker`:

```bash
# Global kill switch (full stop)
printf 'off' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml

# Controlled containment
printf 'read_only' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml

# Normal operation
printf 'normal' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml
```

## Current Baseline Applied

As of 2026-02-27:

- `public/agent/inbox-triage`: `polar_enforce` (100%), strict gates.
- `default/agent/fleet-watchdog`: `shadow` (10%), strict gates.
- `public/agent/fleet-watchdog`: `shadow` (10%), warm-up gates due prior fallback-heavy history.

## Alignment Notes

This policy should be read together with:

- `policy.hub-route-authorization.v1`
- `policy.tenant-tool-exposure.v1`
- `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`

Those documents define the fail-closed execution posture and tenant-aware identity requirements for shared remote MCP execution.

## Review Cadence

Daily:

1. check fallback and mismatch rates by entity.
2. check latency p50/p95 trend.
3. check decision-mix drift (`allow/review/block`).
4. decide promote, hold, or rollback per entity.
