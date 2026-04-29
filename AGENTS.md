# Agent Principles & Workflow

This repository uses **Linear** for agent-native coordination.

Important: Linear is now the source of truth for tracked work, ownership, status, and evidence. The previous local and remote Loom queues were migrated into Linear under the `Loom to Linear Coordination Migration` project. Preserve original `lm-*` IDs in Linear issue descriptions for traceability only; do not create new Loom work.

Core Linear commands:

```bash
pnpm bootstrap:worktree
pnpm linear:ready
pnpm linear:list -- --status open --label code-quality
pnpm linear:create -- --title "..." --description "..." --label code-quality
pnpm linear:claim -- --issue CRE-123
pnpm linear:done -- --issue CRE-123 --evidence "..."
```

The Linear wrapper expects `LINEAR_API_KEY` in the environment. Keep the key in Infisical or another secret manager, not in repo files.

Do not use `lm`, local `.loom`, or `pnpm loom:*` for new coordination. If legacy Loom evidence is needed, read it as historical migration context and mirror the finding into the relevant Linear issue.

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

1. Find or create tracked work in Linear.
2. Verify symbols and import paths before using them.
3. Run the relevant quality gates.
4. Record evidence in Linear and use the narrowest trustworthy validation surface.
5. Push or open/update a PR only when production promotion, shared review, or explicit user intent requires it.

Core commands:

```bash
pnpm bootstrap:worktree

pnpm linear:ready
pnpm linear:list -- --status open
pnpm linear:get -- --issue CRE-123
pnpm linear:claim -- --issue CRE-123
pnpm linear:done -- --issue CRE-123 --evidence "Validation: ..."

pnpm check
pnpm lint
pnpm test
```

For new worktrees, run `pnpm bootstrap:worktree` before type checks, smoke scripts, or any command that expects `pnpm exec tsc` / `pnpm exec tsx` to exist. Symphony after-create hooks should use the same bootstrap path instead of calling `pnpm install` directly.

## Git-light delivery

- For DEV and preview work, prefer direct deploy from the current workspace after the relevant checks pass.
- Record the Linear issue ID, package or surface, target environment, commands run, deploy URL or ID, and rollback note in the Linear issue.
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
- **Task coordination**: `pnpm linear:*`
- **Priority ranking**: Linear project views and `pnpm linear:ready`

Linear replaces Loom in this repository. Use Linear for shared and repo-local task state.
