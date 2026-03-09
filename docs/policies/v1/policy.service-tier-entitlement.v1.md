# policy.service-tier-entitlement.v1

- Status: `draft`
- Owner: `CREATE SOMETHING product + identity + broker operations`
- Effective date: `TBD`

## Purpose

Define how service tier, commercial state, policy acceptance, and approved exceptions govern runtime access across free `MCP-only` access and paid `Policy OS` surfaces.

## Scope

- `.agency` service-tier and entitlement state
- managed bearer issuance and request-time bearer enforcement
- MCP hub discovery and execution where package tier changes visible or executable scope
- hosted product surfaces that expose `Policy OS`-only capabilities
- approved strategic free-wedge exceptions such as bounded intro deployments

## Policy Statements

1. Runtime authorization MAY distinguish among at least these service tiers:
   - `mcp_only`
   - `policy_os_trial`
   - `policy_os_core`
2. `mcp_only` is the default free introduction tier and MUST remain bounded to narrow scope unless an approved exception record explicitly grants additional access.
3. `policy_os_trial` is the first paid governed tier and MUST require active contract, active billing, required policy acceptance, and explicit service entitlement before paid governed capabilities are allowed.
4. `policy_os_core` is the recurring operating tier and MUST require the same commercial and policy gates as `policy_os_trial`, with additional access only where explicitly provisioned by contract or operator policy.
5. Runtime allow or deny decisions MUST evaluate, at minimum:
   - service tier
   - service entitlement
   - policy acceptance state
   - contract status
   - billing status
   - organization or workspace membership state where applicable
   - approved exception state where applicable
6. `MCP-only` users MUST NOT receive paid `Policy OS` capabilities by default, including:
   - broad governed write access
   - Policy OS-only hosted product surfaces
   - commercial operator services represented as self-service product features
7. Strategic free-wedge exceptions MAY temporarily widen `MCP-only` access, but MUST be explicit, bounded, auditable, and tied to a named graduation path into `Policy OS Trial`.
8. Exception handling MUST be modeled as data in entitlement or commercial state, not hardcoded per client in generic route authorization logic.
9. Where a request affects only safety or route risk, route authorization policy MAY decide independently of service tier. Where a request changes paid-versus-free product scope, service-tier entitlement policy MUST be evaluated before final allow.
10. Revocation, regeneration, incident response, and security containment actions MUST remain available regardless of commercial state.
11. Deny decisions produced by service-tier entitlement policy MUST return explicit machine-readable reason codes suitable for customer-facing UX and operator troubleshooting.
12. Pricing strategy, proposal language, and funnel copy MUST NOT be encoded directly in runtime policy; only enforceable entitlement and exception state belongs in runtime evaluation.

## Tier Expectations

### `mcp_only`

- Intended use:
  - education
  - trust setup
  - narrow proof wedge
- Default runtime posture:
  - read-only or tightly constrained tool scope
  - bounded discovery surface
  - no Policy OS-only product features
- Commercial expectation:
  - free by default
  - paid exception only for unusually heavy setup or advisory

### `policy_os_trial`

- Intended use:
  - first paid governed workflow
  - initial approvals and escalation behavior
  - policy artifacts and runbook introduction
- Default runtime posture:
  - governed workflow execution
  - paid hosted product surfaces for the contracted workflow
  - explicit write approval behavior where required

### `policy_os_core`

- Intended use:
  - recurring operating layer
  - ongoing governance and tuning
  - broader managed workflow ownership
- Default runtime posture:
  - paid governed execution
  - recurring review and operations controls
  - only the expanded surfaces explicitly provisioned for the account

## Approved Exception Model

Strategic free-wedge exceptions MUST capture:

- `exception_type`
- `approved_by`
- `approved_at`
- `reason`
- `allowed_scope`
- `expiration_or_review_date`
- `graduation_target`

Named client examples such as Outerfields MUST live in entitlement metadata or an equivalent governed ledger, not in hardcoded route branches.

## Enforcement Surfaces

- `.agency`
  - `packages/agency/src/lib/server/mcp-entitlements.ts`
  - `packages/agency/src/routes/api/internal/mcp-entitlements/check/+server.ts`
  - `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
  - `packages/agency/src/routes/api/admin/contracts/+server.ts`
  - `packages/agency/src/routes/api/stripe/webhook/+server.ts`
- identity worker and bearer governance
  - `packages/identity-worker/src/index.ts`
  - `packages/agency/src/lib/server/mcp-token.ts`
- broker and runtime authorization
  - `packages/mcp-authz/src/policies.ts`
  - `packages/mcp-authz/src/hub.ts`
  - `packages/cs-mcp-hub-remote/index.ts`
- hosted products
  - `packages/concierge-chat/*`

## Evidence

- canonical entitlement rows showing service tier and commercial state
- explicit deny reasons for tier, contract, billing, policy, or exception failures
- bearer request-time authorization logs tied to entitlement state
- hub deny or review traces showing service-tier gating before paid governed access
- operator mutation history for exception approvals and removals
- monthly review output showing which free wedges graduated, expired, or were narrowed

## Source Anchors

- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/lib/server/mcp-token.ts`
- `packages/agency/src/routes/api/internal/mcp-entitlements/check/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `packages/agency/src/routes/api/admin/contracts/+server.ts`
- `packages/agency/src/routes/api/stripe/webhook/+server.ts`
- `packages/mcp-authz/src/policies.ts`
- `packages/mcp-authz/src/hub.ts`
- `docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md`
- `docs/FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md`
- `docs/LOW_COST_HUB_CREATION_STANDARD_2026-03-09.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
