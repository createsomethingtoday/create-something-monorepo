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

## Gate Policy

Default strict promotion gates:

- `mismatch_rate <= 0.005`
- `fallback_rate <= 0.01`
- no material block/review drift outside entity guardrails

Temporary warm-up gates may be used for entities with historical noise in the current 24h window:

- `mismatch_rate <= 0.5`
- `fallback_rate <= 0.5`

Then return to strict gates after a clean measurement window.

## Integration Mapping

### Oso + Polar

- Policy compiler: `@create-something/constraint-os-policy-engine`
- Primary evaluator: Oso Cloud
- Fallback evaluator: local deterministic evaluator
- Circuit breaker: bounded fallback during primary errors

### Telemetry

- `judgment_engine_events` captures rollout mode, sampled path, fallback, mismatch, decision, latency.
- Dashboard `engineHealth` reports p50/p95 latency, parity, fallback rate, decision mix, KPI projections.

### Braintrust

- Decision traces are emitted when `BRAINTRUST_API_KEY` is present and tracing is enabled.
- Treat Braintrust as observability amplification, not a control-plane dependency.

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

## Review Cadence

Daily:

1. check fallback and mismatch rates by entity.
2. check latency p50/p95 trend.
3. check decision-mix drift (`allow/review/block`).
4. decide promote, hold, or rollback per entity.
