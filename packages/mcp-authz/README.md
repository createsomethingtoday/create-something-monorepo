# @create-something/mcp-authz

Shared authorization contracts for CREATE SOMETHING MCP surfaces.

This package adapts broker, identity, and tool-call authorization requests into POLICY OS constraint evaluations. It exposes policy manifests, rollout controls, decision telemetry, and helpers used by MCP hubs and downstream servers.

## Core Concepts

- `AuthorizationRequest` captures actor, action, resource, and context.
- `evaluateAuthorizationRequest` maps authorization input into a POLICY OS constraint decision.
- Policy manifests bind policy IDs to compiled Polar source and fallback IR.
- Rollout storage records legacy, shadow, and Polar enforcement mode by policy/entity scope.
- Decision event storage records fallback, mismatch, latency, and final decision evidence.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/index.ts`, `src/evaluate.ts`, `src/policies.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | TypeScript check output, node test output, authorization decision events, rollout rows |
| UI validation path | none |
| Escalation rule | stop if an authorization decision cannot be traced to a policy manifest, rollout config, request input, and recorded decision event |

## Development

```bash
pnpm --filter @create-something/mcp-authz check
pnpm --filter @create-something/mcp-authz test
```

## Related Packages

- `@create-something/policy-os-engine`
- `@create-something/cs-mcp-hub`
- `@create-something/mcp-core`
