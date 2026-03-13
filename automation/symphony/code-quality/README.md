# Code-Quality Symphony

This workflow runs Symphony against Loom tasks labeled `code-quality`.

## Requirements

- `LOOM_MCP_API_TOKEN` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- remote Loom reachable at `https://loom.mcp.createsomething.agency/mcp`

## Task convention

Create Loom tasks for this lane with the `code-quality` label. Example:

```bash
lm create "Fix failing MCP typecheck in playbook worker" \
  --description "Investigate the current regression and land the smallest safe fix." \
  --labels code-quality
```

## Running

Continuous orchestration:

```bash
pnpm symphony:code-quality
```

Single poll / dispatch pass:

```bash
pnpm symphony:code-quality:once
```

Runtime state is exposed on `http://127.0.0.1:4780/`.
