# auth.md

CREATE SOMETHING provides OAuth 2.0 access to a small, read-only agent discovery resource.

## Audience and boundary

The resource identifier is `https://createsomething.agency`. A valid access token may call `GET /api/agent-access` only. It does not authorize purchases, account changes, credential issuance, or writes to third-party systems.

## Discover

1. Fetch `https://createsomething.agency/.well-known/oauth-protected-resource`.
2. Fetch `https://id.createsomething.space/.well-known/oauth-authorization-server`.
3. Use the advertised `issuer`, authorization endpoint, token endpoint, and JWKS.

## Anonymous agent registration

Agents that need only the public discovery directory can obtain a short-lived, browserless credential without creating an account:

```json
POST https://id.createsomething.space/agent/auth
{
  "type": "anonymous",
  "requested_credential_type": "access_token",
  "resource": "https://createsomething.agency"
}
```

The response contains a Bearer access token with the `mcp` scope and a 15-minute lifetime. The token works only with `GET /api/agent-access`. Registration is rate-limited to ten requests per source address per minute. `POST https://id.createsomething.space/agent/claim` accepts that Bearer token and returns a verifiable scope receipt; it does not create an account or issue a replacement credential.

## User-authorized OAuth

OAuth Dynamic Client Registration is available at `POST https://id.createsomething.space/oauth/register`. It creates a public OAuth client identifier only; it does not create an account or grant access.

Use the authorization-code flow with user authorization and PKCE (`S256`). Request the `mcp` scope and set `resource=https://createsomething.agency`. Send the resulting bearer token in the `Authorization` header when calling `/api/agent-access`.

## Recovery and revocation

When the protected resource returns `401`, discard the failed token and register again from the Authorization Server metadata. Anonymous credentials cannot be refreshed, claimed into an account, or used beyond their 15-minute lifetime. User-authorized OAuth clients may use the advertised refresh-token flow only after the user has authorized the client.
