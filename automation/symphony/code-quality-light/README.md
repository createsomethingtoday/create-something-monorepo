# Code-Quality Symphony Light

This workflow runs Symphony against Loom tasks labeled `code-quality-light`.

Use it for narrow tasks that benefit from Codex CLI execution and lightweight bootstrap:

- docs-only fixes
- config updates
- script or workflow fixes
- package-scoped quality issues that do not require full repo bootstrap

## Requirements

- `LOOM_MCP_API_TOKEN` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- remote Loom reachable at `https://loom.mcp.createsomething.agency/mcp`

Default execution/runtime:

- `codex-cli` via Symphony's `execution.runner`
- lightweight workspace bootstrap via `workspace.mode: lightweight`
- dependency reuse via `workspace.dependency_mode: reuse`

## Task convention

Create Loom tasks for this lane with the `code-quality-light` label.

Use this lane when the task should stay narrow. If the task likely needs full-repo build/test/bootstrap, use the main `code-quality` lane instead.

## Running

Continuous orchestration:

```bash
pnpm symphony:code-quality-light
```

Single poll / dispatch pass:

```bash
pnpm symphony:code-quality-light:once
```

Runtime state is exposed on `http://127.0.0.1:4783/`.

## Running with Infisical

If `LOOM_MCP_API_TOKEN` is stored in Infisical instead of exported into your shell:

```bash
pnpm symphony:code-quality-light:infisical:once
```

Optional Infisical controls:

- `INFISICAL_ENV` defaults to `prod`
- `INFISICAL_PATH` defaults to `/`
- `INFISICAL_PROJECT_ID` selects an explicit project
- `INFISICAL_SECRET_NAME` defaults to `LOOM_MCP_API_TOKEN`
