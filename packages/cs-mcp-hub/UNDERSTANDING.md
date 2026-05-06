# Understanding: @create-something/cs-mcp-hub

> One MCP gateway that turns registry, state, routing, and policy artifacts into controlled tool exposure.

## Position In The Three-Tier Framework

**Primary tier**: Automation.

The hub executes MCP management and proxy tools. It also reads Database-tier artifacts such as registry, state, and routing files, and exposes Judgment-tier routing decisions through problem classification and policy status tools.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `config/mcp-hub/registry.json` | Lists known downstream MCP servers and bundles |
| `config/mcp-hub/state.json` | Records active bundle/server enablement |
| `config/mcp-hub/routing.json` | Controls tenant routing, aliases, and tool exposure |
| `@modelcontextprotocol/sdk` | Provides the MCP stdio server runtime |
| `.codex/config.toml` | The generated client-side MCP configuration target |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Codex MCP setup | Why one hub entry replaces many direct downstream entries |
| Agent routing | Which tools are visible for a tenant or bundle |
| Policy OS | How routing decisions become executable tool exposure |
| Operators | What changed when bundle/server state is updated |

## Internal Structure

```text
src/index.ts          -> MCP server, admin CLI, tool handlers, proxy catalog
src/config.ts         -> registry/state/routing path resolution and Codex config writing
src/downstream.ts     -> downstream MCP process connection lifecycle
src/routing.ts        -> tenant routes, aliases, and visibility filtering
src/problem-routing.ts -> bottleneck-axis classification for task routing
src/types.ts          -> registry, state, and routing contracts
```

## To Understand This Package, Read

1. **`src/index.ts`** - Server mode, admin mode, management tools, proxy tool calls.
2. **`src/config.ts`** - Registry/state loading, state updates, and `.codex/config.toml` generation.
3. **`src/routing.ts`** - Tenant filtering, alias routes, and failover planning.
4. **`src/problem-routing.ts`** - Judgment-facing task classification.
5. **`test/*.test.mjs`** - The current safety net for config, routing, and problem routing behavior.

## Common Tasks

| Task | Start Here |
|------|------------|
| Check hub state | `pnpm mcp:hub:status` |
| Rebuild the package | `pnpm --filter @create-something/cs-mcp-hub build` |
| Validate config/routing behavior | `pnpm --filter @create-something/cs-mcp-hub test` |
| Change exposed tools | Update registry/state/routing artifacts, then validate hub output |

## Escalation Notes

Stop and ask for operator judgment when generated Codex config, tenant routing, or proxy tool exposure conflicts with the registry/state/routing artifacts. The package should not guess which source of truth wins.
