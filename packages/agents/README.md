# @create-something/agents

Agent coordination patterns for CREATE SOMETHING.

## Purpose

Multi-agent orchestration infrastructure. Coordination protocols for swarm-based development workflows.

## Structure

```
agents/
├── coordination/          # Agent communication patterns
└── flue-service-agent/    # Flue pilot service-agent endpoint
```

The Flue pilot is a parallel service-agent path beside the Pi/OpenClaw relay. Its promotion evidence command is:

```bash
pnpm --dir packages/agents/flue-service-agent flue:evidence:cloudflare
```

Its local run-history resource command is:

```bash
pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare
```

Its MCP resource handoff smoke command is:

```bash
pnpm --dir packages/agents/flue-service-agent flue:resources:smoke
```

The hosted `create-something` MCP reads the same run-history resource shape from `TELEMETRY_DB.flue_run_history`; validate that adapter with:

```bash
pnpm --dir packages/create-something-mcp smoke:flue-remote-resources
```

## Status

In development. Part of the larger agent-native tooling initiative.

## Related

- `packages/triad-audit` - Self-audit tooling
- `packages/cloudflare-sdk` - Infrastructure access
