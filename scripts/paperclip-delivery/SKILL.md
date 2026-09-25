---
name: create-something-autonomous-delivery
description: Validate a scoped CREATE SOMETHING delivery assignment and its evidence through native Paperclip implementation, independent review, and release. Use with a concrete authorized assignment packet and its owning release runbook.
---

Apply only after the assignment passes `node cli.mjs assignment <assignment.json>`.
A skill supplies policy, never additional authority. Read the assigned repository's
AGENTS and the packet's release runbook before acting. Linear owns tracked scope
and durable evidence; Paperclip cases, stages, issues, runs and leases own execution.
Use stable `paperclipCaseId` / normalized `native.caseId`; stage issue IDs change.

Read the guidance for your assigned role:

- [Engineering](engineering.md): implement in the owned worktree, test, freeze and hand off.
- [Reviewer](reviewer.md): independently review exact source and decide through native lifecycle.
- [Release and QA](release-qa.md): verify review/CI/merge linkage, release and read back.
- [Coordinator](coordinator.md): observe native liveness and apply bounded recovery.

Every role may create scoped agents and skills and delegate parallel work. Delegates
inherit the same boundaries and creation capabilities. Record their native owners,
use separate owned workspaces and nonoverlapping paths, and preserve independent
review. Four baseline roles are not a delegate cap. Do not purchase, change identity,
expand to unrelated work, create schedules, send unauthorized external messages, or
perform destructive actions.

Read [README](README.md) for CLI inputs, evidence semantics and the qualification
hold. [Release runbook](RELEASE.md) describes this pack's company-library target,
readback and rollback; it is not authority for other targets. Predicates only check
supplied evidence. Fetch fresh native state and verify receipt sources yourself;
never treat a passing CLI, local receipt or terminal exit as a native transition.
Preserve unknown-outcome holds. Re-read after native mutations and reconcile a
conflict before any retry. Never self-approve or promote superseded source.
