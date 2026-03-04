# policy.engine-rollout-gates.v1

- Status: `draft`
- Owner: `CREATE SOMETHING reliability operations`
- Effective date: `TBD`

## Purpose

Define safe promotion gates for policy engine rollout from legacy to polar enforcement.

## Scope

- Entity-level rollout controls
- Canary progression and gate thresholds
- Automatic rollback behavior

## Policy Statements

1. Default rollout MUST start at `legacy_enforce`.
2. Promotion sequence MUST follow:
   `shadow:10 -> shadow:25 -> shadow:50 -> shadow:100 -> polar_enforce`.
3. Strict gate defaults MUST be:
   - `mismatch_rate <= 0.005`
   - `fallback_rate <= 0.01`
4. Warm-up gates MAY be used only for noisy entities and MUST revert to strict gates after a clean window.
5. If thresholds are exceeded in non-legacy mode, system MUST rollback to `legacy_enforce`.

## Enforcement Surfaces

- Rollout storage:
  - `judgment_engine_rollout`
- Auto-rollback branch in tool decision flow
- Engine telemetry summaries

## Evidence

- Rollout change audit (`updated_by`, `updated_at`)
- 24h mismatch/fallback metrics per entity

## Source Anchors

- `docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md`
- `packages/interaction-atlas-mcp/src/storage/rollout.ts`
- `packages/interaction-atlas-mcp/src/tools/index.ts`
