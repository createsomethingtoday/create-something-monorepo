# Retool Control Plane Setup

Retool is the UI/control plane for the monorepo. The monorepo remains the source of truth for contracts, manifests, code, policies, MCP servers, and delivery artifacts.

## Canonical Instance

- Retool origin: `https://createsomething.retool.com`
- Retool MCP: `https://createsomething.retool.com/mcp`
- Config manifest: `config/retool/control-plane.json`
- Infisical path: `/retool`
- Vendor boundary: `docs/guides/RETOOL_VENDOR_BOUNDARY.md`

## Store The Retool API Token

Create a Retool API token in Retool, copy it once, then store it from the clipboard:

```bash
INFISICAL_ENV=prod \
INFISICAL_PATH=/retool \
pnpm retool:token:store
```

The script refuses short or whitespace-containing clipboard values and never prints the token.
Do not store the plaintext token in repo files, docs, Loom evidence, or client-visible messages.

Stored names:

- `RETOOL_API_TOKEN`
- `RETOOL_ORIGIN`
- `RETOOL_API_BASE_URL`
- `RETOOL_MCP_URL`
- `RETOOL_MCP_SERVER_NAME`

## Connect Retool MCP To Codex

Retool's organization MCP server uses OAuth and lives at the Retool instance MCP URL.

```bash
pnpm retool:mcp:codex
```

This adds the Codex MCP server named `retool` and starts the OAuth login flow.
By default the helper requests `mcp:read,mcp:admin` so Codex can use Retool's admin MCP tools for organization, user, folder, workflow, environment, and resource inspection. Retool only grants `mcp:admin` when the authenticated Retool account is allowed to administer the organization.

To re-auth explicitly:

```bash
codex mcp logout retool
codex mcp login retool --scopes mcp:read,mcp:admin
```

Restart the active Codex session after re-authentication so the updated MCP tool surface is loaded.

## Connect CREATE SOMETHING MCP Inside Retool

In Retool, create a new MCP Server resource for the CREATE SOMETHING hub:

- Title: `CREATE SOMETHING MCP Hub`
- Description: `Brokered MCP hub for CREATE SOMETHING monorepo tools, delivery state, and governed workflow execution.`
- Server URL: `https://cs-mcp-hub-remote.createsomething.workers.dev/mcp`
- Authentication: Bearer token using a managed bearer issued by `identity-worker`

Do not use the local stdio hub for Retool. Retool should call the remote brokered hub.

## Delivery Graph

Retool should render from a generated monorepo manifest rather than manually maintained project state.

Generate the manifest:

```bash
pnpm retool:manifest -- --out tmp/retool-delivery-graph.json
```

Run the control-plane checks:

```bash
pnpm retool:manifest:check
```

The manifest includes:

- Retool instance and MCP endpoints
- Retool-facing surfaces: `Operator Console` and `Workflow Control Room`
- workspace lanes from `config/workspace-lanes.json`
- MCP registry and fleet deployments
- visibility levels for private, operator, client, audit, and public-redacted surfaces
- the lock-in boundary that keeps Retool as a replaceable UI/control plane

## Smoke Test

After storing the token:

```bash
pnpm retool:api:smoke
```

The smoke test loads `RETOOL_API_TOKEN` from Infisical and calls a Retool API path without printing the token.

If the current token is intentionally scope-limited, a Retool `403` response still proves the token was accepted but lacks the requested endpoint scope. For org/user automation, issue a token with the required Retool API scopes. For MCP automation, prefer the OAuth-based Retool MCP connection.
