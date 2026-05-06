# Understanding: @create-something/mcp-core

> Account-scoped MCP primitives for auth, tools, resources, prompts, token storage, feedback, telemetry, and insight events.

## Position In The Three-Tier Framework

**Primary tier**: Automation.

The package is the shared runtime contract that MCP servers use before they execute tools. It carries Database-tier token state and Judgment-tier account policy through Automation-tier MCP handlers.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@modelcontextprotocol/sdk` | MCP server primitives consumed by `ScopedMcpServer` |
| Token stores | Persist account token state in file, KV, or D1 |
| `AccountContext` | Boundary artifact passed into every scoped primitive |
| `InsightEmitter` | Cross-cutting event stream for account-scoped behavior |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| MCP server packages | How to keep every tool/resource/prompt account-relative |
| Auth providers | How token and policy state become an `AccountContext` |
| Observability code | Which account and tier produced an event |
| Policy systems | Where account policy enters tool execution |

## Internal Structure

```text
src/index.ts             -> public export surface
src/context.ts           -> AccountContext, policy, token provider/store contracts
src/auth.ts              -> AuthProvider contract
src/server.ts            -> ScopedMcpServer and handler registration
src/providers/           -> OAuth, API key, and stdio auth providers
src/stores/              -> file, KV, D1 token and feedback stores
src/insight.ts           -> InsightEmitter and helper wrappers
src/telemetry.ts         -> usage, health, and activity helpers
```

## To Understand This Package, Read

1. **`src/index.ts`** - The public API and intended grouping.
2. **`src/context.ts`** - The account boundary artifact.
3. **`src/auth.ts`** - How requests resolve into contexts.
4. **`src/server.ts`** - How scoped handlers consume contexts.
5. **`src/insight.ts`** - How events are emitted across tiers.

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a new public primitive | `src/index.ts` |
| Change account policy shape | `src/context.ts` |
| Add an auth provider | `src/providers/` |
| Add a token store | `src/stores/` |
| Validate the package | `pnpm --filter @create-something/mcp-core typecheck && pnpm --filter @create-something/mcp-core build` |

## Escalation Notes

Stop when account scoping, token persistence, or policy behavior differs across transports. Global, unscoped tool execution is a contract violation.
