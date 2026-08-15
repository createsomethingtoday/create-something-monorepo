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

1. Authenticated callers with the exact current `mcp-session` Identity application audience MAY mint a scoped MCP session for their own account.
2. Self-service session mint decisions MUST be logged to shared authz telemetry.
3. Rollout state MUST come from repo-derived policy manifests plus shared rollout storage.
4. Fallback paths MUST remain auditable with evaluation path and fallback reason metadata.
5. Session minting MUST support explicit `allowed_tool_prefixes` for non-toolkit lanes whose visible MCP surface cannot be derived from a generic toolkit profile.
6. When both `toolkit_profile` and explicit `allowed_tool_prefixes` are present, the resolved prefix set MUST be deterministic, auditable, and stable across mint, resolve, and revoke flows.
7. Session minting MUST fail closed when the requested access surface is ambiguous, stale, or wider than the policy-approved lane for the actor.
8. Property, LMS, workspace, and other first-party application audiences MUST NOT be upgraded into MCP sessions; the accepted audience MUST be recorded in authorization and session-creation telemetry.

## Enforcement Surfaces

- `handleCreateMcpSession(...)`
- `policy.mcp-session-self-service.v1`
- Shared authz rollout + decision event tables

## Evidence

- `authz_policy_rollouts`
- `authz_decision_events`
- Legacy MCP auth events for compatibility during cutover
- session records showing the issued `allowed_tool_prefixes`

## Source Anchors

- `packages/mcp-authz/src/policies.ts`
- `packages/identity-worker/src/index.ts`
- `packages/policy-os-engine/src/hybrid.ts`
