# policy.git-light-agent-delivery.v1

- Status: `draft`
- Owner: `CREATE SOMETHING engineering operations`
- Effective date: `TBD`

## Purpose

Define a Git-light delivery workflow for AI agents in the monorepo so DEV and preview iteration can move through direct validation and deploy evidence, while production promotion retains an explicit provenance and rollback boundary.

## Scope

- Agent-authored code changes in the shared monorepo
- Direct DEV and preview deploys from provisioned environments such as Ona or Gitpod
- Production promotion, provenance, and rollback expectations
- Linear evidence requirements for deploy-backed checkpoints

## Policy Statements

1. Linear MUST remain the source of truth for task selection and task state.
2. Agents MAY validate and deploy to DEV or preview directly from the current workspace without creating a commit or push when the objective is inner-loop verification, smoke testing, or non-production preview.
3. Direct DEV or preview deploys MUST be preceded by the narrow relevant quality gates for the affected surface.
4. Every direct DEV or preview deploy MUST record evidence in Linear, including issue ID, package or surface, target environment, commands run, deploy URL or identifier, and rollback reference.
5. Git commits and pushes MUST NOT be treated as mandatory progress checkpoints for inner-loop agent work.
6. Git branches, commits, and PRs MUST remain the default production promotion boundary for shared release paths, human review, and rollback unless a separate immutable release-artifact path is explicitly defined.
7. Production deploys from unpushed or unreviewed local state MUST NOT occur except under explicit human-directed incident response or emergency authorization.
8. Worktrees SHOULD remain the default isolation mechanism for long-running or parallel agent work, but worktree use does not imply that a commit is required before DEV iteration.
9. When a deploy path already runs through direct Wrangler or equivalent runtime commands, the deploy command MAY run without Git metadata, but provenance MUST still be attached to Linear and to any PR or release record used for production promotion.
10. Rollback MUST remain human-controlled and MUST point to the last known-good deployed state, a revert commit, or an approved immutable release artifact.
11. Commit count, push count, or an agent completion message MUST NOT be used as a deploy trigger, promotion trigger, or readiness signal.
12. Non-terminal DEV and preview deploy checkpoints SHOULD be captured as Linear comments and MUST be summarized when the issue is completed or promoted.

## DEV / Preview Eligibility

Required:

- tracked Linear issue exists
- workspace ownership is unambiguous
- relevant quality checks pass
- target environment is non-production
- deploy path is defined
- deploy evidence is recorded

Blocked when:

- the target environment is production
- workspace or branch ownership is ambiguous
- rollback path is unknown
- deploy evidence would live only in chat memory

## Production Promotion Eligibility

Required:

- reviewable immutable source exists
- required human approval exists
- rollback path is defined
- post-deploy verification path is defined

Default path:

- branch and PR review
- merge to `main`
- production deploy
- post-deploy verification

Approved alternative:

- explicitly defined immutable release-artifact promotion path with equivalent provenance and rollback properties

## Evidence

- Linear issue history with deploy evidence comments
- validation command output or summary
- deploy URL, deployment identifier, or runtime version reference
- PR or release record when the change is promoted to production
- rollback rationale and incident reference when rollback occurs
- Linear comment or completion evidence for non-terminal DEV or preview checkpoints

## Source Anchors

- `AGENTS.md`
- `STANDARDS.md`
- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`
- `scripts/run-wrangler.mjs`
- `.github/workflows/agency-pages-deploy.yml`
- `.github/workflows/io-paper-cycle-preview.yml`
- `.github/workflows/io-paper-cycle-post-merge.yml`
