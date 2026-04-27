# Composio docs reference

This package implements the **wrap pattern**: clients see CREATE SOMETHING MCP; Composio is plumbing. The following official docs map to our usage.

## Concept guides (docs)

| Doc | URL | What we use |
|-----|-----|-------------|
| Tools and toolkits | https://docs.composio.dev/docs/tools-and-toolkits | Toolkits = app collections (e.g. ZOOM, NOTION); tools = single actions. We execute tools directly (no meta tools). |
| Fetching tools | https://docs.composio.dev/docs/tools-direct/fetching-tools | **Tool discovery**: we use `getRawComposioTools({ toolkits })` (schemas without `user_id`) in `ComposioClient.getTools()`. |
| Authenticating tools | https://docs.composio.dev/docs/tools-direct/authenticating-tools | Auth Config per toolkit; Connect Link or Direct SDK; `user_id` groups connected accounts. We delegate to Composio for OAuth; `entityId` / `userId` is passed at execution. |
| Executing tools | https://docs.composio.dev/docs/tools-direct/executing-tools | **Direct execution**: we call `composio.tools.execute(toolSlug, { userId, arguments })` in `ComposioClient.executeTool()`. |

## TypeScript SDK reference

| Class / page | URL | Bridge usage |
|--------------|-----|--------------|
| **TypeScript SDK** (index) | https://docs.composio.dev/reference/sdk-reference/typescript | Install `@composio/core`; `Composio` constructor, `tools.get`, `tools.execute`. |
| **Composio** | https://docs.composio.dev/reference/sdk-reference/typescript/composio | Core class. We use `apiKey`, optional `baseURL`. `flush()` for Workers telemetry (not wired yet). |
| **Tools** | https://docs.composio.dev/reference/sdk-reference/typescript/tools | **Primary**: `getRawComposioTools(query)`, `getRawComposioToolBySlug(slug)`, `execute(slug, { userId, arguments })`. We use `dangerouslySkipVersionCheck: true` in execute. |
| **Toolkits** | https://docs.composio.dev/reference/sdk-reference/typescript/toolkits | `toolkits.get(slug)`, `authorize()`, `listCategories()`. Not used in bridge; useful for auth/config discovery. |
| **ConnectedAccounts** | https://docs.composio.dev/reference/sdk-reference/typescript/connected-accounts | `initiate()`, `link()`, `list()`, `get()`, `waitForConnection()`. ComposioAuthProvider / connect flows use these (e.g. quickbooks-notion-mcp). |
| **AuthConfigs** | https://docs.composio.dev/reference/sdk-reference/typescript/auth-configs | `get()`, `list()`, `create()`, `update()`. Auth config IDs used when initiating connections. |
| **MCP** | https://docs.composio.dev/reference/sdk-reference/typescript/mcp | Composio-hosted MCP config (create/list/update). We run our own MCP servers and wrap Composio tools via ComposioToolFactory. |
| **Triggers** | https://docs.composio.dev/reference/sdk-reference/typescript/triggers | Webhook triggers (create, subscribe, verifyWebhook). Not used in this bridge. |

## Mapping (bridge → SDK)

- **Discovery**: `client.getTools(toolkits)` → `getRawComposioTools({ toolkits })` (no user_id; see Fetching tools).
- **Execution**: `client.executeTool(slug, params, userId)` → `tools.execute(slug, { userId, arguments: params, dangerouslySkipVersionCheck: true })` (see Executing tools).
- **User scoping**: Every execution is scoped to a Composio entity/user ID; that user must have connected accounts for the app (see Authenticating tools).
- **Hosted MCP config**: `client.createMcpConfig({ name, toolkits, allowedTools })` → `mcp.create(name, config)`, then `client.generateMcpInstance(userId, mcpConfigId)` → `mcp.generate(userId, mcpConfigId)`.

## Execution policy runtime

`ComposioClientConfig` supports centralized retry policy controls via `executionPolicy`:

- `retryMode: 'off' | 'safe' | 'all'`
  - `off`: no retries
  - `safe` (default): retries for idempotent read operations only (`getTools`, `listToolkits`, `getConnectedAccounts`)
  - `all`: retries all operations, including `executeTool`
- `retry` tuning:
  - `maxAttempts` (default `3`)
  - `baseDelayMs` (default `250`)
  - `maxDelayMs` (default `4000`)
  - `jitterRatio` (default `0.2`)
  - `retryableStatusCodes` (default includes `408`, `429`, `5xx`)
  - `retryableErrorCodes` (transport/runtime error codes such as `ETIMEDOUT`)

Use `retryMode: 'all'` only when duplicate side effects are acceptable or downstream operations are idempotent.

## Security middleware contract

`ComposioToolFactory` now supports execution middleware via `ToolFactoryConfig.executionHooks`:

- `beforeExecute[]`: request normalization/guardrails
- `afterExecute[]`: response redaction/sanitization before MCP output

For a secure-by-default pattern, use:

- `DEFAULT_SECURE_OUTPUT_POLICY`
- `composeSecureOutputPolicies([...])`
- `createSecureOutputRedactionHook(policy)`

from `src/security.ts`.

This lets teams enforce:

- universal baseline redaction (tokens/passwords/secrets)
- toolkit-level overrides (e.g. Zoom recording URLs/tokens)
- per-client policy artifacts (stricter masking/retention)

## Toolkit versioning

Docs support configuring toolkit versions at SDK init or per execution. Our client does not yet expose versioning; add via `Composio` constructor options (e.g. `toolkitVersions: { github: '20250909_00' }`) if needed (see [toolkit versioning](https://docs.composio.dev/docs/tools-direct/toolkit-versioning)).
