# Agent Principles & Workflow

This repository is migrating agent-native coordination to **Linear**.

Use Linear for new CREATE SOMETHING work whenever the Linear MCP is available.
The active team is `CREATE SOMETHING` (`CRE`). Loom remains a legacy/fallback
path while existing agents and remote lanes finish migration.

Preferred Linear path:

```bash
codex mcp add linear --url https://mcp.linear.app/mcp
codex mcp login linear
```

After adding or logging into the Linear MCP, restart Codex if the Linear tools
are not visible in the current session.

When Linear MCP tools are available, read or create issues before changing
shared work. Use Linear issue IDs in status updates, deploy evidence, and
handoffs.

Legacy Loom note: local `lm` talks to the repo-local `.loom` database. Shared coordination for Symphony and other remote agent lanes may still use the remote Loom MCP control plane at `https://loom.mcp.createsomething.agency/mcp`.

For a fresh local clone that has not initialized the repo-local `.loom` database yet:

```bash
lm init
lm ready
lm claim <id>
```

For provisioned Ona or other shared remote environments, skip `lm init` and start with:

```bash
lm ready
pnpm loom:remote ready
```

For shared remote Loom operations, use:

```bash
pnpm loom:remote ready
pnpm loom:remote list --status ready --label code-quality
pnpm loom:remote create --title "..." --description "..." --label code-quality
pnpm loom:remote done --task-id <id> --evidence "..."
```

Use `lm --local ...` only when you intentionally mean the repo-local `.loom` database.
If `lm init` reports that remote Loom is already provisioned, continue with `lm ready` and the `pnpm loom:remote ...` commands instead of retrying `lm init`.
Do not use bare `lm done` for shared tasks in this repo; use `pnpm loom:remote done --task-id <id> --evidence "..."` instead.

## What this repo is

CREATE SOMETHING builds the connectivity and control layer between tools and AI.

- **Core thesis**: MCP consumption is commoditized. MCP creation is not.
- **Framework**: all work maps to **Database / Automation / Judgment**
- **Operating rule**: policy is an artifact, not just a prompt

Read these first:

- `docs/README.md` — documentation map
- `docs/MCP_FIRST_THESIS.md` — strategic thesis and packaging
- `docs/THREE_TIER_FRAMEWORK.md` — Database / Automation / Judgment model

## How to navigate

Treat this file as a map, not an encyclopedia.

When you need:

- **Strategy / positioning**: `docs/MCP_FIRST_THESIS.md`, `docs/AGENCY_CODEX_VECTOR_STRATEGY.md`
- **Architecture / governance**: `docs/THREE_TIER_FRAMEWORK.md`, `docs/MCP_HUB_CONTROL_PLANE.md`, `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- **Policy artifacts**: `docs/policies/README.md`
- **Operational runbooks**: runbooks in `docs/` and `docs/guides/`
- **Historical context / decisions**: `docs/internal/`

## Working model

Before changing anything, identify which tier the work serves:

| Tier | MCP Primitive | Repo examples |
|------|---------------|---------------|
| **Database** | Resources | D1, KV, R2, app data, policy/check artifacts |
| **Automation** | Tools | MCP servers, workers, harnesses, skills |
| **Judgment** | Prompts | policy packs, approval rules, escalation behavior |

Debug in this order:

1. **Database**: is the data correct and available?
2. **Automation**: did the execution path succeed?
3. **Judgment**: was the right policy applied?

When coordinating agents, pass **policy artifacts** alongside task artifacts.

## Default repo workflow

1. Find or create tracked work in Linear. Use Loom only for legacy tasks that
   have not migrated.
2. Verify symbols and import paths before using them.
3. Run the relevant quality gates.
4. Record evidence on the Linear issue and use the narrowest trustworthy
   validation surface.
5. Push or open/update a PR only when production promotion, shared review, or explicit user intent requires it.

Preferred coordination:

```bash
# Use the Linear MCP tools when visible in Codex:
# list_issues, get_issue, create_issue, update_issue, list_projects, list_teams
```

Legacy Loom commands:

```bash
lm ready
lm ready --ranked
lm show <id>
lm claim <id>
lm done <id>
lm sync

pnpm check
pnpm lint
pnpm test
```

For shared orchestration lanes still on Loom, prefer remote Loom via
`pnpm loom:remote ...`. Use `lm --local ...` only when you intentionally mean
the repo-local `.loom` database.

## Git-light delivery

- For DEV and preview work, prefer direct deploy from the current workspace after the relevant checks pass.
- Record the Linear issue ID, package or surface, target environment, commands
  run, deploy URL or ID, and rollback note on the Linear issue.
- If a task is still tracked in legacy Loom, record the same evidence there.
- For non-terminal deploy checkpoints, prefer the surface-specific `pnpm deploy:*:checkpoint` wrappers; use `pnpm loom:deploy:checkpoint` only for custom deploy paths.
- Do not commit or push only to manufacture an agent checkpoint.
- Use Git branches and PRs as the default production promotion boundary unless an approved immutable release path exists.
- See `docs/policies/v1/policy.git-light-agent-delivery.v1.md` and `docs/guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md`.

## Grounding discipline

Do not guess code symbols, import paths, or public exports.

Use:

```bash
pnpm exports
pnpm exports <package>
pnpm exports <package> <symbol>
```

If retrieval returns fragments, read the actual source or `package.json` exports.

## External docs

For third-party libraries, prefer **Context7** instead of memory:

- resolve the library ID first if needed
- fetch version-specific docs/examples
- do not guess unstable APIs

Common library IDs used here:

- SvelteKit: `/sveltejs/kit`
- Cloudflare Workers SDK: `/cloudflare/workers-sdk`
- Cloudflare Docs: `/cloudflare/cloudflare-docs`
- Hono: `/honojs/hono`
- Vitest: `/vitest-dev/vitest`
- TypeScript: `/microsoft/typescript`
- Zod: `/colinhacks/zod`

## Tool preference

- **Code verification**: `ground analyze`, `ground find-duplicates`
- **Task coordination**: Linear MCP first; `lm` only for legacy tasks
- **Priority ranking**: Linear priority/project labels first; `lm ready --ranked`
  only for legacy tasks

Linear replaces Loom as the long-term shared operating ledger. Use remote Loom
only for shared lanes that have not yet migrated, and local `lm` only for
repo-local legacy task state.
