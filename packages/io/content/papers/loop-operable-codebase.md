---
title: 'The Loop-Operable Codebase'
subtitle: 'Why CREATE SOMETHING should integrate agent loops through Symphony before adopting Hermes as a primary runner'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: "Loop engineering is useful only when the codebase can observe the loop, bound its authority, and preserve evidence after the agent stops. This paper documents the CREATE SOMETHING loop pilot after reviewing current public loop-engineering signals, Hermes Agent architecture, and the monorepo's existing Symphony, Linear, worktree, legibility, and policy surfaces. The result is a conservative recommendation: do not make Hermes the first control plane. Use Symphony as the repo-native loop layer, keep readiness checks read-only by default, require explicit dispatch for one bounded pass, and treat policy artifacts as the boundary between automation and judgment."
keywords:
  [
    'Loop Engineering',
    'Symphony',
    'Linear',
    'Codex',
    'Hermes',
    'Agent Harness',
    'Worktrees',
    'Policy OS',
    'Three-Tier Framework'
  ]
publishedAt: '2026-06-22'
readingTime: 16
difficulty: 'intermediate'
published: true
---

## Executive Thesis

The useful lesson from loop engineering is not that a new agent should be installed.

The useful lesson is that a codebase should become operable by loops.

Peter Steinberger's recent loop-engineering claim, echoed by Addy Osmani and others, is easy to flatten into tool enthusiasm: use Hermes, use Codex automations, use Claude loops, run more agents. That is not the durable point. The durable point is that humans should stop retyping coordination prompts when the system can discover work, assign it, check it, record evidence, and stop.

CREATE SOMETHING is already close to that shape. The monorepo has:

- Linear as the durable queue and ownership surface
- `pnpm agent:claim-worktree` for isolated worktree handoff
- Symphony as a Linear-backed orchestration runtime for Codex workers
- package legibility contracts for boot and smoke paths
- policy artifacts as versioned judgment boundaries
- Braintrust, Dify, MCP, and smoke checks as validation surfaces

The recommendation is therefore conservative:

Do not make Hermes the primary loop runner yet. Codify the loop around Symphony first. Treat Hermes as a useful reference implementation and possible secondary runner after the repo-native loop can prove it can observe itself.

## What Was Reviewed

The review had three inputs.

First, current public loop-engineering material. Addy Osmani describes loop engineering as replacing the human prompt-writer with a small system that finds work, hands it out, checks it, writes down what happened, and chooses the next thing. He names the practical components: automation, worktrees, skills, plugins or connectors, sub-agents, and durable state. Business Insider's June 2026 coverage frames the same movement around recurring systems that guide coding agents, with Steinberger's example of Codex waking periodically to maintain repos and direct work to threads.

Second, Hermes Agent. Hermes is relevant because it packages many loop primitives directly: memory files, skill creation, cron scheduling, cross-session recall, messaging gateways, subagents, and remote execution backends. That is a serious signal. It shows where the market is going: agent value compounds when the environment remembers and schedules work.

Third, the CREATE SOMETHING repo. The important discovery was that the repo does not need to start from scratch. It already has the control-plane pieces that public loop-engineering discussions recommend. The gap is not capability. The gap is operational binding: a clear pilot command, a default preflight, dispatch authority, and paper-worthy evidence.

## End Result

This pilot added one repo-native loop surface:

```bash
pnpm agent:loop-pilot
```

That command is the default readiness preflight. It does not claim Linear work and does not start Codex workers. It checks:

- git checkout state
- package agent legibility contracts
- policy artifact structure
- Symphony package tests
- Linear ready queue visibility when `LINEAR_API_KEY` is available

The dispatching version is explicit:

```bash
pnpm agent:loop-pilot:dispatch
```

That command runs the same preflight and then calls:

```bash
pnpm symphony:code-quality:once
```

The distinction matters. A loop that dispatches by default is easy to demo and hard to trust. A loop that starts with read-only readiness can be integrated into daily work without quietly claiming tasks or spending model budget.

The pilot also updated the code-quality Symphony runbook to state its authority boundaries. The loop may read Linear issues, claim work only when dispatch is explicitly requested, create isolated Symphony workspaces, run targeted checks, and leave a reviewable diff or evidence comment. It may not deploy, mutate third-party systems beyond Linear coordination, perform broad speculative refactors, merge, push, or run continuously without operator review of single-pass evidence.

The first real dispatch also found a control-plane bug. The `code-quality` Symphony workflow declared `tracker.label: code-quality`, but the Linear tracker queried by project and active state without enforcing the configured label before dispatch. In practice, the first bounded run claimed one valid code-quality issue and one issue from the same project that did not carry `code-quality`.

That is precisely why the pilot needed to be bounded. The run was interrupted before worker edits landed, the generated workspaces were checked for cleanliness, and Symphony's Linear tracker was patched so `fetch_candidate_issues()` now filters by `tracker.label` and any configured required labels before a worker can claim an issue. A regression test now covers both single-label and multi-label dispatch filters.

## Why Symphony First

Hermes is compelling because it combines memory, skills, cron, and remote execution. That does not make it the right first control plane for this codebase.

The first control plane should be the one that already owns local truth.

In CREATE SOMETHING, that is Symphony plus Linear:

- Linear already owns tracked work, state, and evidence.
- Symphony already knows how to query Linear, prepare workspaces, start Codex workers, and report state.
- Worktree isolation is already a repo rule, not an optional convention.
- Package `createSomething` metadata already gives agents a map.
- Policy artifacts already define what should stop or escalate.

Adding Hermes first would create another state surface before the current one is fully exercised. The codebase would have to answer avoidable questions: Does Hermes memory override repo docs? Does Hermes cron own the queue or does Linear? Where is the receipt? Which workspace owns a failed run? Which policy stopped the agent?

Those questions are solvable, but they are not the first move.

The first move is to make the existing loop boring.

## The Three-Tier Mapping

The pilot maps cleanly onto the CREATE SOMETHING Three-Tier Framework.

### Database

Database is what exists. In this loop, it includes:

- Linear issues and state
- package metadata
- package README and `AGENTS.md` files
- policy markdown and JSON artifacts
- git worktree state
- readiness reports

The key property is persistence. A loop cannot depend on a single chat transcript. It needs durable state outside the model context.

### Automation

Automation is what happens. In this loop, it includes:

- `scripts/agent-loop-pilot.mjs`
- Symphony workflow dispatch
- Codex worker execution
- targeted package checks
- workspace creation and cleanup
- single-pass drain-to-idle behavior

The important design choice is explicit dispatch. Automation can run the work, but it should not silently widen authority from "check readiness" to "claim and edit."

### Judgment

Judgment is what should happen. In this loop, it includes:

- policy artifact checks
- escalation boundaries in the runbook
- human approval before continuous daemon promotion
- no production deploy or merge authority inside the pilot
- no broad refactor authority without a concrete drift signal

This is where the loop differs from a cron job. A cron job repeats. A governed loop repeats within an explicit policy boundary.

## What Makes a Codebase Loop-Operable

A loop-operable codebase has six properties.

### 1. A real queue

The loop needs a queue that survives the agent. Linear is the queue here. It carries ownership, issue state, labels, descriptions, comments, and evidence. The loop should start from Linear work rather than from vague recurring prompts.

The first dispatch tightened this requirement: a queue is not just a list. It is also a scope contract. The workflow's label declaration must be executable, not merely descriptive.

### 2. Isolated execution

Worktrees are not a convenience. They are the safety boundary that lets multiple workers operate without contaminating each other or the root checkout. The existing CREATE SOMETHING workflow already records branch, worktree path, base ref, and base SHA.

### 3. A cheap preflight

The loop needs a command that can run often without starting work. `pnpm agent:loop-pilot` is that preflight. It answers whether the repo is ready for a bounded agent pass.

### 4. Explicit dispatch

Dispatch should be a different command. `pnpm agent:loop-pilot:dispatch` is intentionally more powerful. It can claim Linear work and start Codex workers because the operator asked it to.

### 5. Local evidence

The loop needs evidence that is legible without replaying the entire agent session. The readiness report summarizes each gate. Symphony records workspace metadata and Linear evidence. Package checks and policy checks become receipts.

### 6. A stop rule

The loop needs clear reasons to stop. In this pilot, it stops or escalates when issue state and workspace state cannot be reconciled, a workspace is dirty after failure, validation needs unavailable secrets or production mutation, or the worker hits policy or ownership ambiguity.

The first dispatch added one more stop rule: if the loop claims work outside the configured label scope, stop the run and fix dispatch selection before allowing more autonomy.

## Why This Is Better Than a Prompt

A prompt can say:

> Maintain this repo and improve code quality.

That instruction is too broad. It asks the model to invent the queue, infer authority, choose checks, remember what it did, and decide when to stop.

The pilot decomposes the same desire into artifacts:

- Linear selects work.
- Symphony dispatches work.
- Worktrees isolate work.
- Package metadata routes work.
- Checks validate work.
- Policy artifacts bound work.
- Linear comments and readiness reports preserve work.

That is the difference between prompting an agent and designing a loop that prompts agents.

## Why Not Continuous Yet

Continuous loops are attractive because they promise unattended progress. They also multiply every unresolved boundary.

If a single-pass loop cannot produce boring evidence, a daemon will not fix that. It will only make the failure harder to inspect.

The right promotion ladder is:

1. Readiness only: `pnpm agent:loop-pilot`
2. One bounded dispatch: `pnpm agent:loop-pilot:dispatch`
3. Review worker output, preserved workspaces, Linear evidence, and token cost
4. Add a narrow recurring schedule only for the lane that produced stable evidence
5. Consider Hermes or another runner only after the repo-native evidence model is clear

The loop should earn more autonomy by producing better receipts.

## Hermes as Reference, Not Rejection

This paper does not reject Hermes.

Hermes is useful as a reference because it makes several good bets:

- memory should live outside one session
- skills should compound from repeated work
- scheduled automations should be first-class
- agents should be reachable from operator messaging surfaces
- long-running work should not depend on one laptop tab

Those are good directions for CREATE SOMETHING too.

But adoption should be through compatibility, not displacement. A future Hermes experiment should read Linear as the queue, respect worktree boundaries, emit the same receipts, and treat repo docs and policy artifacts as higher authority than its private memory. If it can do that, it can become another runner. If it cannot, it should remain a personal assistant layer rather than the codebase control plane.

## Practical Operating Pattern

The recommended operating pattern is simple.

Daily:

```bash
pnpm agent:loop-pilot
```

If readiness is clean and there is appropriate `code-quality` work:

```bash
pnpm agent:loop-pilot:dispatch
```

After dispatch:

- inspect the Symphony output
- inspect any created workspace
- inspect Linear comments and issue state
- run targeted package checks if the worker left a diff
- only then decide whether to merge, create a follow-up, or clean up

Weekly:

- review repeated loop failures
- convert repeated comments into lint, policy, docs, or helper changes
- decide whether one narrow lane is stable enough for scheduled execution

## What This Proves

The pilot proves three things.

First, CREATE SOMETHING already has the primitives loop engineering requires. The missing piece was a single operator-facing entrypoint that made readiness and dispatch distinct.

Second, bounded dispatch is not bureaucracy. It is how the system finds the next missing guardrail. The first run did not prove that the loop was ready for a daemon; it proved that the workflow label needed to become executable policy.

Third, the positive trajectory is repo-native. The loop should deepen the codebase's own contracts rather than replacing them with a new agent's private memory.

Fourth, the product language is becoming sharper. CREATE SOMETHING should not describe its work as merely MCP creation or agent setup. The stronger phrase is:

`connectivity + harness engineering + judgment control`

That is what the pilot implements in miniature.

## Conclusion

Loops are not magic. They are operational systems.

A useful loop has a queue, isolation, checks, memory, authority boundaries, and receipts. Without those, the loop is just a prompt that repeats. With those, it becomes a way for the codebase to improve itself without losing human control.

The next step is not to chase the most autonomous agent. The next step is to make the smallest loop trustworthy.

For CREATE SOMETHING, that smallest trustworthy loop is now:

```bash
pnpm agent:loop-pilot
pnpm agent:loop-pilot:dispatch
```

Readiness first. Dispatch second. Judgment always outside the loop.
