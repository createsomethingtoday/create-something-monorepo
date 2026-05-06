# Understanding: @create-something/mcp-authz

> Authorization request contracts, policy manifests, rollout controls, and telemetry for MCP tool exposure.

## Position In The Three-Tier Framework

**Primary tier**: Judgment.

This package turns policy artifacts and rollout state into authorization decisions for MCP surfaces. It records Database-tier evidence for each decision and is consumed by Automation-tier hubs and servers before tool execution.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/policy-os-engine` | Compiles and evaluates constraint policies |
| Policy manifests | Bind policy IDs, hashes, compiler version, and rollout defaults |
| SQL-like storage | Persists rollout state and decision telemetry |
| Authorization request shape | Carries actor, action, resource, and context facts |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| MCP Hub | Whether a tool call should be allowed, reviewed, or blocked |
| Policy OS | How compiled policies map onto MCP authorization requests |
| Operators | Which rollout mode and policy hash produced a decision |
| Auditors | Which events show fallback, mismatch, and final decision behavior |

## Internal Structure

```text
src/index.ts    -> public export surface
src/types.ts    -> authorization request, decision, rollout, metrics contracts
src/evaluate.ts -> maps authorization requests into policy evaluations
src/policies.ts -> built-in policy registry and manifests
src/storage.ts  -> rollout and decision event persistence
src/hub.ts      -> helpers for hub authorization request classification
```

## To Understand This Package, Read

1. **`src/types.ts`** - The request, decision, rollout, and telemetry contracts.
2. **`src/evaluate.ts`** - How requests become policy-engine input.
3. **`src/policies.ts`** - Which policy manifests are available.
4. **`src/storage.ts`** - How rollout and decision evidence is persisted.
5. **`test/authz.test.mjs`** - The current expected authorization behavior.

## Common Tasks

| Task | Start Here |
|------|------------|
| Evaluate a tool call | `evaluateAuthorizationRequest` in `src/evaluate.ts` |
| Add or inspect a policy | `src/policies.ts` |
| Record decision evidence | `src/storage.ts` |
| Validate the package | `pnpm --filter @create-something/mcp-authz test` |

## Escalation Notes

Stop when a decision cannot be traced to a request, policy manifest, rollout mode, and recorded event. Authorization without evidence is not acceptable for this package.
