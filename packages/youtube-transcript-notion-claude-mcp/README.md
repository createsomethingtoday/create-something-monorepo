# YouTube Transcript Notion Claude MCP Wrapper

Claude custom connectors do not accept a static bearer token in the connector
form. This Worker adds a Claude-compatible password-only OAuth layer in front of
the existing bearer-protected MCP:

`https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp`

The wrapper issues Claude an OAuth access token scoped to this wrapper after the
operator enters `OAUTH_LOGIN_PASSWORD`. The upstream MCP bearer token stays in
Worker secrets and is only used server-side while proxying `/mcp` traffic.

No Clerk integration is required. Access is operationally controlled by rotating
and distributing the shared connector password only to approved Half Dozen
users.

## Runtime Contract

- `GET /` and `GET /health` return setup/status metadata.
- `GET /.well-known/oauth-authorization-server` advertises OAuth endpoints.
- `GET /mcp/.well-known/oauth-authorization-server` mirrors the same metadata
  for clients that discover under the MCP path.
- `GET /.well-known/oauth-protected-resource` advertises `/mcp` as the protected
  MCP resource.
- `GET /mcp/.well-known/oauth-protected-resource` mirrors protected-resource
  metadata under the MCP path.
- `GET /oauth/authorize` renders a password-gated authorization page.
- `POST /oauth/authorize` validates `OAUTH_LOGIN_PASSWORD` and redirects back
  with an authorization code.
- `POST /oauth/token` exchanges authorization codes or refresh tokens for
  wrapper-scoped bearer tokens.
- `POST /oauth/register` supports dynamic client registration for hosts that
  require it.
- `/mcp` requires a wrapper OAuth bearer token and then proxies to the upstream
  MCP with `UPSTREAM_MCP_BEARER_TOKEN`.

## Claude Setup

Use this wrapper URL in Claude's custom connector form:

```text
https://youtube-transcript-notion-claude-mcp.createsomething.workers.dev/mcp
```

Leave OAuth Client ID and OAuth Client Secret blank unless Claude requires
manual client credentials for the workspace. The wrapper accepts dynamically
registered clients and public OAuth clients.

When Claude opens the authorization page, enter the shared connector password.

## Secrets

Set these in Wrangler or an Infisical-backed deploy:

```bash
cd packages/youtube-transcript-notion-claude-mcp
pnpm exec wrangler secret put UPSTREAM_MCP_BEARER_TOKEN
pnpm exec wrangler secret put OAUTH_SIGNING_SECRET
pnpm exec wrangler secret put OAUTH_LOGIN_PASSWORD
```

`UPSTREAM_MCP_BEARER_TOKEN` should be the existing bearer token from Infisical:

```text
prod /youtube-transcript-notion-mcp MCP_BEARER_TOKEN
```

## Validation

```bash
pnpm --filter @create-something/youtube-transcript-notion-claude-mcp typecheck
pnpm --filter @create-something/youtube-transcript-notion-claude-mcp test
```

After deployment, verify discovery:

```bash
tsx scripts/verify-mcp-oauth-discovery.ts --hosts=https://youtube-transcript-notion-claude-mcp.createsomething.workers.dev
```

## Boundaries

This package does not change the Dify MCP integration. Dify should continue to
use the original bearer-protected upstream URL directly.
