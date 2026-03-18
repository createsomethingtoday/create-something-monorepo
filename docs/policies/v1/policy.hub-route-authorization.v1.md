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
4. Protected remote discovery and execution MUST default-deny unless actor context, tenant exposure policy, and route authorization rules resolve to an explicit allow or review outcome.
5. Discovery and execution for protected remote routes MUST fail closed when actor context is missing, tenant context is unresolved, or applicable policy inputs cannot be evaluated.
6. Discovery allow decisions MUST be constrained by tenant exposure policy, including server allow/deny rules, tool-prefix limits, and pending OAuth candidate policy.
7. Execution allow decisions MUST be constrained by route classification, access mode, tenant exposure policy, and destructive/control-plane review requirements.
8. Decisions MUST record policy ID, policy hash, matched rule IDs, evaluation path, fallback reason, actor context summary, and route classification.
9. Brokered discovery MUST expose a lightweight service-summary surface before per-tool authorization. Authorizing the full visible proxy catalog before service selection is prohibited as the default discovery path.
10. Execution classification for multiplexed management tools MUST consider the requested action or operation so read-like actions (`list_*`, `get_*`, `preview_*`, `validate_*`) do not inherit the most restrictive classification from the tool name alone.
11. Shared hubs SHOULD expose named discovery packs as the standard managed discovery baseline, and operator-facing guidance SHOULD prefer pack selection plus service-scoped search over ad hoc full-catalog discovery.

## Enforcement Surfaces

- `buildAuthorizedVisibleProxyRoutes(...)`
- `executeProxyRoute(...)`
- `policy.hub-route-authorization.v1`
- tenant exposure policy evaluation before visible-route construction
- actor-context resolution before protected route execution

## Evidence

- `authz_policy_rollouts`
- `authz_decision_events`
- Hub invocation telemetry with `blockedByPolicy` and `requiresHumanReview`
- explicit deny reasons for missing actor context, unresolved tenant policy, or route-classification restrictions
- service-first discovery traces showing `hub_list_services` preceding scoped proxy search for normal broker flows
- discovery reset or discovery-pack selection traces showing managed pack baseline before any ad hoc override

## Source Anchors

- `packages/mcp-authz/src/policies.ts`
- `packages/mcp-authz/src/hub.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`
