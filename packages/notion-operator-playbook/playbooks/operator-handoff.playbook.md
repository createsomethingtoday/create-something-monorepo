# Operator Handoff Playbook

This Playbook is the reusable method for moving one approved workflow into
bounded operation. It is not a live execution record.

## Inputs

- Approved workflow map and version.
- Named accountable operator.
- Explicit rollback or recovery plan.
- Verification target and evidence expectation.

## Plays

1. Confirm the source workflow and ownership boundary.
2. Run `inspectRunbookReadiness` and resolve every missing requirement.
3. Run `instantiateRunbook` with `dryRun=true` and review the receipt.
4. Enable a live write only for the approved disposable or production target.
5. Attach verification evidence and record rollback disposition.

## Policy

The Playbook never treats authentication as authorization. Preview is the
default. A live write requires operator approval, the dedicated environment
gate, an explicit data source, and an authenticated client. Webhook evidence is
accepted only after raw-body HMAC verification.

## Done

The instantiated Runbook has a stable receipt, named owner, approval, rollback
plan, at least one evidence artifact, and an explicit worktree/deployment
disposition.
