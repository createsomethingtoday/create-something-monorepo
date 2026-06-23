# Solo Operator Agent Loop

This guide codifies the Peter Steinberger-inspired fast lane for CREATE
SOMETHING when the operator is working alone and wants maximum iteration speed.

The point is not to remove governance. The point is to move governance to the
places where it buys confidence: validation, review, promotion, rollback, and
production evidence.

## When To Use This

Use the solo loop when:

- one operator owns the current checkout
- the work is exploratory, low-risk, or easy to validate locally
- the fastest trustworthy evidence is a CLI, test, smoke, preview, or browser
  check
- the operator can watch the agent stream and interrupt on drift
- production promotion is not being requested yet

Do not use this path for shared production promotion, concurrent edits to the
same surface, security-sensitive changes, destructive migrations, credential
rotation, or work where another operator needs a durable handoff before the
change is understood.

## Command

Run the readiness check from the checkout you intend to use:

```bash
pnpm agent:solo-loop
```

Use JSON output for dashboards or higher-level agents:

```bash
pnpm agent:solo-loop:json
```

Run the fast contract checks before relying on this lane for broader work:

```bash
pnpm agent:solo-loop:check
```

The default command is read-only. It reports checkout dirtiness, upstream
divergence, Hermes/Codex command availability, and the recommended operating
loop. It does not mutate git, Linear, deployments, secrets, or production
state.

## Operating Loop

1. Work in the current checkout when the operator owns it.
2. Give the agent one compact task with the nearest command, file, or failing
   output.
3. Prefer CLI-verifiable surfaces. If a feature lacks a useful CLI or smoke,
   add the smallest one.
4. Watch the stream. Interrupt, redirect, or queue follow-up work when the
   agent drifts.
5. Ask for tests or write targeted tests in the same context so the model can
   use its fresh understanding.
6. Keep docs and `AGENTS.md` focused enough that the agent loads a map, not a
   manual.
7. Commit only when a commit improves review, rollback, production promotion,
   or durable handoff.

## Peter-Style Biases Adopted Here

- **Current checkout first**: do not force a Linear issue or worktree for every
  solo exploratory change.
- **CLI-first products**: agents need commands they can call to close their own
  loops.
- **Short prompts, strong context**: encode recurring facts in repo docs,
  package scripts, `AGENTS.md`, and skills instead of repeating long prompts.
- **Human steering**: the operator watches the stream and corrects direction
  early.
- **Small tasks in queue**: prefer several small loop iterations over one broad
  unsupervised run.

## Boundaries That Stay

Production promotion still needs provenance:

- branch, PR, merge, and deploy evidence by default
- or an explicitly approved immutable release path with equivalent rollback
  properties

Use `pnpm agent:claim-worktree -- --issue CRE-123` instead of the solo loop when
work needs shared ownership, parallel isolation, long-running background
execution, or cleanup guarantees.

Use Linear when the work should be tracked across sessions, delegated to
another agent, reported externally, or marked complete with durable evidence.

## Hermes Use

Hermes can be used as the solo loop worker when it is installed and configured.
For normal local repo tests it does not require E2B. Use a normal user-owned
checkout path so Hermes file tools can write safely.

Use E2B or another sandbox only when the task is untrusted, destructive,
resource-heavy, or needs parallel disposable environments.

## Quick Decision Table

| Situation | Preferred lane |
| --- | --- |
| Solo exploratory edit | `pnpm agent:solo-loop` plus current-checkout agent session |
| Low-risk DEV or preview deploy | Git-light delivery with Linear evidence if useful |
| Shared production change | branch, PR, merge, deploy, post-deploy verification |
| Parallel agent work touching overlapping files | Linear plus isolated worktrees |
| Untrusted or destructive test | disposable sandbox such as E2B |

## Validation

For this guide and its command:

```bash
pnpm agent:solo-loop:test
pnpm agent:solo-loop:check
git diff --check
```
