# auth.md

CREATE SOMETHING provides OAuth 2.0 access to a small, read-only agent discovery resource.

## Audience and boundary

The resource identifier is `https://createsomething.agency`. A valid access token may call `GET /api/agent-access` only. It does not authorize purchases, account changes, credential issuance, or writes to third-party systems.

## Discover

1. Fetch `https://createsomething.agency/.well-known/oauth-protected-resource`.
2. Fetch `https://id.createsomething.space/.well-known/oauth-authorization-server`.
3. Use the advertised `issuer`, authorization endpoint, token endpoint, and JWKS.

## Register and authorize

OAuth Dynamic Client Registration is available at `POST https://id.createsomething.space/oauth/register`. It creates a public OAuth client identifier only; it does not create an account or grant access.

Use the authorization-code flow with user authorization and PKCE (`S256`). Request the `mcp` scope and set `resource=https://createsomething.agency`. Send the resulting bearer token in the `Authorization` header when calling `/api/agent-access`.

## Recovery and revocation

When the protected resource returns `401`, discard the failed token and restart from its `resource_metadata` pointer. Access tokens are short-lived; use the advertised refresh-token flow only after the user has authorized the client.

CREATE SOMETHING does not publish autonomous account or credential provisioning. Do not probe or assume an `/agent/auth` endpoint.
