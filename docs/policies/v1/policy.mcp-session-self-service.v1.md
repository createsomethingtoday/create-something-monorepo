# policy.mcp-session-self-service.v1

- Status: `draft`
- Owner: `CREATE SOMETHING identity layer`
- Effective date: `TBD`

## Purpose

Define the baseline self-service policy for minting scoped MCP sessions.

## Scope

- Session minting in `@create-something/identity-worker`
- Shared authz contracts in `@create-something/mcp-authz`
- Policy compiler/evaluator in `@create-something/policy-os-engine`

## Policy Statements

1. Authenticated callers MAY mint a scoped MCP session for their own account.
2. Self-service session mint decisions MUST be logged to shared authz telemetry.
3. Rollout state MUST come from repo-derived policy manifests plus shared rollout storage.
4. Fallback paths MUST remain auditable with evaluation path and fallback reason metadata.

## Enforcement Surfaces

- `handleCreateMcpSession(...)`
- `policy.mcp-session-self-service.v1`
- Shared authz rollout + decision event tables

## Evidence

- `authz_policy_rollouts`
- `authz_decision_events`
- Legacy MCP auth events for compatibility during cutover

## Source Anchors

- `packages/mcp-authz/src/policies.ts`
- `packages/identity-worker/src/index.ts`
- `packages/policy-os-engine/src/hybrid.ts`
