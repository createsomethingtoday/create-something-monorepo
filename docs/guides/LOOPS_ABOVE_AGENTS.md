# Loops Above Agents

This guide defines the next CREATE SOMETHING operating layer for codebase
improvement.

The shift is simple: agents are workers, but loops are the product surface.
A loop owns the signal, context, policy, execution lane, verification, evidence,
and next decision. The agent is only one replaceable executor inside that loop.

## Why this exists

Git history and current repo primitives show the same pattern repeating:

- one-off agent runs get safer when the repo gives them a short loop and a
  direct verifier
- shared work gets safer when Linear owns state and isolated worktrees own diffs
- recurring quality work gets cheaper when drift is detected before it becomes a
  broad cleanup project
- policy becomes durable only when it is versioned, checked, and attached to
  execution evidence

The next stage is not "more agents." It is fewer ambiguous agent launches and
more named loops with explicit promotion rules.

Codex Spark fits this model as a fast executor profile, not as a new authority
surface. Use it where speed changes the shape of the loop: frequent context
digests, many small read/triage passes, interactive coding, or sub-agents that
collect evidence for a stronger supervising agent. The loop still owns signal,
policy, verification, proof, rollback, and the next decision.

## Definition

A CREATE SOMETHING loop is a repeatable operating circuit with seven parts:

| Part          | Question                                  | Repo surface                                                            |
| ------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Signal        | What changed or needs attention?          | Linear, git history, tests, smoke checks, logs, docs drift              |
| Context       | What must the worker read before acting?  | `AGENTS.md`, package docs, policy artifacts, issue body, prior evidence |
| Policy        | What boundaries control the work?         | `docs/policies`, intent packets, approval rules, package `AGENTS.md`    |
| Executor      | Who or what performs the work?            | Codex, Hermes, Symphony worker, script, human operator                  |
| Verification  | How do we know the result is real?        | package checks, smoke tests, browser proof, policy checks, live health  |
| Proof         | Where does evidence persist?              | Linear comment, PR body, deploy note, proof artifact, local summary     |
| Next decision | Continue, split, promote, block, or stop? | operator review, Linear status, PR/promotion gate                       |

If one of these parts is missing, the work is still a task. It is not a loop yet.

For production-relevant loops, the default terminal state is stronger than a
validated diff: commit, push, merge, deploy, and live verification. A loop may
stop before deploy only when it is explicitly exploratory, draft/review-only,
blocked on external access, or scoped to non-production evidence; the receipt
must name that boundary.

## Tier mapping

Use the three-tier framework to debug loops before debugging agents.

### Database

Database owns the state the loop observes and updates:

- Linear issues, labels, status, comments, and evidence
- git history, branches, worktree paths, base SHAs, and diffs
- package metadata, docs indexes, generated maps, and policy files
- test output, health checks, traces, screenshots, and proof receipts

First question: is the loop reading the right source of truth?

### Automation

Automation owns the repeatable execution path:

- `pnpm agent:solo-loop`
- `pnpm agent:loop-pilot`
- `pnpm agent:loop-pilot:dispatch`
- `pnpm agent:loop-pilot:reviewed:check`
- `pnpm agent:loop-pilot:reviewed -- --issue CRE-1154 --json`
- `pnpm symphony:code-quality:once`
- `pnpm symphony:policy:once`
- `pnpm agent:legibility:verify`
- `pnpm agent:skills:test`
- package-local checks, smokes, and drift detectors

Second question: did the path run, and can it run again?

### Judgment

Judgment owns the decision boundary:

- whether the work is solo, Linear-tracked, PR-bound, or production-bound
- whether evidence is strong enough to mark done
- whether done means local validation, review-ready, merged, deployed, or
  production-stable
- whether the next action is a fix, a no-op, a split issue, or escalation
- whether an unattended daemon is allowed or only a single-pass dispatch is safe

Third question: did the loop apply the right policy to the observed evidence?

## Current loop registry

These loops already exist in the repo and should be promoted before new
automation is invented.

| Loop                | Purpose                                                                 | Primary command                                               | Evidence target                                      | Promotion state |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- | --------------- |
| Solo operator loop  | Fast current-checkout iteration when one operator owns the workspace    | `pnpm agent:solo-loop:check`                                  | local summary or PR evidence                         | active          |
| Intent mapping loop | Convert fuzzy or long-running work into a durable execution packet      | skill: `intent-mapping`                                       | issue description, Linear comment, or starter prompt | active          |
| Code-quality loop   | Run a bounded Symphony pass on reviewed Linear `code-quality` work      | `pnpm agent:loop-pilot` then `pnpm agent:loop-pilot:dispatch` | Linear issue and workspace path                      | pilot           |
| Fast context loop   | Use Spark-style fast sub-agents for recurring digests, triage, and prep | Codex automation, operator schedule, or reviewed dispatch     | local receipt, Linear comment, or handoff packet     | design-ready    |
| Policy loop         | Repair or align policy artifacts and governance docs                    | `pnpm symphony:policy:once`                                   | Linear issue, policy check output                    | pilot           |
| Skill feedback loop | Keep repo-owned skills tested and behaviorally legible                  | `pnpm agent:skills:test`                                      | package README, PR, Linear closeout                  | active          |
| Cleanup loop        | Keep docs, architecture, quality grades, and policy integrity fresh     | see `RECURRING_CLEANUP_LOOPS.md`                              | targeted fix or Linear follow-up                     | design-ready    |

## Fast executor profile

Spark-style executors are useful when low latency lets the operator keep the
loop warm:

- Slack, Drive, Meet, GitHub, or repo digests where the output is a routing
  packet, not a write.
- Duplicate issue clustering, PR comment triage, and lightweight review prep
  that a stronger agent or human can inspect.
- Interactive coding where the operator is watching the stream and can correct
  drift immediately.
- Fan-out reads where a supervising agent assigns narrow context-gathering work
  to multiple fast sub-agents.

Keep these boundaries:

- Do not treat Spark output as the source of truth. Verify against Linear, git,
  repo files, tests, logs, or live systems before acting.
- Do not grant Spark-only runs destructive tools, production deploy authority,
  secret rotation, or final review authority.
- Do not use speed as evidence. The receipt must still name the signal,
  context, policy, verification, outcome, and next decision.
- Escalate to the strongest full Codex model when the task becomes long-horizon,
  security-sensitive, production-bound, or correctness-heavy.

## Promotion rules

Promote loops in this order:

1. **Readiness**: run the loop in read-only or no-dispatch mode.
2. **Single pass**: dispatch one bounded unit after an operator has reviewed the
   issue, label, and target surface.
3. **Batch**: run a bounded batch only after the single pass has boring
   cleanup, rollback, and evidence behavior.
4. **Daemon**: run continuously only when the batch path has no unresolved
   ownership, workspace cleanup, or evidence gaps.

Do not skip from readiness to daemon.

## Auth boundary

During the account-based phase, loop workers must not rely on model-provider API
keys for agent reasoning.

`pnpm agent:loop-pilot:dispatch` strips common model API-key environment
variables from the Symphony worker process before launching Codex, including
`OPENAI_API_KEY`, `*_OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`GOOGLE_API_KEY`, and other common provider keys. The worker should use the
local Codex account login instead.

This guard does not remove non-model coordination credentials such as
`LINEAR_API_KEY`. Those remain available when the loop needs Linear state,
comments, or status updates.

If a loop genuinely needs API-key model billing, treat that as an explicit
promotion decision and record it in the loop receipt before dispatch.

## Evidence contract

Every loop run should leave a compact receipt:

```text
Loop:
Mode: readiness | single-pass | batch | daemon
Signal:
Context:
Policy:
Executor:
Verification:
Outcome: diff | no-op | blocked | follow-up
Proof:
Next decision:
Rollback or cleanup:
```

For Linear-backed work, put the receipt in the Linear issue. For solo work,
include it in the final agent summary or PR body.

## First recommended pilot

Promote the code-quality loop one notch, from readiness to one reviewed
single-pass dispatch.

Why this is the right first loop:

- it already has a named Linear label: `code-quality`
- it already has a read-only preflight: `pnpm agent:loop-pilot`
- it already uses isolated Symphony workspaces
- it already checks agent legibility, policy artifacts, and Symphony tests
- it has explicit boundaries against production deploys, broad refactors, and
  automatic merge or release promotion

The operator should review one `In Progress` Linear issue with the `code-quality`
label, confirm it is mechanical and bounded, verify its three contracts, then run:

```bash
pnpm agent:loop-pilot:reviewed:check -- --issue CRE-1154 --json
pnpm agent:loop-pilot:reviewed -- --issue CRE-1154 --json
```

Stop after that one pass. Inspect the worker, reviewer, integrator, unchanged
reviewer fingerprint, aggregate metrics, and preserved workspace before any
promotion decision.

## What not to build yet

Do not build a new orchestrator until the existing loops expose a concrete
missing capability.

Do not add another tracker. Linear is the loop state surface for shared work.

Do not run continuous Symphony daemons until single-pass evidence is boring.

Do not turn memory into authority. Use memory and chats as routing context, then
verify against repo files, Linear, git, and live systems before changing code.

## Related docs

- `../THREE_TIER_FRAMEWORK.md`
- `../MCP_FIRST_THESIS.md`
- `./CODING_AGENT_HARNESS_PATTERN.md`
- `./SOLO_OPERATOR_AGENT_LOOP.md`
- `./RECURRING_CLEANUP_LOOPS.md`
- `../../automation/symphony/code-quality/README.md`
- `../../automation/symphony/policy/README.md`
