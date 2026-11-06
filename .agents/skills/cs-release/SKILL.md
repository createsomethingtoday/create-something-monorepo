---
name: cs-release
description: Complete authorized CREATE SOMETHING delivery with exact-artifact verification, promotion evidence, rollback, and a durable Linear closeout. Use when merging, deploying, handing off, or closing tracked implementation work.
---

# CREATE SOMETHING release

Resolve paths from the repository root. Follow the owning application's promotion
workflow, `AGENTS.md`, and the current user authorization. Read
`docs/guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md` for DEV versus production
delivery and `docs/AGENT_RUN_RECEIPT_CHARTER.md` for the receipt contract.

1. Identify the exact source HEAD and deployable artifact, destination/environment,
   acceptance criteria, owning operator, and rollback or recovery path. Confirm
   the available authority covers the intended action. Literal read-only,
   draft-only, no-merge, no-deploy, and wait-for-approval boundaries take priority.
2. Assess the three gates against that artifact:
   - Functional correctness: relevant tests and exercised behavior; distinguish
     offline fixtures, local runtime, and live evidence.
   - Perceptual/product quality: directly view or listen when applicable and
     compare with the approved baseline. Unavailable observation is untested.
   - Release readiness: scope, required reviews, permissions, artifact identity,
     destination, and rollback. Prototype approval alone is insufficient.
   Report each as passed, failed, untested, or not-applicable, with limits. Use
   the independent final re-test required by the applicable `AGENTS.md`.
3. Carry authorized production work through its normal review, merge, deploy,
   and live-verification path. DEV evidence follows the Git-light workflow.
   Follow the active T3 instructions for PR linking and event-driven waits.
   A CI pass or deployment receipt does not establish current live behavior.
   Keep saved, merged, deployed, live-verified, and human-accepted states distinct.
4. Preserve the delivery evidence in the owning Linear issue and its existing
   approved artifact location before ephemeral worktree or browser cleanup.
   Do not create another work-tracking source. A closeout receipt includes:
   - Issue, objective, acceptance criteria, authority, and source of truth.
   - Exact HEAD/artifact and what changed; test/runtime evidence and its limits.
   - PR, deployment, and live-verification evidence where applicable.
   - Rollback/recovery, remaining uncertainty, and next owner or acceptance gate.
   - `Worktree disposition:` followed by `removed`, `preserved at <path/branch>`,
     or `retained until <checkpoint>`.
5. Read back consequential writes through the owning source, record the receipt,
   and close tracked work only when its acceptance criteria are met. If a gate
   is unresolved or unauthorized, name the blocker and remaining work; stop
   before that action. Existing authorization persists, so do not request it again.

External messages, client-system writes, and audience dispatch require their
applicable explicit authorization. A release skill invocation does not create
blanket permission for unrelated external actions.
