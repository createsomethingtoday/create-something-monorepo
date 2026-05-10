# Retool Control Plane Setup

Retool is the UI/control plane for the monorepo. The monorepo remains the source of truth for contracts, manifests, code, policies, MCP servers, and delivery artifacts.

## Canonical Instance

- Retool origin: `https://createsomething.retool.com`
- Retool MCP: `https://createsomething.retool.com/mcp`
- Config manifest: `config/retool/control-plane.json`
- Workspace inventory: `config/retool/inventory.json`
- Generated inventory view: `docs/RETOOL_WORKSPACE_INVENTORY.generated.md`
- Infisical path: `/retool`
- Eval suite: `evals/braintrust/retool/control-plane.eval.ts`
- Vendor boundary: `docs/guides/RETOOL_VENDOR_BOUNDARY.md`

## Store The Retool API Token

Create a Retool API token in Retool, copy it once, then store it from the clipboard:

```bash
INFISICAL_ENV=prod \
INFISICAL_PATH=/retool \
pnpm retool:token:store
```

The script refuses short or whitespace-containing clipboard values and never prints the token.
Do not store the plaintext token in repo files, docs, Linear evidence, or client-visible messages.

Stored names:

- `RETOOL_API_TOKEN`
- `RETOOL_ORIGIN`
- `RETOOL_API_BASE_URL`
- `RETOOL_MCP_URL`
- `RETOOL_MCP_SERVER_NAME`

Retool access tokens are created from Settings > Retool API, can only be copied once, and must be minted with the scopes required by the target endpoint. The production smoke path is `/users`, which requires `users:read` or `mcp:admin`. In the current workspace UI, the visible scope that maps to this production smoke path is `Retool RPC` > `All`. Write scopes imply read access, but do not rely on broad write scopes for daily automation.

For Spaces, use the Space-specific Retool API endpoint and token. A primary organization token should only be used against a Space when the token creator is an admin in both the primary organization and that Space.

## Connect Retool MCP To Codex

Retool's organization MCP server uses OAuth and lives at the Retool instance MCP URL.

```bash
pnpm retool:mcp:codex
```

This adds the Codex MCP server named `retool` and starts the OAuth login flow.
By default the helper requests only `mcp:read` for daily inspection.

For an explicit admin inventory or administration session:

```bash
pnpm retool:mcp:codex:admin
```

The admin helper requests `mcp:read,mcp:admin` so Codex can use Retool's admin MCP tools for organization, user, folder, workflow, environment, and resource inspection. Retool only grants `mcp:admin` when the authenticated Retool account is allowed to administer the organization.

To re-auth explicitly:

```bash
codex mcp logout retool
codex mcp login retool --scopes mcp:read
```

Restart the active Codex session after re-authentication so the updated MCP tool surface is loaded.

Retool's MCP server is distinct from a Retool MCP Server resource. The organization MCP server lets external coding agents inspect and manage Retool organization/user/resource surfaces over OAuth and streamable HTTP. A Retool MCP Server resource lets Retool apps, workflows, and agents call external MCP functionality.

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
pnpm retool:inventory:check
pnpm braintrust:eval:retool:local
```

The manifest includes:

- Retool instance and MCP endpoints
- Retool-facing surfaces: `Operator Console` and `Workflow Control Room`
- workspace lanes from `config/workspace-lanes.json`
- MCP registry and fleet deployments
- visibility levels for private, operator, client, audit, and public-redacted surfaces
- the lock-in boundary that keeps Retool as a replaceable UI/control plane
- the Retool inventory summary, Linear evidence path, and Braintrust eval gates

Generate the workspace inventory document:

```bash
pnpm retool:inventory:generate
```

Run the full local Retool verification suite:

```bash
pnpm retool:verify
```

## Smoke Test

After storing the token:

```bash
pnpm retool:api:smoke
```

The smoke test loads `RETOOL_API_TOKEN` from Infisical and calls a Retool API path without printing the token.

Production smoke requires a `200` on the configured path. If the current token is intentionally scope-limited, this auth-only diagnostic can be run explicitly:

```bash
RETOOL_API_SMOKE_ACCEPT_FORBIDDEN=true pnpm retool:api:smoke
```

A Retool `403` only proves the token was accepted but lacks the requested endpoint scope; it is not a production smoke pass. For org/user automation, issue a token with the required Retool API scopes. For MCP automation, prefer the OAuth-based Retool MCP connection.

## Official References

- Retool API overview: `https://docs.retool.com/org-users/quickstart#retool-api`
- Retool API authentication: `https://docs.retool.com/org-users/guides/retool-api/authentication`
- User onboarding automation: `https://docs.retool.com/org-users/guides/retool-api/automate-onboarding`
- Spaces automation: `https://docs.retool.com/org-users/guides/retool-api/automate-spaces`
- Retool MCP server: `https://docs.retool.com/org-users/guides/mcp`
