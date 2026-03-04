# policy.judgment-baseline.v1

- Status: `draft`
- Owner: `CREATE SOMETHING judgment layer`
- Effective date: `TBD`

## Purpose

Define the baseline hard-gate decision policy for workflow and MCP mapping operations.

## Scope

- Constraint decisions: `allow`, `require_human_review`, `block`
- Policy compiler/evaluator in `@create-something/policy-os-engine`
- Interaction Atlas policy storage and enforcement

## Policy Statements

1. Write-intent paths for public read-only accounts MUST be blocked.
2. Introspection failures for MCP mapping MUST require human review.
3. Write-intent paths without explicit human review MUST require human review.
4. A final fallback allow rule MUST exist with lowest priority.
5. Guardrails for review/block drift MUST be declared and monitored.

## Enforcement Surfaces

- `createDefaultPolicy(...)` baseline
- Compiled policy artifact fields:
  - `policy_engine`
  - `policy_polar`
  - `policy_hash`
  - `compiler_version`
  - `fallback_ir_json`

## Evidence

- Saved policy versions in `judgment_policy_versions`
- Decision traces with rule IDs and evaluation path

## Source Anchors

- `packages/interaction-atlas-mcp/src/storage/policies.ts`
- `packages/policy-os-engine/src/compile.ts`
- `packages/policy-os-engine/src/oso-primary.ts`
