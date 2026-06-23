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
pnpm agent:claim-worktree -- --issue CRE-123
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

1. For solo exploratory work where one operator owns the checkout, start with
   `pnpm agent:solo-loop` and work in the current checkout with tight CLI
   validation.
2. Find or create tracked work in Linear when the work is shared, delegated,
   long-running, production-bound, or needs durable evidence.
3. For isolated implementation work, claim an explicit worktree with
   `pnpm agent:claim-worktree -- --issue CRE-123` so Linear records branch,
   worktree path, base ref, and base SHA.
4. Verify symbols and import paths before using them.
5. Run the relevant quality gates.
6. Record evidence in Linear when the checkpoint affects handoff, review,
   rollback, or promotion.
7. Push or open/update a PR only when production promotion, shared review, or explicit user intent requires it.

Core commands:

```bash
pnpm bootstrap:worktree

pnpm agent:solo-loop
pnpm agent:solo-loop:check

pnpm linear:ready
pnpm linear:list -- --status open
pnpm linear:get -- --issue CRE-123
pnpm linear:claim -- --issue CRE-123
pnpm agent:claim-worktree -- --issue CRE-123
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

## Atlas Studio client mapping

For Codex-led CREATE SOMETHING Atlas sessions, use the browser portal so chat stays on the left and the canvas opens in the Codex browser pane:

```bash
pnpm atlas:portal --client "Client" --workflow "Workflow" --owner "Operator"
```

The launcher starts or reuses a detached local server, stores sessions in `~/Library/Application Support/CREATE SOMETHING/Atlas Studio`, and prints the session URL. It also writes the active runtime to `~/Library/Application Support/CREATE SOMETHING/Atlas Studio/runtime.json`; read that file when you need the current port or session URL.

Use `pnpm atlas:desktop:studio ...` for terminal or agent mutations against the same app-data session store. Use the macOS app launcher only when the operator asks for a standalone desktop window.

For the CREATE SOMETHING Template System canvas, run the read-only production primitive self-heal before assuming the map is current:

```bash
pnpm atlas:desktop:studio heal --session <session-id> --profile template-system
pnpm atlas:desktop:studio propose --session <session-id> --profile template-system
pnpm atlas:desktop:studio proposal-action --session <session-id> --proposal <proposal-id> --action <action-id> --status approved
pnpm atlas:desktop:studio proposal-handoff --session <session-id> --proposal <proposal-id>
```

The heal path attaches/checks bindings against repo-owned production definitions such as Wrangler configs, MCP registry entries, Dify inventory/DSL files, Webflow Cloud configs, delivery manifests, and policy docs. It updates local Atlas node sync state only; it does not deploy, rotate secrets, mutate Airtable, or change production review status.

The proposal path generates an approval-gated write-back plan from the healed canvas. Treat it as a local review artifact: `safe` actions can become repo/docs updates after normal validation, `review` actions need operator review plus package-local or agent-smoke evidence, and `approval` actions require an explicit production promotion path and rollback note.

Proposal action review is local session state only. Mark actions `approved`, `rejected`, or back to `proposed` to prepare the next implementation pass; do not treat an approved Atlas action as permission to deploy or mutate third-party systems without the owning promotion workflow.

Proposal handoff exports the reviewed plan as markdown. Use it as the starting context for a follow-up implementation pass; implement approved actions only, and keep pending/rejected actions as context.

## Pi packages

The monorepo contains publishable Pi coding agent packages:

| Package | Scope | Purpose |
|---------|-------|--------|
| `packages/pi-three-tier-framework` | Public | Three-Tier Framework as installable agent knowledge |
| `packages/pi-policy-os` | Public | Policy OS governance starter with quality gates |
| `packages/pi-halfdozen` | Private | Half Dozen fleet knowledge and client management |
| `packages/pi-webflow` | Private | Webflow fleet knowledge and template review |

Public packages are discovery wedges — developers install them, learn the framework, and become `.agency` leads. See `docs/AGENCY_CODEX_VECTOR_STRATEGY.md` for the delivery vector model.

The project-local `.pi/` directory loads skills and prompts from all three packages via `settings.json`.
