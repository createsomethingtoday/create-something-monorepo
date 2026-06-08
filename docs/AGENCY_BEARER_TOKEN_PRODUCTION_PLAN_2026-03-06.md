# `.agency` Bearer Token Production Plan

> Provider note: this March 2026 plan originally used Auth0-specific wording. `.agency` now uses Clerk for portal identity; preserve the bearer-governance model, but do not use Auth0 as the current identity-provider assumption.

## Decision

CREATE SOMETHING will support a permanent, customer-facing bearer-token product through `.agency` with the following constraints:

- one active bearer token per authenticated user
- token is long-lived by default
- token is intended for third-party hosts, local tools, and background agents
- token is issued by `.agency`, not raw upstream identity-provider tokens
- token remains continuously governed by live entitlement checks

This is not the same as the repo's current temporary "legacy key" exception lane.

## Current Repo State

The monorepo already contains:

- short-lived MCP session issuance in [`packages/identity-worker/src/index.ts`](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/identity-worker/src/index.ts)
- resolver support for both session tokens and legacy personal bearer keys in [`packages/identity-worker/README.md`](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/identity-worker/README.md)
- a draft credential-delivery policy for temporary legacy compatibility in [`docs/policies/v1/policy.mcp-credential-delivery.v1.md`](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/policies/v1/policy.mcp-credential-delivery.v1.md)

The current implementation does not yet match the desired production model because:

- `legacy keys` are framed as exceptions, not the primary product
- legacy TTL is currently bounded to 30 days in the identity worker
- legal/contract/billing requirements are not yet formalized as a unified bearer-token control policy
- there is no declared customer-facing `.agency` token-management surface in the repo

## Production Architecture

### Identity

- Clerk is the current portal identity provider
- every bearer token is bound to one canonical portal identity subject
- bearer token issuance requires authenticated access through `.agency`

### Token

- token type: opaque managed bearer token
- cardinality: one active token per user
- lifecycle: create, copy once, revoke, regenerate
- regeneration invalidates prior token immediately

### Authorization

Every bearer-token request must be checked against:

- token status
- user status
- organization membership
- requested org context
- requested MCP/service entitlement
- required policy acceptance
- contract status
- billing status

### Runtime Boundaries

- Clerk: portal identity only
- `.agency`: token issuance, UI, legal acceptance, entitlement broker
- MCP hub/gateway: request-time enforcement
- Stripe: billing source of truth
- contract system: legal signature source of truth
- Infisical: runtime secret storage for system-side credentials

## Legal Package Required For Launch

This token model needs to be reflected in legal, not just engineering.

Required legal artifacts:

1. Bearer Token Policy
2. `.agency` Terms / MSA language
3. Security / trust-center disclosure
4. Acceptable use language for third-party hosts and background agents
5. Incident response language for token compromise

### Required Legal Positions

Legal should explicitly state:

- bearer tokens are high-trust credentials
- each token is personal to one authenticated user
- tokens may be long-lived and used in external hosts and agents
- tokens may not be shared
- access remains contingent on org membership, contract status, policy acceptance, and billing state
- CREATE SOMETHING may revoke access immediately for risk, misuse, legal, or commercial reasons

## Engineering Changes Required

### 1. Replace exception framing

Current `legacy key` handling in the identity worker should be replaced or superseded by a permanent long-lived bearer-token flow.

Needed change:

- add a first-class long-lived token issuance path instead of treating bearer delivery as a compatibility exception

### 2. Remove 30-day compatibility ceiling for the permanent token model

Current legacy constants in [`packages/identity-worker/src/index.ts`](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/identity-worker/src/index.ts) enforce short bounded TTLs for compatibility keys.

Needed change:

- define a separate long-lived token policy and persistence path
- do not overload compatibility TTL constants for the production bearer-token product

### 3. Add `.agency` token-management UI

Needed surface:

- `Settings > Bearer Token`

Required actions:

- create token
- reveal token once
- revoke token
- regenerate token
- display last-used metadata
- display warning that regeneration breaks existing hosts

### 4. Add org-context enforcement in the gateway

If a user belongs to multiple orgs, each bearer-token request must resolve to a specific org context and be checked against that org's entitlements.

### 5. Add legal/commercial enforcement hooks

Bearer-token authorization must query:

- contract state
- billing state
- policy acceptance state

Access must fail closed when any required prerequisite becomes invalid.

### 6. Add incident and audit controls

Required telemetry:

- token issuance
- token regeneration
- token revocation
- request allow/deny
- last-used metadata
- suspicious activity review hooks

## Product Rules

- one token per user
- no shared team token
- no exposure of raw portal identity-provider tokens as the portable host credential
- no access if user or org is no longer in good standing

## Rollout Recommendation

### Phase 1

- approve the policy and legal language
- keep current session flow unchanged
- implement permanent bearer-token schema and endpoints

### Phase 2

- ship `.agency` token UI
- add gateway enforcement for contract, billing, and policy state
- launch for internal operators and one pilot client org

### Phase 3

- migrate legacy exception users to the permanent token model
- retire the framing of bearer delivery as a temporary exception

## Launch Gate

Do not call this production-ready until all of the following are true:

- policy approved
- legal text approved
- permanent token issuance path implemented
- one-token-per-user enforcement implemented
- live entitlement checks implemented
- revoke/regenerate flows implemented
- audit and incident-review flows implemented
- `.agency` UI implemented

## Recommended Next Work Items

1. Convert the new bearer-token policy into website-facing legal copy.
2. Implement a dedicated long-lived token model in `identity-worker` instead of reusing the legacy exception lane.
3. Build the `.agency` token-management screen and connect it to the new endpoints.
4. Add request-time entitlement checks for contract, billing, and policy acceptance.
