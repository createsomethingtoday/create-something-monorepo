# @create-something/mcp-core

Shared MCP primitives for multi-account servers.

This package defines the boundary contract used by MCP packages that need account-scoped tools, resources, prompts, auth, token storage, feedback, telemetry, and insight events.

## Core Concepts

- `AccountContext` scopes every MCP primitive to an account, user, team, token provider, metadata, and policy.
- `AuthProvider` resolves incoming stdio, Worker, OAuth, or API-key calls into an `AccountContext`.
- `ScopedMcpServer` consumes the context before tool/resource/prompt execution.
- `InsightEmitter` records account-scoped observations across Database, Automation, and Judgment events.
- Token stores provide local file, KV, and D1 persistence adapters.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/index.ts`, `src/server.ts`, `src/context.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm typecheck && pnpm build` |
| Validation surfaces | TypeScript check output, emitted declaration files, package export shape |
| UI validation path | none |
| Escalation rule | stop if account scoping, token persistence, or policy semantics become ambiguous across transports |

## Development

```bash
pnpm --filter @create-something/mcp-core typecheck
pnpm --filter @create-something/mcp-core build
```

## Related Packages

Ground policy declares the ESLint pilot configuration as a tool entry point.
See [Ground monorepo adoption](../../docs/guides/GROUND_MONOREPO_ADOPTION.md)
for published CLI/MCP verification and the public-API finding dispositions.

- `@create-something/mcp-authz`
- `@create-something/observability`
- `@create-something/cs-mcp-hub`
