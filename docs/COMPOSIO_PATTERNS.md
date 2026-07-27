# Composio patterns (global)

When to use Composio for app connectivity, how we wrap it, and where the SDK surfaces fit. For package-level API details see `packages/composio-bridge/` and [DOCS_REFERENCE.md](packages/composio-bridge/DOCS_REFERENCE.md). For evaluation see [internal/COMPOSIO_EVALUATION.md](internal/COMPOSIO_EVALUATION.md).

> Status: legacy and frozen for new connector work.
>
> Preserve existing Composio-backed production paths until each workflow is
> audited and has a verified replacement or an approved retirement plan. New
> connector work starts from an owned CREATE SOMETHING MCP contract and the
> product's selected operator surface. Any new Composio exception requires
> explicit operator approval recorded in Linear.

## When to use Composio vs custom

| Preserve Composio temporarily                                    | Use custom CREATE SOMETHING MCPs                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Existing production path with no verified replacement            | Deep or client-specific integrations (e.g. Half Dozen Gmail Sync: custom OAuth, Notion schema, automations) |
| Bounded bridge while its owned replacement is being proved       | You need full control over tokens, lifecycle, governance, or client-specific behavior                       |
| Operator-approved exception whose decision is recorded in Linear | New connector work and all strategic integration surfaces                                                   |

**Default**: Do not start new Composio integrations. For new MCPs that need
"connect to Gmail/Notion/Slack/…", define an owned CREATE SOMETHING MCP
contract and choose the operator surface appropriate to that product. Keep an
existing Composio path only until replacement or retirement is verified.

## Notion-specific decision matrix

Notion now has first-party Worker and hosted MCP surfaces. Treat them as delivery channels, not replacements for the house MCP pattern.

| Surface                         | Use when                                                                                                                            | Avoid when                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Composio wrapped by our MCP** | An existing production workflow still depends on generic Notion plus other SaaS CRUD tools while its replacement is verified.       | New work, or work that needs fixed client schema semantics, our custom Notion policies, or deep workspace-specific behavior. |
| **CREATE SOMETHING MCP**        | The workflow needs cross-client governed execution, telemetry, bearer-token routing, headless agents, or dual-workspace operations. | The workflow only needs a small capability inside a Notion Custom Agent.                                                     |
| **Notion hosted MCP**           | A human user wants to connect their Notion workspace to ChatGPT, Claude, Cursor, or another supported AI client.                    | The agent is headless, bearer-token based, or needs CREATE SOMETHING resources/prompts/telemetry.                            |
| **Notion Workers Agent Tools**  | A capability should run inside a Notion Custom Agent with `context.notion` and Notion-scoped permissions.                           | The tool needs our fleet gateway, non-Notion runtime controls, or broad external orchestration.                              |
| **Notion Workers Syncs**        | The target is a greenfield Notion-managed mirror database.                                                                          | The client already owns the target database/schema; current Syncs do not yet sync into existing databases.                   |

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

## Existing single-toolkit hosted MCPs

These helpers are compatibility paths for existing approved integrations. Do
not use them to start a new connector without explicit operator approval in
Linear. An approved exception must remain narrow to one commodity toolkit and
must not require CREATE SOMETHING resources, prompts, telemetry, or custom
workflow tools.

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

## Related

- **CLAUDE.md** — Architecture § Integration connectivity (Composio)
- **AGENTS.md** — Framework alignment § Integration connectivity
- **packages/composio-bridge/** — Implementation and DOCS_REFERENCE
- **docs/internal/COMPOSIO_EVALUATION.md** — Vendor evaluation and wrap-pattern rationale
