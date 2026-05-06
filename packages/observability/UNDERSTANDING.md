# Understanding: @create-something/observability

> Shared trace, span, MCP instrumentation, Braintrust, and Atlas metadata utilities for agent work.

## Position In The Three-Tier Framework

**Primary tier**: Database.

The package makes evidence available. It records what happened, which account or governance context was involved, and how tool and LLM activity should be classified. Automation packages call it; Judgment packages inspect the evidence it produces.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| Langfuse | Optional trace/span/generation backend |
| Braintrust | Optional MCP usage and governance event backend |
| AI Interaction Atlas vocabulary | Shared metadata taxonomy |
| MCP tool requests | Source of server/tool/account trace context |
| Infisical or environment variables | Source for live observability keys |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| MCP servers | How to emit consistent tool invocation traces |
| Operators | Which tool, account, policy, and route produced an event |
| Evaluation systems | How Braintrust events are segmented by client and governance context |
| Reviewers | Whether traces include enough metadata to debug behavior |

## Internal Structure

```text
src/index.ts        -> Langfuse config, trace, span, generation, event helpers
src/atlas.ts        -> shared AI Interaction Atlas metadata taxonomy
src/mcp.ts          -> instrumented MCP tool-handler wrapper
src/braintrust.ts   -> Braintrust logger and tool invocation emission
src/openai-agents.ts -> OpenAI Agents tracing helpers
src/schemas/        -> JSON schema for metadata payloads
```

## To Understand This Package, Read

1. **`src/index.ts`** - Langfuse setup and core trace/span/generation helpers.
2. **`src/mcp.ts`** - MCP tool wrapper and dual-emission behavior.
3. **`src/braintrust.ts`** - Braintrust event payload and governance metadata.
4. **`src/atlas.ts`** - Metadata vocabulary used across traces.
5. **`.dev.vars.example`** - Environment variable shape for local live tracing.

## Common Tasks

| Task | Start Here |
|------|------------|
| Add trace metadata | `src/atlas.ts` |
| Wrap an MCP server | `src/mcp.ts` |
| Emit Braintrust events | `src/braintrust.ts` |
| Validate the package | `pnpm --filter @create-something/observability typecheck && pnpm --filter @create-something/observability build` |

## Escalation Notes

Stop when trace payloads require live keys that are unavailable, or when account identity/governance context would be emitted incorrectly. Secrets must come from Infisical or runtime environment, never repo files.
