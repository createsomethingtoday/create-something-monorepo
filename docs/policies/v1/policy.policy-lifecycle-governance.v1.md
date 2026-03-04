# policy.policy-lifecycle-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING policy operations`
- Effective date: `TBD`

## Purpose

Define lifecycle governance for policy artifacts from draft through activation and archival.

## Scope

- Policy version records
- Promotion and rollback workflow
- Compiled artifact integrity requirements

## Policy States

- `draft`
- `active`
- `archived`

## Policy Statements

1. All new policy versions MUST start in `draft`.
2. Activation MUST require documented approval and change rationale.
3. Active policies MUST include compiled artifact integrity fields:
   - `policy_engine`
   - `policy_polar`
   - `policy_hash`
   - `compiler_version`
   - `fallback_ir_json`
4. Rollback MUST be possible to a previously active policy version.
5. Archived policies MUST remain queryable for audit but MUST NOT be used for enforcement.

## Enforcement Surfaces

- `judgment_policy_versions` table and promotion operations
- Policy resolution and binding in tool workflows

## Evidence

- Version history with actor, timestamp, and status transitions
- Hash continuity across active policy versions

## Source Anchors

- `packages/interaction-atlas-mcp/src/storage/policies.ts`
- `docs/THREE_TIER_FRAMEWORK.md`
