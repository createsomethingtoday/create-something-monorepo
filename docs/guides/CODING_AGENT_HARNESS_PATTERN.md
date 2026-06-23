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
