# Understanding: @create-something/harness

> **The execution substrate for coding agents: isolate work, run loops, review continuously, escalate uncertainty.**

## Ontological position

**Mode of Being**: Harness — model-controlled execution with recoverable oversight.

This package is where CREATE SOMETHING turns coding agents from one-shot assistants into repeatable workers. The harness is not just a shell around a model runtime. It is the structure that makes long-running work legible, reviewable, and resumable.

## Depends on

| Dependency | Why it matters |
|------------|----------------|
| **Linear** | Source of tracked work, priority, and agent coordination |
| **Git worktrees** | Isolation boundary for parallel or long-running execution |
| **Codex-compatible runtime** | Executes the task loop and tool calls |
| **Quality gates** | Converts "done" into something mechanically testable |
| **Checkpoint storage** | Makes pause/resume and handoff reliable |

## Enables understanding of

| Consumer | What this package clarifies |
|----------|----------------------------|
| **Platform engineers** | How agents are actually run safely and repeatedly |
| **Operators** | Where to inspect progress, pause work, and redirect |
| **Researchers** | How review loops and execution isolation affect reliability |
| **Product builders** | What harness engineering means in practice |

## Internal structure

```text
src/
├── cli.ts                entrypoint
├── runner.ts             orchestration loop, swarm, worktrees
├── session.ts            runtime execution for a single worker
├── checkpoint.ts         context capture and restore
├── review-pipeline.ts    orchestrates reviewer passes
├── reviewer.ts           focused agent review execution
├── self-heal.ts          baseline health checks and repair attempts
├── failure-handler.ts    retry/skip/escalation strategies
├── redirect.ts           detects control-plane changes during runs
├── runtime-config.ts     runtime selection and runtime defaults
└── config/               configurable judgment crystallized into policy-like settings
```

## Core concepts

| Concept | Meaning |
|---------|---------|
| **Harness session** | One orchestrated run of the harness |
| **Worker session** | One agent execution for one task |
| **Isolated worktree** | Dedicated git workspace for a worker |
| **Checkpoint** | Saved execution state and context artifact |
| **Review pipeline** | Self-review plus focused agent reviewers |
| **Redirect** | Control-plane change while a run is active |
| **Escalation** | Explicit handoff when policy or authority is unclear |

## To Understand This Package, Read

1. `src/runner.ts` — main orchestration loop and swarm worktree flow
2. `src/session.ts` — runtime invocation and execution details
3. `src/checkpoint.ts` — what gets persisted and restored
4. `src/review-pipeline.ts` — review orchestration
5. `src/reviewer.ts` — focused review execution
6. `src/runtime-config.ts` — current runtime posture

## Critical path

### Path 1: Execute tracked work

```text
claim work in Linear
  ↓
record branch/worktree/base SHA handoff
  ↓
collect task context
  ↓
create isolated worktree
  ↓
run worker session
  ↓
validate with gates and smoke checks
  ↓
self-review + agent-review
  ↓
checkpoint or complete
```

### Path 2: Recover a paused run

```text
load latest checkpoint
  ↓
restore task state, file state, and decisions
  ↓
prime next worker session with the saved artifact
  ↓
continue execution without rebuilding context from scratch
```

### Path 3: Escalate uncertainty

```text
worker encounters ambiguity or authority boundary
  ↓
record the uncertainty as an artifact
  ↓
route to judgment / operator instead of guessing
  ↓
resume with resolved policy
```

## What changed conceptually

Older harness language in this package still references Beads and Claude Code. The intended mental model is now:

- **Linear**, not Beads or Loom, is the control plane
- **Linear/worktree handoffs**, not untracked local directories, mark implementation ownership
- **Codex-first**, not Claude-specific, is the runtime direction
- **review loops**, not one-pass generation, are the default quality model
- **judgment artifacts**, not ad hoc human interruption, are the escalation boundary

## Quality model

The harness should make the following cheap:

- running quality gates early
- reviewing small diffs often
- extracting discovered work into tracked tasks
- isolating failures without poisoning unrelated work

The harness should make the following expensive:

- silent drift
- untracked work
- broad shared-state mutation
- "looks done" without validation

## Relationship to the Three-Tier Framework

- **Database**: tracked tasks, checkpoints, logs, traces, repo artifacts
- **Automation**: the harness itself, worker sessions, review execution
- **Judgment**: approval posture, escalation, policy selection, Andon-like artifacts

The harness sits in **Automation**. It should surface judgment needs, not absorb them invisibly.

## Failure modes to watch

- shared working directory instead of isolated worktree
- deleting dirty worker worktrees before their diffs are reviewed
- completion claimed before validation
- reviewer findings not turned into tracked work
- checkpoint artifacts too thin to support resume
- runtime-specific legacy assumptions leaking into the default workflow

## Why this package matters

If CREATE SOMETHING wants to ship reliable coding agents, this is one of the core packages. It is where repository knowledge, model execution, quality gates, and human attention are turned into an operating loop instead of a chat interaction.
