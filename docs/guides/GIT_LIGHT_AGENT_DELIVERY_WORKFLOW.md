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

1. For solo exploratory work, start with `pnpm agent:solo-loop` in the current
   checkout. For delegated or shared work, start from a Linear issue.
2. Build context from repo artifacts and package docs.
3. Run the narrow relevant checks for the touched surface.
4. Deploy directly to DEV or preview from the current workspace if runtime evidence is needed.
5. Record the deploy evidence in Linear when the checkpoint affects handoff,
   review, rollback, or promotion.

Use `pnpm linear:comment` or `pnpm linear:done -- --evidence "..."` to attach checkpoint evidence to the Linear issue.

## Required Linear Evidence

Each DEV or preview deploy checkpoint should capture:

- Linear issue ID
- package or surface name
- target environment
- commands run
- deploy URL, deployment identifier, or runtime version
- log path, trace, or verification note
- rollback note or last known-good reference

Example:

```bash
pnpm linear:comment -- --issue CRE-123 --body "Deploy: agency dev https://dev.create-something-agency.pages.dev
Validation: pnpm --filter @create-something/agency check
Rollback: redeploy main"
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

1. tracked Linear issue
2. branch and PR review
3. required approvals and evidence
4. merge to `main`
5. production deploy
6. post-deploy verification

For CREATE SOMETHING internal production-lab work, the agent may auto-rollback
the deploy it just performed when post-deploy verification fails and the
recorded rollback path is reversible, scoped to that deploy, and verified after
rollback. This exception is governed by
`docs/policies/v1/policy.operator-agent-production-lab.v1.md`; client
production, credential, billing, destructive data, and irreversible third-party
changes still require operator approval.

An alternative production path is acceptable only when it uses an explicitly defined immutable release artifact with equivalent provenance and rollback properties.

## GitHub Actions Budget Posture

When GitHub Actions free quota or a billing budget is exhausted, keep Actions as the PR and production promotion evidence surface. Do not move core quality gates or deploy provenance to an ad hoc runner just to avoid a small overage.

Use repo-side controls in this order:

1. Confirm whether the affected usage is from private repositories, larger runners, artifact or cache storage, or scheduled workflows. Standard GitHub-hosted runners in public repositories should not consume private-repo minutes.
2. Raise a small capped Actions budget in GitHub billing if private workflows are blocked.
3. Pause nonessential scheduled automations before changing PR gates or production deploy workflows.
4. Move only consistently expensive background work to another scheduler after it has a stable owner, logs, and rollback path.

This repo keeps expensive scheduled automations behind repository variables. Keep these variables set to `true` while the GitHub Actions budget is healthy. Set one to `false` or delete it to pause that scheduled run; manual `workflow_dispatch` remains available.

| Repository variable                             | Scheduled workflow                   |
| ----------------------------------------------- | ------------------------------------ |
| `ENABLE_TEMPLATE_REVIEW_HUB_SCHEDULE=true`      | `Template Review Hub Agent Feedback` |
| `ENABLE_TEMPLATE_DESCRIPTION_FIX_SCHEDULE=true` | `Fix Broken Template Descriptions`   |
| `ENABLE_LANGFUSE_MCP_EVALS_SCHEDULE=true`     | `Langfuse MCP Evals`               |

To re-enable one scheduled automation after budget review:

```bash
gh variable set ENABLE_TEMPLATE_REVIEW_HUB_SCHEDULE --body true --repo createsomethingtoday/create-something-monorepo
```

Manual runs are still the preferred escape hatch during a budget crunch because they preserve GitHub logs, secrets, and provenance without silently spending on background loops.

## What This Changes For Agents

- Do not commit or push only to create a checkpoint.
- Prefer direct DEV deploys when they are the fastest trustworthy validation surface.
- Keep Git as the production and shared-review boundary.
- Use Linear comments for non-terminal deploy evidence and final Linear evidence on completion.

## Source Anchors

- `AGENTS.md`
- `STANDARDS.md`
- `docs/policies/v1/policy.git-light-agent-delivery.v1.md`
- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`
