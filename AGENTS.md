# Agent Principles & Workflow

This repository uses **Loom** (`lm`) for agent-native coordination.

Important: local `lm` talks to the repo-local `.loom` database. Shared coordination for Symphony and other remote agent lanes now uses the remote Loom MCP control plane at `https://loom.mcp.createsomething.agency/mcp`.

Start here:

```bash
lm init
lm ready
lm claim <id>
```

For shared remote Loom operations, use:

```bash
pnpm loom:remote ready
pnpm loom:remote list --status ready --label code-quality
pnpm loom:remote create --title "..." --description "..." --label code-quality
pnpm loom:remote done --task-id <id> --evidence "..."
```

Use `lm --local ...` only when you intentionally mean the repo-local `.loom` database.
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

1. Find or create tracked work in Loom.
2. Verify symbols and import paths before using them.
3. Run the relevant quality gates.
4. Update Loom status.
5. Push the work so it remains connected to the whole.

Core commands:

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

For shared orchestration lanes, prefer remote Loom via `pnpm loom:remote ...`.
Use `lm --local ...` only when you intentionally mean the repo-local `.loom` database.

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
- **Task coordination**: `lm`
- **Priority ranking**: `lm ready --ranked`

Loom replaces Beads in this repository. Use remote Loom for shared coordination and local `lm` for repo-local task state.
