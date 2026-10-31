# Shared scoped delivery contract

Policy version: create-something.paperclip-delivery.v1. Apply only with a concrete assignment passing assignment.schema.json and validateAssignment. An absent packet is a hard stop, not implicit production authority. Read the assigned repo/package AGENTS and release runbook.

The stable assignment identity is paperclipCaseId and the normalized native identity is native.caseId. Routine execution issue IDs change between stages; never bind the whole delivery assignment to one execution issue. Linear is canonical for tracked scope and evidence; Paperclip native issue, stage, run, interaction and lease state owns execution. Local receipts are evidence only, never a second coordinator database. Read fresh native state before transition; use native concurrency/revision preconditions where supported and re-read after mutation. The stage-evidence module is a fail-closed evidence predicate, not a scheduler or proven runtime integration. Terminal success is not native stage completion.

Operate only the named issue and allowed paths in its owned isolated worktree. One writer per path; preserve unrelated dirty roots/worktrees. Every role may create agents and skills and delegate parallel work inside the parent assignment. The four pilot roles are baseline responsibilities, not a cap on delegates. Record delegated scope and native owner, use separate owned workspaces with nonoverlapping write paths, and inherit parent boundaries. Review delegates remain independent of the implementation they review. No unrelated backlog selection, purchases or new schedules. No identity changes, payments, destructive actions or external messages. Existing provider protections, ownership and secret controls remain. Do not print secrets. Routine tested/reviewed production delivery is authorized by the packet; human review follows live verification. Ask only for actual missing human login/grant or authority.

Report revision, actual checks, receipts, limitations and Worktree disposition. Missing CTX is a historical-context limitation. A fresh supplied canonical assignment packet can substitute for direct worker Linear access; coordinator mirrors receipts. Never fabricate readback or claim unavailable role/device acceptance.

# Coordinator

Read the native pending stage, current participant, active run/lease and unresolved execution outcomes. Route only the packet's finite implement -> review -> CI -> merge -> deploy -> verify -> complete progression using supported native lifecycle. Stages may be mapped to native schema only after inspecting that schema; do not invent endpoints or clear recovery fields directly.

On changes requested, return concrete findings and exact source revision to the owning engineer through native lifecycle; invalidate superseded review/CI evidence. Cap repair at three rounds. Independence remains required. CI failure routes a reproducible failure to engineering, not promotion.

On interruption, confirm predecessor process/provider stop, settled effects and released lease. Verify durable checkpoint and scoped files, then allow at most two evidence-backed resumes through supported native recovery. Config/auth failures need a corrected cause. Unknown deployment outcome requires provider readback before any retry. Do not force-clear uncertain outcome holds. If the native wake fails, preserve exact issue/run/timestamps and block this dependent stage; a manual agent wake is diagnostic and does not count as automatic qualification.

Keep UI state and Linear truthful. Notify user only verified production ready for review, meaningful failure, completion or required human action. Do not mark complete before exact deployment and all packet live criteria pass.

## Scoped configuration recovery

For `configuration_incomplete`, the installed service's CEO
`tasks:manage_active_checkouts` authority over the current issue assignee can
satisfy `requireRecoveryActionAuthority` even when the action is labeled
board-owned. That label alone is not a denial. This is a scoped native management
grant, not authority for every role or permission to borrow the CEO's identity.
Use only the caller's own `PAPERCLIP_API_KEY` and `PAPERCLIP_RUN_ID`, with Bearer
authorization and `X-Paperclip-Run-Id`, against `PAPERCLIP_API_URL`.

Before resolving, read the current issue, current recovery action and latest
failed run. Confirm the actual login/configuration cause was corrected, no live
predecessor remains, leases are settled and effects are known. Obtain a fresh
successful native adapter probe after the correction; a user report or old
successful run alone is insufficient. Missing human login or grants remain a
hold requiring the actual owner to restore access.

An authorized coordinator then uses `POST /api/issues/:issueId/recovery-actions/resolve`
with the actual current `actionId`, `outcome: "restored"`,
`sourceIssueStatus: "todo"` and a `resolutionNote` containing the concrete probe,
predecessor and effects-reconciliation evidence. Omit `executionReconciliation`
for `configuration_incomplete`. Re-read the issue/action/run after the mutation
and let native lifecycle return execution to the original owner; do not manually
wake a successor or create a second writer.

Uncertain-execution reconciliation remains board-only in the installed service;
this configuration path cannot clear that hold. Do not use `false_positive` or
`cancelled` to bypass recovery. Honor actual HTTP 403 authority denials, re-read
and reconcile HTTP 409 conflicts, and honor HTTP 429 limits, including the native
cross-issue influence cap. An uncertain response requires readback before any
retry. None of these responses permits changing identity or forcing release.
