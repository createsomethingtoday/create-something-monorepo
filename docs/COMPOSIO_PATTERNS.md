# Composio patterns (global)

When to use Composio for app connectivity, how we wrap it, and where the SDK surfaces fit. For package-level API details see `packages/composio-bridge/` and [DOCS_REFERENCE.md](packages/composio-bridge/DOCS_REFERENCE.md). For evaluation see [internal/COMPOSIO_EVALUATION.md](internal/COMPOSIO_EVALUATION.md).

## When to use Composio vs custom

| Use Composio                                                         | Use custom CREATE SOMETHING MCPs                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Commodity app connectivity (Gmail, Notion, Slack, HubSpot, etc.)     | Deep or client-specific integrations (e.g. Half Dozen Gmail Sync: custom OAuth, Notion schema, automations) |
| You want managed auth (OAuth, connect links) and standard CRUD tools | You need full control over tokens, lifecycle, or an app not on Composio                                     |
| New MCP for "most users" or multi-tenant with generic app actions    | Single-client MCP with fixed schema and custom workflows                                                    |

**Default**: For new MCPs that need "connect to Gmail/Notion/Slack/…", consider Composio first via `@create-something/composio-bridge`. Use custom when the integration is strategic or client-specific.

## Notion-specific decision matrix

Notion now has first-party Worker and hosted MCP surfaces. Treat them as delivery channels, not replacements for the house MCP pattern.

| Surface                         | Use when                                                                                                                            | Avoid when                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Composio wrapped by our MCP** | The workflow needs generic Notion plus other SaaS CRUD tools with managed OAuth.                                                    | The workflow needs fixed client schema semantics, our custom Notion policies, or deep workspace-specific behavior. |
| **CREATE SOMETHING MCP**        | The workflow needs cross-client governed execution, telemetry, bearer-token routing, headless agents, or dual-workspace operations. | The workflow only needs a small capability inside a Notion Custom Agent.                                           |
| **Notion hosted MCP**           | A human user wants to connect their Notion workspace to ChatGPT, Claude, Cursor, or another supported AI client.                    | The agent is headless, bearer-token based, or needs CREATE SOMETHING resources/prompts/telemetry.                  |
| **Notion Workers Agent Tools**  | A capability should run inside a Notion Custom Agent with `context.notion` and Notion-scoped permissions.                           | The tool needs our fleet gateway, non-Notion runtime controls, or broad external orchestration.                    |
| **Notion Workers Syncs**        | The target is a greenfield Notion-managed mirror database.                                                                          | The client already owns the target database/schema; current Syncs do not yet sync into existing databases.         |

See [guides/NOTION_WORKERS_AND_CLI_2026.md](./guides/NOTION_WORKERS_AND_CLI_2026.md) and [packages/notion-worker-experiments](../packages/notion-worker-experiments) for the repo-local spike path.

## Commercial packaging (Codex vector)

Composio usage does **not** change the commercial packaging rule:

- `MCP-only` remains a narrow discovery/compliance offer.
- `Policy OS` (agents + MCPs + governed execution) is the default paid delivery.
- Codex is the primary setup/demo vector, but MCP/policy artifacts remain portable.

## Wrap pattern

Clients see a CREATE SOMETHING MCP server; Composio is plumbing. We do not expose Composio as a product name.

- **Bridge**: `packages/composio-bridge` — `ComposioToolFactory` fetches tool definitions from Composio and registers them as MCP tools; `ComposioClient.executeTool()` delegates execution. Supports both `ScopedMcpServer` (with AccountContext) and raw `McpServer` via `registerToolsOnMcpServer(server, entityId)`.
- **Example in repo**: [packages/halfdozen-zoom-sync](packages/halfdozen-zoom-sync) — Zoom Clips are custom (Steel.dev); Zoom API tools (meetings, recordings) are optional and come from Composio via the bridge. See worker `index.ts` (ComposioToolFactory + registerToolsOnMcpServer) and [src/tools/zoom-api-auth.ts](packages/halfdozen-zoom-sync/src/tools/zoom-api-auth.ts) for connect-link flow.

## SDK surfaces (reference)

| Surface         | Purpose                                                                                                                    | Our usage                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Tools**       | Discovery (`getRawComposioTools`, `getRawComposioToolBySlug`), execution (`execute`), custom tools (`createCustomTool`)    | Bridge uses getRawComposioTools + execute. Custom tools can extend value-add; execute() dispatches by slug.                        |
| **Toolkits**    | `authorize(userId, toolkitSlug, authConfigId?)` for connect links; `get(slug)`, `listCategories()` for metadata            | Use for programmatic "Connect Gmail/Notion" flows and optional resources.                                                          |
| **AuthConfigs** | create, list, get, update, disable, delete auth configs per toolkit                                                        | When you need an `authConfigId` for authorize() or for Composio-hosted MCP configs.                                                |
| **MCP**         | `create(name, mcpConfig)` (toolkits + allowedTools + authConfigIds), `generate(userId, mcpConfigId)` for per-user MCP URLs | Optional: Composio can host the MCP endpoint (tools-only; no prompts/resources). We usually run our own server for full value-add. |

Official reference: [Composio TypeScript SDK](https://docs.composio.dev/reference/sdk-reference/typescript).

## Single-toolkit hosted MCPs

Use this when the goal is a narrow Composio-hosted MCP for one commodity toolkit and we do not need CREATE SOMETHING resources, prompts, telemetry, or custom workflow tools.

QuickBooks helper:

```bash
COMPOSIO_API_KEY=... \
COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID=ac_xxx \
pnpm mcp:composio:quickbooks create
```

Generate a per-user URL after the config exists:

```bash
COMPOSIO_API_KEY=... \
COMPOSIO_QUICKBOOKS_MCP_CONFIG_ID=mcp_xxx \
COMPOSIO_QUICKBOOKS_USER_ID=user_123 \
pnpm mcp:composio:quickbooks generate
```

Optional allowlist:

```bash
COMPOSIO_QUICKBOOKS_ALLOWED_TOOLS=QUICKBOOKS_GET_COMPANY_INFO,QUICKBOOKS_QUERY \
pnpm mcp:composio:quickbooks create
```

The helper delegates through `@create-something/composio-bridge` so SDK plumbing stays centralized. It is separate from the deployed `composio-toolkit-mcp` Worker, which exposes `/mcp/quickbooks` through the CREATE SOMETHING Hub registry.

## Claude operator, client-owned downstream account

Use [packages/canva-client-operator-mcp](../packages/canva-client-operator-mcp) when the Claude user operating an MCP is not the person who owns the downstream SaaS account. Claude authenticates the operator through CREATE SOMETHING Identity; the client authorizes Canva through a Composio Connect Link. The wrapper atomically locks the first completed `connectedAccountId`, supplies that ID on every tool call, and requires an admin-scoped, confirmed reset before a different account can connect.

Do not point Claude directly at the Composio session MCP for this pattern. The wrapper is the policy boundary that separates operator identity from client OAuth, hides tools by operator scope, prevents ambient connected-account selection, and owns revoke/rebind receipts.

## Related

- **CLAUDE.md** — Architecture § Integration connectivity (Composio)
- **AGENTS.md** — Framework alignment § Integration connectivity
- **packages/composio-bridge/** — Implementation and DOCS_REFERENCE
- **docs/internal/COMPOSIO_EVALUATION.md** — Vendor evaluation and wrap-pattern rationale
