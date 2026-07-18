# Understanding: @create-something/symphony

> Linear-backed orchestration runtime that dispatches Codex workers from workflow files.

## Position In The Three-Tier Framework

**Primary tier**: Automation.

Symphony turns Linear issues and workflow definitions into running Codex worker sessions. Linear remains the coordination database. Workflow files are policy-like artifacts that decide which work is eligible, how many workers can run, and how workspaces are managed.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| Linear API | Source of truth for tracked work, assignment, and status |
| `automation/symphony/**/WORKFLOW.md` | Dispatch policy and prompt template for each lane |
| Codex app-server | Worker execution runtime |
| Isolated workspaces | Keeps concurrent worker changes attributable |
| Infisical | Expected source for `LINEAR_API_KEY` in operator runs |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Code-quality lanes | How ready Linear issues become Codex worker sessions |
| Policy lanes | How workflow definitions constrain automation |
| Operators | Which workers are running, retrying, awaiting independent completion, or cleaned up |
| Agent infrastructure | How orchestration differs from a single local Codex turn |
| Canonical harness | How acceptance evidence becomes a fail-closed, persisted done decision |

## Internal Structure

```text
src/cli.js            -> CLI entrypoint and workflow path selection
src/orchestrator.js   -> service loop, issue claiming, worker lifecycle, HTTP status
src/workflow.js       -> workflow file loading and reload behavior
src/config.js         -> dispatch config validation
src/workspace.js      -> workspace creation, metadata, and cleanup
src/agent-worker.js   -> Codex worker process integration
src/tracker/linear.js -> Linear tracker client
src/canonical-harness-gate.js -> strict receipt evaluation, atomic persistence, and final done gate
schemas/canonical-harness-receipt.v1.schema.json -> canonical evidence contract
```

## To Understand This Package, Read

1. **`src/cli.js`** - How the workflow path and `--once` mode are selected.
2. **`src/orchestrator.js`** - The main service loop and worker lifecycle.
3. **`src/config.js`** - Required workflow dispatch configuration.
4. **`src/workspace.js`** - Workspace creation and cleanup rules.
5. **`src/tracker/linear.js`** - Linear issue querying, claiming, and completion behavior.
6. **`src/canonical-harness-gate.js`** - How evidence is computed, persisted, revalidated, and allowed to reach the completion seam.

## Common Tasks

| Task | Start Here |
|------|------------|
| Run code-quality lane once | `pnpm symphony:code-quality:once` |
| Run policy lane once | `pnpm symphony:policy:once` |
| Validate syntax | `pnpm --filter @create-something/symphony check` |
| Run tests | `pnpm --filter @create-something/symphony test` |
| Evaluate canonical done evidence | `evaluate_canonical_harness_receipt(candidate)` |
| Run with secrets | `infisical run --env=prod --path=/ --include-imports=true -- pnpm symphony:code-quality:once` |

## Escalation Notes

Stop when Linear issue state, workspace metadata, or worker status cannot be reconciled with the workflow file and tracker evidence. Do not claim or complete work outside Linear.
