# policy.account-role-boundaries.v1

- Status: `draft`
- Owner: `CREATE SOMETHING policy operations`
- Effective date: `TBD`

## Purpose

Define role and account boundaries for MCP access, control-plane mutation, and incident operations.

## Scope

- Interaction Atlas MCP judgment/security tools
- Hub control-plane and tenant operations
- Runtime account posture enforcement

## Policy Statements

1. `public` accounts MUST remain read-only and MUST NOT mutate rollout or security controls.
2. `auditor` and `readonly` roles MUST remain read-only and MUST NOT execute write or enforcement mutations.
3. `operator` and `admin` roles MAY execute rollout, access-mode, and incident resolution operations.
4. Policy checks MUST be enforced server-side, not only client-side.

## Enforcement Surfaces

- Account metadata and role resolution in request context
- Security tools:
  - `judgment_security_access_set`
  - `judgment_security_incident_review_next`
  - `judgment_security_incident_resolve`
- Rollout tools:
  - `judgment_engine_rollout_set`
  - `judgment_engine_rollout_get`

## Evidence

- Audit log of mutation attempts by role
- Denied mutations from unauthorized roles

## Source Anchors

- `docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md`
- `packages/interaction-atlas-mcp/src/storage/security.ts`
- `packages/interaction-atlas-mcp/src/storage/rollout.ts`
