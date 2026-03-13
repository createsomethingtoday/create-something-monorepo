# Policy Symphony

This workflow runs Symphony against Loom tasks labeled `policy`.

## Requirements

- `LOOM_MCP_API_TOKEN` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- remote Loom reachable at `https://loom.mcp.createsomething.agency/mcp`

## Task convention

Create Loom tasks for this lane with the `policy` label. Example:

```bash
lm create "Align tenant tool exposure policy with current hub routing" \
  --description "Update the policy artifacts and supporting governance docs to match the live hub routing model." \
  --labels policy
```

## Running

Continuous orchestration:

```bash
pnpm symphony:policy
```

Single poll / dispatch pass:

```bash
pnpm symphony:policy:once
```

Runtime state is exposed on `http://127.0.0.1:4781/`.
