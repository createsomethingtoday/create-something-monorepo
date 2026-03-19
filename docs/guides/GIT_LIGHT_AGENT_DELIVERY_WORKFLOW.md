# Git-Light Agent Delivery Workflow

## Purpose

Use this workflow when AI agents need fast DEV iteration without paying the cost of commit and push steps that do not materially improve confidence.

The operating rule is simple:

- deploy is the DEV checkpoint
- Git is the default PROD promotion boundary

## When To Use It

Use the Git-light path when:

- the target is DEV or preview
- the agent is working in Ona, Gitpod, or another provisioned environment
- the main goal is validation, smoke testing, or runtime confirmation
- no human review or production promotion is being requested yet

Do not use the Git-light path as a substitute for production provenance.

## Inner Loop

1. Start from a Loom task.
2. Build context from repo artifacts and package docs.
3. Run the narrow relevant checks for the touched surface.
4. Deploy directly to DEV or preview from the current workspace if runtime evidence is needed.
5. Record the deploy evidence in Loom.

Until remote Loom supports append-only checkpoint evidence from the repo CLI, use `pnpm loom:deploy:checkpoint` to write a structured checkpoint artifact under `.loom/checkpoints/` and carry its summary forward when the task is completed or promoted.

For the common surfaces, prefer the thin task-aware wrappers:

- `pnpm deploy:agency:checkpoint`
- `pnpm deploy:io:checkpoint`
- `pnpm deploy:space:checkpoint`
- `pnpm deploy:ltd:checkpoint`
- `pnpm deploy:identity-worker:checkpoint`
- `pnpm deploy:cs-hub-remote:checkpoint`
- `pnpm deploy:hub-fleet:checkpoint`

## Required Loom Evidence

Each DEV or preview deploy checkpoint should capture:

- Loom task ID
- package or surface name
- target environment
- commands run
- deploy URL, deployment identifier, or runtime version
- log path, trace, or verification note
- rollback note or last known-good reference

Example:

```bash
pnpm deploy:agency:checkpoint \
  -- \
  --task-id lm-12345678 \
  --environment dev \
  --rollback-reference main \
  --deploy-url https://dev.create-something-agency.pages.dev \
```

To pass extra deploy flags through to the underlying deploy command, add a second `--`:

```bash
pnpm deploy:io:checkpoint \
  -- \
  --task-id lm-23456789 \
  --environment preview \
  --rollback-reference main \
  --print-command \
  -- --branch=preview
```

## When Git Is Still Required

Use branch, commit, and PR flow when:

- the change is being promoted to production
- another human or agent needs diff-based review
- the work needs a durable mergeable handoff
- rollback will depend on a revert commit
- a package already defines Git or PR state as part of its release gate

## Production Path

Default production promotion remains:

1. tracked Loom task
2. branch and PR review
3. required approvals and evidence
4. merge to `main`
5. production deploy
6. post-deploy verification

An alternative production path is acceptable only when it uses an explicitly defined immutable release artifact with equivalent provenance and rollback properties.

## What This Changes For Agents

- Do not commit or push only to create a checkpoint.
- Prefer direct DEV deploys when they are the fastest trustworthy validation surface.
- Keep Git as the production and shared-review boundary.
- Use `.loom/checkpoints/` as the temporary bridge for non-terminal deploy evidence until remote Loom adds append-only checkpoint support in the repo CLI.
- Prefer the surface-specific checkpoint wrappers over hand-building the command for common deploy targets.

## Source Anchors

- `AGENTS.md`
- `STANDARDS.md`
- `docs/policies/v1/policy.git-light-agent-delivery.v1.md`
- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`
