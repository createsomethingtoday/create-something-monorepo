# @create-something/harness

Autonomous agent orchestration for CREATE SOMETHING.

The current target runtime is **Codex-first** with **Linear** as the control plane. Legacy Beads-backed code still exists in the package, but the intended operating model is:

1. claim tracked work in Linear
2. run the task in an isolated worktree
3. validate with quality gates and app-specific checks
4. run self-review and agent-review loops
5. escalate uncertainty through judgment artifacts instead of guessing

## Philosophy

Humans steer. Agents execute.

The harness exists to make coding agents reliable by giving them structure:

- tracked work
- reproducible isolation
- review loops
- explicit escalation boundaries
- persistent context for pause/resume

When it is working, humans spend less time coding by hand and more time shaping the environment, constraints, and acceptance criteria.

## Current direction

This package is in transition from older Beads, Loom, and Claude-oriented terminology toward a Linear and Codex-native workflow.

Read this package as:

- **execution substrate** for long-running coding agents
- **review loop** for self-correction and agent-to-agent feedback
- **worktree manager** for parallel isolation
- **checkpoint system** for recoverability and handoff

## Quick start

From the monorepo:

```bash
cd packages/harness
pnpm build
harness start specs/my-project.md
```

Recommended operator loop:

```bash
pnpm linear:ready
pnpm agent:claim-worktree -- --issue <id>
harness start specs/my-project.md
pnpm linear:get -- --issue <id>
```

Use `pnpm agent:claim-worktree` as the default implementation handoff. It claims the Linear issue, creates an isolated branch/worktree, and records the branch, worktree path, base ref, and base SHA in Linear before edits begin.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/runner.ts` |
| Boot command | `cd packages/harness && pnpm build && harness start specs/my-project.md` |
| Smoke command | `cd packages/harness && pnpm test` |
| Validation surfaces | test output, checkpoint artifacts, review findings, git worktree state |
| UI validation path | none |
| Escalation rule | stop if the worker cannot validate completion through gates or review, or if policy/authority boundaries appear during execution |

## Default harness loop

The intended loop is closer to the harness-engineering pattern described by OpenAI than to a one-shot codegen workflow.

### 1. Intake and routing

- claim or create tracked work in Linear
- record the branch/worktree/base SHA handoff with `pnpm agent:claim-worktree`
- gather repo context and prior checkpoints
- choose execution mode and model/runtime defaults

### 2. Isolated execution

- create a dedicated git worktree per task or swarm worker
- refuse path/branch collisions instead of overwriting an existing workspace
- run the agent in that worktree
- let the agent inspect code, run tools, and gather evidence directly

### 3. Validation

- run local quality gates
- run task-specific smoke checks
- inspect traces, logs, or UI surfaces when available

### 4. Review loop

- self-review the diff locally
- run additional agent reviewers for security, architecture, and quality
- extract new follow-up work if a finding is real

### 5. Escalation and checkpointing

- if the agent is uncertain, emit a judgment artifact instead of improvising
- persist checkpoint context so the task can resume cleanly
- return control to a human only when judgment is required

## Why worktrees matter

The harness supports isolated worktrees so multiple agents can work in parallel without contaminating each other.

This is the default recommended execution mode for swarm or background runs because it improves:

- reproducibility
- reviewability
- cleanup
- safety when multiple agents are active

Harness-created swarm worktrees log their branch, path, and base SHA. Clean worker worktrees may be removed automatically; dirty worker worktrees are preserved for review instead of being deleted.

## Review model

The harness is built around short execution loops with repeated review, not one giant run followed by manual cleanup.

Typical review layers:

- **self-review**: the worker checks its own diff before claiming completion
- **quality-gate review**: tests, typecheck, lint, build, smoke checks
- **agent review**: focused reviewers for security, architecture, quality
- **human review**: only when policy, ambiguity, or business judgment requires it

## Spec inputs

The harness accepts structured work descriptions and execution specs.

- Markdown specs are supported
- YAML specs are preferred when you need explicit dependencies, files, and acceptance criteria

The goal is not just to tell the agent what to build. The goal is to give the harness enough structure to validate whether the work is actually done.

## Commands

```bash
harness start <spec-file>
harness pause
harness resume --harness-id <id>
harness status
```

Common options:

```bash
--checkpoint-every N
--max-hours M
--reviewers <list>
--model <model>
--dry-run
--swarm-execution-mode isolated_worktree
```

## Runtime expectations

The package has older Claude-facing language in parts of the source, but current runtime configuration already includes Codex-oriented behavior.

Treat the stable concepts as:

- task orchestration
- execution isolation
- review pipelines
- checkpoint recovery
- judgment-aware escalation

Treat runtime-specific flags and older naming as transitional details unless the source explicitly requires them.

## Checkpointing

Checkpoints are the boundary between long-running autonomy and recoverable control.

A good checkpoint captures:

- current task state
- files touched
- decisions made
- blockers encountered
- validation status
- review findings

This allows the next run to resume from a real artifact instead of reconstructing context from memory.

## Relationship to the Judgment Layer

The harness belongs to the **Automation** tier.

It should not decide policy by itself. When uncertainty or authority boundaries appear, it should hand off to **Judgment** artifacts and operators rather than silently guessing.

See also:

- `../../docs/THREE_TIER_FRAMEWORK.md`
- `../../docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`

## What to read next

- `UNDERSTANDING.md` for a package-level conceptual map
- `src/runner.ts` for orchestration and worktree execution
- `src/session.ts` for runtime spawning
- `src/review-pipeline.ts` and `src/reviewer.ts` for review loops
- `src/checkpoint.ts` for persistence and recoverability
