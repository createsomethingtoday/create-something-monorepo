# ChatGPT MCP OAuth Managed Bearer Contract

This document defines the CREATE SOMETHING contract for exposing MCP hubs to ChatGPT while preserving the current bearer-token and resolver-based hub behavior.

## Decision

When a host such as ChatGPT requires OAuth, CREATE SOMETHING uses OAuth as the onboarding and credential-delivery layer only. The credential ultimately presented to Hub remains the existing managed long-lived bearer token already resolved by `identity-worker`.

OAuth in this model does not imply short-lived Hub-only session tokens.

## Required Model

1. ChatGPT signs in through an OAuth/OIDC surface exposed by `identity-worker`.
2. `identity-worker` may mint the OAuth authorization code as a signed token that carries the authorize-request context needed for exchange.
3. The OAuth token exchange returns the user's managed long-lived MCP bearer token as the `access_token`.
4. ChatGPT calls the Hub MCP endpoint with `Authorization: Bearer <managed bearer token>`.
5. Hub authorization logic remains unchanged:
   - shared `HUB_API_TOKEN` continues to work for existing clients
   - managed user bearer tokens continue to resolve through `HUB_SESSION_RESOLVE_URL`
   - legacy compatibility behavior remains governed separately by policy

## Non-Goals

- Do not require ChatGPT to send `X-MCP-Session-Token`.
- Do not replace existing bearer-token clients with short-lived-only OAuth sessions.
- Do not expose the shared worker/runtime `HUB_API_TOKEN` to end users or third-party hosts.
- Do not mint a second, host-specific credential type unless policy is revised.

## Endpoint Contract

### Identity Worker

`identity-worker` is the OAuth authority and should expose:

- `/.well-known/oauth-authorization-server`
- `/.well-known/openid-configuration`
- `/oauth/authorize`
- `/oauth/token`
- `/oauth/register` when host registration requires it
- `/oauth/userinfo` when OIDC/domain claim support is required

### Hub

Each Hub custom domain should expose OAuth discovery metadata and MCP endpoint metadata, but the Hub should not become the primary token issuer.

Hub discovery responses should point back to the shared identity service for:

- authorization endpoint
- token endpoint
- registration endpoint
- OIDC metadata and userinfo, when enabled

The Hub remains the MCP resource server at `/mcp`.

## Security Rules

1. The OAuth-delivered access token must be the same managed bearer token already governed by `.agency` and `identity-worker`.
2. Managed bearer tokens must remain revocable, regenerable, auditable, and subject to live request-time authorization checks.
3. Signed authorization codes are valid in this model; they do not need to be database-persisted opaque codes if they are bound to the original OAuth request context.
4. OAuth discovery and registration must never surface the shared hub runtime token.
5. UI may reveal a managed bearer token only at explicit issuance or regeneration time.
6. ChatGPT-facing OAuth support must not degrade the current bearer-token experience for existing MCP clients.

## Identity Rules

1. The `.agency` portal login uses Clerk.
2. The interactive password entered on the OAuth authorize page is an `identity-worker` credential, not a Clerk password.
3. That OAuth login password is separate from the managed bearer token and separate from the Clerk session.
4. `.agency` should show the linked MCP email and account or tenant context for the OAuth login credential.
5. `.agency` should allow the entitled user to set or rotate that password without revealing any previously stored plaintext password.
6. If the system generates a temporary password, it may be revealed only once at issuance or reset time.

## Operational Rules

1. Existing `compat` bearer clients must continue to authenticate without OAuth changes.
2. Strict `session_required` hubs may continue to serve first-party session-token clients, but ChatGPT compatibility must use bearer auth through OAuth delivery.
3. Production rollout is incomplete unless:
   - OAuth discovery works from the Hub custom domain
   - token exchange returns a managed bearer token recognized by the resolver
   - the entitled user can manage the OAuth login password from `.agency`
   - ChatGPT can complete MCP connection setup end-to-end
   - revoke/regenerate in `.agency` immediately affects ChatGPT access

## Source Anchors

- `packages/cs-mcp-hub-remote/index.ts`
- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/README.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`
- `docs/MCP_HUB_REMOTE_DEPLOY.md`
