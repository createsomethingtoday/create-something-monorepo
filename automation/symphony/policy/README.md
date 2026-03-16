# Policy Symphony

This workflow runs Symphony against Loom tasks labeled `policy`.

## Requirements

- `LOOM_MCP_API_TOKEN` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- remote Loom reachable at `https://loom.mcp.createsomething.agency/mcp`

Default execution runtime:

- `codex-cli` via Symphony's `execution.runner` workflow setting
- app-server is no longer the default for this lane
- lightweight workspace bootstrap via `workspace.mode: lightweight`
- dependency reuse via `workspace.dependency_mode: reuse`

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

The policy lane now uses the CLI runner by default. This keeps Loom orchestration and lane semantics unchanged while moving policy work off the older app-server execution path.

The lane also defaults to a lightweight workspace bootstrap:

- snapshots the policy-relevant repo surface instead of creating a full worktree
- reuses root `node_modules` when available instead of installing by default
- preserves the old isolated path as a fallback if the workflow config changes back

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
