# policy.hub-route-authorization.v1

- Status: `draft`
- Owner: `CREATE SOMETHING broker layer`
- Effective date: `TBD`

## Purpose

Define the centralized broker authorization policy for MCP proxy route discovery and execution.

## Scope

- Broker surfaces in `@create-something/cs-mcp-hub-remote`
- Shared authz contracts in `@create-something/mcp-authz`
- Policy compiler/evaluator in `@create-something/policy-os-engine`

## Policy Statements

1. Read-only sessions MUST NOT discover mutable or administrative proxy routes.
2. Read-only sessions MUST NOT execute mutable or administrative proxy routes.
3. Destructive or control-plane proxy execution MUST require human review.
4. Discovery and execution MAY proceed when no restrictive rule matches.
5. Decisions MUST record policy ID, policy hash, matched rule IDs, evaluation path, and fallback reason.

## Enforcement Surfaces

- `buildAuthorizedVisibleProxyRoutes(...)`
- `executeProxyRoute(...)`
- `policy.hub-route-authorization.v1`

## Evidence

- `authz_policy_rollouts`
- `authz_decision_events`
- Hub invocation telemetry with `blockedByPolicy` and `requiresHumanReview`

## Source Anchors

- `packages/mcp-authz/src/policies.ts`
- `packages/mcp-authz/src/hub.ts`
- `packages/cs-mcp-hub-remote/index.ts`
