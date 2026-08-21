# @create-something/observability

Agent observability utilities with Langfuse, Langfuse, MCP instrumentation, OpenAI Agents helpers, and AI Interaction Atlas metadata.

This package makes agent and MCP execution visible without making each caller hand-roll tracing vocabulary. Secrets stay in environment variables or Infisical-backed runtime injection, not in repo files.

## Core Concepts

- `initObservability` configures Langfuse tracing when `LANGFUSE_*` keys are present.
- `createTrace`, `createSpan`, and `createGeneration` provide direct tracing handles.
- `createInstrumentedMcpServer` wraps MCP tool handlers and emits tool-call traces. MCP results with `isError: true` are failures even when the handler promise resolves.
- Langfuse helpers emit per-client MCP usage and governance metadata.
- Each tool trace includes an `execution_success` Boolean score plus environment, release, duration, service, correlation, and actionable error fields for monitor filters.
- Atlas helpers standardize metadata for AI tasks, human oversight, system tasks, data artifacts, constraints, and touchpoints.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/index.ts`, `src/mcp.ts`, `src/atlas.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm typecheck && pnpm build` |
| Validation surfaces | TypeScript check output, tsup build output, emitted declaration files, trace payload shape |
| UI validation path | none |
| Escalation rule | stop if trace metadata, account identity, governance context, or secret-bound observability behavior cannot be validated without exposing keys |

## Development

```bash
pnpm --filter @create-something/observability typecheck
pnpm --filter @create-something/observability build
```

Use Infisical for live Langfuse or Langfuse keys when needed.
