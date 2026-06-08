# Remote MCP Identity Standard

This standard defines the required identity model for remote MCP access across CREATE SOMETHING systems.

## Goal

Use one coherent identity story across:

- remote Hub access
- `.agency` bearer-token delivery
- remote Worker MCPs
- delegated third-party OAuth flows

The system should avoid fragmented identity semantics between packages.

## Core Rule

Remote MCP identity uses:

- **bearer token** for client-to-CREATE SOMETHING access
- **OAuth** for delegated access to third-party tools and remote MCP hosts when required
- **tenant-aware actor context** on every protected execution path

## Identity Layers

### 1. Client access identity

This is how a user, host, or agent authenticates to a CREATE SOMETHING MCP surface.

Accepted patterns:

- managed bearer token
- MCP session token in first-party controlled flows
- OAuth-delivered bearer token where host compatibility requires OAuth onboarding
- operator-delivered managed bearer onboarding for approved white-glove customer setup, provided the credential still resolves through the same governed bearer model

### 2. Runtime actor context

This is the normalized context the system must resolve before execution.

Required fields:

- `accountId`
- `tenantId`
- `userId`
- `role`
- `identitySource`
- `toolMode`

Optional but recommended:

- `sessionId`
- `orgId` if distinct from tenant
- `allowedToolPrefixes`

### 3. Delegated provider identity

This is how CREATE SOMETHING accesses third-party systems on behalf of the actor.

Use:

- OAuth connect links
- provider auth configs
- provider-scoped connected accounts

This layer should not redefine the actor model used by the Hub.

## Canonical Rules

### Rule 1: Bearer is the portable host credential

The portable external credential for CREATE SOMETHING remote MCP access is the managed bearer token, not a raw upstream IdP token.

### Rule 2: OAuth is a delivery and delegation mechanism

OAuth may be required by a host or a third-party integration, but it should map back into CREATE SOMETHING's managed identity model.

### Rule 3: Client-supplied account headers are not trusted in protected remote flows

Protected remote flows should resolve identity from:

- bearer token
- session token
- trusted resolver

Not from arbitrary client-supplied account headers.

### Rule 4: Actor context must be normalized before tool execution

Protected tool execution must not proceed without normalized actor context.

### Rule 4a: Explicit tool prefixes are first-class identity scope

For non-toolkit lanes such as reviewer-specific Hub surfaces, the resolved actor context MUST be allowed to carry explicit `allowedToolPrefixes` that are not inferred from a generic toolkit profile. Resolver outputs and issuance APIs should treat these prefixes as governed scope data, not as incidental metadata.

### Rule 5: Tenant context is first-class

Authorization and entitlement checks must evaluate against the resolved tenant context, not just the user identity.

## Delivery Modes

### Session-required mode

Use for first-party or tightly controlled clients.

Expected behavior:

- gateway auth still applies
- session token resolves actor context
- tool access may be constrained by resolved prefixes or policy
- explicit `allowedToolPrefixes` may be required when the lane is a curated reviewer or custom Hub surface rather than a toolkit-derived surface

### Managed bearer mode

Use for partner delivery, third-party hosts, and portable long-lived access.

Expected behavior:

- one active bearer token per entitled user
- request-time entitlement checks remain live
- token remains governed by contract, policy, and billing state where applicable
- resolver output for the token must expose the effective `allowedToolPrefixes` transparently when a curated lane depends on them
- initial delivery may happen either through `.agency` self-service or a governed white-glove operator handoff
- follow-on revoke, regenerate, password rotation, and connection management should resolve to `.agency` unless a dedicated approved client shell replaces that surface

### OAuth compatibility mode

Use when the client host requires OAuth app onboarding.

Expected behavior:

- OAuth exchange ultimately yields access under the CREATE SOMETHING bearer-governed model
- host compatibility does not create a second independent identity system

## Onboarding Rule

White-glove onboarding is an approved delivery path for initial client access, but it does not create a separate identity model.

Required behavior:

- the delivered credential must still be a governed managed bearer or other explicitly approved credential type
- canonical portal identity subject binding must exist when that credential type requires it
- operator-only runtime bootstrap tokens must never be treated as customer credentials
- ongoing lifecycle actions should remain in `.agency` unless an explicitly approved client shell is the system of record

## Required Resolution Outputs

Identity resolution for protected remote MCP execution should produce:

```json
{
  "accountId": "acct_x",
  "tenantId": "tenant_y",
  "userId": "user_z",
  "role": "operator",
  "identitySource": "managed_bearer",
  "toolMode": "normal",
  "sessionId": "sess_optional",
  "allowedToolPrefixes": ["github_", "notion_"]
}
```

## Trust Rules

### Trust:

- resolved bearer subject
- resolver output from trusted identity-worker
- OAuth token exchange performed by trusted authority

### Do not trust:

- arbitrary `x-mcp-account-id` headers from remote callers
- tenant claims not backed by resolver or token authority
- connector-level identity hacks that bypass house policy evaluation

## Standard Failure Behavior

### Reject when:

- bearer token is invalid or revoked
- actor context cannot be resolved
- tenant entitlement is missing
- requested surface exceeds actor policy

### Degrade only when explicitly allowed:

- first-party compat lanes
- documented migration windows
- legacy exception paths with sunset dates

## Implementation Targets

This standard should govern:

- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [docs/AGENCY_BEARER_TOKEN_PRODUCTION_PLAN_2026-03-06.md](./AGENCY_BEARER_TOKEN_PRODUCTION_PLAN_2026-03-06.md)
- [packages/mcp-authz/src/hub.ts](../packages/mcp-authz/src/hub.ts)
- [packages/identity-worker/src/index.ts](../packages/identity-worker/src/index.ts)

## Recommended Next Work

1. Define one canonical resolver response shape and use it everywhere.
2. Remove remaining trust in client-supplied account headers on protected remote paths.
3. Ensure OAuth host compatibility reuses the managed bearer model instead of creating a parallel token model.
4. Make tenant-aware actor context mandatory for Hub-governed execution.
5. Treat explicit `allowedToolPrefixes` as a scalable first-class scope mechanism for non-Composio lanes.
