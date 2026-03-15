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

For the recommended CREATE SOMETHING task shapes, use:

- [docs/guides/SYMPHONY_TASK_TEMPLATES.md](/Volumes/LaCie/Create Something/create-something-monorepo/docs/guides/SYMPHONY_TASK_TEMPLATES.md)

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

## Running with Infisical

If `LOOM_MCP_API_TOKEN` is stored in Infisical instead of exported into your shell:

```bash
pnpm symphony:policy:infisical:once
```

Optional Infisical controls:

- `INFISICAL_ENV` defaults to `prod`
- `INFISICAL_PATH` defaults to `/`
- `INFISICAL_PROJECT_ID` selects an explicit project
- `INFISICAL_SECRET_NAME` defaults to `LOOM_MCP_API_TOKEN`
