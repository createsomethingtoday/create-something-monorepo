# Hub Execution Governance Plan

This plan defines how the CREATE SOMETHING Hub should govern downstream MCP execution.

## Goal

Turn the Hub from a routing surface into a real execution governance layer.

The Hub should not only know **where** to send a call. It should decide **whether**, **how**, and **under what limits** that call should execute.

## Scope

This plan applies to:

- remote Hub deployments
- shared connector surfaces
- brokered downstream tool execution
- tenant-aware execution paths

It is most relevant to:

- `hub_execute_proxy_tool`
- `hub_run_proxy_tool`
- `hub_run_intent`

## Required Execution Pipeline

Every downstream execution should follow this order:

1. resolve actor context
2. classify route
3. evaluate authorization
4. enforce quota and rate limits
5. apply retry/backoff policy
6. execute downstream call
7. emit telemetry and trace records

## Control Stages

### 1. Resolve actor context

Required context:

- `accountId`
- `tenantId`
- `userId`
- `sessionId` when present
- `role`
- `toolMode`
- `identitySource`

The Hub should fail closed when required context is missing for protected remote execution.

### 2. Classify route

Use route classification to determine:

- read
- write
- destructive
- auth admin
- control plane

This logic already has a starting point in [packages/mcp-authz/src/hub.ts](../packages/mcp-authz/src/hub.ts).

### 3. Evaluate authorization

Authorization should consider:

- actor role
- tenant policy
- server allow/deny rules
- tool prefix allow/deny rules
- access mode (`normal`, `read_only`, `off`)
- write/destructive restrictions
- OAuth or delegated-access requirements

### 4. Enforce quotas and rate limits

Quota and rate limits should be enforced before downstream invocation.

Minimum controls:

- per-account call limits
- per-tenant call limits
- optional per-server and per-tool caps
- separate controls for read and write/destructive operations

Recommended initial ordering:

- hard deny if quota exhausted
- hard deny if access mode blocks category
- soft deny or backoff on rate-limit breach depending on class

### 5. Apply retry and backoff

Retry should be policy-driven, not connector-specific by default.

Recommended rules:

- reads: safe retry allowed
- writes: retry only for explicitly idempotent operations
- destructive actions: no automatic retry unless explicitly approved

Required retry inputs:

- route classification
- idempotency signal
- provider-specific transient error map
- max attempts
- base delay
- max delay

### 6. Execute downstream call

Execution should happen only after all control stages pass.

Hub responsibilities:

- preserve correlation id
- normalize headers and identity forwarding
- normalize provider failure shapes into house errors where possible

### 7. Emit telemetry and trace records

Minimum output:

- correlation id
- actor context summary
- route classification
- authz decision
- quota/rate-limit decision
- retry activity
- downstream result status
- latency

## Policy Matrix

| Access type | Authz required | Quota required | Retry default |
|-------------|----------------|----------------|---------------|
| Read | Yes | Yes | Safe retry |
| Write | Yes | Yes | Idempotent-only |
| Destructive | Yes, stricter | Yes | Off by default |
| Auth admin | Yes, strict | Yes | Off by default |
| Control plane | Yes, operator-only | Yes | Off by default |

## Recommended Runtime Controls

### Immediate controls

- `MCP_TOOL_ACCESS_MODE`
- per-account rate limits
- per-account monthly quota
- route classification gates

### Near-term controls

- per-tenant quotas
- per-server budgets
- per-tool budgets for expensive or high-risk actions
- review hooks for destructive categories

## Failure Policy

### Fail closed when:

- actor context is unresolved
- authz evaluation fails
- quota is exceeded
- access mode blocks the route

### Retry when:

- the route policy allows it
- the provider error is classified as transient
- the attempt count is within policy

### Do not retry when:

- the operation is destructive
- the operation is non-idempotent and write-capable
- the error is auth, permission, schema, or policy related

## Operational Rollout

### Phase 1

- wire centralized pre-execution middleware
- enable route classification for every proxied call
- emit consistent trace records

### Phase 2

- enforce per-account quota and rate limits
- standardize retry/backoff behavior
- normalize downstream error classes

### Phase 3

- add tenant-aware budgets
- add review hooks for destructive flows
- add provider-specific policy overlays where needed

## Success Criteria

The Hub should be considered governance-ready when:

- every downstream call passes through one policy runtime
- no protected route executes without actor context
- quota and rate-limit controls block calls in practice, not just in metadata
- retries are auditable and policy-driven
- correlation and trace lookup cover both hub and downstream execution

## Related Docs

- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md](./STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md)
- [docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md](./HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md)
