# Service-Tier Entitlement OSO Mapping

## Purpose

Map the new `policy.service-tier-entitlement.v1` artifact onto the current `.agency` and `mcp-authz` runtime surfaces so the free `MCP-only` wedge and paid `Policy OS` lanes become enforceable without pushing sales copy into policy code.

## Decision

The repo should treat service tier as a runtime entitlement input, not just a commercial label.

That means:

- `.agency` remains the source of truth for commercial and exception state.
- `mcp-authz` and hub runtime consume a normalized entitlement snapshot.
- pricing rationale, proposal language, and packaging copy remain outside OSO.

## Canonical Runtime Inputs

The current `.agency` entitlement model already provides most of the required fields in [packages/agency/src/lib/server/mcp-entitlements.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/src/lib/server/mcp-entitlements.ts):

- `service_tier`
- `managed_bearer_allowed`
- `org_membership_active`
- `service_entitled`
- `policy_accepted`
- `contract_active`
- `billing_active`
- `denial_reason`
- `metadata_json`

Recommended normalized runtime snapshot:

```json
{
  "serviceTier": "mcp_only | policy_os_trial | policy_os_core",
  "managedBearerAllowed": true,
  "orgMembershipActive": true,
  "serviceEntitled": true,
  "policyAccepted": true,
  "contractActive": true,
  "billingActive": true,
  "approvedException": {
    "present": false,
    "type": null,
    "allowedScope": null,
    "graduationTarget": null,
    "reviewBy": null
  }
}
```

## Current Repo Mapping

### Already present

- `service_tier` already exists on entitlement, commercial, and seed rows.
- live bearer checks already use:
  - `service_entitled`
  - `policy_accepted`
  - `contract_active`
  - `billing_active`
- `.agency` already exposes explicit deny reasons such as:
  - `service_not_entitled`
  - `policy_acceptance_required`
  - `contract_inactive`
  - `billing_inactive`

### Still missing or inconsistent

- canonical tier values are not yet standardized around:
  - `mcp_only`
  - `policy_os_trial`
  - `policy_os_core`
- approved exception fields are not yet modeled as a clear shared contract
- hub runtime does not yet consume a normalized service-tier entitlement snapshot before all paid-scope decisions
- some seed and default flows still use generic tiers like `agency`

## What Belongs In OSO

OSO should govern:

- whether this account is free `MCP-only` or paid `Policy OS`
- whether commercial prerequisites are satisfied for paid governed access
- whether an approved exception temporarily widens a free wedge
- whether a hosted product surface is `Policy OS`-only
- whether governed write access is allowed at this tier

## What Does Not Belong In OSO

OSO should not hold:

- pricing bands
- proposal language
- sales funnel copy
- strategic rationale for why `MCP-only` is free
- marketing package descriptions

## Recommended Enforcement Split

### `.agency`

Owns:

- contract state
- billing state
- policy acceptance state
- service tier assignment
- exception approval records
- customer-facing deny explanations

### `mcp-authz` / hub

Owns:

- consuming the normalized entitlement snapshot
- gating paid-only surfaces
- enforcing narrow free-wedge scope
- recording matched rule IDs and deny reasons

## Suggested Evaluation Order

1. Resolve actor and tenant context.
2. Resolve current entitlement snapshot from `.agency`.
3. Evaluate `policy.service-tier-entitlement.v1`.
4. Evaluate route-risk policy such as `policy.hub-route-authorization.v1`.
5. Merge outcomes so commercial deny happens before paid-scope allow.

## Exception Handling

The Outerfields intro case should be represented as an entitlement exception record, not as a route-specific hardcode.

Recommended metadata shape:

```json
{
  "exception_type": "strategic_free_wedge",
  "approved_by": "operator-or-exec-id",
  "approved_at": "2026-03-09T00:00:00Z",
  "reason": "Intro deployment for Half Dozen system team",
  "allowed_scope": "bounded_outerfields_mcp_only",
  "expiration_or_review_date": "2026-06-09T00:00:00Z",
  "graduation_target": "policy_os_trial"
}
```

## Implementation Recommendations

1. Standardize `service_tier` values in `.agency` and Stripe/product mapping.
2. Add approved exception fields to entitlement metadata or a dedicated governed table.
3. Expose a normalized entitlement snapshot to hub runtime before paid-scope decisions.
4. Add `policy.service-tier-entitlement.v1` to the canonical policy catalog and policy review cadence.
5. Only after the input contract is stable, wire a concrete `mcp-authz` runtime evaluator for this policy.

## Source Anchors

- [packages/agency/src/lib/server/mcp-entitlements.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/src/lib/server/mcp-entitlements.ts)
- [packages/agency/src/routes/api/stripe/webhook/+server.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/src/routes/api/stripe/webhook/%2Bserver.ts)
- [packages/mcp-authz/src/policies.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/mcp-authz/src/policies.ts)
- [docs/policies/v1/policy.user-bearer-token-governance.v1.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/policies/v1/policy.user-bearer-token-governance.v1.md)
- [docs/policies/v1/policy.hub-route-authorization.v1.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/policies/v1/policy.hub-route-authorization.v1.md)
- [docs/FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md)
- [docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)
