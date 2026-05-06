# Understanding: @create-something/orchestration

> Multi-session durability for agent work: sessions, checkpoints, convoys, cost controls, reflection, postmortems, and metrics.

## Position In The Three-Tier Framework

**Primary tier**: Automation.

The package coordinates long-running work across sessions and workers. Its durable artifacts, such as checkpoints, metrics, reflections, and postmortems, are Database-tier evidence surfaces. Judgment enters through review, postmortem approval, and prevention rule application.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/harness` | Baseline agent context and validation patterns |
| Git checkpoints | Durable pause/resume and audit trail |
| Vitest tests | Safety net for sessions, convoys, routing, and checkpoints |
| `src/bin/orch.ts` | CLI entrypoint for operator workflows |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Agent harness users | How a one-shot session becomes resumable work |
| Reviewers | What evidence exists for pause/resume and quality gates |
| Operators | How cost, convoy, witness, and postmortem workflows are controlled |
| Future orchestration systems | Which durability patterns have already been tested |

## Internal Structure

```text
src/bin/orch.ts              -> CLI entrypoint
src/session/                 -> lifecycle, context, and background execution
src/checkpoint/              -> checkpoint policy, storage, review, and resume briefs
src/coordinator/             -> convoys, workers, and witness coordination
src/cost/                    -> cost tracking and reports
src/reflection/              -> learning extraction from completed work
src/postmortem/              -> incident analysis and prevention rules
src/metrics/                 -> work metrics collection and reporting
src/outbox/                  -> durable event publication pattern
```

## To Understand This Package, Read

1. **`src/bin/orch.ts`** - CLI command groups exposed to operators.
2. **`src/session/lifecycle.ts`** - Start, pause, resume, complete, and checkpoint trigger behavior.
3. **`src/checkpoint/store.ts`** - Durable checkpoint storage and retrieval.
4. **`src/coordinator/convoy.ts`** - Multi-worker convoy state.
5. **`src/index.ts`** - Public API surface exported by the package.

## Common Tasks

| Task | Start Here |
|------|------------|
| Start or resume a session | `orch session start --epic <id>` |
| Inspect session state | `orch session status --epic <id>` |
| Reflect on completed work | `orch reflect convoy <id> --epic <id>` |
| Capture incident learnings | `orch postmortem create <issue-id>` |
| Validate the package | `pnpm --filter @create-something/orchestration test` |

## Escalation Notes

Stop when checkpoint, convoy, worker, cost, or postmortem state conflicts and no durable artifact explains which state is authoritative. Do not synthesize resume context from memory when checkpoint evidence is missing.
