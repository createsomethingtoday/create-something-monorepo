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

For the recommended CREATE SOMETHING task shapes, use:

- [docs/guides/SYMPHONY_TASK_TEMPLATES.md](/Volumes/LaCie/Create Something/create-something-monorepo/docs/guides/SYMPHONY_TASK_TEMPLATES.md)

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

Default execution/runtime:

- `codex-cli` via Symphony's `execution.runner`
- snapshot-backed bootstrap by default for broader code-quality tasks

The `code-quality` lane now defaults to a snapshot-backed workspace bootstrap on this repo, which avoids Git worktree/clone stalls on external storage. Shared `node_modules` directories are linked into the workspace after the snapshot is created.

Optional lightweight mode:

- set `workspace.mode: lightweight` in a lane workflow when the task is narrow enough to avoid a full repo snapshot
- keep the default mode for broader build, test, or dependency-sensitive work
- lightweight mode maps the lane to the existing reduced `symphony` snapshot scope instead of the full snapshot path

## Running with Infisical

If `LOOM_MCP_API_TOKEN` is stored in Infisical instead of exported into your shell:

```bash
pnpm symphony:code-quality:infisical:once
```

Optional Infisical controls:

- `INFISICAL_ENV` defaults to `prod`
- `INFISICAL_PATH` defaults to `/`
- `INFISICAL_PROJECT_ID` selects an explicit project
- `INFISICAL_SECRET_NAME` defaults to `LOOM_MCP_API_TOKEN`
