# Hub-Deploy Symphony

This workflow runs Symphony against Loom tasks labeled `hub-deploy`.

Use it when you want to create, configure, or deploy a CREATE SOMETHING Hub worker from a bounded config request.

## Requirements

- `LOOM_MCP_API_TOKEN` exported in the environment or available through Infisical
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- remote Loom reachable at `https://loom.mcp.createsomething.agency/mcp`
- Cloudflare deploy prerequisites available when the task requires a real deploy:
  - `wrangler` via repo dependencies
  - authenticated Cloudflare access
  - required vault/runtime secrets available

## Task convention

Create Loom tasks for this lane with the `hub-deploy` label.

Your task description should point to the exact config artifact(s) Symphony should use, for example:

```bash
pnpm loom:remote create \
  --title "Create MJ partner hub from config" \
  --description "Tier: Automation
Objective: Create or update the target Hub worker from the supplied config and existing deploy scripts.
Config artifacts:
- config/mcp-hub/registry.json
- config/mcp-hub/state.json
- packages/cs-mcp-hub-remote/wrangler.team-hubs.toml

Verification:
- pnpm mcp:hub:fleet:deploy
- pnpm mcp:hub:fleet:verify

Scope:
- existing Hub config files
- existing deploy scripts and Worker config
- required vault sync or deploy glue directly needed by the requested hub change

Do not:
- invent a new hub provisioning path when an existing script or runbook already applies
- publish unrelated policy changes
- broaden into general repo cleanup" \
  --priority high \
  --label hub-deploy
```

For the recommended CREATE SOMETHING task shapes, use:

- [docs/guides/SYMPHONY_TASK_TEMPLATES.md](/Volumes/LaCie/Create Something/create-something-monorepo/docs/guides/SYMPHONY_TASK_TEMPLATES.md)

## Running

Continuous orchestration:

```bash
pnpm symphony:hub-deploy
```

Single poll / dispatch pass:

```bash
pnpm symphony:hub-deploy:once
```

Runtime state is exposed on `http://127.0.0.1:4782/`.

Default execution/runtime:

- `codex-cli` via Symphony's `execution.runner`
- existing hub-deploy bootstrap path remains in place for isolation and deploy-sensitive tasks

## Running with Infisical

If `LOOM_MCP_API_TOKEN` is stored in Infisical instead of exported into your shell:

```bash
pnpm symphony:hub-deploy:infisical:once
```

Optional Infisical controls:

- `INFISICAL_ENV` defaults to `prod`
- `INFISICAL_PATH` defaults to `/`
- `INFISICAL_PROJECT_ID` selects an explicit project
- `INFISICAL_SECRET_NAME` defaults to `LOOM_MCP_API_TOKEN`
