# Coding Agent Harness Pattern

This guide captures the default CREATE SOMETHING pattern for running coding agents reliably in the monorepo.

It is the local interpretation of "harness engineering" for this repository.

## Goal

Turn a coding agent from a one-shot assistant into a repeatable worker by giving it:

- tracked work
- isolated execution
- direct validation surfaces
- review loops
- explicit escalation boundaries

## The default loop

### Solo-operator fast lane

When one operator owns the checkout and is actively steering the agent, use the
solo loop before adding coordination overhead:

```bash
pnpm agent:solo-loop
```

This is the Peter Steinberger-inspired path: current checkout, short prompts,
CLI-first verification, visible stream steering, and targeted tests in the same
context. It does not replace production provenance or shared-work safeguards.
Use [SOLO_OPERATOR_AGENT_LOOP.md](./SOLO_OPERATOR_AGENT_LOOP.md) for the full
decision table.

### 1. Track the work

Use Linear as the control plane.

```bash
pnpm linear:ready
pnpm linear:list -- --status open
pnpm linear:get -- --issue CRE-123
pnpm agent:claim-worktree -- --issue CRE-123
```

The agent should start from a tracked task, not from an untracked conversation fragment.

The previous local and remote Loom queues were migrated into Linear. Keep original `lm-*` IDs in Linear descriptions/comments only for historical traceability.

## 2. Build context from repo artifacts

Before execution, gather:

- the task or issue record
- package `createSomething` directives
- package-local `AGENTS.md`
- relevant docs
- package-level understanding docs
- any prior checkpoint or decision memo

The agent should load a map, not a giant manual.

Use `pnpm agent:legibility:map` when the package boundary is unclear. Use `--tier` or `--surface` filters to narrow the traversal before reading package docs.

When changing package directives, package-local `AGENTS.md`, or the legibility scripts themselves, run `pnpm agent:legibility:verify` before closing the task.

## 3. Execute in isolation

Prefer isolated git worktrees for long-running or parallel work.

Use the repo helper when starting implementation work:

```bash
pnpm agent:claim-worktree -- --issue CRE-123
```

The helper records the Linear issue, branch, worktree path, base ref, and base SHA as a Linear comment. Treat that record as the shared ownership handoff. If `origin/main` has moved before push or production promotion, rebase or merge the current base and update Linear evidence.

For Hermes-backed runs, use a normal user-owned worktree root so Hermes can edit
repo files through its own tools:

```bash
AGENT_WORKTREE_ROOT="$HOME/Code/create-something-worktrees" \
  pnpm agent:claim-worktree -- --issue CRE-123
```

Why:

- prevents cross-task contamination
- makes cleanup straightforward
- keeps diffs attributable
- improves reproducibility

## 4. Validate with direct evidence

The agent should validate with the narrowest relevant evidence surface:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- package smoke checks
- traces/logs/metrics if applicable
- UI preview or screenshots if applicable

Do not let "done" mean "the code compiles in my head."

## 5. Run the review loop

Every meaningful change should pass through at least:

- **self-review**: the worker inspects its own diff
- **focused review**: security, architecture, quality, or domain-specific review
- **human review** only when judgment is required

The default question is not "did the model produce code?"

It is "did the system produce a validated change that survives review?"

## 6. Escalate uncertainty explicitly

When the agent hits ambiguity, missing authority, or conflicting evidence:

- do not guess
- do not silently widen scope
- emit a judgment artifact or checkpoint note
- route the decision to the operator or judgment layer

This is the boundary between Automation and Judgment.

## 7. Persist the state

A useful checkpoint captures:

- task state
- files touched
- decisions made
- validation state
- blockers
- review findings

This makes pause/resume and handoff real instead of conversational.

For DEV or preview work, a direct deploy with linked Linear evidence is a valid checkpoint. Use Linear comments for non-terminal checkpoints that affect handoff, review, rollback, or promotion. Do not force a commit just to manufacture state.

## Fleet maintenance lane

Use this lane when the work is the same class of maintenance repeated across
many packages, routes, workers, or client surfaces: dependency updates, API
migrations, export cleanup, policy wording alignment, generated artifact repair,
or framework-version drift.

Fleet work is not "ask an agent to touch everything." It needs a bounded batch,
a repeatable verifier, and an evidence trail that lets reviewers see which
surfaces changed and why.

Before starting fleet maintenance:

- create or claim one Linear issue for the batch
- define the target set with repo evidence such as `rg`, `pnpm exports`,
  package metadata, registry config, or generated maps
- separate deterministic changes from judgment-heavy changes
- name the package owners or review surfaces that may need human attention
- define the rollback unit before making changes

Prefer deterministic scripts for uniform edits. Use coding agents where the
same intent appears in many local shapes and static transforms would become
edge-case code. The agent should still work from a concrete target list, not an
open-ended repository scan.

The default loop for a fleet batch is:

1. Build the target inventory and save the command output or summary in Linear.
2. Pick the smallest representative slice and run the full verifier.
3. Apply the change to the next bounded batch in an isolated worktree.
4. Run package-local gates first, then broaden only when shared contracts moved.
5. Self-review the diff for accidental scope expansion.
6. Record changed surfaces, commands, failures, skipped targets, and rollback
   notes in Linear.

Stop and split the issue when:

- the target set crosses unrelated product or client ownership boundaries
- a package needs a different policy decision than the rest of the batch
- verification requires production credentials, third-party writes, or manual
  reviewer judgment
- the change starts modifying behavior outside the named maintenance class

Do not automerge fleet maintenance just because each edit is small. The safety
property comes from target inventory, ownership, verification, and rollback
evidence, not from line count.

## Design rules

### Prefer structure over prompting harder

If the agent fails repeatedly, the first question is:

> What capability, artifact, or validation loop is missing?

Do not default to "try again with a better prompt."

### Prefer repo-local truth

If a fact matters to execution, it should be encoded in:

- code
- package metadata
- markdown
- schemas
- policy artifacts
- runbooks

If it only exists in chat or memory, it is not reliably visible to the agent.

Package routing facts belong in `package.json` under `createSomething`; short package instructions belong in package-local `AGENTS.md`; detailed context belongs in README and `UNDERSTANDING.md`. Any generated repo map should derive from those artifacts instead of becoming another hand-maintained source of truth.

### Prefer small loops over heroic runs

Shorter loops with review and validation beat long unsupervised runs followed by cleanup.

### Prefer mechanical enforcement over taste-by-comment

If the same correction appears repeatedly, turn it into:

- a lint
- a guide
- a policy artifact
- a reusable helper
- a review rule

## What this means for CREATE SOMETHING

In this repo, harness engineering is the combination of:

- Linear for coordination
- worktrees for isolation
- quality gates for evidence
- observability and UI preview for legibility
- judgment artifacts for escalation
- docs as the system of record

## Related docs

- `../README.md`
- `../THREE_TIER_FRAMEWORK.md`
- `../guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`
- `../../packages/harness/README.md`
